const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_5_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "self-awareness",
  courseTitle: "Self-Awareness",
  weekNumber: 5,
  weekTitle: "Understanding Emotional Intelligence",
  guidance: WEEK_5_GUIDANCE
});

const SCENARIOS = Object.freeze([
  "Sarah and Alex disagree about a group project, and Alex feels sidelined.",
  "Jack is pressured by peers to skip class for an off-campus party.",
  "James feels embarrassed and defensive after feedback about his presentation delivery.",
  "Tom feels overwhelmed by schoolwork and family issues and has become quiet and tired.",
  "Emily feels disappointed and rejected after not getting a part in the school play."
]);

const TARGETS = Object.freeze({
  "self-awareness:week:5:activity:2": { activity: 2, feedbackIndex: 0 },
  ...Object.fromEntries(SCENARIOS.map((_, index) => [
    `self-awareness:week:5:activity:6:scenario:${index + 1}`,
    { activity: 6, feedbackIndex: index }
  ]))
});

const getFeedback = (activity, index) =>
  Array.isArray(activity?.feedback) ? activity.feedback[index] : undefined;

const formatScenarioAnswer = (answers, index) => {
  if (!answers || typeof answers !== "object") return "";
  const will = toText(answers.IWill?.[index]);
  const willNot = toText(answers.IWillNot?.[index]);
  return will && willNot ? `I will: ${will}\nI will not: ${willNot}` : "";
};

const buildSelfAwarenessWeek5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Self-Awareness Week 5 activities must be an array");
  const byActivity = new Map(activities.map((item) => [Number(item?.activity), item]));
  const targets = [];
  const reflection = byActivity.get(2);
  const reflectionAnswer = toText(reflection?.answers?.[0]);
  if (reflection && reflectionAnswer && !hasExistingFeedback(getFeedback(reflection, 0))) {
    targets.push({
      targetId: "self-awareness:week:5:activity:2",
      activityLabel: "Activity 1",
      question: "What do you understand by emotional intelligence?",
      answer: reflectionAnswer,
      responseType: "reflection"
    });
  }
  const scenarioActivity = byActivity.get(6);
  SCENARIOS.forEach((scenario, index) => {
    const answer = formatScenarioAnswer(scenarioActivity?.answers, index);
    if (!scenarioActivity || !answer || hasExistingFeedback(getFeedback(scenarioActivity, index))) return;
    targets.push({
      targetId: `self-awareness:week:5:activity:6:scenario:${index + 1}`,
      activityLabel: `Activity 3 - Scenario ${index + 1}`,
      question: scenario,
      answer,
      responseType: "multi_step"
    });
  });
  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Self-Awareness Week 5 feedback request: ${error.message}`);
  return value;
};

const applySelfAwarenessWeek5Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) throw new TypeError("Self-Awareness Week 5 activities must be an array");
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

const selfAwarenessWeek5Integration = Object.freeze({ buildRequest: buildSelfAwarenessWeek5Request, applyFeedback: applySelfAwarenessWeek5Feedback });
module.exports = { applySelfAwarenessWeek5Feedback, buildSelfAwarenessWeek5Request, selfAwarenessWeek5Integration };
