const { randomUUID } = require("crypto");
const {
  createHttpFeedbackProvider,
  FeedbackProviderContractError,
  FeedbackProviderRequestError
} = require("../../utils/aiFeedback/providers");

const buildRequest = () => ({
  requestId: randomUUID(),
  context: {
    courseKey: "transition-2",
    courseTitle: "Transition 2",
    weekNumber: 1,
    weekTitle: "Defining Your Next Chapter"
  },
  targets: [
    {
      targetId: "transition-2:week:1:page:2",
      activityLabel: "Activity 1",
      question: "What's next for you after year 12?",
      answer: "I want to study engineering.",
      responseType: "reflection"
    }
  ]
});

const buildResponse = (request) => ({
  requestId: request.requestId,
  results: request.targets.map(({ targetId }) => ({
    targetId,
    status: "ready",
    feedback: "You have identified a clear direction for your next step."
  }))
});

const createProvider = (httpClient) =>
  createHttpFeedbackProvider({
    url: "https://ai.example.com/feedback",
    apiKey: "test-secret",
    timeoutMs: 120000,
    httpClient
  });

describe("HTTP AI feedback provider", () => {
  it("requires valid configuration", () => {
    expect(() =>
      createHttpFeedbackProvider({ url: "invalid", apiKey: "secret" })
    ).toThrow("AI_FEEDBACK_API_URL");
    expect(() =>
      createHttpFeedbackProvider({ url: "https://ai.example.com", apiKey: "" })
    ).toThrow("AI_FEEDBACK_API_KEY");
    expect(() =>
      createHttpFeedbackProvider({
        url: "https://ai.example.com",
        apiKey: "secret",
        timeoutMs: 0
      })
    ).toThrow("AI_FEEDBACK_TIMEOUT_MS");
  });

  it("posts one validated weekly request using Bearer authentication", async () => {
    const request = buildRequest();
    const httpClient = {
      post: jest.fn().mockResolvedValue({ data: buildResponse(request) })
    };
    const provider = createProvider(httpClient);

    await expect(provider.generate(request)).resolves.toEqual(buildResponse(request));
    expect(httpClient.post).toHaveBeenCalledWith(
      "https://ai.example.com/feedback",
      request,
      {
        headers: {
          Authorization: "Bearer test-secret",
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 120000
      }
    );
  });

  it.each([
    ["timeout", { code: "ECONNABORTED" }, "PROVIDER_TIMEOUT", true, null],
    ["authentication", { response: { status: 401 } }, "PROVIDER_AUTH_FAILED", false, 401],
    ["rate limit", { response: { status: 429 } }, "PROVIDER_RATE_LIMITED", true, 429],
    ["server failure", { response: { status: 503 } }, "PROVIDER_UNAVAILABLE", true, 503],
    ["bad request", { response: { status: 400 } }, "PROVIDER_REJECTED", false, 400]
  ])(
    "classifies %s errors",
    async (label, requestError, code, retryable, status) => {
      const httpClient = { post: jest.fn().mockRejectedValue(requestError) };
      const provider = createProvider(httpClient);

      try {
        await provider.generate(buildRequest());
        throw new Error("Expected provider request to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(FeedbackProviderRequestError);
        expect(error).toMatchObject({ code, retryable, status });
        expect(error.message).not.toContain("test-secret");
      }
    }
  );

  it("rejects a successful HTTP response that violates the feedback contract", async () => {
    const request = buildRequest();
    const httpClient = {
      post: jest.fn().mockResolvedValue({
        data: {
          requestId: request.requestId,
          results: [{ targetId: "wrong-target", status: "ready", feedback: "Wrong" }]
        }
      })
    };

    await expect(createProvider(httpClient).generate(request)).rejects.toBeInstanceOf(
      FeedbackProviderContractError
    );
  });
});
