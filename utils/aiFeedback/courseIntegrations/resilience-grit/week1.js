const { validateGenerationRequest } = require("../../contracts");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_1_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "resilience-grit",
  courseTitle: "Resilience and Grit",
  weekNumber: 1,
  weekTitle: "Introduction to Resilience and Grit",
  guidance: WEEK_1_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "resilience-grit:week:1:page:2": 2,
  "resilience-grit:week:1:page:4": 4,
  "resilience-grit:week:1:page:6": 6,
  "resilience-grit:week:1:page:8": 8,
  "resilience-grit:week:1:page:10": 10
});

const SORT_STATEMENTS = Object.freeze([
  "Sam keeps practising piano for months despite difficulty.",
  "Chris keeps writing a book despite slow and difficult progress.",
  "Emma recovers from a failed science project and makes a new plan.",
  "Lucy responds to losing a game by preparing for the next one."
]);

const formatListAnswer = (answer) => {
  if (!Array.isArray(answer)) return "";
  return answer
    .map((item, index) => {
      const value = toText(item?.value ?? item);
      return value ? `${index + 1}. ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
};

const formatSortAnswer = (answer) => {
  const value = Array.isArray(answer) ? answer[0]?.value : answer?.value || answer;
  if (!value || typeof value !== "object") return "";
  const formatGroup = (label, indices) => {
    const statements = Array.isArray(indices)
      ? indices.map((index) => SORT_STATEMENTS[Number(index)]).filter(Boolean)
      : [];
    return statements.length ? `${label}: ${statements.join(" | ")}` : "";
  };
  return [
    formatGroup("Resilience", value.green),
    formatGroup("Grit", value.red)
  ].filter(Boolean).join("\n");
};

const formatYetAnswer = (answer) => {
  if (!Array.isArray(answer)) return "";
  return answer
    .map((item, index) => {
      const value = item?.value;
      if (!value || typeof value !== "object") return "";
      const challenge = toText(value[0] ?? value.challenge);
      const yet = toText(value[1] ?? value.yet);
      if (!challenge || !yet) return "";
      return `Pair ${index + 1}\nChallenge: ${challenge}\nYet statement: ${yet}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What do you understand by the word resilience?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "List challenges you have encountered and bounced back from.",
    responseType: "reflection",
    formatAnswer: formatListAnswer
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "What do you understand by the word grit?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "Sort four scenarios into resilience or grit.",
    responseType: "drag_and_drop",
    formatAnswer: formatSortAnswer
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "Turn four personal challenges into realistic growth statements using the Power of Yet.",
    responseType: "multi_step",
    formatAnswer: formatYetAnswer
  }
]);

const buildResilienceGritWeek1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Resilience and Grit Week 1 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = definition.formatAnswer(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `resilience-grit:week:1:page:${definition.page}`,
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
      `Invalid Resilience and Grit Week 1 feedback request: ${error.message}`
    );
  }
  return value;
};

const applyResilienceGritWeek1Feedback = ({ activities, response }) =>
  applyPageFeedback({
    activities,
    results: response?.results,
    targetPages: TARGET_PAGES
  });

const resilienceGritWeek1Integration = Object.freeze({
  buildRequest: buildResilienceGritWeek1Request,
  applyFeedback: applyResilienceGritWeek1Feedback
});

module.exports = {
  applyResilienceGritWeek1Feedback,
  buildResilienceGritWeek1Request,
  resilienceGritWeek1Integration
};
