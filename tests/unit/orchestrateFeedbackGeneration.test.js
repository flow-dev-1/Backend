const { randomUUID } = require("crypto");
const {
  orchestrateFeedbackGeneration
} = require("../../utils/aiFeedback/orchestrateFeedbackGeneration");
const {
  createFeedbackProvider
} = require("../../utils/aiFeedback/providers");

const buildActivities = () => [
  { page: 2, answer: "I want to study engineering." },
  { page: 4, answer: 3 }
];

const createSuccessfulProvider = () =>
  createFeedbackProvider({
    name: "fake",
    generate: async (request) => ({
      requestId: request.requestId,
      results: request.targets.map(({ targetId }) => ({
        targetId,
        status: "ready",
        feedback: `Generated feedback for ${targetId}`
      }))
    })
  });

describe("AI feedback generation orchestration", () => {
  it("runs one weekly request and returns updated activities", async () => {
    const activities = buildActivities();
    const provider = createSuccessfulProvider();

    const result = await orchestrateFeedbackGeneration({
      courseKey: "transition-2",
      weekNumber: 1,
      activities,
      provider,
      requestId: randomUUID()
    });

    expect(result.status).toBe("completed");
    expect(result.generatedTargetCount).toBe(2);
    expect(result.skippedTargetCount).toBe(0);
    expect(result.activities.find(({ page }) => page === 2).feedback).toContain(
      "page:2"
    );
    expect(activities.find(({ page }) => page === 2).feedback).toBeUndefined();
  });

  it("does not call the provider when no activities need feedback", async () => {
    const generate = jest.fn();
    const provider = createFeedbackProvider({ name: "fake", generate });

    const result = await orchestrateFeedbackGeneration({
      courseKey: "transition-2",
      weekNumber: 1,
      activities: [],
      provider,
      requestId: randomUUID()
    });

    expect(result.status).toBe("no_targets");
    expect(result.generatedTargetCount).toBe(0);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects an unsupported course or week", async () => {
    await expect(
      orchestrateFeedbackGeneration({
        courseKey: "transition-2",
        weekNumber: 99,
        activities: buildActivities(),
        provider: createSuccessfulProvider()
      })
    ).rejects.toThrow("No AI feedback integration");
  });

  it("preserves provider failures for the future queue to retry", async () => {
    const providerError = new Error("Provider unavailable");
    const provider = createFeedbackProvider({
      name: "fake",
      generate: async () => {
        throw providerError;
      }
    });

    await expect(
      orchestrateFeedbackGeneration({
        courseKey: "transition-2",
        weekNumber: 1,
        activities: buildActivities(),
        provider
      })
    ).rejects.toBe(providerError);
  });
});
