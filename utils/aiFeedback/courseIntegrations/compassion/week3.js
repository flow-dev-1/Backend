const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_3_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "compassion",
  courseTitle: "Compassion",
  weekNumber: 3,
  weekTitle: "Compassion for Others",
  guidance: WEEK_3_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "compassion:week:3:page:2": 2,
  "compassion:week:3:page:4": 4,
  "compassion:week:3:page:6": 6,
  "compassion:week:3:page:8": 8,
  "compassion:week:3:page:10": 10
});

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "Do you remember what self-compassion is?",
    responseType: "reflection"
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "A classmate is sitting alone and looks upset. What would you do? A: Go over and ask if they are okay. B: Ignore them. C: Tell a teacher.",
    responseType: "single_select"
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Think about a time when someone helped you when you were feeling down. How did it make you feel?",
    responseType: "reflection"
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "List five other ways compassion can be shown to others.",
    responseType: "multi_step"
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "Write a letter apologising to a friend you did not support compassionately, and offer the kind words you wish you had said.",
    responseType: "reflection"
  }
]);

const normalizeAnswer = (activity) => {
  if (!Array.isArray(activity?.answer)) return toText(activity?.answer);
  return activity.answer
    .map((item, index) => {
      const value = toText(item?.value);
      return value ? `${index + 1}. ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
};

const buildCompassionWeek3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Compassion Week 3 activities must be an array");
  }
  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );
  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    const answer = normalizeAnswer(activity);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `compassion:week:3:page:${definition.page}`,
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
    throw new TypeError(`Invalid Compassion Week 3 feedback request: ${error.message}`);
  }
  return value;
};

const applyCompassionWeek3Feedback = ({ activities, response }) =>
  applyPageFeedback({
    activities,
    results: response?.results,
    targetPages: TARGET_PAGES
  });

const compassionWeek3Integration = Object.freeze({
  buildRequest: buildCompassionWeek3Request,
  applyFeedback: applyCompassionWeek3Feedback
});

module.exports = {
  applyCompassionWeek3Feedback,
  buildCompassionWeek3Request,
  compassionWeek3Integration
};
