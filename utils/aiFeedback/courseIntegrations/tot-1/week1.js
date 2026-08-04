const { validateGenerationRequest } = require("../../contracts");
const { hasExistingFeedback, toText } = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");
const { WEEK_1_GUIDANCE } = require("./context");

const CONTEXT = Object.freeze({
  courseKey: "tot-1",
  courseTitle: "TOT 1",
  weekNumber: 1,
  weekTitle: "Understanding SEL and Positive Psychology",
  guidance: WEEK_1_GUIDANCE
});

const PAGE_TARGETS = Object.freeze({
  "tot-1:week:1:page:6": 6,
  "tot-1:week:1:page:8": 8,
  "tot-1:week:1:page:12": 12,
  "tot-1:week:1:page:16": 16,
  "tot-1:week:1:page:20": 20,
  "tot-1:week:1:page:22": 22
});

const STEP_TARGETS = Object.freeze({
  ...Object.fromEntries([1, 2, 3].map((stepId) => [
    `tot-1:week:1:page:10:step:${stepId}`, { page: 10, stepId }
  ])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, index) => index + 2).map((stepId) => [
    `tot-1:week:1:page:14:step:${stepId}`, { page: 14, stepId }
  ])),
  ...Object.fromEntries([2, 3, 4].map((stepId) => [
    `tot-1:week:1:page:18:step:${stepId}`, { page: 18, stepId }
  ])),
  ...Object.fromEntries([2, 3].map((stepId) => [
    `tot-1:week:1:page:23:step:${stepId}`, { page: 23, stepId }
  ]))
});

const SELF_CHECK_STATEMENTS = Object.freeze([
  "Felt frustrated because a student was not listening",
  "Raised their voice at a student out of frustration",
  "Dismissed a student's emotions as overreacting",
  "Judged a student's ability too quickly",
  "Assumed a student was lazy without knowing their struggles",
  "Struggled with self-care because of work stress",
  "Felt overwhelmed by teaching responsibilities",
  "Felt unappreciated as a teacher",
  "Wanted better tools to support students emotionally",
  "Doubted their impact on students"
]);

const SEL_SCENARIOS = Object.freeze([
  {
    question: "A student repeatedly interrupts the lesson.",
    options: ["Call them out in front of the class", "Caution them kindly, then speak privately after class"]
  },
  {
    question: "A shy student rarely participates.",
    options: ["Let them stay quiet", "Find supportive ways to build their confidence"]
  },
  {
    question: "A student fails a test and feels discouraged.",
    options: ["Tell them to work harder", "Recognise progress and help create an improvement plan"]
  }
]);

const COMPETENCY_SCENARIOS = Object.freeze([
  "A student recognises anxiety before tests and talks to the teacher",
  "A teacher asks students to identify their feelings and reasons",
  "A teacher notices overwhelm and pauses before responding",
  "A frustrated student takes deep breaths instead of giving up",
  "A student invites a classmate sitting alone to join the group",
  "A teacher adapts teaching to a student's cultural background",
  "Two students resolve a group-project disagreement through discussion",
  "A teacher models active listening",
  "A teacher asks students to consider long-term consequences",
  "A student attends intervention class instead of a social hangout"
]);

const COMPETENCY_OPTIONS = Object.freeze({
  A: "Self-Awareness",
  B: "Self-Management",
  C: "Social Awareness",
  D: "Relationship Skills",
  E: "Responsible Decision-Making"
});

const STRENGTH_SCENARIOS = Object.freeze([
  "A student helps a classmate solve a maths problem",
  "A student stands up for a friend being teased",
  "A student organises their group's project work"
]);

const REFRAME_SCENARIOS = Object.freeze([
  "I sometimes doubt whether I am making a real difference in my students' lives",
  "There is never enough time to finish everything, and I feel overwhelmed"
]);

const getEntry = (answer, stepId) => Array.isArray(answer)
  ? answer.find((item, index) =>
    Number(item?.stepId ?? item?.id ?? index + 1) === Number(stepId)
  )
  : undefined;

const getEntryValue = (answer, stepId) => {
  const entry = getEntry(answer, stepId);
  return entry?.value !== undefined ? entry.value : entry;
};

const formatList = (answer) => Array.isArray(answer)
  ? answer.map((item, index) => {
    const value = toText(item?.value ?? item);
    return value ? `${index + 1}. ${value}` : "";
  }).filter(Boolean).join("\n")
  : "";

const getDragValue = (answer) => {
  if (!Array.isArray(answer)) return null;
  const value = answer.find((item) => item?.value && typeof item.value === "object")?.value;
  return value && !Array.isArray(value) ? value : null;
};

const bucketForIndex = (dragValue, index) => Object.entries(dragValue || {})
  .find(([, entries]) => Array.isArray(entries) && entries.map(Number).includes(Number(index)))?.[0] || "Unplaced";

const formatSelfCheck = (answer) => {
  const value = getDragValue(answer);
  if (!value) return "";
  return SELF_CHECK_STATEMENTS.map((statement, index) =>
    `${statement}: ${bucketForIndex(value, index)}`
  ).join("\n");
};

