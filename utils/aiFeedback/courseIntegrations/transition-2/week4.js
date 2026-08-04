const { validateGenerationRequest } = require("../../contracts");
const {
  getSelectedOptions,
  hasExistingFeedback,
  toText
} = require("../shared/normalizers");
const { applyPageFeedback } = require("../shared/applyPageFeedback");

const CONTEXT = Object.freeze({
  courseKey: "transition-2",
  courseTitle: "Transition 2",
  weekNumber: 4,
  weekTitle: "Freedom and Responsibility"
});

const TARGET_PAGES = Object.freeze(
  Object.fromEntries(
    [2, 4, 6, 8, 10, 14, 16, 18].map((page) => [
      `transition-2:week:4:page:${page}`,
      page
    ])
  )
);

const STEP_TARGETS = Object.freeze({
  "transition-2:week:4:page:12:step:1": { page: 12, stepId: 1 },
  "transition-2:week:4:page:12:step:2": { page: 12, stepId: 2 },
  "transition-2:week:4:page:20:step:1": { page: 20, stepId: 1 },
  "transition-2:week:4:page:20:step:2": { page: 20, stepId: 2 },
  "transition-2:week:4:page:20:step:3": { page: 20, stepId: 3 }
});

const formatChoice = (answer, options) => {
  if (typeof answer === "string") return toText(answer);
  if (!answer || typeof answer !== "object") return "";
  return toText(answer.value) || toText(options[Number(answer.selectedOption)]);
};

const formatOpeningReflection = (answer) => {
  if (!answer || typeof answer !== "object") return "";
  const regret = toText(answer[1] ?? answer["1"]);
  const freedom = toText(answer[2] ?? answer["2"]);
  return [
    regret && `Experience of freedom and regret: ${regret}`,
    freedom && `What university freedom brings to mind: ${freedom}`
  ].filter(Boolean).join("\n");
};

const SOCIAL_SKILLS = Object.freeze([
  "Meeting new people",
  "Saying no to peer pressure",
  "Resolving disagreements calmly",
  "Keeping friendships balanced with academics"
]);

const formatSocialRatings = (answer) => {
  if (!answer?.ratings || typeof answer.ratings !== "object") return "";
  return SOCIAL_SKILLS.map((skill) => {
    const rating = toText(answer.ratings[skill]);
    return rating ? `${skill}: ${rating} out of 5` : "";
  }).filter(Boolean).join("\n");
};

const SELF_AUDIT_OPTIONS = Object.freeze([
  "Attending classes consistently",
  "Balancing work and social life",
  "Managing time",
  "Getting enough rest"
]);

const hasStepFeedback = (feedback, stepId) => Array.isArray(feedback) &&
  feedback.some((item) =>
    Number(item?.stepId) === Number(stepId) && toText(item?.value)
  );

const DEFINITIONS = Object.freeze([
  {
    page: 2,
    activityLabel: "Activity 1",
    question: "Reflect on a time when too much freedom led to a regretted choice, and what university freedom brings to mind.",
    responseType: "multi_step",
    formatAnswer: formatOpeningReflection
  },
  {
    page: 4,
    activityLabel: "Activity 2",
    question: "What does freedom mean to you? Write one word that describes it best.",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 6,
    activityLabel: "Activity 3",
    question: "What is one way you plan to organise your time each week at university?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 8,
    activityLabel: "Activity 4",
    question: "Looking at the example week, what went wrong and what could have been done differently before the week began?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 10,
    activityLabel: "Activity 5",
    question: "What is one financial mistake you think most students make?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 14,
    activityLabel: "Activity 7",
    question: "With an exam in four days and an invitation to go out, what would you do?",
    responseType: "single_select",
    formatAnswer: (answer) => formatChoice(answer, [
      "Go because four days is still enough time.",
      "Decline because exams come first.",
      "Negotiate and attend for two hours maximum.",
      "Join virtually for a short time and remain at home."
    ])
  },
  {
    page: 16,
    activityLabel: "Activity 8",
    question: "Do you study better alone or in a group?",
    responseType: "reflection",
    formatAnswer: toText
  },
  {
    page: 18,
    activityLabel: "Activity 9",
    question: "At which point could James have changed the outcome most effectively?",
    responseType: "single_select",
    formatAnswer: (answer) => formatChoice(answer, [
      "Week 2.", "Week 3.", "Week 4.", "Week 5."
    ])
  }
]);

