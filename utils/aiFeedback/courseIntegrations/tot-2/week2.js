const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_2_GUIDANCE } = require("./context");

const PAGE_DEFINITIONS = Object.freeze([
  [2, "Activity 1", "Describe how you want SEND learners to feel and reflect on your usual first response to struggle or challenging behaviour."],
  [4, "Activity 2", "Reflect honestly on reactions or assumptions you have noticed in your teaching."],
  [6, "Activity 3", "Identify the learner strength demonstrated in each scenario."],
  [8, "Activity 4", "Classify each teacher response as empathy or compassion."],
  [10, "Activity 5", "Identify possible needs behind challenging behaviour and name one change you will make in your response."]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGE_DEFINITIONS.map(([page]) => [`tot-2:week:2:page:${page}`, page])));

const OPTIONS = Object.freeze({
  "2:2": ["I try to understand what the learner might be experiencing", "I focus on correcting the behaviour quickly", "I feel unsure about how to respond", "I try to support the learner but sometimes feel frustrated"],
  "6:2": ["Deep curiosity and engagement", "Disruptive behaviour", "Lack of focus", "Attention seeking"],
  "6:3": ["Creativity and spatial thinking", "Avoiding work", "Lack of interest in class", "Poor organisation"],
  "6:4": ["Empathy and helping behaviour", "Avoiding tasks", "Seeking attention", "Lack of discipline"],
  "6:5": ["Persistence and determination", "Slow learning", "Poor time management", "Low confidence"],
  "8:2": ["Empathy", "Compassion"],
  "8:3": ["Empathy", "Compassion"],
  "8:4": ["Empathy", "Compassion"],
  "8:5": ["Empathy", "Compassion"],
  "10:1": ["Sensory sensitivity", "A quieter learning space", "Lack of interest in the activity", "Poor behaviour", "Attention seeking"],
  "10:2": ["Cognitive overload", "The task may feel too difficult", "Disobedience", "Laziness", "Distraction"],
  "10:3": ["Need for predictability or structure", "Advance warning about changes", "Lack of discipline", "Disinterest in the lesson", "Peer conflict"]
});
const CHECKBOX_OPTIONS = Object.freeze([
  "Assumed a learner was lazy when they struggled to complete work",
  "Thought a learner was disrespectful when they avoided participating",
  "Assumed a quiet learner was doing fine without checking in",
  "Felt frustrated when a learner repeatedly interrupted",
  "Focused more attention on confident learners than quieter learners",
  "Paused to understand what might be happening before reacting"
]);

const describeCheckbox = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (typeof entry === "boolean") return entry ? CHECKBOX_OPTIONS[index] : "";
      const text = toText(entry);
      const optionIndex = Number(text);
      return Number.isInteger(optionIndex) && CHECKBOX_OPTIONS[optionIndex]
        ? CHECKBOX_OPTIONS[optionIndex]
        : text;
    }).filter(Boolean).join("; ");
  }
  if (!value || typeof value !== "object") return toText(value);
  return Object.entries(value).filter(([, selected]) => Boolean(selected)).map(([key]) => {
    const index = Number(key);
    return CHECKBOX_OPTIONS[index] || key;
  }).join("; ");
};

const formatAnswer = (page, answer) => {
  if (!Array.isArray(answer)) return toText(answer);
  return answer.map((item, index) => {
    const stepId = Number(item?.stepId ?? item?.id ?? index + 1);
    const value = item?.value !== undefined ? item.value : item;
    if (page === 4 && stepId === 2) {
      const selected = describeCheckbox(value?.checkboxAnswers ?? value);
      const other = toText(value?.textAnswer);
      return [selected && `Selected: ${selected}`, other && `Other reflection: ${other}`].filter(Boolean).join("\n");
    }
    const raw = toText(value);
    const optionIndex = Number(raw) - 1;
    const label = OPTIONS[`${page}:${stepId}`]?.[optionIndex] || raw;
    if (label) return `Step ${stepId}: ${label}`;
    if (value && typeof value === "object") {
      const fields = Object.entries(value).map(([key, entry]) => `${key}: ${toText(entry)}`).filter((line) => !line.endsWith(": "));
      return fields.length ? `Step ${stepId}: ${fields.join("; ")}` : "";
    }
    return "";
  }).filter(Boolean).join("\n");
};

const buildTot2Week2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 2 Week 2 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGE_DEFINITIONS.flatMap(([page, activityLabel, question]) => {
    const activity = byPage.get(page);
    const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-2:week:2:page:${page}`, activityLabel, question, answer, responseType: "multi_step" }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "tot-2", courseTitle: "TOT 2", weekNumber: 2, weekTitle: "The Inclusive Mindset: Empathy and Compassion", guidance: WEEK_2_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid TOT 2 Week 2 feedback request: ${error.message}`);
  return value;
};

const applyTot2Week2Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const tot2Week2Integration = Object.freeze({ buildRequest: buildTot2Week2Request, applyFeedback: applyTot2Week2Feedback });
module.exports = { applyTot2Week2Feedback, buildTot2Week2Request, tot2Week2Integration };
