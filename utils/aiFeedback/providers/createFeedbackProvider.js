const {
  validateGenerationExchange,
  validateGenerationRequest
} = require("../contracts");

class FeedbackProviderContractError extends Error {
  constructor(message, validationError) {
    super(message);
    this.name = "FeedbackProviderContractError";
    this.validationError = validationError;
  }
}

const createFeedbackProvider = ({ name, generate } = {}) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Feedback provider name is required");
  }

  if (typeof generate !== "function") {
    throw new TypeError("Feedback provider generate function is required");
  }

  const providerName = name.trim();

  return Object.freeze({
    name: providerName,
    generate: async (request) => {
      const requestValidation = validateGenerationRequest(request);
      if (requestValidation.error) {
        throw new FeedbackProviderContractError(
          "Invalid feedback generation request",
          requestValidation.error
        );
      }

      const response = await generate(requestValidation.value);
      const exchangeValidation = validateGenerationExchange(
        requestValidation.value,
        response
      );

      if (exchangeValidation.error) {
        throw new FeedbackProviderContractError(
          `Invalid feedback response from provider: ${providerName}`,
          exchangeValidation.error
        );
      }

      return exchangeValidation.value.response;
    }
  });
};

module.exports = {
  createFeedbackProvider,
  FeedbackProviderContractError
};
