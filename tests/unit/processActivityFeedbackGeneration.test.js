const {
  processActivityFeedbackGeneration
} = require("../../utils/aiFeedback/processActivityFeedbackGeneration");
const {
  createFeedbackProvider
} = require("../../utils/aiFeedback/providers");

const buildActivities = () => [
  { page: 2, answer: "I want to study engineering." },
  { page: 4, answer: 3 }
];

const createActivity = (overrides = {}) => {
  const activity = {
    _id: "activity-1",
    week: "1",
    activities: buildActivities(),
    feedbackGeneration: undefined,
    ...overrides
  };
  activity.save = jest.fn(async () => activity);
  return activity;
};

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

describe("persistent Activity feedback generation", () => {
  const fixedNow = new Date("2026-07-15T10:00:00.000Z");
  const now = () => fixedNow;

  it("moves from processing to completed and saves generated feedback", async () => {
    const initialActivity = createActivity();
    const latestActivity = createActivity();
    const ActivityModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(initialActivity)
        .mockResolvedValueOnce(latestActivity)
    };

    const result = await processActivityFeedbackGeneration({
      activityId: "activity-1",
      courseKey: "transition-2",
      provider: createSuccessfulProvider(),
      ActivityModel,
      now
    });

    expect(initialActivity.feedbackGeneration.status).toBe("processing");
    expect(latestActivity.feedbackGeneration.status).toBe("completed");
    expect(latestActivity.feedbackGeneration.attempts).toBe(1);
    expect(latestActivity.activities.find(({ page }) => page === 2).feedback).toContain(
      "page:2"
    );
    expect(result).toEqual({
      status: "completed",
      generatedTargetCount: 2,
      skippedTargetCount: 0
    });
  });

  it("completes without calling the provider when there are no targets", async () => {
    const initialActivity = createActivity({ activities: [] });
    const latestActivity = createActivity({ activities: [] });
    const generate = jest.fn();
    const ActivityModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(initialActivity)
        .mockResolvedValueOnce(latestActivity)
    };

    const result = await processActivityFeedbackGeneration({
      activityId: "activity-1",
      courseKey: "transition-2",
      provider: createFeedbackProvider({ name: "fake", generate }),
      ActivityModel,
      now
    });

    expect(generate).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(latestActivity.feedbackGeneration.status).toBe("completed");
  });

  it("preserves manual feedback added while generation is running", async () => {
    const initialActivity = createActivity();
    const latestActivity = createActivity();
    latestActivity.activities[0].feedback = "Manual admin feedback";
    const ActivityModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(initialActivity)
        .mockResolvedValueOnce(latestActivity)
    };

    await processActivityFeedbackGeneration({
      activityId: "activity-1",
      courseKey: "transition-2",
      provider: createSuccessfulProvider(),
      ActivityModel,
      now
    });

    expect(latestActivity.activities[0].feedback).toBe("Manual admin feedback");
    expect(latestActivity.activities[1].feedback).toContain("page:4");
  });

  it("marks the Activity failed and preserves the provider error", async () => {
    const initialActivity = createActivity();
    const failedActivity = createActivity({
      feedbackGeneration: { status: "processing", attempts: 1 }
    });
    const providerError = new Error("Provider unavailable");
    const provider = createFeedbackProvider({
      name: "fake",
      generate: async () => {
        throw providerError;
      }
    });
    const ActivityModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(initialActivity)
        .mockResolvedValueOnce(failedActivity)
    };

    await expect(
      processActivityFeedbackGeneration({
        activityId: "activity-1",
        courseKey: "transition-2",
        provider,
        ActivityModel,
        now
      })
    ).rejects.toBe(providerError);

    expect(failedActivity.feedbackGeneration.status).toBe("failed");
    expect(failedActivity.feedbackGeneration.attempts).toBe(1);
    expect(failedActivity.feedbackGeneration.lastError).toBe("Provider unavailable");
  });

  it("does not rerun completed or currently processing Activities", async () => {
    const provider = createSuccessfulProvider();

    for (const status of ["completed", "processing"]) {
      const activity = createActivity({ feedbackGeneration: { status } });
      const ActivityModel = { findById: jest.fn().mockResolvedValue(activity) };

      const result = await processActivityFeedbackGeneration({
        activityId: "activity-1",
        courseKey: "transition-2",
        provider,
        ActivityModel,
        now
      });

      expect(result.status).toBe(`already_${status}`);
      expect(activity.save).not.toHaveBeenCalled();
    }
  });

  it("retries a processing Activity after its processing window expires", async () => {
    const staleStartedAt = new Date("2026-07-15T09:00:00.000Z");
    const initialActivity = createActivity({
      feedbackGeneration: {
        status: "processing",
        attempts: 1,
        startedAt: staleStartedAt
      }
    });
    const latestActivity = createActivity({
      feedbackGeneration: {
        status: "processing",
        attempts: 2,
        startedAt: fixedNow
      }
    });
    const ActivityModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(initialActivity)
        .mockResolvedValueOnce(latestActivity)
    };

    const result = await processActivityFeedbackGeneration({
      activityId: "activity-1",
      courseKey: "transition-2",
      provider: createSuccessfulProvider(),
      ActivityModel,
      now
    });

    expect(result.status).toBe("completed");
    expect(latestActivity.feedbackGeneration.attempts).toBe(2);
  });

  it("reports a missing Activity without calling the provider", async () => {
    const generate = jest.fn();
    const ActivityModel = { findById: jest.fn().mockResolvedValue(null) };

    await expect(
      processActivityFeedbackGeneration({
        activityId: "missing",
        courseKey: "transition-2",
        provider: createFeedbackProvider({ name: "fake", generate }),
        ActivityModel,
        now
      })
    ).rejects.toMatchObject({ code: "ACTIVITY_NOT_FOUND" });

    expect(generate).not.toHaveBeenCalled();
  });
});
