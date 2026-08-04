const { randomUUID } = require("crypto");
const {
  createFeedbackProvider,
  FeedbackProviderContractError,
  createBedrockClaudeFeedbackProvider
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

describe("AI feedback provider boundary", () => {
  it("requires a provider name and generate function", () => {
    expect(() => createFeedbackProvider()).toThrow(TypeError);
    expect(() => createFeedbackProvider({ name: "fake" })).toThrow(TypeError);
  });

  it("returns a validated response from a conforming provider", async () => {
    const request = buildRequest();
    const provider = createFeedbackProvider({
      name: "fake",
      generate: async (validatedRequest) => ({
        requestId: validatedRequest.requestId,
        results: validatedRequest.targets.map(({ targetId }) => ({
          targetId,
          status: "ready",
          feedback: "You have identified a clear direction for your next step."
        }))
      })
    });

    await expect(provider.generate(request)).resolves.toEqual({
      requestId: request.requestId,
      results: [
        {
          targetId: request.targets[0].targetId,
          status: "ready",
          feedback: "You have identified a clear direction for your next step."
        }
      ]
    });
  });

  it("rejects an invalid request before calling the provider", async () => {
    const generate = jest.fn();
    const provider = createFeedbackProvider({ name: "fake", generate });
    const request = buildRequest();
    request.context.email = "student@example.com";

    await expect(provider.generate(request)).rejects.toBeInstanceOf(
      FeedbackProviderContractError
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects a response with mismatched targets", async () => {
    const provider = createFeedbackProvider({
      name: "fake",
      generate: async (request) => ({
        requestId: request.requestId,
        results: [
          {
            targetId: "transition-2:week:1:page:wrong",
            status: "ready",
            feedback: "Feedback for the wrong target."
          }
        ]
      })
    });

    await expect(provider.generate(buildRequest())).rejects.toBeInstanceOf(
      FeedbackProviderContractError
    );
  });

  it("preserves operational provider errors for later retry handling", async () => {
    const providerError = new Error("Provider unavailable");
    const provider = createFeedbackProvider({
      name: "fake",
      generate: async () => {
        throw providerError;
      }
    });

    await expect(provider.generate(buildRequest())).rejects.toBe(providerError);
  });

  it("instructs Bedrock to generate feedback for valid short answers", async () => {
    const request = buildRequest();
    request.targets[0].answer = "Yes of course!";
    const post = jest.fn(async (_url, body) => ({
      data: {
        content: [{
          type: "text",
          text: JSON.stringify({
            requestId: request.requestId,
            results: [{
              targetId: request.targets[0].targetId,
              status: "ready",
              feedback: "Your response shows confidence; consider what makes you feel supportive."
            }]
          })
        }]
      }
    }));
    const provider = createBedrockClaudeFeedbackProvider({
      apiKey: "test-key",
      httpClient: { post }
    });

    await provider.generate(request);

    expect(post).toHaveBeenCalledTimes(1);

    const systemPrompt = post.mock.calls[0][1].system;
    expect(systemPrompt).toContain("including brief answers");
    expect(systemPrompt).toContain("Do not skip a target merely because its answer is short");
    expect(systemPrompt).toContain("no more than two sentences");
    expect(systemPrompt).toContain("no more than 45 words");
    expect(systemPrompt).toContain("Do not repeat the question");
    expect(systemPrompt).toContain("Do not use bullets");
    expect(systemPrompt).toContain("leading hyphens");
  });

  it("repairs one contract-invalid Bedrock response", async () => {
    const request = buildRequest();
    const invalidResponse = {
      requestId: request.requestId,
      results: [{
        targetId: request.targets[0].targetId,
        status: "ready",
        feedback: `- ${"This response is unnecessarily verbose ".repeat(12)}`
      }]
    };
    const repairedResponse = {
      requestId: request.requestId,
      results: [{
        targetId: request.targets[0].targetId,
        status: "ready",
        feedback: "You have chosen engineering as a clear next step. Consider naming one action that will help you prepare."
      }]
    };
    const post = jest
      .fn()
      .mockResolvedValueOnce({
        data: { content: [{ type: "text", text: JSON.stringify(invalidResponse) }] }
      })
      .mockResolvedValueOnce({
        data: { content: [{ type: "text", text: JSON.stringify(repairedResponse) }] }
      });
    const provider = createBedrockClaudeFeedbackProvider({
      apiKey: "test-key",
      httpClient: { post }
    });

    await expect(provider.generate(request)).resolves.toEqual(repairedResponse);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1].messages[2].content).toContain(
      "complete corrected JSON response"
    );
    expect(post.mock.calls[1][1].messages[2].content).toContain(
      "feedback must contain no more than 45 words"
    );
  });

  it("rejects a response that remains invalid after one repair", async () => {
    const request = buildRequest();
    const invalidResponse = {
      requestId: request.requestId,
      results: [{
        targetId: request.targets[0].targetId,
        status: "ready",
        feedback: `- ${"Still too verbose for the feedback contract ".repeat(10)}`
      }]
    };
    const post = jest.fn(async () => ({
      data: { content: [{ type: "text", text: JSON.stringify(invalidResponse) }] }
    }));
    const provider = createBedrockClaudeFeedbackProvider({
      apiKey: "test-key",
      httpClient: { post }
    });

    await expect(provider.generate(request)).rejects.toBeInstanceOf(
      FeedbackProviderContractError
    );
    expect(post).toHaveBeenCalledTimes(2);
  });
});
