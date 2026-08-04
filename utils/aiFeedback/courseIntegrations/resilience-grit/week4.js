const { validateGenerationRequest } = require("../../contracts");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_4_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "resilience-grit",
  courseTitle: "Resilience and Grit",
  weekNumber: 4,
  weekTitle: "The Role of Support Systems",
  guidance: WEEK_4_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "resilience-grit:week:4:page:2": 2,
  "resilience-grit:week:4:page:4": 4,
  "resilience-grit:week:4:page:6": 6
});

const formatValueList = (answer, valueKey) => {
  if (!Array.isArray(answer)) return "";
  return answer
    .map((item, index) => {
      const value = toText(item?.[valueKey] ?? item?.value ?? item);
      return value ? `${index + 1}. ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What do you understand by the term support system?",
    formatAnswer: toText,
    responseType: "reflection"
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "Who are the three main people you go to when you need help with a situation?",
    formatAnswer: (answer) => formatValueList(answer, "value"),
    responseType: "reflection"
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Map five people in your support network.",
    formatAnswer: (answer) => formatValueList(answer, "text"),
    responseType: "multi_step"
  }
]);

const buildResilienceGritWeek4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Resilience and Grit Week 4 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = definition.formatAnswer(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `resilience-grit:week:4:page:${definition.page}`,
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
    throw new TypeError(
      `Invalid Resilience and Grit Week 4 feedback request: ${error.message}`
    );
  }
  return value;
};

const applyResilienceGritWeek4Feedback = ({ activities, response }) =>
  applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });

const resilienceGritWeek4Integration = Object.freeze({
  buildRequest: buildResilienceGritWeek4Request,
  applyFeedback: applyResilienceGritWeek4Feedback
});

module.exports = {
  applyResilienceGritWeek4Feedback,
  buildResilienceGritWeek4Request,
  resilienceGritWeek4Integration
};
