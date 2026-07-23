const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_1_GUIDANCE } = require("./context");

const PAGES = Object.freeze([
  [2, "Activity 1", "What do you think regulation means?"],
  [4, "Activity 2", "What does emotional regulation mean?"],
  [6, "Activity 3", "List emotions you know."],
  [8, "Activity 4", "What do you think about the Blue Zone?"],
  [10, "Activity 5", "What do you think about the Green Zone?"],
  [12, "Activity 6", "What do you think about the Yellow Zone?"],
  [14, "Activity 7", "What do you think about the Red Zone?"],
  [15, "Activity 8", "Which Zone of Regulation are you in today?"]
]);
const TARGET_PAGES = Object.freeze(Object.fromEntries(PAGES.map(([page]) =>
  [`emotional-regulation:week:1:page:${page}`, page]
)));
const ZONES = Object.freeze({ A: "Blue Zone", B: "Green Zone", C: "Yellow Zone", D: "Red Zone" });
const REGULATION_OPTIONS = Object.freeze({
  A: "Keeping all your emotions hidden so no one can see how you feel",
  B: "A type of game where you guess how other people are feeling",
  C: "Adjusting your emotions, actions, or body to match what is happening around you",
  D: "A way to make sure everyone does the same thing at the same time"
});

const formatAnswer = (page, answer) => {
  if (page === 2) return REGULATION_OPTIONS[toText(answer)] || toText(answer);
  if (page === 15) return ZONES[toText(answer)] || toText(answer);
  if (Array.isArray(answer)) {
    return answer
      .map((item) => toText(item?.value !== undefined ? item.value : item))
      .filter(Boolean)
      .join(", ");
  }
  return toText(answer);
};

const buildEmotionalRegulationWeek1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("Emotional Regulation Week 1 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const targets = PAGES.flatMap(([page, activityLabel, question]) => {
    const activity = byPage.get(page);
    const answer = formatAnswer(page, activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `emotional-regulation:week:1:page:${page}`, activityLabel, question, answer,
      responseType: [2, 15].includes(page) ? "single_select" : "reflection" }];
  });
  if (!targets.length) return null;
  const request = { requestId, context: { courseKey: "emotional-regulation", courseTitle: "Emotional Regulation", weekNumber: 1, weekTitle: "Introduction to Emotional Regulation", guidance: WEEK_1_GUIDANCE }, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) throw new TypeError(`Invalid Emotional Regulation Week 1 feedback request: ${error.message}`);
  return value;
};

const applyEmotionalRegulationWeek1Feedback = ({ activities, response }) => applyPageFeedback({ activities, results: response?.results, targetPages: TARGET_PAGES });
const emotionalRegulationWeek1Integration = Object.freeze({ buildRequest: buildEmotionalRegulationWeek1Request, applyFeedback: applyEmotionalRegulationWeek1Feedback });
module.exports = { applyEmotionalRegulationWeek1Feedback, buildEmotionalRegulationWeek1Request, emotionalRegulationWeek1Integration };
