const { validateGenerationRequest } = require("../../contracts");
const { toText } = require("../shared/normalizers");
const { WEEK_4_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({ courseKey: "tot-1", courseTitle: "TOT 1", weekNumber: 4, weekTitle: "Growth Mindset and Resilience for Educators", guidance: WEEK_4_GUIDANCE });
const TARGETS = Object.freeze({
  ...Object.fromEntries([2, 3].map((stepId) => [`tot-1:week:4:page:8:step:${stepId}`, { page: 8, stepId }])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, index) => index + 1).map((stepId) => [`tot-1:week:4:page:10:step:${stepId}`, { page: 10, stepId }])),
  ...Object.fromEntries([3, 4, 5, 6].map((stepId) => [`tot-1:week:4:page:12:step:${stepId}`, { page: 12, stepId }])),
  ...Object.fromEntries([2, 3, 4, 5].map((stepId) => [`tot-1:week:4:page:14:step:${stepId}`, { page: 14, stepId }]))
});

const MINDSET_STATEMENTS = Object.freeze([
  "I can't do this", "I can learn this if I keep trying", "This is tough now, but I'll improve over time", "This subject is not for me", "Mistakes help me grow", "This is for new-age teachers, and I am not one", "This may take time and effort", "I failed this time, so I will probably keep failing", "Making mistakes means I am not smart", "I have not figured it out yet, but I will"
]);
const TIMELINE = Object.freeze([
  [5, 1, "Current focus: What area of teaching do you want to build resilience in?"], [5, 2, "Current focus: What support or mindset shift could help?"],
  [4, 1, "Recent success: What recent teaching moment made you proud?"], [4, 2, "Recent success: What personal strengths contributed?"],
  [3, 1, "Turning point: What experience helped you grow or bounce back?"], [3, 2, "Turning point: What lesson did you learn?"],
  [2, 1, "Early challenge: Describe a difficult early teaching experience."], [2, 2, "Early challenge: How did you handle it?"],
  [1, 1, "Start of career: What motivated you to become a teacher?"], [1, 2, "Start of career: What hopes or fears did you have?" ]
]);
const REFRAME_QUESTIONS = Object.freeze(["You got it right on the first try.", "This is too hard for you.", "You keep making the same mistake.", "Don't worry, this just isn't your strength."]);
const FINAL_QUESTIONS = Object.freeze(["What teaching challenge did you once think you could not overcome, but did?", "A student stands up for a friend being teased. Reflect on the growth or strength shown.", "A student organises their group's project work. Reflect on the growth or strength shown.", "What is one thing you learned that made you a better teacher?"]);

const hasFeedback = (feedback, stepId) => Array.isArray(feedback) && feedback.some((item) => Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value)));
const addTarget = (targets, activity, stepId, question, answer, responseType = "reflection") => {
  const text = toText(answer);
  if (!activity || !text || hasFeedback(activity.feedback, stepId)) return;
  targets.push({ targetId: `tot-1:week:4:page:${activity.page}:step:${stepId}`, activityLabel: `Activity ${Number(activity.page) / 2} - Response ${stepId}`, question, answer: text, responseType });
};
const getDragValue = (answer) => Array.isArray(answer) ? answer.find((item) => item?.value && typeof item.value === "object")?.value : null;
const formatMindsetSort = (answer) => {
  const value = getDragValue(answer);
  if (!value) return "";
  return MINDSET_STATEMENTS.map((statement, index) => {
    const bucket = Object.entries(value).find(([, indices]) => Array.isArray(indices) && indices.map(Number).includes(index))?.[0];
    return `${statement}: ${bucket === "green" ? "Growth mindset" : bucket === "red" ? "Fixed mindset" : "Unplaced"}`;
  }).join("\n");
};

const buildTot1Week4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 1 Week 4 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = [];
  const page8 = byPage.get(8);
  addTarget(targets, page8, 2, "Sort each statement as fixed mindset or growth mindset.", formatMindsetSort(page8?.answer), "drag_and_drop");
  addTarget(targets, page8, 3, "Which mindset thoughts have you heard from students or caught yourself saying?", page8?.answer?.find((item) => Number(item?.stepId ?? item?.id) === 3)?.value || page8?.answer?.[1]?.value);

  const page10 = byPage.get(10);
  TIMELINE.forEach(([boxId, questionId, question], index) => addTarget(targets, page10, index + 1, question, page10?.answer?.[boxId]?.[questionId]));

  const page12 = byPage.get(12);
  REFRAME_QUESTIONS.forEach((question, index) => addTarget(targets, page12, index + 3, `Rewrite this statement as growth-oriented feedback: ${question}`, page12?.answer?.[index]?.reframe));

  const page14 = byPage.get(14);
  FINAL_QUESTIONS.forEach((question, index) => addTarget(targets, page14, index + 2, question, page14?.answer?.[index]?.value));

  if (!targets.length) return null;
  const { error, value } = validateGenerationRequest({ requestId, context: CONTEXT, targets });
  if (error) throw new TypeError(`Invalid TOT 1 Week 4 feedback request: ${error.message}`);
  return value;
};

const applyTot1Week4Feedback = ({ activities, response }) => {
  if (!Array.isArray(response?.results)) throw new TypeError("Feedback results must be an array");
  const additions = new Map();
  response.results.forEach((result) => {
    const target = TARGETS[result.targetId];
    if (!target) throw new TypeError(`Unknown feedback target: ${result.targetId}`);
    if (result.status === "skipped") return;
    const value = toText(result.feedback);
    if (result.status !== "ready" || !value) throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    if (!additions.has(target.page)) additions.set(target.page, new Map());
    additions.get(target.page).set(target.stepId, value);
  });
  return activities.map((activity) => {
    const pageAdditions = additions.get(Number(activity?.page));
    if (!pageAdditions) return activity;
    const feedback = Array.isArray(activity.feedback) ? activity.feedback.map((item) => ({ ...item })) : [];
    pageAdditions.forEach((value, stepId) => { const existing = feedback.find((item) => Number(item?.stepId) === stepId); if (existing) existing.value = value; else feedback.push({ stepId, value }); });
    return { ...activity, feedback };
  });
};

const tot1Week4Integration = Object.freeze({ buildRequest: buildTot1Week4Request, applyFeedback: applyTot1Week4Feedback });
module.exports = { applyTot1Week4Feedback, buildTot1Week4Request, tot1Week4Integration };
