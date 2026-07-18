const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");

const CONTEXT = Object.freeze({
  courseKey: "transition-2",
  courseTitle: "Transition 2",
  weekNumber: 5,
  weekTitle: "Goal Setting and Resilience"
});

const TARGET_PAGES = Object.freeze({
  "transition-2:week:5:page:2": 2,
  "transition-2:week:5:page:4": 4,
  "transition-2:week:5:page:6": 6
});

const STEP_TARGETS = Object.freeze({
  "transition-2:week:5:page:8:step:1": { page: 8, stepId: 1 },
  "transition-2:week:5:page:8:step:2": { page: 8, stepId: 2 }
});

const SMART_LABELS = Object.freeze([
  "Specific",
  "Measurable",
  "Achievable",
  "Relevant",
  "Time-bound"
]);

const formatList = (answer) => Array.isArray(answer)
  ? answer.map((item) => toText(item?.value)).filter(Boolean)
    .map((value, index) => `${index + 1}. ${value}`).join("\n")
  : "";

const formatSmart = (value) => {
  if (!value || typeof value !== "object") return "";
  return Object.values(value).map((answer, index) => {
    const text = toText(answer);
    return text ? `${SMART_LABELS[index] || `Item ${index + 1}`}: ${text}` : "";
  }).filter(Boolean).join("\n");
};

const getStepAnswer = (answer, stepId) => Array.isArray(answer)
  ? answer.find((item) => Number(item?.stepId) === Number(stepId))?.value
  : undefined;

const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) =>
    Number(item?.stepId) === Number(stepId) && toText(item?.value)
  );

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What challenges might you deal with as a first-year student?",
    responseType: "multi_step",
    formatAnswer: formatList
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "Which coping skill would help you most at university, and why?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Write what each letter in SMART stands for.",
    responseType: "multi_step",
    formatAnswer: (answer) => formatSmart(getStepAnswer(answer, 6))
  }
]);

const buildTransition2Week5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Transition 2 Week 5 activities must be an array");
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
      targetId: `transition-2:week:5:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const activity4 = activitiesByPage.get(8);
  if (activity4) {
    const steps = [
      {
        stepId: 1,
        question: "What is your short-term goal for your first semester?",
        answer: toText(getStepAnswer(activity4.answer, 1)),
        responseType: "reflection"
      },
      {
        stepId: 2,
        question: "Turn your short-term goal into a SMART goal using Specific, Measurable, Achievable, Relevant, and Time-bound details.",
        answer: formatSmart(getStepAnswer(activity4.answer, 2)),
        responseType: "multi_step"
      }
    ];
    steps.forEach(({ stepId, question, answer, responseType }) => {
      if (!answer || hasStepFeedback(activity4.feedback, stepId)) return;
      targets.push({
        targetId: `transition-2:week:5:page:8:step:${stepId}`,
        activityLabel: `Activity 4 - Response ${stepId}`,
        question,
        answer,
        responseType
      });
    });
  }

  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Transition 2 Week 5 feedback request: ${error.message}`);
  }
  return value;
};

const applyTransition2Week5Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const pageResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId)
  );
  const stepResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(STEP_TARGETS, targetId)
  );
  if (pageResults.length + stepResults.length !== results.length) {
    const unknown = results.find(({ targetId }) =>
      !Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId) &&
      !Object.prototype.hasOwnProperty.call(STEP_TARGETS, targetId)
    );
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }
  const updated = applyPageFeedback({
    activities,
    results: pageResults,
    targetPages: TARGET_PAGES
  });
  const feedbackByStep = new Map();
  stepResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByStep.set(STEP_TARGETS[result.targetId].stepId, feedback);
  });
  return updated.map((activity) => {
    if (Number(activity?.page) !== 8 || !feedbackByStep.size) return activity;
    const feedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];
    feedbackByStep.forEach((value, stepId) => {
      if (!hasStepFeedback(feedback, stepId)) feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const transition2Week5Integration = Object.freeze({
  buildRequest: buildTransition2Week5Request,
  applyFeedback: applyTransition2Week5Feedback
});

module.exports = {
  applyTransition2Week5Feedback,
  buildTransition2Week5Request,
  transition2Week5Integration
};
