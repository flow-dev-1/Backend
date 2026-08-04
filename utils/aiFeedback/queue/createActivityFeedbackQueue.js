const Queue = require("bull");
const { randomUUID } = require("crypto");
const Activity = require("../../../models/activity");
const { getCourseIntegration } = require("../courseIntegrations");
const {
  boundedErrorMessage,
  createActivityNotFoundError,
  getGenerationState
} = require("../activityGenerationState");
const {
  processActivityFeedbackGeneration
} = require("../processActivityFeedbackGeneration");

const QUEUE_NAME = "AI_ACTIVITY_FEEDBACK_QUEUE";
const JOB_ATTEMPTS = 3;
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

const getJobId = (activityId) => `activity-feedback-${activityId}`;

const validateJobData = ({ activityId, courseKey } = {}) => {
  if (typeof activityId !== "string" || !activityId.trim()) {
    throw new TypeError("Activity feedback job requires an activityId");
  }
  if (typeof courseKey !== "string" || !courseKey.trim()) {
    throw new TypeError("Activity feedback job requires a courseKey");
  }

  return {
    activityId: activityId.trim(),
    courseKey: courseKey.trim()
  };
};

const createActivityFeedbackQueue = ({
  provider,
  redisUrl = process.env.REDIS_URL,
  QueueClass = Queue,
  ActivityModel = Activity,
  processGeneration = processActivityFeedbackGeneration,
  now = () => new Date()
} = {}) => {
  if (!provider || typeof provider.generate !== "function") {
    throw new TypeError("A valid feedback provider is required for the queue");
  }
  if (typeof redisUrl !== "string" || !redisUrl.trim()) {
    throw new TypeError("REDIS_URL is required for the feedback queue");
  }

  const queue = new QueueClass(QUEUE_NAME, redisUrl);

  queue.process(1, async (job) => {
    const data = validateJobData(job.data);
    return processGeneration({
      ...data,
      provider,
      ActivityModel,
      processingTimeoutMs: 0
    });
  });

  queue.on("error", (error) => {
    console.error("AI activity feedback queue error:", error.message);
  });

  const enqueue = async (jobData) => {
    const data = validateJobData(jobData);
    const activity = await ActivityModel.findById(data.activityId);
    if (!activity) throw createActivityNotFoundError(data.activityId);

    const state = getGenerationState(activity);
    if (["queued", "processing"].includes(state.status)) {
      return {
        status: `already_${state.status}`,
        jobId: getJobId(data.activityId)
      };
    }

    const jobId = getJobId(data.activityId);
    if (state.status === "completed") {
      const integration = getCourseIntegration(data.courseKey, activity.week);
      let missingRequest = null;
      try {
        missingRequest = integration?.buildRequest({
          requestId: randomUUID(),
          activities: activity.activities
        });
      } catch {
        // Preserve completed deduplication when the stored payload is unsupported.
      }
      if (!missingRequest) {
        return { status: "already_completed", jobId };
      }

      const previousJob = await queue.getJob(jobId);
      if (previousJob) await previousJob.remove();
    }

    activity.feedbackGeneration = {
      ...state,
      status: "queued",
      lastError: null,
      queuedAt: now(),
      startedAt: null,
      completedAt: null
    };
    await activity.save();

    try {
      const job = await queue.add(data, {
        jobId,
        attempts: JOB_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 5000
        },
        timeout: JOB_TIMEOUT_MS,
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 100
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 100
        }
      });

      return {
        status: "queued",
        jobId: String(job?.id || jobId)
      };
    } catch (error) {
      activity.feedbackGeneration = {
        ...getGenerationState(activity),
        status: "failed",
        lastError: boundedErrorMessage(error),
        completedAt: null
      };
      await activity.save();
      throw error;
    }
  };

  return Object.freeze({
    enqueue,
    queue
  });
};

module.exports = {
  createActivityFeedbackQueue,
  getJobId,
  QUEUE_NAME
};
