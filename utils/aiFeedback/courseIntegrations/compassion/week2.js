const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_2_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "compassion",
  courseTitle: "Compassion",
  weekNumber: 2,
  weekTitle: "Self-Compassion",
  guidance: WEEK_2_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "compassion:week:2:page:2": 2,
  "compassion:week:2:page:4": 4
});

const PROMPTS = Object.freeze([
  { id: 1, title: "I feel loved when" },
  { id: 2, title: "I feel cared for when" },
  { id: 3, title: "I need support when" },
  { id: 4, title: "I wish someone would" }
]);

const PROMPT_TARGETS = Object.freeze(Object.fromEntries(
  PROMPTS.map(({ id }) => [`compassion:week:2:page:6:prompt:${id}`, id])
));

const buildCompassionWeek2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Compassion Week 2 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const pageDefinitions = [
    {
      page: 2,
      activityLabel: "Activity 1",
      question: "What do you understand by the word self-compassion?"
    },
    {
      page: 4,
      activityLabel: "Activity 2",
      question: "Write a compassionate letter to yourself about a time you made a mistake and judged yourself without empathy."
    }
  ];
  const targets = pageDefinitions.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = toText(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `compassion:week:2:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: "reflection"
    }];
  });

  const promptActivity = activitiesByPage.get(6);
  if (promptActivity && Array.isArray(promptActivity.answer)) {
    PROMPTS.forEach(({ id, title }, index) => {
      const answerItem = promptActivity.answer.find(
        (item) => Number(item?.id) === id
      );
      const answer = toText(answerItem?.value);
      if (!answer || hasExistingFeedback(answerItem?.feedback)) return;
      targets.push({
        targetId: `compassion:week:2:page:6:prompt:${id}`,
        activityLabel: `Activity 3 - Reflection ${index + 1}`,
        question: `${title}...`,
        answer,
        responseType: "reflection"
      });
    });
  }

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Compassion Week 2 feedback request: ${error.message}`);
  }
  return value;
};

const applyCompassionWeek2Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const pageResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId)
  );
  const promptResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(PROMPT_TARGETS, targetId)
  );
  if (pageResults.length + promptResults.length !== results.length) {
    const unknown = results.find(({ targetId }) =>
      !Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId) &&
      !Object.prototype.hasOwnProperty.call(PROMPT_TARGETS, targetId)
    );
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }

  const updated = applyPageFeedback({
    activities,
    results: pageResults,
    targetPages: TARGET_PAGES
  });
  const feedbackByPrompt = new Map();
  promptResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByPrompt.set(PROMPT_TARGETS[result.targetId], feedback);
  });

  return updated.map((activity) => {
    if (Number(activity?.page) !== 6 || !feedbackByPrompt.size) return activity;
    const answer = Array.isArray(activity.answer)
      ? activity.answer.map((item) => ({ ...item }))
      : [];
    answer.forEach((item) => {
      const feedback = feedbackByPrompt.get(Number(item?.id));
      if (feedback && !hasExistingFeedback(item.feedback)) item.feedback = feedback;
    });
    return { ...activity, answer };
  });
};

const compassionWeek2Integration = Object.freeze({
  buildRequest: buildCompassionWeek2Request,
  applyFeedback: applyCompassionWeek2Feedback
});

module.exports = {
  applyCompassionWeek2Feedback,
  buildCompassionWeek2Request,
  compassionWeek2Integration
};