const formatSingleSelection = (answer, labels) => {
  if (!Array.isArray(answer)) return "";
  const entry = answer.find((item) => toText(item?.value ?? item));
  const value = toText(entry?.value ?? entry);
  return labels[value] || value;
};

const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) =>
    Number(item?.stepId) === Number(stepId) && Boolean(toText(item?.value))
  );

const addStepTarget = (targets, activity, definition) => {
  if (!activity || hasStepFeedback(activity.feedback, definition.stepId)) return;
  const answer = definition.formatAnswer(activity.answer);
  if (!answer) return;
  targets.push({
    targetId: `tot-1:week:1:page:${definition.page}:step:${definition.stepId}`,
    activityLabel: definition.activityLabel,
    question: definition.question,
    answer,
    responseType: definition.responseType
  });
};

const buildTot1Week1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) throw new TypeError("TOT 1 Week 1 activities must be an array");
  const byPage = new Map(activities.map((activity) => [Number(activity?.page), activity]));
  const pageDefinitions = [
    [6, "Activity 2", "Reflect on ten common emotional experiences in teaching.", "multi_select", formatSelfCheck],
    [8, "Activity 3", "Describe what a classroom without emotional awareness might look like.", "reflection", toText],
    [12, "Activity 5", "How might poor sleep, deadlines, classroom noise, and many questions affect your teaching?", "single_select", (answer) => formatSingleSelection(answer, { 1: "No effect", 2: "Slight impact", 3: "Moderate impact", 4: "Severe impact" })],
    [16, "Activity 7", "List personal strengths.", "reflection", formatList],
    [20, "Activity 9", "List things you are grateful for.", "reflection", formatList],
    [22, "Activity 10", "Which option is not a healthy way to create balance and prioritise teacher well-being?", "single_select", (answer) => formatSingleSelection(answer, { A: "Setting boundaries", B: "Getting enough rest", C: "Always covering for an absent colleague", D: "Practising mindfulness", E: "Taking a moment to breathe" })]
  ];
  const targets = pageDefinitions.flatMap(([page, activityLabel, question, responseType, formatter]) => {
    const activity = byPage.get(page);
    const answer = formatter(activity?.answer);
    if (!activity || !answer || hasExistingFeedback(activity.feedback)) return [];
    return [{ targetId: `tot-1:week:1:page:${page}`, activityLabel, question, answer, responseType }];
  });

  const page10 = byPage.get(10);
  const page10Drag = getDragValue(page10?.answer);
  SEL_SCENARIOS.forEach((scenario, index) => addStepTarget(targets, page10, {
    page: 10,
    stepId: index + 1,
    activityLabel: `Activity 4 - Scenario ${index + 1}`,
    question: scenario.question,
    answer: "",
    responseType: "drag_and_drop",
    formatAnswer: () => scenario.options.map((option, optionIndex) =>
      `${option}: ${bucketForIndex(page10Drag, index * 2 + optionIndex)}`
    ).join("\n")
  }));

  const page14 = byPage.get(14);
  COMPETENCY_SCENARIOS.forEach((question, index) => {
    const stepId = index + 2;
    addStepTarget(targets, page14, {
      page: 14,
      stepId,
      activityLabel: `Activity 6 - Scenario ${index + 1}`,
      question,
      responseType: "single_select",
      formatAnswer: (answer) => {
        const value = toText(getEntryValue(answer, stepId));
        return COMPETENCY_OPTIONS[value] || value;
      }
    });
  });

  const page18 = byPage.get(18);
  STRENGTH_SCENARIOS.forEach((question, index) => {
    const stepId = index + 2;
    addStepTarget(targets, page18, {
      page: 18,
      stepId,
      activityLabel: `Activity 8 - Scenario ${index + 1}`,
      question,
      responseType: "reflection",
      formatAnswer: (answer) => toText(getEntryValue(answer, stepId))
    });
  });

  const page23 = byPage.get(23);
  REFRAME_SCENARIOS.forEach((question, index) => {
    const stepId = index + 2;
    addStepTarget(targets, page23, {
      page: 23,
      stepId,
      activityLabel: `Activity 11 - Reframe ${index + 1}`,
      question: `Reframe this statement using a strengths-based perspective: ${question}`,
      responseType: "reflection",
      formatAnswer: (answer) => toText(getEntryValue(answer, stepId))
    });
  });

  if (!targets.length) return null;
  const { error, value } = validateGenerationRequest({ requestId, context: CONTEXT, targets });
  if (error) throw new TypeError(`Invalid TOT 1 Week 1 feedback request: ${error.message}`);
  return value;
};

const applyTot1Week1Feedback = ({ activities, response }) => {
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
    const pageFeedback = byPage.get(Number(activity?.page));
    if (!pageFeedback) return activity;
    const feedback = Array.isArray(activity.feedback) ? activity.feedback.map((item) => ({ ...item })) : [];
    pageFeedback.forEach((value, stepId) => {
      const existing = feedback.find((item) => Number(item?.stepId) === stepId);
      if (existing) existing.value = value;
      else feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const tot1Week1Integration = Object.freeze({
  buildRequest: buildTot1Week1Request,
  applyFeedback: applyTot1Week1Feedback
});

module.exports = {
  applyTot1Week1Feedback,
  buildTot1Week1Request,
  tot1Week1Integration
};
