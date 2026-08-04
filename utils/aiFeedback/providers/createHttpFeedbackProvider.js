const axios = require("axios");
const { createFeedbackProvider } = require("./createFeedbackProvider");

class FeedbackProviderRequestError extends Error {
  constructor(message, { code, status = null, retryable }) {
    super(message);
    this.name = "FeedbackProviderRequestError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const validateUrl = (value) => {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new TypeError("AI_FEEDBACK_API_URL must be a valid HTTP or HTTPS URL");
  }
};

const classifyRequestError = (error) => {
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) {
    return new FeedbackProviderRequestError("AI feedback provider timed out", {
      code: "PROVIDER_TIMEOUT",
      retryable: true
    });
  }

  const status = Number(error?.response?.status) || null;
  if ([401, 403].includes(status)) {
    return new FeedbackProviderRequestError(
      "AI feedback provider authentication failed",
      { code: "PROVIDER_AUTH_FAILED", status, retryable: false }
    );
  }
  if (status === 429) {
    return new FeedbackProviderRequestError("AI feedback provider rate limit reached", {
      code: "PROVIDER_RATE_LIMITED",
      status,
      retryable: true
    });
  }
  if (status >= 500) {
    return new FeedbackProviderRequestError("AI feedback provider is unavailable", {
      code: "PROVIDER_UNAVAILABLE",
      status,
      retryable: true
    });
  }
  if (status >= 400) {
    return new FeedbackProviderRequestError("AI feedback provider rejected the request", {
      code: "PROVIDER_REJECTED",
      status,
      retryable: false
    });
  }

  return new FeedbackProviderRequestError("AI feedback provider request failed", {
    code: "PROVIDER_UNAVAILABLE",
    retryable: true
  });
};

const createHttpFeedbackProvider = ({
  url = process.env.AI_FEEDBACK_API_URL,
  apiKey = process.env.AI_FEEDBACK_API_KEY,
  timeoutMs = process.env.AI_FEEDBACK_TIMEOUT_MS || 180000,
  httpClient = axios,
  name = "flow-ai-api"
} = {}) => {
  const providerUrl = validateUrl(url);
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new TypeError("AI_FEEDBACK_API_KEY is required");
  }
  const providerTimeout = Number(timeoutMs);
  if (!Number.isFinite(providerTimeout) || providerTimeout <= 0) {
    throw new TypeError("AI_FEEDBACK_TIMEOUT_MS must be a positive number");
  }
  if (!httpClient || typeof httpClient.post !== "function") {
    throw new TypeError("A valid HTTP client is required");
  }

  return createFeedbackProvider({
    name,
    generate: async (request) => {
      try {
        const response = await httpClient.post(providerUrl, request, {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          timeout: providerTimeout
        });

        return response.data;
      } catch (error) {
        throw classifyRequestError(error);
      }
    }
  });
};

module.exports = {
  createHttpFeedbackProvider,
  FeedbackProviderRequestError
};
