const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");

const CONTEXT = Object.freeze({
  courseKey: "transition-2",
  courseTitle: "Transition 2",
  weekNumber: 3,
  weekTitle: "Social and Financial Intelligence"
});

const TARGET_PAGES = Object.freeze({
  "transition-2:week:3:page:2": 2,
  "transition-2:week:3:page:4": 4,
  "transition-2:week:3:page:8": 8,
  "transition-2:week:3:page:10": 10,
  "transition-2:week:3:page:12": 12
});

const RELATIONSHIP_SCENARIOS = Object.freeze([
  "Tola reminds you about your class project deadline and offers to proofread your work.",
  "Amarachi gets upset when you study instead of hanging out and calls you boring.",
  "David celebrates your wins and motivates you when things get hard.",
  "Sarah constantly compares your grades, clothes, and social media followers to hers.",
  "Jide checks in when you are stressed and listens without judging.",
  "Lola only reaches out when she needs notes, data, or assignment help.",
  "Chika respects your boundaries when you need to leave early or recharge.",
  "Ben spreads rumours or talks about people behind their backs.",
  "Ada encourages you to join a club or apply for a leadership role.",
  "Kene teases you about your goals and says you are trying too hard."
]);

const SCENARIO_TARGETS = Object.freeze(
  Object.fromEntries(
    RELATIONSHIP_SCENARIOS.map((_, index) => [
      `transition-2:week:3:page:6:step:${index + 1}`,
      index + 1
    ])
  )
);

const BUDGET_ITEMS = Object.freeze([
  "Hostel rent",
  "Netflix subscription",
  "Groceries",
  "New sneakers",
  "Data plan",
  "Weekend hangout",
  "Emergency fund",
  "Course textbook",
  "Birthday gift for a friend",
  "Savings for laptop plan"
]);

const formatRating = (answer) => {
  const value = toText(answer);
  return value ? `${value} out of 10` : "";
};

const formatIndexedSelection = (answer, options) => {
  if (typeof answer === "string") return toText(answer);
  if (!answer || typeof answer !== "object") return "";
  const directValue = toText(answer.value);
  if (directValue) return directValue;
  return toText(options[Number(answer.selectedOption)]);
};

const formatRelationshipChoice = (value) => value === "A"
  ? "Supportive Friend"
  : value === "B"
    ? "Draining Friend"
    : toText(value);

const hasScenarioFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) => Number(item?.stepId) === Number(stepId) && toText(item?.value));

const formatBudget = (answer) => {
  if (!answer) return "";
  const bucketAnswer = Array.isArray(answer)
    ? answer.find((item) => Number(item?.stepId) === 2)?.value
    : answer?.value || answer;
  if (!bucketAnswer || typeof bucketAnswer !== "object") return "";

  const formatBucket = (bucket) => (Array.isArray(bucketAnswer[bucket])
    ? bucketAnswer[bucket]
      .map((index) => BUDGET_ITEMS[Number(index)])
      .filter(Boolean)
    : []);
  const needs = formatBucket("orange");
  const wants = formatBucket("pink");
  const savings = formatBucket("red");
  const parts = [];

  if (needs.length) parts.push(`Needs: ${needs.join(", ")}`);
  if (wants.length) parts.push(`Wants: ${wants.join(", ")}`);
  if (savings.length) parts.push(`Savings: ${savings.join(", ")}`);
  return parts.join("\n");
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "On a rating from 1 to 10, how important are relationships and money to your university experience?",
    responseType: "single_select",
    formatAnswer: formatRating
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "If you spend time with people who always skip lectures or complain, what is likely to happen?",
    responseType: "single_select",
    formatAnswer: (answer) => formatIndexedSelection(answer, [
      "I will probably start doing the same",
      "I will try to stay focused"
    ])
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "Honestly, are you a supportive or draining friend right now? Rate yourself.",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "Looking at Amy's spending, which bucket received most of her money?",
    responseType: "single_select",
    formatAnswer: (answer) => formatIndexedSelection(answer, [
      "Needs.",
      "Wants.",
      "Savings."
    ])
  },
  {
    page: 12,
    activityLabel: "Activity 6",
    question: "Allocate the listed expenses into Needs, Wants, and Savings buckets.",
    responseType: "drag_and_drop",
    formatAnswer: formatBudget
  }
]);

const buildTransition2Week3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Transition 2 Week 3 activities must be an array");
  }

  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    if (!activity || hasExistingFeedback(activity.feedback)) return [];

    const answer = definition.formatAnswer(activity.answer);
    if (!answer) return [];

    return [{
      targetId: `transition-2:week:3:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const scenarioActivity = activitiesByPage.get(6);
  if (scenarioActivity && Array.isArray(scenarioActivity.answer)) {
    scenarioActivity.answer.forEach((item) => {
      const stepId = Number(item?.stepId);
      const scenario = RELATIONSHIP_SCENARIOS[stepId - 1];
      const answer = formatRelationshipChoice(item?.value);
      if (!scenario || !answer || hasScenarioFeedback(scenarioActivity.feedback, stepId)) {
        return;
      }

      targets.push({
        targetId: `transition-2:week:3:page:6:step:${stepId}`,
        activityLabel: `Activity 3 - Scenario ${stepId}`,
        question: `Classify this friendship scenario as supportive or draining and give feedback specific to the behaviour described.\nScenario ${stepId}: ${scenario}`,
        answer,
        responseType: "single_select"
      });
    });
  }

  if (!targets.length) return null;

  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Transition 2 Week 3 feedback request: ${error.message}`);
  }
  return value;
};

const applyTransition2Week3Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");

  const pageResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId)
  );
  const scenarioResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(SCENARIO_TARGETS, targetId)
  );
  if (pageResults.length + scenarioResults.length !== results.length) {
    const unknown = results.find(({ targetId }) =>
      !Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId) &&
      !Object.prototype.hasOwnProperty.call(SCENARIO_TARGETS, targetId)
    );
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }

  const updated = applyPageFeedback({
    activities,
    results: pageResults,
    targetPages: TARGET_PAGES
  });

  if (!scenarioResults.length) return updated;
  const feedbackByStep = new Map();
  scenarioResults.forEach((result) => {
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status === "skipped") return;
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByStep.set(SCENARIO_TARGETS[result.targetId], feedback);
  });

  return updated.map((activity) => {
    if (Number(activity?.page) !== 6 || !feedbackByStep.size) return activity;
    const existingFeedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];
    feedbackByStep.forEach((value, stepId) => {
      if (!hasScenarioFeedback(existingFeedback, stepId)) {
        existingFeedback.push({ stepId, value });
      }
    });
    return { ...activity, feedback: existingFeedback };
  });
};

const transition2Week3Integration = Object.freeze({
  buildRequest: buildTransition2Week3Request,
  applyFeedback: applyTransition2Week3Feedback
});

module.exports = {
  applyTransition2Week3Feedback,
  buildTransition2Week3Request,
  transition2Week3Integration
};
