const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_2_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "self-awareness",
  courseTitle: "Self-Awareness",
  weekNumber: 2,
  weekTitle: "Strengths and Weaknesses",
  guidance: WEEK_2_GUIDANCE
});

const TARGETS = Object.freeze({
  "self-awareness:week:2:activity:2": { activity: 2, feedbackIndex: 0 },
  "self-awareness:week:2:activity:4": { activity: 4, feedbackIndex: 0 },
  "self-awareness:week:2:activity:5": { activity: 5, feedbackIndex: 0 },
  "self-awareness:week:2:activity:7:scenario:1": { activity: 7, feedbackIndex: 0 },
  "self-awareness:week:2:activity:7:scenario:2": { activity: 7, feedbackIndex: 1 },
  "self-awareness:week:2:activity:7:scenario:3": { activity: 7, feedbackIndex: 2 }
});

const getFeedback = (activity, index) =>
  Array.isArray(activity?.feedback) ? activity.feedback[index] : undefined;

const formatList = (items) =>
  Array.isArray(items) ? items.map(toText).filter(Boolean).join(", ") : "";

const formatScenario = (answers, number) => {
  if (!answers || typeof answers !== "object") return "";
  const strengths = formatList(answers[`strengthsQ${number}`]);
  const weaknesses = formatList(answers[`weaknessesQ${number}`]);
  if (!strengths || !weaknesses) return "";
  return `Selected strengths: ${strengths}\nSelected weaknesses: ${weaknesses}`;
};

const DEFINITIONS = Object.freeze([
  {
    targetId: "self-awareness:week:2:activity:2",
    activity: 2,
    activityLabel: "Activity 1",
    question: "What do you understand by strengths and weaknesses?",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[0])
  },
  {
    targetId: "self-awareness:week:2:activity:4",
    activity: 4,
    activityLabel: "Activity 2 - Strengths",
    question: "Select the strengths that best describe you.",
    responseType: "multi_select",
    answer: (item) => formatList(item?.answers?.strengths)
  },
  {
    targetId: "self-awareness:week:2:activity:5",
    activity: 5,
    activityLabel: "Activity 2 - Weaknesses",
    question: "Select the weaknesses or growth areas that best describe you.",
    responseType: "multi_select",
    answer: (item) => formatList(item?.answers?.weakness)
  },
  {
    targetId: "self-awareness:week:2:activity:7:scenario:1",
    activity: 7,
    feedbackIndex: 0,
    activityLabel: "Activity 3 - Scenario 1",
    question: "A friend failed a test and comes to you for support. Which strengths and weaknesses could affect how you help?",
    responseType: "multi_select",
    answer: (item) => formatScenario(item?.answers, 1)
  },
  {
    targetId: "self-awareness:week:2:activity:7:scenario:2",
    activity: 7,
    feedbackIndex: 1,
    activityLabel: "Activity 3 - Scenario 2",
    question: "Your group is struggling to develop a project idea. Which strengths and weaknesses could affect how you contribute?",
    responseType: "multi_select",
    answer: (item) => formatScenario(item?.answers, 2)
  },
  {
    targetId: "self-awareness:week:2:activity:7:scenario:3",
    activity: 7,
    feedbackIndex: 2,
    activityLabel: "Activity 3 - Scenario 3",
    question: "You must represent your house in a sport you dislike. Which strengths and weaknesses could affect how you respond?",
    responseType: "multi_select",
    answer: (item) => formatScenario(item?.answers, 3)
  }
]);

const buildSelfAwarenessWeek2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 2 activities must be an array");
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
    throw new TypeError(`Invalid Self-Awareness Week 2 feedback request: ${error.message}`);
  }
  return value;
};

const applySelfAwarenessWeek2Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 2 activities must be an array");
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

const selfAwarenessWeek2Integration = Object.freeze({
  buildRequest: buildSelfAwarenessWeek2Request,
  applyFeedback: applySelfAwarenessWeek2Feedback
});

module.exports = {
  applySelfAwarenessWeek2Feedback,
  buildSelfAwarenessWeek2Request,
  selfAwarenessWeek2Integration
};
