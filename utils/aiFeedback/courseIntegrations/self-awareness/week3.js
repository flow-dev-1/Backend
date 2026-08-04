const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_3_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "self-awareness",
  courseTitle: "Self-Awareness",
  weekNumber: 3,
  weekTitle: "Understanding Mindset",
  guidance: WEEK_3_GUIDANCE
});

const TARGETS = Object.freeze({
  "self-awareness:week:3:activity:2": { activity: 2, feedbackIndex: 0 },
  "self-awareness:week:3:activity:4": { activity: 4, feedbackIndex: 0 },
  "self-awareness:week:3:activity:6:lessons": { activity: 6, feedbackIndex: 0 },
  "self-awareness:week:3:activity:6:growth-action": { activity: 6, feedbackIndex: 1 }
});

const getFeedback = (activity, index) =>
  Array.isArray(activity?.feedback) ? activity.feedback[index] : undefined;

const formatLessons = (answers) => {
  if (!Array.isArray(answers)) return "";
  const lessons = answers.slice(0, 5).map(toText).filter(Boolean);
  if (lessons.length !== 5) return "";
  return lessons.map((lesson, index) => `${index + 1}. ${lesson}`).join("\n");
};

const DEFINITIONS = Object.freeze([
  {
    targetId: "self-awareness:week:3:activity:2",
    activity: 2,
    activityLabel: "Activity 1",
    question: "What do you understand by the word mindset?",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[0])
  },
  {
    targetId: "self-awareness:week:3:activity:4",
    activity: 4,
    activityLabel: "Activity 2",
    question: "Do you think you have a growth mindset or a fixed mindset, and why?",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[0])
  },
  {
    targetId: "self-awareness:week:3:activity:6:lessons",
    activity: 6,
    activityLabel: "Activity 3 - Video Lessons",
    question: "List five lessons you learned from the mindset videos.",
    responseType: "multi_step",
    answer: (item) => formatLessons(item?.answers)
  },
  {
    targetId: "self-awareness:week:3:activity:6:growth-action",
    activity: 6,
    feedbackIndex: 1,
    activityLabel: "Activity 3 - Growth Action",
    question: "Name one thing you will start working on during your growth journey.",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[5])
  }
]);

const buildSelfAwarenessWeek3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 3 activities must be an array");
  }
  const byActivity = new Map(
    activities.map((item) => [Number(item?.activity), item])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = byActivity.get(definition.activity);
    const feedbackIndex = definition.feedbackIndex ?? 0;
    const answer = definition.answer(activity);
    if (!activity || !answer || hasExistingFeedback(getFeedback(activity, feedbackIndex))) {
      return [];
    }
    return [{
      targetId: definition.targetId,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Self-Awareness Week 3 feedback request: ${error.message}`);
  }
  return value;
};

const applySelfAwarenessWeek3Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 3 activities must be an array");
  }
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const feedbackByActivity = new Map();
  results.forEach((result) => {
    const target = TARGETS[result?.targetId];
    if (!target) throw new TypeError(`Unknown feedback target: ${result?.targetId}`);
    if (result.status === "skipped") return;
    const feedback = toText(result.feedback);
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    if (!feedbackByActivity.has(target.activity)) {
      feedbackByActivity.set(target.activity, new Map());
    }
    feedbackByActivity.get(target.activity).set(target.feedbackIndex, feedback);
  });

  return activities.map((activity) => {
    const generated = feedbackByActivity.get(Number(activity?.activity));
    if (!generated) return activity;
    const feedback = Array.isArray(activity.feedback) ? [...activity.feedback] : [];
    generated.forEach((value, index) => {
      if (!hasExistingFeedback(feedback[index])) feedback[index] = value;
    });
    return { ...activity, feedback };
  });
};

const selfAwarenessWeek3Integration = Object.freeze({
  buildRequest: buildSelfAwarenessWeek3Request,
  applyFeedback: applySelfAwarenessWeek3Feedback
});

module.exports = {
  applySelfAwarenessWeek3Feedback,
  buildSelfAwarenessWeek3Request,
  selfAwarenessWeek3Integration
};
