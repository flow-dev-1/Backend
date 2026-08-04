const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_5_GUIDANCE } = require("./context");

const TARGET_PAGES = Object.freeze({ "emotional-regulation:week:5:page:2": 2 });
const formatZones = (answer) => {
  if (!Array.isArray(answer)) return "";
  const value = answer.find((item) => item?.value && typeof item.value === "object")?.value;
  if (!value) return "";
  return ["blue", "green", "yellow", "red"].map((zone) => {
    const skills = Array.isArray(value[zone]) ? value[zone].map(toText).filter(Boolean) : [];
    return skills.length ? `${zone[0].toUpperCase()}${zone.slice(1)} Zone: ${skills.join(", ")}` : "";
  }).filter(Boolean).join("\n");
};
const buildEmotionalRegulationWeek5Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Emotional Regulation Week 5 activities must be an array");
  const activity = activities.find((item) => Number(item?.page) === 2);
  const answer = formatZones(activity?.answer);
  if (!activity || !answer || hasExistingFeedback(activity.feedback)) return null;
  const request = { requestId, context: { courseKey: "emotional-regulation", courseTitle: "Emotional Regulation", weekNumber: 5, weekTitle: "Wrapping Up", guidance: WEEK_5_GUIDANCE }, targets: [{ targetId: "emotional-regulation:week:5:page:2", activityLabel: "Activity 1", question: "Sort the coping skills into the regulation zones they can support.", answer, responseType: "drag_and_drop" }] };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Emotional Regulation Week 5 feedback request: ${error.message}`);
  return value;
};
const applyEmotionalRegulationWeek5Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const emotionalRegulationWeek5Integration = Object.freeze({ buildRequest: buildEmotionalRegulationWeek5Request, applyFeedback: applyEmotionalRegulationWeek5Feedback });
module.exports = { applyEmotionalRegulationWeek5Feedback, buildEmotionalRegulationWeek5Request, emotionalRegulationWeek5Integration };
