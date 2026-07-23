const { validateGenerationRequest } = require("../../contracts");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_5_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "resilience-grit",
  courseTitle: "Resilience and Grit",
  weekNumber: 5,
  weekTitle: "Coping Skills",
  guidance: WEEK_5_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "resilience-grit:week:5:page:2": 2,
  "resilience-grit:week:5:page:4": 4,
  "resilience-grit:week:5:page:6": 6
});

const COPING_SCENARIOS = Object.freeze([
  "A big test is tomorrow and you feel nervous and overwhelmed.",
  "A best friend said something hurtful and you feel upset.",
  "A difficult maths problem is causing frustration.",
  "You did not make a sports team and feel disappointed.",
  "A group project is due but teammates have not finished their parts.",
  "You are anxious about giving a speech to the class.",
  "You lost a favourite item and feel sad.",
  "You argued with a sibling and still feel angry.",
  "You made a mistake on a school assignment and feel embarrassed.",
  "You did not know an answer when called on by a teacher and feel nervous."
]);

const formatListAnswer = (answer) => {
  if (!Array.isArray(answer)) return "";
  return answer.map((item, index) => {
    const value = toText(item?.value ?? item);
    return value ? `${index + 1}. ${value}` : "";
  }).filter(Boolean).join("\n");
};

const formatCopingMatches = (answer) => {
  if (!Array.isArray(answer)) return "";
  return COPING_SCENARIOS.map((scenario, index) => {
    const selected = toText(answer[index]?.value ?? answer[index]);
    return selected
      ? `Situation ${index + 1}: ${scenario}\nSelected coping skill: ${selected}`
      : "";
  }).filter(Boolean).join("\n\n");
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What do you understand by the term coping skills?",
    formatAnswer: toText,
    responseType: "reflection"
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "List challenges you have encountered and bounced back from.",
    formatAnswer: formatListAnswer,
    responseType: "reflection"
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Match each stressful situation to a coping skill you would use.",
    formatAnswer: formatCopingMatches,
    responseType: "multi_step"
  }
]);

const buildResilienceGritWeek5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Resilience and Grit Week 5 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = definition.formatAnswer(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `resilience-grit:week:5:page:${definition.page}`,
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
      `Invalid Resilience and Grit Week 5 feedback request: ${error.message}`
    );
  }
  return value;
};

const applyResilienceGritWeek5Feedback = ({ activities, response }) =>
  applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });

const resilienceGritWeek5Integration = Object.freeze({
  buildRequest: buildResilienceGritWeek5Request,
  applyFeedback: applyResilienceGritWeek5Feedback
});

module.exports = {
  applyResilienceGritWeek5Feedback,
  buildResilienceGritWeek5Request,
  resilienceGritWeek5Integration
};