const buildTransition2Week4Request = ({ requestId, activities }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Transition 2 Week 4 activities must be an array");
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
      targetId: `transition-2:week:4:page:${definition.page}`,
      activityLabel: definition.activityLabel,
      question: definition.question,
      answer,
      responseType: definition.responseType
    }];
  });

  const activity6 = activitiesByPage.get(12);
  if (activity6) {
    const activity6Steps = [
      {
        stepId: 1,
        question: "What kind of people would you like in your university circle?",
        answer: toText(activity6.answer?.textAnswer ?? activity6.answer?.[1])
      },
      {
        stepId: 2,
        question: "Rate your current confidence in meeting people, resisting peer pressure, resolving disagreements, and balancing friendships with academics.",
        answer: formatSocialRatings(activity6.answer)
      }
    ];
    activity6Steps.forEach(({ stepId, question, answer }) => {
      if (!answer || hasStepFeedback(activity6.feedback, stepId)) return;
      targets.push({
        targetId: `transition-2:week:4:page:12:step:${stepId}`,
        activityLabel: `Activity 6 - Response ${stepId}`,
        question,
        answer,
        responseType: stepId === 1 ? "reflection" : "ranking"
      });
    });
  }

  const activity10 = activitiesByPage.get(20);
  if (activity10) {
    const selectedStruggles = getSelectedOptions(
      activity10.answer?.checkboxAnswers,
      SELF_AUDIT_OPTIONS
    );
    const activity10Steps = [
      {
        stepId: 1,
        question: "How do you usually handle freedom, and do you sometimes let it get out of control?",
        answer: toText(activity10.answer?.textAnswers?.["1"]),
        responseType: "reflection"
      },
      {
        stepId: 2,
        question: "Which area are you most likely to struggle with?",
        answer: selectedStruggles.join(", "),
        responseType: "multi_select"
      },
      {
        stepId: 3,
        question: "What is one thing you could do differently to handle this better?",
        answer: toText(activity10.answer?.textAnswers?.["3"]),
        responseType: "reflection"
      }
    ];
    activity10Steps.forEach(({ stepId, question, answer, responseType }) => {
      if (!answer || hasStepFeedback(activity10.feedback, stepId)) return;
      targets.push({
        targetId: `transition-2:week:4:page:20:step:${stepId}`,
        activityLabel: `Activity 10 - Response ${stepId}`,
        question,
        answer,
        responseType
      });
    });
  }
  if (!targets.length) return null;
  const request = { requestId, context: CONTEXT, targets };
  const { error, value } = validateGenerationRequest(request);
  if (error) {
    throw new TypeError(`Invalid Transition 2 Week 4 feedback request: ${error.message}`);
  }
  return value;
};

const applyTransition2Week4Feedback = ({ activities, response }) => {
  const results = response?.results;
  if (!Array.isArray(results)) throw new TypeError("Feedback results must be an array");
  const pageResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId)
  );
  const stepResults = results.filter(({ targetId }) =>
    Object.prototype.hasOwnProperty.call(STEP_TARGETS, targetId)
  );
  if (pageResults.length + stepResults.length !== results.length) {
    const unknown = results.find(({ targetId }) =>
      !Object.prototype.hasOwnProperty.call(TARGET_PAGES, targetId) &&
      !Object.prototype.hasOwnProperty.call(STEP_TARGETS, targetId)
    );
    throw new TypeError(`Unknown feedback target: ${unknown?.targetId}`);
  }

  const updated = applyPageFeedback({
    activities,
    results: pageResults,
    targetPages: TARGET_PAGES
  });

  const feedbackByPage = new Map();
  stepResults.forEach((result) => {
    if (result.status === "skipped") return;
    const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";
    if (result.status !== "ready" || !feedback) {
      throw new TypeError(`Invalid or empty feedback result for target: ${result.targetId}`);
    }
    const { page, stepId } = STEP_TARGETS[result.targetId];
    if (!feedbackByPage.has(page)) feedbackByPage.set(page, new Map());
    feedbackByPage.get(page).set(stepId, feedback);
  });

  return updated.map((activity) => {
    const pageFeedback = feedbackByPage.get(Number(activity?.page));
    if (!pageFeedback?.size) return activity;
    const feedback = Array.isArray(activity.feedback)
      ? activity.feedback.map((item) => ({ ...item }))
      : [];
    pageFeedback.forEach((value, stepId) => {
      if (!hasStepFeedback(feedback, stepId)) feedback.push({ stepId, value });
    });
    return { ...activity, feedback };
  });
};

const transition2Week4Integration = Object.freeze({
  buildRequest: buildTransition2Week4Request,
  applyFeedback: applyTransition2Week4Feedback
});

module.exports = {
  applyTransition2Week4Feedback,
  buildTransition2Week4Request,
  transition2Week4Integration
};
