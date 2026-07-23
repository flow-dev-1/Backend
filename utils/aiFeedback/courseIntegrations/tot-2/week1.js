const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_1_GUIDANCE } = require("./context");

const PAGE_DEFINITIONS = Object.freeze([
  [3, "Activity 1", "As a teacher, what do you think this course is about?", "reflection"],
  [5, "Activity 2", "What one word comes to mind when you hear Inclusive Classroom?", "reflection"],
  [7, "Activity 3", "Define inclusion, integration, and segregation.", "multi_step"],
  [9, "Activity 4", "Sort the classroom statements into integration, segregation, and inclusion, then reflect on the model that best describes your setting.", "drag_and_drop"],
  [11, "Activity 5", "Do you think you have learners with SEND in your classroom?", "single_select"],
  [13, "Activity 6", "Identify the possible learning barrier in each classroom scenario.", "multi_step"],
  [15, "Activity 7", "Complete the learner-experience activities about reading, listening, and working memory.", "multi_step"],
  [17, "Activity 8", "Sort the classroom-support statements into equality and equity.", "drag_and_drop"]
]);

const TARGET_PAGES = Object.freeze(Object.fromEntries(
  PAGE_DEFINITIONS.map(([page]) => [`tot-2:week:1:page:${page}`, page])
));

const OPTION_LABELS = Object.freeze({
  "9:3": { 1: "Segregation", 2: "Integration", 3: "Inclusion" },
  "11:1": { 1: "Yes", 2: "No", 3: "I'm not sure" },
  "13:2": { 1: "Dyslexia", 2: "Visual Impairment", 3: "Hearing Impairment", 4: "Anxiety" },
  "13:3": { 1: "ADHD", 2: "Dyslexia", 3: "Hearing Impairment", 4: "Physical Disability" },
  "13:4": { 1: "Hearing Impairment", 2: "Dyslexia", 3: "ADHD", 4: "Physical Disability" },
  "13:5": { 1: "Visual Impairment", 2: "ADHD", 3: "Dyslexia", 4: "Anxiety" },
  "13:6": { 1: "Dysgraphia", 2: "ADHD", 3: "Visual Impairment", 4: "Hearing Impairment" },
  "15:3": { 1: "Very easy", 2: "A bit difficult", 3: "Difficult", 4: "Very difficult" },
  "15:6": { 1: "Click the green button after the bell", 2: "Select the blue icon immediately", 3: "Wait five seconds then press red", 4: "Press the red button twice immediately" },
  "15:7": { 1: "Very easy", 2: "A bit difficult", 3: "Difficult", 4: "Very difficult" },
  "15:9": { 1: "7 - 3 - 9 - 2 - 6", 2: "7 - 9 - 3 - 2 - 6", 3: "3 - 7 - 9 - 2 - 6", 4: "9 - 3 - 7 - 2 - 6" }
});

const DRAG_ITEMS = Object.freeze({
  9: [
    "Students with disabilities learn in separate classrooms",
    "Students with learning difficulties are placed in lower ability classes",
    "Students are separated based on academic ability",
    "Learners with disabilities attend special schools only",
    "Students with special needs sit in the same classroom but receive no additional support",
    "Students with learning difficulties must adapt to the normal teaching style",
    "All learners follow the same lesson without adjustments",
    "Students with disabilities attend the same school but rarely participate in activities",
    "All students learn together with the right support",
    "Teachers adjust lessons to meet different learning needs",
    "Students receive different resources to help them succeed",
    "Every learner participates in classroom activities"
  ],
  17: [
    "All students receive the same worksheet",
    "All students take the same test with identical instructions",
    "All learners receive the same amount of time",
    "Every student receives the same textbook",
    "All students follow the same teaching method",
    "Every learner completes the same assignment in the same way",
    "A dyslexic learner receives an audiobook",
    "A learner with mobility challenges sits near the door",
    "A learner receives extra assessment time",
    "A learner uses visual aids",
    "A learner receives simplified instructions",
    "A learner uses assistive technology"
  ]
});

const describeDragValue = (page, value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value).map(([bucket, entries]) => {
    if (!Array.isArray(entries)) return "";
    const items = entries.map((entry) => {
      const text = toText(entry);
      if (!text) return "";
      const index = Number(text);
      return Number.isInteger(index) && DRAG_ITEMS[page]?.[index]
        ? DRAG_ITEMS[page][index]
        : text;
    }).filter(Boolean);
    return items.length ? `${bucket}: ${items.join("; ")}` : "";
  }).filter(Boolean).join("\n");
};

const formatAnswer = (page, answer) => {
  if ([3, 5].includes(page)) return toText(answer);
  if (!Array.isArray(answer)) return "";

  return answer.map((item, index) => {
    const stepId = Number(item?.stepId ?? item?.id ?? index + 1);
    const value = item?.value !== undefined ? item.value : item;
    const dragValue = describeDragValue(page, value);
    if (dragValue) return `Step ${stepId}:\n${dragValue}`;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const fields = Object.entries(value)
        .map(([key, fieldValue]) => `${key}: ${toText(fieldValue)}`)
        .filter((line) => !line.endsWith(": "));
      return fields.length ? fields.join("\n") : "";
    }
    const rawValue = toText(value);
    const label = OPTION_LABELS[`${page}:${stepId}`]?.[rawValue] || rawValue;
    return label ? `Step ${stepId}: ${label}` : "";
  }).filter(Boolean).join("\n");
};

const buildTot2Week1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 2 Week 1 activities must be an array");
  const activitiesByPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGE_DEFINITIONS.flatMap(([page, activityLabel, question, responseType]) => {
    const activity = activitiesByPage.get(page);
    const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-2:week:1:page:${page}`, activityLabel, question, answer, responseType }];
  });
  if (!targets.length) return null;

  const request = {
    requestId,
    context: {
      courseKey: "tot-2",
      courseTitle: "TOT 2",
      weekNumber: 1,
      weekTitle: "Understanding Inclusion and Special Needs in the Classroom",
      guidance: WEEK_1_GUIDANCE
    },
    targets
  };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid TOT 2 Week 1 feedback request: ${error.message}`);
  return value;
};

const applyTot2Week1Feedback = ({ activities, response }) => applyPageFeedback({
  activities,
  results: response?.results,
  targetPages: TARGET_PAGES
});

const tot2Week1Integration = Object.freeze({
  buildRequest: buildTot2Week1Request,
  applyFeedback: applyTot2Week1Feedback
});

module.exports = {
  applyTot2Week1Feedback,
  buildTot2Week1Request,
  tot2Week1Integration
};
