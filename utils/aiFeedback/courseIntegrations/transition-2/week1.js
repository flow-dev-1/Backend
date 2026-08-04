const { validateGenerationRequest } = require("../../contracts");
const {
  formatSelections,
  hasExistingFeedback,
  toText
} = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");

const CONTEXT = Object.freeze({
  courseKey: "transition-2",
  courseTitle: "Transition 2",
  weekNumber: 1,
  weekTitle: "Defining Your Next Chapter"
});

const TARGET_PAGES = Object.freeze({
  "transition-2:week:1:page:2": 2,
  "transition-2:week:1:page:4": 4,
  "transition-2:week:1:page:6": 6,
  "transition-2:week:1:page:8": 8,
  "transition-2:week:1:page:10": 10
});

const SCENARIO_TARGETS = Object.freeze({
  "transition-2:week:1:page:12:step:2": 2,
  "transition-2:week:1:page:12:step:4": 4,
  "transition-2:week:1:page:12:step:6": 6,
  "transition-2:week:1:page:12:step:8": 8
});

const WHY_OPTIONS = Object.freeze([
  "Because it's expected of me",
  "To build a future career",
  "To discover who I am",
  "To gain independence",
  "Others"
]);

const FUTURE_SELF_OPTIONS = Object.freeze([
  "Confident",
  "Independent",
  "Discplined",
  "Social",
  "Curious",
  "Resilent",
  "Creative",
  "Leader"
]);

const SCENARIOS = Object.freeze([
  {
    answerKey: 2,
    text: "You got admission into university to study a particular course, but an important required course is dull, technical, and difficult, and your grades begin to drop.",
    question: "Does your why give you enough motivation to push through these tough and boring classes so you can graduate with a good result?"
  },
  {
    answerKey: 4,
    text: "You receive a fully paid, year-long volunteer or travel opportunity abroad, but accepting it means taking a full year off school.",
    question: "Is your why for going to university strong enough to keep you focused on your long-term goal, or would this exciting opportunity pull you away?"
  },
  {
    answerKey: 6,
    text: "A respected lecturer says you do not have what it takes to succeed in your chosen field and suggests switching majors or leaving the programme.",
    question: "Is your why strong enough to help you rise above criticism and prove your abilities, or does this discouragement make you question your entire purpose?"
  },
  {
    answerKey: 8,
    text: "Your best friend attends a different school and asks you to transfer or move closer because your choice of university is affecting the friendship.",
    question: "Does your why for attending this university and pursuing your goals matter more than the short-term comfort of staying close to your friend?"
  }
]);

const formatVisionAnswer = (answer) => {
  if (!answer || typeof answer !== "object") return "";

  const parts = [];
  const reason = toText(answer.textAnswer);
  const sentenceReason = toText(answer.sentenceAnswer?.reason);
  const identity = toText(answer.sentenceAnswer?.identity);

  if (reason) parts.push(`Reason for the next step: ${reason}`);
  if (sentenceReason) parts.push(`Because: ${sentenceReason}`);
  if (identity) parts.push(`Person I want to become: ${identity}`);

  return parts.join("\n");
};

const hasScenarioFeedback = (feedback, stepId) => {
  if (!Array.isArray(feedback)) return false;
  return feedback.some(
    (item) => Number(item?.stepId) === stepId && hasExistingFeedback(item?.value)
  );
};

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "What's next for you after year 12?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "On a scale of 1-5, how nervous are you about your next step?",
    responseType: "single_select",
    formatAnswer: (answer) => {
      const value = toText(answer);
      return value ? `${value} out of 5` : "";
    }
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "Why do you want to go to the University/College?",
    responseType: "multi_select",
    formatAnswer: (answer) =>
      formatSelections(answer, WHY_OPTIONS, "Selected reasons", "Other reason")
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "Choose 3-4 that best describe your future self.",
    responseType: "multi_select",
    formatAnswer: (answer) =>
      formatSelections(answer, FUTURE_SELF_OPTIONS, "Future-self qualities", "Other quality")
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "Why are you making this particular decision for your next step after secondary school? Complete the reflection about why you are choosing higher education or further training and the person you want to become.",
    responseType: "multi_step",
    formatAnswer: formatVisionAnswer
  }
]);

const buildTransition2Week1Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Transition 2 Week 1 activities must be an array");
  }

  const activitiesByPage = new Map(
    activities.map((activity) => [Number(activity?.page), activity])
  );

  const targets = DEFINITIONS.flatMap((definition) => {
    const activity = activitiesByPage.get(definition.page);
    if (!activity || hasExistingFeedback(activity.feedback)) return [];

    const answer = definition.formatAnswer(activity.answer);
    if (!answer) return [];

    return [{
      targetId: `transition-2:week:1:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const scenarioActivity = activitiesByPage.get(12);
  if (scenarioActivity) {
    SCENARIOS.forEach((scenario, index) => {
      const answer = toText(scenarioActivity.answer?.[scenario.answerKey]);
      if (!answer || hasScenarioFeedback(scenarioActivity.feedback, scenario.answerKey)) {
        return;
      }

      targets.push({
        targetId: `transition-2:week:1:page:12:step:${scenario.answerKey}`,
        activityLabel: `Activity 6 - Scenario ${index + 1}`,
        question: `Scenario ${index + 1}: ${scenario.text}\nChallenge: ${scenario.question}`,
        answer,
        responseType: "reflection"
      });
    });
  }

  if (!targets.length) return null;

  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);

  if (error) {
    throw new TypeError(`Invalid Transition 2 Week 1 feedback request: ${error.message}`);
  }

  return value;
};

const applyTransition2Week1Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) {
    throw new TypeError("Feedback results must be an array");
  }

  const pageResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId)
  );
  const scenarioResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(SCENARIO_TARGETS, targetId)
  );
  const knownResultCount = pageResults.length + scenarioResults.length;
  if (knownResultCount !== results.length) {
    const unknown = results.find(
      ({ targetId }) =>
        !Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId) &&
        !Object.prototype.hasOwnProperty.call(SCENARIO_TARGETS, targetId)
    );
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }

  const updated = applyPageFeedback({
    activities,
    results: pageResults,
    targetPages: TARGET_PAGES
  });

  if (!scenarioResults.length) return updated;

  const scenarioActivityCount = updated.filter(
    (activity) => Number(activity?.page) === 12
  ).length;
  if (scenarioActivityCount !== 1) {
    throw new TypeError("Scenario feedback targets must map to exactly one saved activity");
  }

  const seenTargets = new Set();
  const feedbackByStep = new Map();
  scenarioResults.forEach((result) => {
    if (seenTargets.has(result.targetId)) {
      throw new TypeError(`Invalid or duplicate feedback target: ${result.targetId}`);
    }
    seenTargets.add(result.targetId);

    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    feedbackByStep.set(SCENARIO_TARGETS[result.targetId], feedback);
  });

  return updated.map((activity) => {
    if (Number(activity?.page) !== 12 || !feedbackByStep.size) return activity;
    const existingFeedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];

    feedbackByStep.forEach((value, stepId) => {
      if (hasScenarioFeedback(existingFeedback, stepId)) return;
      existingFeedback.push({ stepId, value });
    });

    return { ...activity, feedback: existingFeedback };
  });
};

const transition2Week1Integration = Object.freeze({
  buildRequest: buildTransition2Week1Request,
  applyFeedback: applyTransition2Week1Feedback
});

module.exports = {
  applyTransition2Week1Feedback,
  buildTransition2Week1Request,
  transition2Week1Integration
};
