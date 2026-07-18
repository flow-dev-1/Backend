const Activity = require("../../models/activity");
const {
  boundedErrorMessage,
  createActivityNotFoundError,
  getGenerationState
} = require("./activityGenerationState");
const { getCourseIntegration } = require("./courseIntegrations");
const {
  orchestrateFeedbackGeneration
} = require("./orchestrateFeedbackGeneration");

const processActivityFeedbackGeneration = async ({
  activityId,
  courseKey,
  provider,
  ActivityModel = Activity,
  now = () => new Date(),
  processingTimeoutMs = 15 * 60 * 1000
}) => {
  const activity = await ActivityModel.findById(activityId);
  if (!activity) throw createActivityNotFoundError(activityId);

  const initialState = getGenerationState(activity);
  if (initialState.status === "completed") {
    return { status: "already_completed" };
  }
  const currentTime = now();
  if (initialState.status === "processing") {
    const startedAt = new Date(initialState.startedAt).getTime();
    const isStale =
      Number.isFinite(startedAt) &&
      currentTime.getTime() - startedAt >= processingTimeoutMs;

    if (!isStale) return { status: "already_processing" };
  }

  const attempts = Number(initialState.attempts || 0) + 1;
  const startedAt = currentTime;
  activity.feedbackGeneration = {
    ...initialState,
    status: "processing",
    attempts,
    lastError: null,
    startedAt,
    completedAt: null
  };
  await activity.save();

  try {
    const result = await orchestrateFeedbackGeneration({
      courseKey,
      weekNumber: Number(activity.week),
      activities: activity.activities,
      provider
    });

    const latestActivity = await ActivityModel.findById(activityId);
    if (!latestActivity) throw createActivityNotFoundError(activityId);

    const latestState = getGenerationState(latestActivity);
    if (latestState.status === "completed") {
      return { status: "already_completed" };
    }

    if (result.feedbackResponse) {
      const integration = getCourseIntegration(courseKey, Number(latestActivity.week));
      latestActivity.activities = integration.applyFeedback({
        activities: latestActivity.activities,
        response: result.feedbackResponse
      });
    }

    latestActivity.feedbackGeneration = {
      ...latestState,
      status: "completed",
      attempts,
      lastError: null,
      startedAt: latestState.startedAt || startedAt,
      completedAt: now()
    };
    await latestActivity.save();

    return {
      status: "completed",
      generatedTargetCount: result.generatedTargetCount,
      skippedTargetCount: result.skippedTargetCount
    };
  } catch (error) {
    try {
      const failedActivity = (await ActivityModel.findById(activityId)) || activity;
      const failedState = getGenerationState(failedActivity);

      if (failedState.status !== "completed") {
        failedActivity.feedbackGeneration = {
          ...failedState,
          status: "failed",
          attempts,
          lastError: boundedErrorMessage(error),
          startedAt: failedState.startedAt || startedAt,
          completedAt: null
        };
        await failedActivity.save();
      }
    } catch {
      // Preserve the generation error so the queue can make the retry decision.
    }

    throw error;
  }
};

module.exports = {
  processActivityFeedbackGeneration
};
