const axios = require("axios");
const { validateGenerationExchange } = require("../contracts");
const { createFeedbackProvider } = require("./createFeedbackProvider");
const { FeedbackProviderRequestError } = require("./createHttpFeedbackProvider");

const DEFAULT_REGION = "us-east-1";
const DEFAULT_MODEL = "us.anthropic.claude-sonnet-4-6";

const classifyBedrockError = (error) => {
  const status = Number(error?.response?.status || error?.status) || null;

  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) {
    return new FeedbackProviderRequestError("Bedrock feedback request timed out", {
      code: "PROVIDER_TIMEOUT",
      retryable: true
    });
  }
  if ([401, 403].includes(status)) {
    return new FeedbackProviderRequestError("Bedrock authentication failed", {
      code: "PROVIDER_AUTH_FAILED",
      status,
      retryable: false
    });
  }
  if (status === 429) {
    return new FeedbackProviderRequestError("Bedrock rate limit reached", {
      code: "PROVIDER_RATE_LIMITED",
      status,
      retryable: true
    });
  }
  if (status >= 500 || !status) {
    return new FeedbackProviderRequestError("Bedrock is unavailable", {
      code: "PROVIDER_UNAVAILABLE",
      status,
      retryable: true
    });
  }

  return new FeedbackProviderRequestError("Bedrock rejected the feedback request", {
    code: "PROVIDER_REJECTED",
    status,
    retryable: false
  });
};

const buildSystemPrompt = () => [
  "You generate supportive administrator feedback for student course activities.",
  "Return JSON only. Keep each targetId unchanged and return exactly one result per target.",
  "Every supplied target already contains a valid student answer, including brief answers such as yes, no, or a short rating.",
  "Use status ready with concise, answer-specific feedback for every supplied target.",
  "Each feedback must contain no more than two sentences and no more than 45 words.",
  "Sentence one should acknowledge the learner's exact response. Sentence two may reinforce or correct one key course concept or give one practical improvement.",
  "Do not repeat the question, restate the full answer, summarise the lesson, stack multiple suggestions, or add generic praise.",
  "Write as one plain prose paragraph. Do not use bullets, numbered lists, headings, leading hyphens, em dashes, en dashes, or decorative separators.",
  "Do not skip a target merely because its answer is short. Use skipped only when safety policy makes feedback impossible.",
  "Do not grade assessments and do not invent student facts."
].join(" ");

const parseResponse = (completion) => {
  const content = completion?.content
    ?.filter(({ type }) => type === "text")
    .map(({ text }) => text)
    .join("")
    .trim();
  if (!content) {
    throw new Error("Bedrock returned an empty completion");
  }

  const json = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(json);
};

const formatValidationError = (error) => {
  if (!error) return "The response did not satisfy the feedback contract.";

  if (Array.isArray(error.details) && error.details.length) {
    return error.details.map(({ message }) => message).join("; ");
  }

  return error.message || "The response did not satisfy the feedback contract.";
};

const buildRepairPrompt = ({ request, invalidResponse, validationError }) =>
  JSON.stringify({
    task: "Correct the invalid response. Return only the complete corrected JSON response.",
    validationError: formatValidationError(validationError),
    originalRequest: request,
    invalidResponse
  });

const createBedrockClaudeFeedbackProvider = ({
  apiKey = process.env.BEDROCK_API_KEY,
  region = process.env.BEDROCK_REGION || DEFAULT_REGION,
  model = process.env.BEDROCK_FEEDBACK_MODEL || DEFAULT_MODEL,
  timeoutMs = process.env.BEDROCK_FEEDBACK_TIMEOUT_MS || 180000,
  httpClient = axios
} = {}) => {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new TypeError("BEDROCK_API_KEY is required");
  }
  if (typeof region !== "string" || !region.trim()) {
    throw new TypeError("BEDROCK_REGION is required");
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new TypeError("BEDROCK_FEEDBACK_MODEL is required");
  }

  const timeout = Number(timeoutMs);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new TypeError("BEDROCK_FEEDBACK_TIMEOUT_MS must be a positive number");
  }

  if (!httpClient || typeof httpClient.post !== "function") {
    throw new TypeError("A valid Bedrock HTTP client is required");
  }

  return createFeedbackProvider({
    name: "aws-bedrock-claude-sonnet-4.6",
    generate: async (request) => {
      const invoke = async (messages) => {
        try {
          const response = await httpClient.post(
          `https://bedrock-runtime.${region.trim()}.amazonaws.com/model/${encodeURIComponent(
            model.trim()
          )}/invoke`,
          {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 12000,
            system: buildSystemPrompt(),
            messages
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            timeout
          }
          );

          return response.data;
        } catch (error) {
          throw classifyBedrockError(error);
        }
      };

      const initialCompletion = await invoke([
        { role: "user", content: JSON.stringify(request) }
      ]);

      let initialResponse;
      let validationError;
      try {
        initialResponse = parseResponse(initialCompletion);
        validationError = validateGenerationExchange(request, initialResponse).error;
      } catch (error) {
        validationError = error;
      }

      if (!validationError) return initialResponse;

      const repairCompletion = await invoke([
        { role: "user", content: JSON.stringify(request) },
        { role: "assistant", content: JSON.stringify(initialResponse || initialCompletion) },
        {
          role: "user",
          content: buildRepairPrompt({
            request,
            invalidResponse: initialResponse || initialCompletion,
            validationError
          })
        }
      ]);

      return parseResponse(repairCompletion);
    }
  });
};

module.exports = {
  DEFAULT_MODEL,
  createBedrockClaudeFeedbackProvider
};
