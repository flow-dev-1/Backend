const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_1_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "compassion",
  courseTitle: "Compassion",
  weekNumber: 1,
  weekTitle: "Introduction to Compassion",
  guidance: WEEK_1_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "compassion:week:1:page:2": 2,
  "compassion:week:1:page:4": 4
});

const RESPONSE_TYPES = Object.freeze(["Seeing", "Caring", "Doing"]);
const SCENARIOS = Object.freeze([
  {
    stepId: 2,
    title: "A classmate is sitting alone at lunch, looking sad, and has not touched their food.",
    questions: [
      "What do you notice about the situation?",
      "What do you think your classmate might be feeling?",
      "What could you do to show compassion?"
    ]
  },
  {
    stepId: 3,
    title: "A new student looks lost and unsure while trying to find their way around the school.",
    questions: [
      "What do you notice about the situation?",
      "What do you think the new student might be feeling?",
      "What could you do to show compassion?"
    ]
  },
  {
    stepId: 4,
    title: "Your friend studied hard but did not do well on a test and seems disappointed.",
    questions: [
      "What do you notice about the situation?",
      "What do you think your friend might be feeling?",
      "What could you do to show compassion?"
    ]
  },
  {
    stepId: 5,
    title: "A group excludes a student from a game during recess, and the student stands alone looking sad.",
    questions: [
      "What do you notice about the situation?",
      "What do you think the student might be feeling?",
      "What could you do to show compassion?"
    ]
  },
  {
    stepId: 6,
    title: "A classmate is teased for a presentation mistake, appears embarrassed, and avoids eye contact.",
    questions: [
      "What do you notice about the situation?",
      "What do you think your classmate might be feeling?",
      "What could you do to show compassion?"
    ]
  }
]);

const SCENARIO_TARGETS = Object.freeze(
  Object.fromEntries(
    SCENARIOS.flatMap((scenario) => scenario.questions.map((_, responseIndex) => [
      `compassion:week:1:page:6:step:${scenario.stepId}:response:${responseIndex}`,
      { stepId: scenario.stepId, responseIndex }
    ]))
  )
);

const hasScenarioFeedback = (answerItem, responseIndex) =>
  Boolean(toText(answerItem?.feedback?.[responseIndex]));

const buildCompassionWeek1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Compassion Week 1 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = [
    {
      page: 2,
      activityLabel: "Activity 1",
      question: "What do you understand by the word compassion?",
      responseType: "reflection"
    },
    {
      page: 4,
      activityLabel: "Activity 2",
      question: "What do you understand by the word theory?",
      responseType: "reflection"
    }
  ].flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = toText(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `compassion:week:1:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const scenarioActivity = activitiesByPage.get(6);
  if (scenarioActivity && Array.isArray(scenarioActivity.answer)) {
    SCENARIOS.forEach((scenario, scenarioIndex) => {
      const answerItem = scenarioActivity.answer.find(
        (item) => Number(item?.stepId) === scenario.stepId
      );
      if (!answerItem) return;
      scenario.questions.forEach((question, responseIndex) => {
        const answer = toText(answerItem.value?.[responseIndex]);
        if (!answer || hasScenarioFeedback(answerItem, responseIndex)) return;
        targets.push({
          targetId: `compassion:week:1:page:6:step:${scenario.stepId}:response:${responseIndex}`,
          activityLabel: `Activity 3 - Scenario ${scenarioIndex + 1} - ${RESPONSE_TYPES[responseIndex]}`,
          question: `${scenario.title}\n${RESPONSE_TYPES[responseIndex]}: ${question}`,
          answer,
          responseType: "reflection"
        });
      });
    });
  }

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Compassion Week 1 feedback request: ${error.message}`);
  }
  return value;
};

const applyCompassionWeek1Feedback = ({ activities, response }) => {
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
  const feedbackByStep = new Map();
  scenarioResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    const { stepId, responseIndex } = SCENARIO_TARGETS[result.targetId];
    if (!feedbackByStep.has(stepId)) feedbackByStep.set(stepId, new Map());
    feedbackByStep.get(stepId).set(responseIndex, feedback);
  });

  return updated.map((activity) => {
    if (Number(activity?.page) !== 6 || !feedbackByStep.size) return activity;
    const answer = Array.isArray(activity.answer)
      ? activity.answer.map((item) => ({
        ...item,
        value: item?.value && typeof item.value === "object" ? { ...item.value } : item?.value,
        feedback: item?.feedback && typeof item.feedback === "object"
          ? { ...item.feedback }
          : undefined
      }))
      : [];
    answer.forEach((item) => {
      const stepFeedback = feedbackByStep.get(Number(item?.stepId));
      if (!stepFeedback) return;
      const feedback = item.feedback || {};
      stepFeedback.forEach((value, responseIndex) => {
        if (!toText(feedback[responseIndex])) feedback[responseIndex] = value;
      });
      item.feedback = feedback;
    });
    return { ...activity, answer };
  });
};

const compassionWeek1Integration = Object.freeze({
  buildRequest: buildCompassionWeek1Request,
  applyFeedback: applyCompassionWeek1Feedback
});

module.exports = {
  applyCompassionWeek1Feedback,
  buildCompassionWeek1Request,
  compassionWeek1Integration
};
