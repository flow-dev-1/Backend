const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_4_GUIDANCE } = require("./context");

const PAGE_DEFINITIONS = Object.freeze([
  [1, "Activity 1", "Reflect on your first instinct when a learner displays challenging behaviour."],
  [3, "Activity 2", "Match each classroom behaviour to a possible learning or regulation barrier."],
  [5, "Activity 3", "Choose the most supportive response to a learner overwhelmed by a difficult task."],
  [7, "Activity 4", "Choose supportive responses for routine change and sensory overload."],
  [9, "Activity 5", "Choose supportive ADHD strategies and identify a harmful teacher response."],
  [11, "Activity 6", "Choose an accessible response for a learner who struggles to read a worksheet."],
  [13, "Activity 7", "Match dysgraphia supports to learner needs and choose an inclusive response to writing frustration."]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGE_DEFINITIONS.map(([page]) => [`tot-2:week:4:page:${page}`, page])));
const OPTIONS = Object.freeze({
  "1:1": ["Correct the behaviour immediately", "Ask what might be wrong", "Ignore the behaviour", "Feel unsure how to respond"],
  "3:2": ["Reading difficulty", "Attention regulation difficulty", "Cognitive overload", "Difficulty with transitions"],
  "3:3": ["Reading difficulty", "Attention regulation difficulty", "Cognitive overload", "Difficulty with transitions"],
  "3:4": ["Reading difficulty", "Attention regulation difficulty", "Cognitive overload", "Difficulty with transitions"],
  "3:5": ["Reading difficulty", "Attention regulation difficulty", "Cognitive overload", "Difficulty with transitions"],
  "5:1": ["Tell the learner to finish immediately", "Break the task into smaller steps", "Send the learner out", "Ignore the situation"],
  "7:1": ["Provide advance warning", "Tell the learner to stop reacting", "Ignore the distress", "Remove the learner"],
  "7:2": ["Reduce noise and speak calmly", "Raise the teacher's voice", "Punish the behaviour", "Ignore the learner"],
  "9:1": ["Punish the student", "Allow structured movement breaks", "Ignore the behaviour", "Remove the student"],
  "9:2": ["It ignores the learner's regulation difficulty", "The learner should try harder", "The class should wait longer", "Assign extra homework"],
  "11:1": ["Offer an audio version", "Ask the learner to read faster", "Reduce the objective", "Remove the learner"],
  "13:1": ["Allow typing", "Oral responses", "Graphic organisers"],
  "13:2": ["Allow typing", "Oral responses", "Graphic organisers"],
  "13:3": ["Allow typing", "Oral responses", "Graphic organisers"],
  "13:4": ["Allow another way to show understanding", "Force the learner to finish writing", "Remove the learner", "Ignore the behaviour"]
});

const formatAnswer = (page, answer) => {
  if (!Array.isArray(answer)) return toText(answer);
  return answer.map((item, index) => {
    const stepId = Number(item?.stepId ?? item?.id ?? index + 1);
    const raw = toText(item?.value !== undefined ? item.value : item);
    const label = OPTIONS[`${page}:${stepId}`]?.[Number(raw) - 1] || raw;
    return label ? `Step ${stepId}: ${label}` : "";
  }).filter(Boolean).join("\n");
};
const buildTot2Week4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 2 Week 4 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGE_DEFINITIONS.flatMap(([page, activityLabel, question]) => {
    const activity = byPage.get(page); const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-2:week:4:page:${page}`, activityLabel, question, answer, responseType: "multi_step" }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "tot-2", courseTitle: "TOT 2", weekNumber: 4, weekTitle: "Practical Strategies for Supporting Students with Common Special Needs", guidance: WEEK_4_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid TOT 2 Week 4 feedback request: ${error.message}`);
  return value;
};
const applyTot2Week4Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const tot2Week4Integration = Object.freeze({ buildRequest: buildTot2Week4Request, applyFeedback: applyTot2Week4Feedback });
module.exports = { applyTot2Week4Feedback, buildTot2Week4Request, tot2Week4Integration };
