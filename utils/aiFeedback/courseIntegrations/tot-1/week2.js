const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_2_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "tot-1",
  courseTitle: "TOT 1",
  weekNumber: 2,
  weekTitle: "Self-Awareness and Emotional Regulation",
  guidance: WEEK_2_GUIDANCE
});

const PAGE_TARGETS = Object.freeze({
  "tot-1:week:2:page:2": 2,
  "tot-1:week:2:page:6": 6,
  "tot-1:week:2:page:8": 8
});

const SONAR_STEPS = Object.freeze(["STOP", "OBSERVE", "NAME", "ASK", "REGULATE"]);
const STEP_TARGETS = Object.freeze({
  ...Object.fromEntries(Array.from({ length: 15 }, (_, index) => [
    `tot-1:week:2:page:14:step:${index + 1}`,
    { page: 14, stepId: index + 1 }
  ])),
  ...Object.fromEntries([3, 5, 7, 9, 10, 11].map((stepId) => [
    `tot-1:week:2:page:16:step:${stepId}`,
    { page: 16, stepId }
  ]))
});

const TRIGGERS = Object.freeze([
  "A student refuses to follow instructions during a lesson",
  "A colleague dismisses your idea in a staff meeting",
  "A student constantly interrupts while you are speaking",
  "A parent questions your teaching methods",
  "A student makes a disrespectful comment about your appearance",
  "Your head of department gives unexpected negative feedback",
  "A student rolls their eyes and mutters something rude",
  "A last-minute schedule change disrupts your plans",
  "A student deliberately provokes others during group work",
  "A colleague blames you for an issue that was not your fault"
]);

const RANKING_SCENARIOS = Object.freeze([
  "A student rolls their eyes and says the lesson is boring.",
  "A student starts crying in the middle of class.",
  "A student becomes defensive and raises their voice during group work.",
  "A student shuts down after receiving 40% on a project."
]);

const RANKING_OPTIONS = Object.freeze({
  response_1: "Ignore the behaviour",
  response_2: "Call the student out in front of the class",
  response_3: "Acknowledge their feelings and redirect focus",
  response_4: "Speak with the student privately after class"
});

const getDragValue = (answer) => Array.isArray(answer)
  ? answer.find((item) => item?.value && typeof item.value === "object" && !Array.isArray(item.value))?.value
  : null;

const bucketForIndex = (value, index) => Object.entries(value || {})
  .find(([, entries]) => Array.isArray(entries) && entries.map(Number).includes(index))?.[0] || "Unplaced";

const formatTriggers = (answer) => {
  const value = getDragValue(answer);
  if (!value) return "";
  const labels = { green: "Mildly triggering", orange: "Frustrating", red: "Highly triggering" };
  return TRIGGERS.map((trigger, index) => `${trigger}: ${labels[bucketForIndex(value, index)] || bucketForIndex(value, index)}`).join("\n");
};

const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) => Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value)));

const addStepTarget = (targets, activity, { page, stepId, activityLabel, question, answer, responseType }) => {
  const text = toText(answer);
  if (!activity || !text || hasStepFeedback(activity.feedback, stepId)) return;
  targets.push({
    targetId: `tot-1:week:2:page:${page}:step:${stepId}`,
    activityLabel,
    question,
    answer: text,
    responseType
  });
};

const formatRanking = (rankings) => Object.keys(rankings || {})
  .sort((a, b) => Number(a) - Number(b))
  .map((rank) => `${rank}. ${RANKING_OPTIONS[rankings[rank]] || rankings[rank]}`)
  .join("\n");

