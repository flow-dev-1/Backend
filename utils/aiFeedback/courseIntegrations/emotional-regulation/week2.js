const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_2_GUIDANCE } = require("./context");

const PAGES = Object.freeze([
  [2, "Activity 1", "What do you remember about the Zones of Regulation?", "reflection"],
  [4, "Activity 2", "Match each mood to its Zone of Regulation.", "multi_step"],
  [6, "Activity 3", "Identify the energy level and regulation zone in each scenario.", "multi_step"],
  [8, "Activity 4", "Identify the energy level and regulation zone in each scenario.", "multi_step"]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGES.map(([page]) => [`emotional-regulation:week:2:page:${page}`, page])));
const ZONES = Object.freeze({ A: "Blue", B: "Green", C: "Yellow", D: "Red" });
const ENERGY = Object.freeze({ A: "High", B: "Low" });

const formatStructuredAnswer = (page, answer) => {
  if (page === 2) return toText(answer);
  if (!Array.isArray(answer)) return "";
  return answer.map((item, index) => {
    const value = item?.value;
    if (value && typeof value === "object") {
      const energy = ENERGY[toText(value.energyLevel)] || toText(value.energyLevel);
      const zone = ZONES[toText(value.zone)] || toText(value.zone);
      if (energy || zone) return `Scenario ${index + 1}: energy level ${energy || "not selected"}; zone ${zone || "not selected"}`;
      const selections = Object.values(value).map((entry) => ZONES[toText(entry)] || toText(entry)).filter(Boolean);
      return selections.length ? `Scenario ${index + 1}: ${selections.join(", ")}` : "";
    }
    return `Scenario ${index + 1}: ${ZONES[toText(value)] || toText(value)}`;
  }).filter(Boolean).join("\n");
};

const buildEmotionalRegulationWeek2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Emotional Regulation Week 2 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGES.flatMap(([page, activityLabel, question, responseType]) => {
    const activity = byPage.get(page);
    const answer = formatStructuredAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `emotional-regulation:week:2:page:${page}`, activityLabel, question, answer, responseType }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "emotional-regulation", courseTitle: "Emotional Regulation", weekNumber: 2, weekTitle: "Identifying Energy Levels", guidance: WEEK_2_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Emotional Regulation Week 2 feedback request: ${error.message}`);
  return value;
};

const applyEmotionalRegulationWeek2Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const emotionalRegulationWeek2Integration = Object.freeze({ buildRequest: buildEmotionalRegulationWeek2Request, applyFeedback: applyEmotionalRegulationWeek2Feedback });
module.exports = { applyEmotionalRegulationWeek2Feedback, buildEmotionalRegulationWeek2Request, emotionalRegulationWeek2Integration };
