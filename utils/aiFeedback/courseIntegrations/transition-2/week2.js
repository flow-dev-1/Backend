const { validateGenerationRequest } = require("../../contracts");
const {
  getSelectedOptions,
  hasExistingFeedback,
  toText
} = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");

const CONTEXT = Object.freeze({
  courseKey: "transition-2",
  courseTitle: "Transition 2",
  weekNumber: 2,
  weekTitle: "Mindset and Values"
});

const TARGET_PAGES = Object.freeze({
  "transition-2:week:2:page:2": 2,
  "transition-2:week:2:page:4": 4,
  "transition-2:week:2:page:6": 6,
  "transition-2:week:2:page:8": 8,
  "transition-2:week:2:page:10": 10,
  "transition-2:week:2:page:12": 12,
  "transition-2:week:2:page:14": 14,
  "transition-2:week:2:page:16": 16
});

const MINDSET_STATEMENTS = Object.freeze([
  "I failed once, so I'm probably not cut out for this.",
  "This is hard, but that means I'm learning something new.",
  "Smart people don't need to study as hard.",
  "I asked for feedback so I can do better next time.",
  "I can't do presentations, I've always been shy.",
  "I'm nervous about this, but I'll give it my best shot.",
  "There's no point trying again, I'll just fail anyway.",
  "I didn't get it right, but now I know what to work on."
]);

const VALUE_OPTIONS = Object.freeze([
  "Honesty",
  "Respect",
  "Kindess",
  "Responsibility",
  "Family",
  "Faith",
  "Hardwork",
  "Growth",
  "Justice",
  "Balance"
]);

const formatDragAnswer = (answer) => {
  if (!answer || typeof answer !== "object") return "";

  const formatBucket = (bucket) => (Array.isArray(answer[bucket])
    ? answer[bucket].map((index) => MINDSET_STATEMENTS[Number(index)]).filter(Boolean)
    : []);
  const growth = formatBucket("green");
  const fixed = formatBucket("red");
  const parts = [];

  if (growth.length) parts.push(`Growth Mindset: ${growth.join(" | ")}`);
  if (fixed.length) parts.push(`Fixed Mindset: ${fixed.join(" | ")}`);
  return parts.join("\n");
};

const formatListAnswer = (answer) => {
  if (!Array.isArray(answer)) return "";
  const values = answer
    .map((item) => toText(item?.value ?? item))
    .filter(Boolean);
  return values.length ? `Important values: ${values.join(", ")}` : "";
};

const formatRankedValues = (answer) => {
  if (!answer || typeof answer !== "object") return "";

  const selected = getSelectedOptions(answer.selectedValues, VALUE_OPTIONS);
  const ranked = Object.entries(answer.rankValues || {})
    .map(([value, rank]) => ({ value: toText(value), rank: Number(rank) }))
    .filter(({ value, rank }) => value && Number.isInteger(rank) && rank > 0)
    .sort((first, second) => first.rank - second.rank);
  const parts = [];

  if (selected.length) parts.push(`Selected values: ${selected.join(", ")}`);
  if (ranked.length) {
    parts.push(`Ranking: ${ranked.map(({ value, rank }) => `${rank}. ${value}`).join(", ")}`);
  }
  return parts.join("\n");
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What's your definition of Mindset and Values?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "Does this make sense to you so far?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Classify each statement as Growth Mindset or Fixed Mindset.",
    responseType: "drag_and_drop",
    formatAnswer: formatDragAnswer
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "What's the first thought that comes to your mind?",
    responseType: "single_select",
    formatAnswer: toText
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "List 3 values you think are important.",
    responseType: "reflection",
    formatAnswer: formatListAnswer
  },
  {
    page: 12,
    activityLabel: "Activity 6",
    question: "Choose the top 5 values that matter most to you and rank them from 1 to 5.",
    responseType: "ranking",
    formatAnswer: formatRankedValues
  },
  {
    page: 14,
    activityLabel: "Activity 7",
    question: "Does your behaviour in a typical week reflect your most important value?",
    responseType: "single_select",
    formatAnswer: toText
  },
  {
    page: 16,
    activityLabel: "Activity 8",
    question: "How would your value of responsibility influence your decision?",
    responseType: "reflection",
    formatAnswer: toText
  }
]);

const buildTransition2Week2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Transition 2 Week 2 activities must be an array");
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
      targetId: `transition-2:week:2:page:${definition.page}`,
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
    throw new TypeError(`Invalid Transition 2 Week 2 feedback request: ${error.message}`);
  }
  return value;
};

const applyTransition2Week2Feedback = ({ activities, response }) =>
  applyPageFeedback({
    activities,
    results: response?.results,
    targetPages: TARGET_PAGES
  });

const transition2Week2Integration = Object.freeze({
  buildRequest: buildTransition2Week2Request,
  applyFeedback: applyTransition2Week2Feedback
});

module.exports = {
  applyTransition2Week2Feedback,
  buildTransition2Week2Request,
  transition2Week2Integration
};