const buildTot1Week2Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 1 Week 2 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const pageDefinitions = [
    [2, "Activity 1", "What do you remember from last week?", "reflection", (answer) => toText(answer)],
    [6, "Activity 2", "Sort the classroom situations by how strongly they trigger you.", "drag_and_drop", formatTriggers],
    [8, "Activity 3", "Which triggers were common for you, and do teachers share these triggers? Why?", "reflection", (answer) => toText(answer)]
  ];
  const targets = pageDefinitions.flatMap(([page, activityLabel, question, responseType, formatter]) => {
    const activity = byPage.get(page);
    const answer = formatter(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-1:week:2:page:${page}`, activityLabel, question, answer, responseType }];
  });

  const sonarActivity = byPage.get(14);
  const sonarAnswer = sonarActivity?.answer;
  [1, 2, 3].forEach((scenarioNumber) => {
    const scenario = sonarAnswer?.[`scenario_${scenarioNumber}`];
    SONAR_STEPS.forEach((stage, stageIndex) => {
      const stepId = (scenarioNumber - 1) * 5 + stageIndex + 1;
      const scenarioContext = scenario?.scenario || `Scenario ${scenarioNumber}`;
      addStepTarget(targets, sonarActivity, {
        page: 14,
        stepId,
        activityLabel: `Activity 4 - Scenario ${scenarioNumber} - ${stage}`,
        question: `For ${scenarioContext}, explain the ${stage} stage of the SONAR pathway.`,
        answer: scenario?.sonar?.[String(stageIndex + 1)],
        responseType: "reflection"
      });
    });
  });

  const rankingActivity = byPage.get(16);
  [3, 5, 7, 9].forEach((stepId, index) => addStepTarget(targets, rankingActivity, {
    page: 16,
    stepId,
    activityLabel: `Activity 5 - Scenario ${index + 1}`,
    question: `Rank the teacher responses for this scenario: ${RANKING_SCENARIOS[index]}`,
    answer: formatRanking(rankingActivity?.answer?.[`step_${stepId}`]?.rankings),
    responseType: "ranking"
  }));
  [10, 11].forEach((stepId, index) => addStepTarget(targets, rankingActivity, {
    page: 16,
    stepId,
    activityLabel: `Activity 5 - Reflection ${index + 1}`,
    question: index === 0 ? "Which response encourages self-regulation?" : "Which response might escalate the situation?",
    answer: rankingActivity?.answer?.[`step_${stepId}`]?.answer,
    responseType: "reflection"
  }));

  if (!targets.length) return null;
  const { error, value } = validateGenerationRequest({ requestId, context: CONTEXT, targets });
  if (error) throw new TypeError(`Invalid TOT 1 Week 2 feedback request: ${error.message}`);
  return value;
};

const applyTot1Week2Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const pageResults = results.filter(({ targetId }) => PAGE_TARGETS[targetId]);
  const stepResults = results.filter(({ targetId }) => STEP_TARGETS[targetId]);
  if (pageResults.length + stepResults.length !== results.length) {
    const unknown = results.find(({ targetId }) => !PAGE_TARGETS[targetId] && !STEP_TARGETS[targetId]);
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }
  const updated = applyPageFeedback({ activities, results: pageResults, targetPages: PAGE_TARGETS });
  const byPage = new Map();
  stepResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = toText(result.feedback);
    if (result.status !== "ready" || !feedback) throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    const { page, stepId } = STEP_TARGETS[result.targetId];
    if (!byPage.has(page)) byPage.set(page, new Map());
    byPage.get(page).set(stepId, feedback);
  });
  return updated.map((activity) => {
    const additions = byPage.get(Number(activity?.page));
    if (!additions) return activity;
    const feedback = Array.isArray(activity.feedback) ? activity.feedback.map((item) => ({ ...item })) : [];
    additions.forEach((value, stepId) => {
      const existing = feedback.find((item) => Number(item?.stepId) === stepId);
      if (existing) existing.value = value;
      else feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const tot1Week2Integration = Object.freeze({
  buildRequest: buildTot1Week2Request,
  applyFeedback: applyTot1Week2Feedback
});

module.exports = {
  applyTot1Week2Feedback,
  buildTot1Week2Request,
  tot1Week2Integration
};
