const { validateGenerationRequest } = require("../../contracts");
const { toText } = require("../shared/normalizers");
const { WEEK_3_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "tot-1",
  courseTitle: "TOT 1",
  weekNumber: 3,
  weekTitle: "Building Relationships and Creating a Safe Classroom",
  guidance: WEEK_3_GUIDANCE
});

const TARGETS = Object.freeze({
  ...Object.fromEntries([1, 2].map((stepId) => [`tot-1:week:3:page:4:step:${stepId}`, { page: 4, stepId }])),
  ...Object.fromEntries([2, 3, 4, 5, 6].map((stepId) => [`tot-1:week:3:page:6:step:${stepId}`, { page: 6, stepId }])),
  ...Object.fromEntries([1, 2].map((stepId) => [`tot-1:week:3:page:8:step:${stepId}`, { page: 8, stepId }])),
  ...Object.fromEntries([3, 4].map((stepId) => [`tot-1:week:3:page:10:step:${stepId}`, { page: 10, stepId }])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((stepId) => [`tot-1:week:3:page:12:step:${stepId}`, { page: 12, stepId }]))
});

const RELATIONSHIP_OPTIONS = Object.freeze({
  A: "Active Listening",
  B: "Encouragement and Praise",
  C: "Fairness and Consistency",
  D: "Emotional Support",
  E: "Showing Interest in Students' Lives"
});

const QUESTIONS = Object.freeze({
  4: [
    "Think of a student you found difficult to connect with. What got in the way?",
    "What helped you build a better relationship with them over time?"
  ],
  6: [
    "A withdrawn student receives private acknowledgement and help creating a study plan.",
    "A teacher repeats and validates a quiet student's contribution.",
    "A teacher praises a student for persisting with a difficult task.",
    "A teacher gives all students turns and applies rules consistently.",
    "A teacher remembers and follows up about a student's weekend football match."
  ],
  8: [
    "How might a student feel when the teacher listens and acknowledges them?",
    "How might a student feel when the teacher ignores or dismisses them?"
  ],
  10: [
    "Identify the strength and write specific praise for a student contributing thoughtfully to a group discussion.",
    "Identify the strength and write specific praise for a student comforting an upset peer."
  ],
  12: [
    "Ask the student who talks out of turn a question that encourages reflection.",
    "Explain how talking out of turn affects other people or learning.",
    "Suggest how the student can improve or repair the situation.",
    "Ask the student who made a hurtful teasing comment a question that encourages reflection.",
    "Explain how the teasing affected the other student or group.",
    "Suggest how the student can repair the harm or improve in future."
  ]
});

const getEntry = (answer, stepId, fallbackIndex = stepId - 1) => Array.isArray(answer)
  ? answer.find((item) => Number(item?.stepId ?? item?.id) === Number(stepId)) || answer[fallbackIndex]
  : undefined;

const hasFeedback = (feedback, stepId) => Array.isArray(feedback) && feedback.some((item) =>
  Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value))
);

const addTarget = (targets, activity, stepId, question, answer, responseType) => {
  const text = toText(answer);
  if (!activity || !text || hasFeedback(activity.feedback, stepId)) return;
  targets.push({
    targetId: `tot-1:week:3:page:${activity.page}:step:${stepId}`,
    activityLabel: `Activity ${(Number(activity.page) / 2)} - Response ${stepId}`,
    question,
    answer: text,
    responseType
  });
};

const buildTot1Week3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 1 Week 3 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = [];

  const page4 = byPage.get(4);
  [1, 2].forEach((stepId) => addTarget(targets, page4, stepId, QUESTIONS[4][stepId - 1], getEntry(page4?.answer, stepId)?.value, "reflection"));

  const page6 = byPage.get(6);
  [2, 3, 4, 5, 6].forEach((stepId, index) => {
    const entry = getEntry(page6?.answer, stepId, index);
    const value = toText(entry?.value ?? entry);
    addTarget(targets, page6, stepId, QUESTIONS[6][index], RELATIONSHIP_OPTIONS[value] || value, "single_select");
  });

  const page8 = byPage.get(8);
  [1, 2].forEach((stepId) => addTarget(targets, page8, stepId, QUESTIONS[8][stepId - 1], getEntry(page8?.answer, stepId)?.value, "reflection"));

  const page10 = byPage.get(10);
  [3, 4].forEach((stepId, index) => {
    const entry = getEntry(page10?.answer, stepId, index);
    addTarget(targets, page10, stepId, QUESTIONS[10][index], `Strength: ${toText(entry?.strength)}\nPraise: ${toText(entry?.praiseExample)}`, "reflection");
  });

  const page12 = byPage.get(12);
  const fields = ["reflect", "explain", "suggestion", "reflect", "explain", "suggestion"];
  fields.forEach((field, index) => {
    const scenarioIndex = index < 3 ? 0 : 1;
    addTarget(targets, page12, index + 1, QUESTIONS[12][index], page12?.answer?.[scenarioIndex]?.[field], "reflection");
  });

  if (!targets.length) return null;
  const { error, value } = validateGenerationRequest({ requestId, context: CONTEXT, targets });
  if (error) throw new TypeError(`Invalid TOT 1 Week 3 feedback request: ${error.message}`);
  return value;
};

const applyTot1Week3Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const additions = new Map();
  results.forEach((result) => {
    const definition = TARGETS[result.targetId];
    if (!definition) throw new TypeError(`Unknown feedback target: ${result.targetId}`);
    if (result.status === "skipped") return;
    const value = toText(result.feedback);
    if (result.status !== "ready" || !value) throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    if (!additions.has(definition.page)) additions.set(definition.page, new Map());
    additions.get(definition.page).set(definition.stepId, value);
  });
  return activities.map((activity) => {
    const pageAdditions = additions.get(Number(activity?.page));
    if (!pageAdditions) return activity;
    const feedback = Array.isArray(activity.feedback) ? activity.feedback.map((item) => ({ ...item })) : [];
    pageAdditions.forEach((value, stepId) => {
      const existing = feedback.find((item) => Number(item?.stepId) === stepId);
      if (existing) existing.value = value;
      else feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const tot1Week3Integration = Object.freeze({ buildRequest: buildTot1Week3Request, applyFeedback: applyTot1Week3Feedback });

module.exports = { applyTot1Week3Feedback, buildTot1Week3Request, tot1Week3Integration };
