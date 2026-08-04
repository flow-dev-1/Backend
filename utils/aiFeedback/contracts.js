const Joi = require("joi");

const ACTIVITY_RESPONSE_TYPES = Object.freeze([
  "reflection",
  "single_select",
  "multi_select",
  "ranking",
  "drag_and_drop",
  "multi_step",
  "other"
]);

const FEEDBACK_RESULT_STATUSES = Object.freeze(["ready", "skipped"]);
const MAX_FEEDBACK_WORDS = 45;
const MAX_FEEDBACK_SENTENCES = 2;

const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;

const countSentences = (value) => {
  const normalized = value.trim();
  if (!normalized) return 0;
  return normalized.match(/[.!?]+(?=\s|$)/g)?.length || 1;
};

const conciseFeedback = (value, helpers) => {
  if (countWords(value) > MAX_FEEDBACK_WORDS) {
    return helpers.error("feedback.maxWords", { limit: MAX_FEEDBACK_WORDS });
  }
  if (countSentences(value) > MAX_FEEDBACK_SENTENCES) {
    return helpers.error("feedback.maxSentences", {
      limit: MAX_FEEDBACK_SENTENCES
    });
  }
  if (/^\s*(?:[-*•]|\d+[.)])\s+/m.test(value) || /[–—]/.test(value)) {
    return helpers.error("feedback.plainProse");
  }
  return value;
};

const generationContextSchema = Joi.object({
  courseKey: Joi.string().trim().min(1).max(100).required(),
  courseTitle: Joi.string().trim().min(1).max(300).required(),
  weekNumber: Joi.number().integer().positive().required(),
  weekTitle: Joi.string().trim().min(1).max(300).required(),
  guidance: Joi.string().trim().min(1).max(30000).optional()
});

const activityFeedbackTargetSchema = Joi.object({
  targetId: Joi.string().trim().min(1).max(200).required(),
  activityLabel: Joi.string().trim().min(1).max(200).required(),
  question: Joi.string().trim().min(1).max(10000).required(),
  answer: Joi.string().trim().min(1).max(20000).required(),
  responseType: Joi.string()
    .valid(...ACTIVITY_RESPONSE_TYPES)
    .required()
});

const generationRequestSchema = Joi.object({
  requestId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  context: generationContextSchema.required(),
  targets: Joi.array()
    .items(activityFeedbackTargetSchema)
    .min(1)
    .max(100)
    .unique("targetId")
    .required()
});

const feedbackResultSchema = Joi.object({
  targetId: Joi.string().trim().min(1).max(200).required(),
  status: Joi.string()
    .valid(...FEEDBACK_RESULT_STATUSES)
    .required(),
  feedback: Joi.when("status", {
    is: "ready",
    then: Joi.string()
      .trim()
      .min(1)
      .max(500)
      .custom(conciseFeedback, "concise feedback validation")
      .messages({
        "feedback.maxWords": "feedback must contain no more than {#limit} words",
        "feedback.maxSentences": "feedback must contain no more than {#limit} sentences",
        "feedback.plainProse": "feedback must use plain prose without list markers or dash separators"
      })
      .required(),
    otherwise: Joi.forbidden()
  }),
  reason: Joi.when("status", {
    is: "skipped",
    then: Joi.string().trim().min(1).max(500).required(),
    otherwise: Joi.forbidden()
  })
});

const generationResponseSchema = Joi.object({
  requestId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  results: Joi.array()
    .items(feedbackResultSchema)
    .min(1)
    .max(100)
    .unique("targetId")
    .required()
});

const validationOptions = {
  abortEarly: false,
  convert: false
};

const validateGenerationRequest = (payload) =>
  generationRequestSchema.validate(payload, validationOptions);

const validateGenerationResponse = (payload) =>
  generationResponseSchema.validate(payload, validationOptions);

const validateGenerationExchange = (request, response) => {
  const requestValidation = validateGenerationRequest(request);
  if (requestValidation.error) return requestValidation;

  const responseValidation = validateGenerationResponse(response);
  if (responseValidation.error) return responseValidation;

  if (request.requestId !== response.requestId) {
    return { error: new Error("Feedback response requestId does not match the request") };
  }

  const requestedTargets = new Set(request.targets.map(({ targetId }) => targetId));
  const returnedTargets = new Set(response.results.map(({ targetId }) => targetId));
  const hasExactTargets =
    requestedTargets.size === returnedTargets.size &&
    [...requestedTargets].every((targetId) => returnedTargets.has(targetId));

  if (!hasExactTargets) {
    return { error: new Error("Feedback response targets do not match the request") };
  }

  return {
    value: {
      request: requestValidation.value,
      response: responseValidation.value
    }
  };
};

module.exports = {
  ACTIVITY_RESPONSE_TYPES,
  FEEDBACK_RESULT_STATUSES,
  MAX_FEEDBACK_SENTENCES,
  MAX_FEEDBACK_WORDS,
  generationRequestSchema,
  generationResponseSchema,
  validateGenerationRequest,
  validateGenerationResponse,
  validateGenerationExchange
};
