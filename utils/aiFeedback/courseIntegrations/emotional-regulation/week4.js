const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_4_GUIDANCE } = require("./context");

const PAGES = Object.freeze([[2, "Activity 1", "What do you remember about the SONAR method?", "reflection"], [4, "Activity 2", "Describe how you coped with each emotion and classify the action as healthy or unhealthy.", "multi_step"]]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGES.map(([page]) => [`emotional-regulation:week:4:page:${page}`, page])));
const formatAnswer = (page, answer) => {
  if (page === 2) return toText(answer);
  if (!Array.isArray(answer)) return "";
  return answer.flatMap((item) => Object.entries(item?.value || {})).map(([key, value]) => `${key}: ${toText(value)}`).filter((line) => !line.endsWith(": ")).join("\n");
};
const buildEmotionalRegulationWeek4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Emotional Regulation Week 4 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGES.flatMap(([page, activityLabel, question, responseType]) => {
    const activity = byPage.get(page); const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `emotional-regulation:week:4:page:${page}`, activityLabel, question, answer, responseType }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "emotional-regulation", courseTitle: "Emotional Regulation", weekNumber: 4, weekTitle: "Introduction to Coping Skills", guidance: WEEK_4_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Emotional Regulation Week 4 feedback request: ${error.message}`);
  return value;
};
const applyEmotionalRegulationWeek4Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const emotionalRegulationWeek4Integration = Object.freeze({ buildRequest: buildEmotionalRegulationWeek4Request, applyFeedback: applyEmotionalRegulationWeek4Feedback });
module.exports = { applyEmotionalRegulationWeek4Feedback, buildEmotionalRegulationWeek4Request, emotionalRegulationWeek4Integration };
