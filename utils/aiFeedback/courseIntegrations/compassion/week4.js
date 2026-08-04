const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_4_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "compassion",
  courseTitle: "Compassion",
  weekNumber: 4,
  weekTitle: "Circle of Concern",
  guidance: WEEK_4_GUIDANCE
});

const TARGET_PAGES = Object.freeze({
  "compassion:week:4:page:2": 2,
  "compassion:week:4:page:4": 4,
  "compassion:week:4:page:6": 6
});

const PEOPLE = Object.freeze([
  "Mum", "Dad", "Family friend", "Cousin", "Brother", "Sister",
  "Stranger", "Classmate", "Uncle", "Driver", "Best friend", "Teacher"
]);
const ACTIONS = Object.freeze([
  "Helping with chores at home",
  "Helping an elderly neighbor with groceries",
  "Smiling at someone who looks upset",
  "Standing up for someone being bullied",
  "Holding the door open for a stranger",
  "Helping a classmate with a school project",
  "Listening when someone needs to talk",
  "Being kind and respectful in daily interactions",
  "Preparing a meal for a sick family member",
  "Picking up litter in a public park"
]);

const formatGroups = (answer, groups, labels) => groups
  .map((group) => {
    const values = Array.isArray(answer?.[group])
      ? answer[group].map((index) => labels[Number(index)]).filter(Boolean)
      : [];
    return `${group}: ${values.join(", ") || "none"}`;
  })
  .join("\n");

const buildCompassionWeek4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Compassion Week 4 activities must be an array");
  }
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const definitions = [
    {
      page: 2,
      label: "Activity 1",
      question: "An unfamiliar hungry person asks you to share your lunch. What would you do, and would sharing show compassion?",
      answer: toText(byPage.get(2)?.answer),
      responseType: "reflection"
    },
    {
      page: 4,
      label: "Activity 2",
      question: "Classify the people into the learner's inner and outer circles.",
      answer: formatGroups(byPage.get(4)?.answer, ["inner", "outer"], PEOPLE),
      responseType: "drag_and_drop"
    },
    {
      page: 6,
      label: "Activity 3",
      question: "Classify compassionate actions as suitable for the Inner Circle, Outer Circle, or Both.",
      answer: formatGroups(byPage.get(6)?.answer, ["green", "orange", "red"], ACTIONS)
        .replace("green:", "Inner Circle:")
        .replace("orange:", "Outer Circle:")
        .replace("red:", "Both:"),
      responseType: "drag_and_drop"
    }
  ];
  const targets = definitions.flatMap((definition) => {
    const activity = byPage.get(definition.page);
    if (!activity || !definition.answer || hasExistingFeedback(activity.feedback)) return [];
    return [{
      targetId: `compassion:week:4:page:${definition.page}`,
      activityLabel: definition.label,
      question: definition.question,
      answer: definition.answer,
      responseType: definition.responseType
    }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Compassion Week 4 feedback request: ${error.message}`);
  return value;
};

const applyCompassionWeek4Feedback = ({ activities, response }) =>
  applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });

const compassionWeek4Integration = Object.freeze({
  buildRequest: buildCompassionWeek4Request,
  applyFeedback: applyCompassionWeek4Feedback
});

module.exports = {
  applyCompassionWeek4Feedback,
  buildCompassionWeek4Request,
  compassionWeek4Integration
};
