const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_5_GUIDANCE } = require("./context");

const PAGE_DEFINITIONS = Object.freeze([
  [2, "Activity 1", "Identify who plays the most important role in supporting a learner with special needs."],
  [4, "Activity 2", "Identify language that supports constructive collaboration with families."],
  [6, "Activity 3", "Choose respectful and inclusive responses to common classroom situations."],
  [8, "Activity 4", "Reflect on deficit labels and choose collaborative responses in parent conversations."],
  [10, "Activity 5", "Match the components of an individual learner-support plan."],
  [12, "Activity 6", "Recognise teacher burnout and choose sustainable wellbeing practices."]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGE_DEFINITIONS.map(([page]) => [`tot-2:week:5:page:${page}`, page])));
const LABELS = Object.freeze(["Lazy", "Disruptive", "Slow learner", "Not trying", "Careless", "Unmotivated", "Difficult child"]);
const OPTIONS = Object.freeze({
  "2:1": ["The teacher", "Parents or caregivers", "School leadership", "A team effort between all of them"],
  "4:2": ["Your child needs to behave better", "Your child struggles with everything", "You need to help your child more"],
  "4:3": ["Your child needs to behave better", "Your child struggles with everything", "You need to help your child more"],
  "4:4": ["Your child needs to behave better", "Your child struggles with everything", "You need to help your child more"],
  "6:1": ["Threaten removal", "Ignore the student", "Publicly criticise repeated disruption", "Calmly remind the class agreement", "Call the student disrespectful"],
  "6:2": ["Force participation unexpectedly", "Ignore the learner", "Privately offer smaller-group participation", "Demand more speaking", "Compare with peers"],
  "6:3": ["Dismiss the answer as wrong", "Ignore the answer", "Criticise attention", "Explore the idea and adjust it together", "Blame poor study"],
  "6:4": ["Let one student do all the work", "Tell the stronger student to continue", "Assign roles so everyone contributes", "Move weaker students", "Ask one student to work alone"],
  "8:9": ["Insist the teacher is correct", "End the conversation", "Listen calmly and ask about home observations", "Blame the parent"],
  "8:10": ["Tell the parent they are wrong", "Explain observations calmly and ask about home", "End the conversation", "Say the school will handle it alone"],
  "8:11": ["Demand more work at home", "Try strategies together to support learning", "Call it mainly a home problem", "Say the child must try harder"],
  "10:2": ["Learner strengths", "Barriers", "Adjustments", "Accountability"],
  "10:3": ["Learner strengths", "Barriers", "Adjustments", "Accountability"],
  "10:4": ["Learner strengths", "Barriers", "Adjustments", "Accountability"],
  "10:5": ["Learner strengths", "Barriers", "Adjustments", "Accountability"],
  "12:1": ["Emotional exhaustion", "Increased impatience", "Loss of empathy", "Chronic fatigue", "All of the above"],
  "12:2": ["Lack of discipline", "A normal experience needing no attention", "A possible early sign of burnout", "Lower expectations"],
  "12:3": ["Take full responsibility alone", "Ignore stress", "Collaborate with colleagues", "Avoid parents"],
  "12:4": ["Stop caring", "Protect wellbeing while supporting learners", "Reduce responsibility", "Avoid difficult situations"],
  "12:5": ["Solve every challenge alone", "Treat learner struggle as teacher failure", "Small progress is meaningful", "Expect inclusion to remove every challenge", "Ask one student to do all group work"]
});

const formatAnswer = (page, answer) => {
  if (!Array.isArray(answer)) return toText(answer);
  return answer.map((item, index) => {
    const stepId = Number(item?.stepId ?? item?.id ?? index + 1);
    const value = item?.value !== undefined ? item.value : item;
    if (page === 8 && stepId >= 2 && stepId <= 8) {
      const rawLabel = toText(value);
      return rawLabel ? `Step ${stepId}: ${LABELS[Number(rawLabel) - 1] || rawLabel}` : "";
    }
    const raw = toText(value);
    const label = OPTIONS[`${page}:${stepId}`]?.[Number(raw) - 1] || raw;
    if (label) return `Step ${stepId}: ${label}`;
    if (value && typeof value === "object") {
      const fields = Object.entries(value).map(([key, entry]) => `${key}: ${toText(entry)}`).filter((line) => !line.endsWith(": "));
      return fields.length ? `Step ${stepId}: ${fields.join("; ")}` : "";
    }
    return "";
  }).filter(Boolean).join("\n");
};
const buildTot2Week5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 2 Week 5 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGE_DEFINITIONS.flatMap(([page, activityLabel, question]) => {
    const activity = byPage.get(page); const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-2:week:5:page:${page}`, activityLabel, question, answer, responseType: "multi_step" }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "tot-2", courseTitle: "TOT 2", weekNumber: 5, weekTitle: "Collaboration, Support Systems, and Inclusive Implementation", guidance: WEEK_5_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid TOT 2 Week 5 feedback request: ${error.message}`);
  return value;
};
const applyTot2Week5Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const tot2Week5Integration = Object.freeze({ buildRequest: buildTot2Week5Request, applyFeedback: applyTot2Week5Feedback });
module.exports = { applyTot2Week5Feedback, buildTot2Week5Request, tot2Week5Integration };
