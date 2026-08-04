const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_5_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({ courseKey: "tot-1", courseTitle: "TOT 1", weekNumber: 5, weekTitle: "Integrating SEL into Teaching Methods", guidance: WEEK_5_GUIDANCE });
const PAGE_TARGETS = Object.freeze({ "tot-1:week:5:page:4": 4, "tot-1:week:5:page:12": 12 });
const STEP_TARGETS = Object.freeze({
  ...Object.fromEntries([1, 2].map((stepId) => [`tot-1:week:5:page:6:step:${stepId}`, { page: 6, stepId }])),
  ...Object.fromEntries([1, 2, 3].map((stepId) => [`tot-1:week:5:page:8:step:${stepId}`, { page: 8, stepId }])),
  ...Object.fromEntries([2, 3, 4, 5].map((stepId) => [`tot-1:week:5:page:10:step:${stepId}`, { page: 10, stepId }]))
});
const SKILLS = Object.freeze({ A: "Self-awareness and Emotional Regulation", B: "Resilience", C: "Empathy", D: "Collaboration and Social Awareness" });
const SCENARIOS = Object.freeze(["Tunde persists after failing a Spanish test.", "A teacher validates a quiet student's contribution.", "Amina listens to and comforts an upset classmate.", "Chijioke reflects, stays calm, and keeps trying with a difficult maths problem."]);
const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) && feedback.some((item) => Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value)));
const add = (targets, activity, stepId, question, answer, responseType = "reflection") => { const text = toText(answer); if (!activity || !text || hasStepFeedback(activity.feedback, stepId)) return; targets.push({ targetId: `tot-1:week:5:page:${activity.page}:step:${stepId}`, activityLabel: `Activity ${Number(activity.page) / 2} - Response ${stepId}`, question, answer: text, responseType }); };
const entryValue = (answer, stepId, fallback) => { const entry = Array.isArray(answer) ? answer.find((item) => Number(item?.stepId ?? item?.id) === Number(stepId)) || answer[fallback] : undefined; return entry?.value ?? entry; };

const buildTot1Week5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 1 Week 5 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = [];
  [[4, "Activity 1", "Can SEL be incorporated into every subject? Explain your view."], [12, "Activity 5", "Document a current classroom routine that is simple, realistic, and consistent."]].forEach(([page, activityLabel, question]) => { const activity = byPage.get(page), answer = toText(activity?.answer); if (activity && answer && !hasExistingFeedback(activity.feedback)) targets.push({ targetId: `tot-1:week:5:page:${page}`, activityLabel, question, answer, responseType: "reflection" }); });
  const page6 = byPage.get(6), plan = page6?.answer?.[0] || {};
  add(targets, page6, 1, "Which subject will you use for this SEL activity?", plan.subject);
  add(targets, page6, 2, "Which SEL skill will the activity develop?", plan.skill);
  const page8 = byPage.get(8), game = page8?.answer?.[0] || page8?.answer || {};
  [[1, "What is the name of the classroom game?", game.game], [2, "How is the game played?", game.instructions], [3, "What is the game's SEL connection?", game.connection]].forEach(([id, question, answer]) => add(targets, page8, id, question, answer));
  const page10 = byPage.get(10);
  [2, 3, 4, 5].forEach((stepId, index) => { const raw = toText(entryValue(page10?.answer, stepId, index)); add(targets, page10, stepId, `Which SEL skill is demonstrated? ${SCENARIOS[index]}`, SKILLS[raw] || raw, "single_select"); });
  if (!targets.length) return null;
  const { error, value } = validateGenerationRequest({ requestId, context: CONTEXT, targets }); if (error) throw new TypeError(`Invalid TOT 1 Week 5 feedback request: ${error.message}`); return value;
};

const applyTot1Week5Feedback = ({ activities, response }) => {
  if (!Array.isArray(response?.results)) throw new TypeError("Feedback results must be an array");
  const pageResults = response.results.filter(({ targetId }) => PAGE_TARGETS[targetId]); const stepResults = response.results.filter(({ targetId }) => STEP_TARGETS[targetId]);
  if (pageResults.length + stepResults.length !== response.results.length) throw new TypeError(`Unknown feedback target: ${response.results.find(({ targetId }) => !PAGE_TARGETS[targetId] && !STEP_TARGETS[targetId])?.targetId}`);
  const updated = applyPageFeedback({ activities, results: pageResults, targetPages: PAGE_TARGETS }); const additions = new Map();
  stepResults.forEach((result) => { if (result.status === "skipped") return; const value = toText(result.feedback); if (result.status !== "ready" || !value) throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`); const target = STEP_TARGETS[result.targetId]; if (!additions.has(target.page)) additions.set(target.page, new Map()); additions.get(target.page).set(target.stepId, value); });
  return updated.map((activity) => { const page = additions.get(Number(activity?.page)); if (!page) return activity; const feedback = Array.isArray(activity.feedback) ? activity.feedback.map((item) => ({ ...item })) : []; page.forEach((value, stepId) => { const existing = feedback.find((item) => Number(item?.stepId) === stepId); if (existing) existing.value = value; else feedback.push({ stepId, value }); }); return { ...activity, feedback }; });
};
const tot1Week5Integration = Object.freeze({ buildRequest: buildTot1Week5Request, applyFeedback: applyTot1Week5Feedback });
module.exports = { applyTot1Week5Feedback, buildTot1Week5Request, tot1Week5Integration };
