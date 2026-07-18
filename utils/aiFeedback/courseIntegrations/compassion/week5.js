const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_5_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "compassion",
  courseTitle: "Compassion",
  weekNumber: 5,
  weekTitle: "Life Scenarios - Let's Wear the Shoes of Others",
  guidance: WEEK_5_GUIDANCE
});

const SCENARIOS = Object.freeze([
  {
    id: 1,
    title: "Friend forgot homework",
    question: "Your friend forgot their homework and is upset. What would you do?",
    options: {
      A: "Acknowledge they are upset but offer no further help.",
      B: "Acknowledge their worry, share notes, and help them prepare for class discussion.",
      C: "Offer to go with them to explain the situation to the teacher."
    }
  },
  {
    id: 3,
    title: "Sibling was rude to a waiter",
    question: "Your sibling is rude to a waiter during a family dinner. What would you do?",
    options: {
      A: "Apologise to the waiter and thank them for their service.",
      B: "Ignore the situation.",
      C: "Suggest leaving a generous tip."
    }
  },
  {
    id: 5,
    title: "Nervous new student",
    question: "A new student is nervous about joining others to play. What would you do?",
    options: {
      A: "Invite him and introduce him while allowing him to choose.",
      B: "Decide it is not your responsibility.",
      C: "Pull him into the game without permission."
    }
  },
  {
    id: 7,
    title: "Friend failed a test",
    question: "Your friend failed a test while you scored the highest. What would you do?",
    options: {
      A: "Brag and criticise their preparation.",
      B: "Ignore their feelings and celebrate.",
      C: "Encourage them and offer study help."
    }
  }
]);

const TARGETS = Object.freeze(Object.fromEntries(
  SCENARIOS.map(({ id }) => [`compassion:week:5:page:2:scenario:${id}`, id])
));

const buildCompassionWeek5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Compassion Week 5 activities must be an array");
  const activity = activities.find((item) => Number(item?.page) === 2);
  if (!activity || !Array.isArray(activity.answer)) return null;
  const targets = SCENARIOS.flatMap((scenario, index) => {
    const answerItem = activity.answer.find((item) => Number(item?.id) === scenario.id);
    const choice = toText(answerItem?.value);
    if (!choice || hasExistingFeedback(answerItem?.feedback)) return [];
    return [{
      targetId: `compassion:week:5:page:2:scenario:${scenario.id}`,
      activityLabel: `Activity 1 - Scenario ${index + 1}: ${scenario.title}`,
      question: `${scenario.question}\nSelected option ${choice}: ${scenario.options[choice] || "Unknown option"}`,
      answer: choice,
      responseType: "single_select"
    }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Compassion Week 5 feedback request: ${error.message}`);
  return value;
};

const applyCompassionWeek5Feedback = ({ activities, response }) => {
  if (!Array.isArray(response?.results)) throw new TypeError("Feedback results must be an array");
  const feedbackByScenario = new Map();
  response.results.forEach((result) => {
    const scenarioId = TARGETS[result.targetId];
    if (!scenarioId) throw new TypeError(`Unknown feedback target: ${result.targetId}`);
    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByScenario.set(scenarioId, feedback);
  });
  return activities.map((activity) => {
    if (Number(activity?.page) !== 2) return activity;
    const answer = Array.isArray(activity.answer) ? activity.answer.map((item) => ({ ...item })) : [];
    answer.forEach((item) => {
      const feedback = feedbackByScenario.get(Number(item?.id));
      if (feedback && !hasExistingFeedback(item.feedback)) item.feedback = feedback;
    });
    return { ...activity, answer };
  });
};

const compassionWeek5Integration = Object.freeze({
  buildRequest: buildCompassionWeek5Request,
  applyFeedback: applyCompassionWeek5Feedback
});

module.exports = {
  applyCompassionWeek5Feedback,
  buildCompassionWeek5Request,
  compassionWeek5Integration
};
