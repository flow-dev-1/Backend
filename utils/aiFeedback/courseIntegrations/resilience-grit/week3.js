const { validateGenerationRequest } = require("../../contracts");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_3_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "resilience-grit",
  courseTitle: "Resilience and Grit",
  weekNumber: 3,
  weekTitle: "Understanding Adaptability and Its Application",
  guidance: WEEK_3_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "resilience-grit:week:3:page:2": 2,
  "resilience-grit:week:3:page:4": 4
});

const SORT_STATEMENTS = Object.freeze([
  "Ability to adjust to new situations, changes, or challenges.",
  "Expecting everything to stay the same and becoming frustrated when it does not.",
  "Adaptability does not mean having to like change all the time.",
  "Sticking to one approach even when it is not working.",
  "Staying calm, thinking through the situation, and making a new plan.",
  "Refusing to try new things because they seem too hard.",
  "Being open to new approaches when plans change.",
  "Avoiding change or pretending it is not happening.",
  "Knowing how to handle change when it happens.",
  "Panicking when something unexpected happens."
]);

const SCENARIOS = Object.freeze([
  "You feel overwhelmed by upcoming assignments and exams and are unsure how to manage them.",
  "A friend is going through a difficult time and you choose to listen and offer support.",
  "You kept practising guitar through early difficulty and now feel proud of your progress.",
  "You do not know an outcome, but focus on what you can do and how you can manage your emotions.",
  "You help organise a local charity event and make a positive contribution."
]);

const SCENARIO_TARGETS = Object.freeze(
  Object.fromEntries(SCENARIOS.map((_, index) => [
    `resilience-grit:week:3:page:5:scenario:${index + 1}`,
    index + 1
  ]))
);

const formatSortAnswer = (answer) => {
  if (!answer || typeof answer !== "object") return "";
  const format = (label, indices) => {
    const values = Array.isArray(indices)
      ? indices.map((index) => SORT_STATEMENTS[Number(index)]).filter(Boolean)
      : [];
    return values.length ? `${label}: ${values.join(" | ")}` : "";
  };
  return [
    format("Adaptability", answer.green),
    format("Not adaptability", answer.red)
  ].filter(Boolean).join("\n");
};

const hasScenarioFeedback = (activity, feedbackStepId) =>
  Array.isArray(activity?.feedback) && activity.feedback.some(
    (item) => Number(item?.stepId) === feedbackStepId && Boolean(toText(item?.value))
  );

const buildResilienceGritWeek3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Resilience and Grit Week 3 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = [
    {
      page: 2,
      activityLabel: "Activity 1",
      question: "What do you understand by the word adaptability?",
      answer: toText,
      responseType: "reflection"
    },
    {
      page: 4,
      activityLabel: "Activity 2",
      question: "Sort the statements into adaptability and not adaptability.",
      answer: formatSortAnswer,
      responseType: "drag_and_drop"
    }
  ].flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = definition.answer(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `resilience-grit:week:3:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const scenarioActivity = activitiesByPage.get(5);
  if (scenarioActivity && Array.isArray(scenarioActivity.answer)) {
    SCENARIOS.forEach((question, index) => {
      const feedbackStepId = index + 1;
      const answerItem = scenarioActivity.answer[index] ||
        scenarioActivity.answer.find((item) => Number(item?.stepId) === index + 2);
      const answer = toText(answerItem?.value);
      if (!answer || hasScenarioFeedback(scenarioActivity, feedbackStepId)) return;
      targets.push({
        targetId: `resilience-grit:week:3:page:5:scenario:${feedbackStepId}`,
        activityLabel: `Activity 3 - Scenario ${feedbackStepId}`,
        question: `${question}\nHow would you adapt in this situation?`,
        answer,
        responseType: "reflection"
      });
    });
  }

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(
      `Invalid Resilience and Grit Week 3 feedback request: ${error.message}`
    );
  }
  return value;
};

const applyResilienceGritWeek3Feedback = ({ activities, response }) => {
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
  const generated = new Map();
  scenarioResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = toText(result.feedback);
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid feedback result for target: ${result.targetId}`);
    }
    generated.set(SCENARIO_TARGETS[result.targetId], feedback);
  });

  return updated.map((activity) => {
    if (Number(activity?.page) !== 5 || !generated.size) return activity;
    const feedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];
    generated.forEach((value, stepId) => {
      if (feedback.some((item) => Number(item?.stepId) === stepId && toText(item?.value))) {
        return;
      }
      const existing = feedback.find((item) => Number(item?.stepId) === stepId);
      if (existing) existing.value = value;
      else feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const resilienceGritWeek3Integration = Object.freeze({
  buildRequest: buildResilienceGritWeek3Request,
  applyFeedback: applyResilienceGritWeek3Feedback
});

module.exports = {
  applyResilienceGritWeek3Feedback,
  buildResilienceGritWeek3Request,
  resilienceGritWeek3Integration
};
