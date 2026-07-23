const { validateGenerationRequest } = require("../../contracts");
const { toText } = require("../shared/normalizers");
const { WEEK_3_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "emotional-regulation",
  courseTitle: "Emotional Regulation",
  weekNumber: 3,
  weekTitle: "The SONAR of Emotional Regulation",
  guidance: WEEK_3_GUIDANCE
});

const SCENARIOS = Object.freeze([
  {
    stepId: 2,
    title: "You feel really nervous because you have to give a presentation in class.",
    keys: ["S1", "O1", "N1", "A1", "R1"]
  },
  {
    stepId: 3,
    title: "You feel super excited and cannot sit still during a fun class project.",
    keys: ["S2", "O2", "N2", "A2", "R2"]
  }
]);

const SONAR_LABELS = Object.freeze(["Stop", "Observe", "Name", "Accept", "Regulate"]);
const STEP_TARGETS = Object.freeze(Object.fromEntries(SCENARIOS.map(({ stepId }) => [
  `emotional-regulation:week:3:page:2:step:${stepId}`,
  { page: 2, stepId }
])));

const formatScenario = (answer, keys) => {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return "";
  return keys.map((key, index) => {
    const value = toText(answer[key]);
    return value ? `${SONAR_LABELS[index]}: ${value}` : "";
  }).filter(Boolean).join("\n");
};

const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) =>
    Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value))
  );

const buildEmotionalRegulationWeek3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Emotional Regulation Week 3 activities must be an array");
  }
  const activity = activities.find((item) => Number(item?.page) === 2);
  if (!activity) return null;

  const targets = SCENARIOS.flatMap((scenario, index) => {
    const answer = formatScenario(activity.answer, scenario.keys);
    if (!answer || hasStepFeedback(activity.feedback, scenario.stepId)) return [];
    return [{
      targetId: `emotional-regulation:week:3:page:2:step:${scenario.stepId}`,
      activityLabel: `Activity 1 - Scenario ${index + 1}`,
      question: `${scenario.title}\nEvaluate how the learner applied the five SONAR steps.`,
      answer,
      responseType: "multi_step"
    }];
  });

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Emotional Regulation Week 3 feedback request: ${error.message}`);
  }
  return value;
};

const applyEmotionalRegulationWeek3Feedback = ({ activities, response }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Emotional Regulation Week 3 activities must be an array");
  }
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");

  const feedbackByStep = new Map();
  results.forEach((result) => {
    const target = STEP_TARGETS[result.targetId];
    if (!target) throw new TypeError(`Unknown feedback target: ${result.targetId}`);
    if (result.status === "skipped") return;
    const feedback = toText(result.feedback);
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByStep.set(target.stepId, feedback);
  });

  return activities.map((activity) => {
    if (Number(activity?.page) !== 2 || !feedbackByStep.size) return activity;
    const feedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];
    feedbackByStep.forEach((value, stepId) => {
      const existing = feedback.find((item) => Number(item?.stepId) === stepId);
      if (existing) existing.value = value;
      else feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const emotionalRegulationWeek3Integration = Object.freeze({
  buildRequest: buildEmotionalRegulationWeek3Request,
  applyFeedback: applyEmotionalRegulationWeek3Feedback
});

module.exports = {
  applyEmotionalRegulationWeek3Feedback,
  buildEmotionalRegulationWeek3Request,
  emotionalRegulationWeek3Integration
};
