const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_3_GUIDANCE } = require("./context");

const PAGE_DEFINITIONS = Object.freeze([
  [1, "Activity 1", "When planning a lesson, what usually comes first for you?", "reflection"],
  [3, "Activity 2", "Sort each statement as a learning barrier or learner variability.", "drag_and_drop"],
  [5, "Activity 3", "What does UDL stand for?", "single_select"],
  [7, "Activity 4", "Choose an inclusive engagement strategy for each learner scenario.", "multi_step"],
  [9, "Activity 5", "Match representation supports to learner needs.", "multi_step"],
  [11, "Activity 6", "Choose flexible action and expression strategies and identify the three UDL principles.", "multi_step"]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGE_DEFINITIONS.map(([page]) => [`tot-2:week:3:page:${page}`, page])));
const OPTIONS = Object.freeze({
  "5:1": ["Universal Design for Learning", "Unified Development Learning", "Understanding Diverse Learners", "Universal Development Lessons"],
  "7:2": ["Continue teaching and expect adaptation", "Add short activities or movement breaks", "Ask the learner to copy more notes", "Ignore the behaviour"],
  "7:3": ["Provide advance notice of changes", "Tell the learner to calm down", "Ignore the anxiety", "Remove the learner"],
  "7:4": ["Introduce small task checkpoints", "Extend the task time", "Remove the learner", "Assign extra work"],
  "7:5": ["Use visuals or interactive discussion", "Repeat the lecture", "Assign more notes", "Move the learner to the back"],
  "7:6": ["Offer group-work options", "Force independent work", "Reduce task difficulty", "Remove collaboration"],
  "9:2": ["Dyslexia", "ADHD", "Intellectual disability"],
  "9:3": ["Dyslexia", "ADHD", "Intellectual disability"],
  "9:4": ["Dyslexia", "ADHD", "Intellectual disability"],
  "11:2": ["A long written essay", "An oral explanation", "A silent timed test", "Copying from the board"],
  "11:3": ["Allow flexible timing", "Increase test pressure", "Remove the assessment", "Ignore the anxiety"],
  "11:4": ["Allow visual diagrams or models", "Require longer written responses", "Reduce the objective", "Remove the learner"],
  "11:5": ["Provide verbal explanation and examples", "Repeat written instructions", "Reduce task difficulty", "Remove the learner"],
  "11:6": ["Allow oral presentations", "Force written responses", "Lower expectations", "Skip the assessment"],
  "11:8": ["Engagement", "Representation", "Action and Expression"],
  "11:9": ["Engagement", "Representation", "Action and Expression"],
  "11:10": ["Engagement", "Representation", "Action and Expression"]
});
const DRAG_ITEMS = Object.freeze([
  "A lesson relies only on long written texts",
  "A learner needs extra time to process information",
  "A test only allows written answers",
  "A learner prefers visual diagrams",
  "Instructions are given only verbally",
  "A learner needs short learning breaks"
]);

const formatAnswer = (page, answer) => {
  if (page === 1) return toText(answer);
  if (!Array.isArray(answer)) return "";
  return answer.map((item, index) => {
    const stepId = Number(item?.stepId ?? item?.id ?? index + 1);
    const value = item?.value !== undefined ? item.value : item;
    if (page === 3 && value && typeof value === "object" && !Array.isArray(value)) {
      return Object.entries(value).map(([bucket, entries]) => {
        const labels = Array.isArray(entries) ? entries.map((entry) => {
          const text = toText(entry); const itemIndex = Number(text);
          return Number.isInteger(itemIndex) && DRAG_ITEMS[itemIndex] ? DRAG_ITEMS[itemIndex] : text;
        }).filter(Boolean) : [];
        return labels.length ? `${bucket}: ${labels.join("; ")}` : "";
      }).filter(Boolean).join("\n");
    }
    const raw = toText(value);
    const label = OPTIONS[`${page}:${stepId}`]?.[Number(raw) - 1] || raw;
    return label ? `Step ${stepId}: ${label}` : "";
  }).filter(Boolean).join("\n");
};

const buildTot2Week3Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 2 Week 3 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGE_DEFINITIONS.flatMap(([page, activityLabel, question, responseType]) => {
    const activity = byPage.get(page); const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-2:week:3:page:${page}`, activityLabel, question, answer, responseType }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "tot-2", courseTitle: "TOT 2", weekNumber: 3, weekTitle: "Designing Learning for Everyone: UDL and Differentiated Instruction", guidance: WEEK_3_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid TOT 2 Week 3 feedback request: ${error.message}`);
  return value;
};
const applyTot2Week3Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const tot2Week3Integration = Object.freeze({ buildRequest: buildTot2Week3Request, applyFeedback: applyTot2Week3Feedback });
module.exports = { applyTot2Week3Feedback, buildTot2Week3Request, tot2Week3Integration };
