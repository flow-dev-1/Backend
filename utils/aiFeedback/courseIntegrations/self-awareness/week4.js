const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_4_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "self-awareness",
  courseTitle: "Self-Awareness",
  weekNumber: 4,
  weekTitle: "Understanding Values",
  guidance: WEEK_4_GUIDANCE
});

const TARGETS = Object.freeze({
  "self-awareness:week:4:activity:2": { activity: 2, feedbackIndex: 0 },
  "self-awareness:week:4:activity:4": { activity: 4, feedbackIndex: 0 },
  "self-awareness:week:4:activity:6:people": { activity: 6, feedbackIndex: 0 },
  "self-awareness:week:4:activity:6:perspectives": { activity: 6, feedbackIndex: 1 },
  "self-awareness:week:4:activity:6:reflection": { activity: 6, feedbackIndex: 2 },
  "self-awareness:week:4:activity:8": { activity: 8, feedbackIndex: 0 }
});

const getFeedback = (activity, index) =>
  Array.isArray(activity?.feedback) ? activity.feedback[index] : undefined;

const formatList = (items) =>
  Array.isArray(items) ? items.map(toText).filter(Boolean).join(", ") : "";

const formatAnswerGroup = (answers, index, label) => {
  const group = answers?.[index];
  if (!group || typeof group !== "object") return "";
  const values = [group.q1, group.q2, group.q3].map(toText).filter(Boolean);
  if (values.length !== 3) return "";
  return values.map((value, itemIndex) => `${label} ${itemIndex + 1}: ${value}`).join("\n");
};

const DEFINITIONS = Object.freeze([
  ["self-awareness:week:4:activity:2", 2, 0, "Activity 1", "What are values, and why are they important?", "reflection", (a) => toText(a?.answers?.[0])],
  ["self-awareness:week:4:activity:4", 4, 0, "Activity 2", "Select the values that are a big part of who you are.", "multi_select", (a) => formatList(a?.answers)],
  ["self-awareness:week:4:activity:6:people", 6, 0, "Activity 3 - Important People", "Identify three important people in your life.", "multi_step", (a) => formatAnswerGroup(a?.answers, 0, "Person")],
  ["self-awareness:week:4:activity:6:perspectives", 6, 1, "Activity 3 - Their Perspectives", "What do these three people think about you?", "multi_step", (a) => formatAnswerGroup(a?.answers, 1, "Perspective")],
  ["self-awareness:week:4:activity:6:reflection", 6, 2, "Activity 3 - Your Reflection", "Are you happy with what these people think about you, and what would you like to change?", "multi_step", (a) => formatAnswerGroup(a?.answers, 2, "Reflection")],
  ["self-awareness:week:4:activity:8", 8, 0, "Activity 4", "Identify four core values that resonate with you most.", "multi_select", (a) => formatList(a?.answers)]
].map(([targetId, activity, feedbackIndex, activityLabel, question, responseType, answer]) =>
  Object.freeze({ targetId, activity, feedbackIndex, activityLabel, question, responseType, answer })
));

const buildSelfAwarenessWeek4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Self-Awareness Week 4 activities must be an array");
  const byActivity = new Map(activities.map((item) => [Number(item?.activity), item]));
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = byActivity.get(definition.activity);
    const answer = definition.answer(activity);
    if (!activity || !answer || hasExistingFeedback(getFeedback(activity, definition.feedbackIndex))) return [];
    return [{ targetId: definition.targetId, activityLabel: definition.activityLabel, question: definition.question, answer, responseType: definition.responseType }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Self-Awareness Week 4 feedback request: ${error.message}`);
  return value;
};

const applySelfAwarenessWeek4Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) throw new TypeError("Self-Awareness Week 4 activities must be an array");
  if (!Array.isArray(response?.results)) throw new TypeError("Feedback results must be an array");
  const generated = new Map();
  response.results.forEach((result) => {
    const target = TARGETS[result?.targetId];
    if (!target) throw new TypeError(`Unknown feedback target: ${result?.targetId}`);
    if (result.status === "skipped") return;
    const feedback = toText(result.feedback);
    if (result.status !== "ready" || !feedback) throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    if (!generated.has(target.activity)) generated.set(target.activity, new Map());
    generated.get(target.activity).set(target.feedbackIndex, feedback);
  });
  return activities.map((activity) => {
    const entries = generated.get(Number(activity?.activity));
    if (!entries) return activity;
    const feedback = Array.isArray(activity.feedback) ? [...activity.feedback] : [];
    entries.forEach((value, index) => { if (!hasExistingFeedback(feedback[index])) feedback[index] = value; });
    return { ...activity, feedback };
  });
};

const selfAwarenessWeek4Integration = Object.freeze({ buildRequest: buildSelfAwarenessWeek4Request, applyFeedback: applySelfAwarenessWeek4Feedback });

module.exports = { applySelfAwarenessWeek4Feedback, buildSelfAwarenessWeek4Request, selfAwarenessWeek4Integration };
