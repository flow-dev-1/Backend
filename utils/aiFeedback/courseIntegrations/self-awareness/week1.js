const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_1_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "self-awareness",
  courseTitle: "Self-Awareness",
  weekNumber: 1,
  weekTitle: "Introduction to Self-Awareness",
  guidance: WEEK_1_GUIDANCE
});

const TARGETS = Object.freeze({
  "self-awareness:week:1:activity:2": { activity: 2, feedbackIndex: 0 },
  "self-awareness:week:1:activity:4": { activity: 4, feedbackIndex: 0 },
  "self-awareness:week:1:activity:6": { activity: 6, feedbackIndex: 0 },
  "self-awareness:week:1:activity:8": { activity: 8, feedbackIndex: 0 },
  "self-awareness:week:1:activity:14:reflection:agree": {
    activity: 14,
    feedbackIndex: 0
  },
  "self-awareness:week:1:activity:14:reflection:match": {
    activity: 14,
    feedbackIndex: 1
  },
  "self-awareness:week:1:activity:14:reflection:difference": {
    activity: 14,
    feedbackIndex: 2
  }
});

const getFeedback = (activity, index) =>
  Array.isArray(activity?.feedback) ? activity.feedback[index] : undefined;

const formatBuckets = (activity) => {
  const buckets = activity?.buckets;
  if (!buckets || typeof buckets !== "object") return "";
  return ["yes", "no", "sometimes"]
    .map((key) => {
      const statements = Array.isArray(buckets[key])
        ? buckets[key].map((item) => toText(item?.content ?? item)).filter(Boolean)
        : [];
      return statements.length
        ? `${key[0].toUpperCase()}${key.slice(1)}: ${statements.join(" | ")}`
        : "";
    })
    .filter(Boolean)
    .join("\n");
};

const findReflection = (activity, questionText) => {
  const answers = Array.isArray(activity?.answers) ? activity.answers : [];
  return toText(
    answers.find((item) => item?.questionText === questionText)?.answer
  );
};

const DEFINITIONS = Object.freeze([
  {
    targetId: "self-awareness:week:1:activity:2",
    activity: 2,
    activityLabel: "Activity 1",
    question: "What do you think self-awareness is?",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[0])
  },
  {
    targetId: "self-awareness:week:1:activity:4",
    activity: 4,
    activityLabel: "Activity 2",
    question: "What do you understand by the word personality?",
    responseType: "reflection",
    answer: (item) => toText(item?.answers?.[0])
  },
  {
    targetId: "self-awareness:week:1:activity:6",
    activity: 6,
    activityLabel: "Activity 3",
    question: "Sort the personality-trait statements into Yes, No, or Sometimes.",
    responseType: "drag_and_drop",
    answer: formatBuckets
  },
  {
    targetId: "self-awareness:week:1:activity:8",
    activity: 8,
    activityLabel: "Activity 4",
    question: "Which personality colour describes you, and why?",
    responseType: "reflection",
    answer: (item) => {
      const colour = toText(item?.answer?.selectedPersonality);
      const explanation = toText(item?.answer?.explanation);
      return colour && explanation
        ? `Selected personality colour: ${colour}\nExplanation: ${explanation}`
        : "";
    }
  },
  {
    targetId: "self-awareness:week:1:activity:14:reflection:agree",
    activity: 14,
    feedbackIndex: 0,
    activityLabel: "Activity 6 - Test Result Agreement",
    question: "Do you agree with this new personality-colour result?",
    responseType: "reflection",
    answer: (item) => findReflection(item, "Do you agree with this new result?")
  },
  {
    targetId: "self-awareness:week:1:activity:14:reflection:match",
    activity: 14,
    feedbackIndex: 1,
    activityLabel: "Activity 6 - Result Comparison",
    question: "Did you get the same colour as the colour you identified for yourself earlier?",
    responseType: "reflection",
    answer: (item) => findReflection(
      item,
      "Did you get the same color as the color you identified for yourself earlier?"
    )
  },
  {
    targetId: "self-awareness:week:1:activity:14:reflection:difference",
    activity: 14,
    feedbackIndex: 2,
    activityLabel: "Activity 6 - Result Difference",
    question: "What was different, and why do you think it was different?",
    responseType: "reflection",
    answer: (item) => findReflection(
      item,
      "What was different? Why do you think this was different?"
    )
  }
]);

const buildSelfAwarenessWeek1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 1 activities must be an array");
  }
  const byActivity = new Map(
    activities.map((item) => [Number(item?.activity), item])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = byActivity.get(definition.activity);
    const feedbackIndex = definition.feedbackIndex ?? 0;
    const answer = definition.answer(activity);
    if (
      !activity ||
      !answer ||
      hasExistingFeedback(getFeedback(activity, feedbackIndex))
    ) return [];
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
    throw new TypeError(`Invalid Self-Awareness Week 1 feedback request: ${error.message}`);
  }
  return value;
};

const applySelfAwarenessWeek1Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Self-Awareness Week 1 activities must be an array");
  }
  const results = response?.results;
  if (!Array.isArray(results)) {
    throw new TypeError("Feedback results must be an array");
  }

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

const selfAwarenessWeek1Integration = Object.freeze({
  buildRequest: buildSelfAwarenessWeek1Request,
  applyFeedback: applySelfAwarenessWeek1Feedback
});

module.exports = {
  applySelfAwarenessWeek1Feedback,
  buildSelfAwarenessWeek1Request,
  selfAwarenessWeek1Integration
};
