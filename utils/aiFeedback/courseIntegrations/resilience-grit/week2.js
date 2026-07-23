const { validateGenerationRequest } = require("../../contracts");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { WEEK_2_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "resilience-grit",
  courseTitle: "Resilience and Grit",
  weekNumber: 2,
  weekTitle: "Developing Resilience",
  guidance: WEEK_2_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "resilience-grit:week:2:page:2": 2,
  "resilience-grit:week:2:page:4": 4
});

const MATCHING_DEFINITIONS = Object.freeze([
  "Belief in your ability to handle situations and tasks successfully.",
  "People who support and guide you through challenges.",
  "Values and sense of right and wrong that guide difficult decisions.",
  "Skills and strategies used to manage stress, challenges, and emotions.",
  "Understanding that you can help others and make a positive difference.",
  "Ability to perform tasks or overcome challenges using skills and knowledge.",
  "Understanding what you can influence through your own actions and responses."
]);

const formatMatchingAnswer = (answer) => {
  if (!Array.isArray(answer)) return "";
  const answersByStep = new Map(
    answer.map((item, index) => [
      Number(item?.stepId ?? index + 2),
      toText(item?.value ?? item)
    ])
  );
  return MATCHING_DEFINITIONS.map((definition, index) => {
    const selected = answersByStep.get(index + 2);
    return selected ? `${index + 1}. ${definition}\nSelected C: ${selected}` : "";
  }).filter(Boolean).join("\n\n");
};

const buildResilienceGritWeek2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Resilience and Grit Week 2 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const definitions = [
    {
      page: 2,
      activityLabel: "Activity 1",
      question: "Have you ever seen or heard of a building that collapsed?",
      answer: (value) => value === "A" ? "Yes" : value === "B" ? "No" : toText(value),
      responseType: "single_select"
    },
    {
      page: 4,
      activityLabel: "Activity 2",
      question: "Match each definition to the correct one of the 7 Cs of resilience.",
      answer: formatMatchingAnswer,
      responseType: "multi_step"
    }
  ];
  const targets = definitions.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = definition.answer(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `resilience-grit:week:2:page:${definition.page}`,
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
      `Invalid Resilience and Grit Week 2 feedback request: ${error.message}`
    );
  }
  return value;
};

const applyResilienceGritWeek2Feedback = ({ activities, response }) =>
  applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });

const resilienceGritWeek2Integration = Object.freeze({
  buildRequest: buildResilienceGritWeek2Request,
  applyFeedback: applyResilienceGritWeek2Feedback
});

module.exports = {
  applyResilienceGritWeek2Feedback,
  buildResilienceGritWeek2Request,
  resilienceGritWeek2Integration
};
