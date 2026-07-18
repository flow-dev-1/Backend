const {
  createActivityFeedbackQueue,
  getJobId,
  QUEUE_NAME
} = require("../../utils/aiFeedback/queue");

const createActivity = (overrides = {}) => {
  const activity = {
    _id: "activity-1",
    feedbackGeneration: undefined,
    ...overrides
  };
  activity.save = jest.fn(async () => activity);
  return activity;
};

const createFakeQueueClass = ({ addError } = {}) => {
  class FakeQueue {
    constructor(name, redisUrl) {
      this.name = name;
      this.redisUrl = redisUrl;
      this.add = jest.fn(async (data, options) => {
        if (addError) throw addError;
        return { id: options.jobId, data };
      });
      this.on = jest.fn();
      FakeQueue.instance = this;
    }

    process(concurrency, handler) {
      this.concurrency = concurrency;
      this.handler = handler;
    }
  }

  return FakeQueue;
};

describe("AI activity feedback queue", () => {
  const provider = { generate: jest.fn() };

  it("queues one bounded job containing only the Activity ID and course key", async () => {
    const activity = createActivity();
    const ActivityModel = { findById: jest.fn().mockResolvedValue(activity) };
    const QueueClass = createFakeQueueClass();
    const service = createActivityFeedbackQueue({
      provider,
      redisUrl: "redis://test",
      QueueClass,
      ActivityModel,
      now: () => new Date("2026-07-15T10:00:00.000Z")
    });

    const result = await service.enqueue({
      activityId: "activity-1",
      courseKey: "transition-2"
    });
    const queue = QueueClass.instance;
    const [payload, options] = queue.add.mock.calls[0];

    expect(queue.name).toBe(QUEUE_NAME);
    expect(queue.concurrency).toBe(1);
    expect(payload).toEqual({
      activityId: "activity-1",
      courseKey: "transition-2"
    });
    expect(options).toMatchObject({
      jobId: getJobId("activity-1"),
      attempts: 3,
      timeout: 300000,
      removeOnComplete: { age: 86400, count: 100 },
      removeOnFail: { age: 604800, count: 100 }
    });
    expect(activity.feedbackGeneration.status).toBe("queued");
    expect(result).toEqual({
      status: "queued",
      jobId: getJobId("activity-1")
    });
  });

  it("does not enqueue duplicate queued, processing, or completed work", async () => {
    for (const status of ["queued", "processing", "completed"]) {
      const activity = createActivity({ feedbackGeneration: { status } });
      const ActivityModel = { findById: jest.fn().mockResolvedValue(activity) };
      const QueueClass = createFakeQueueClass();
      const service = createActivityFeedbackQueue({
        provider,
        redisUrl: "redis://test",
        QueueClass,
        ActivityModel
      });

      const result = await service.enqueue({
        activityId: "activity-1",
        courseKey: "transition-2"
      });

      expect(result.status).toBe(`already_${status}`);
      expect(QueueClass.instance.add).not.toHaveBeenCalled();
    }
  });

  it("marks the Activity failed when Redis rejects the job", async () => {
    const queueError = new Error("Redis unavailable");
    const activity = createActivity();
    const QueueClass = createFakeQueueClass({ addError: queueError });
    const service = createActivityFeedbackQueue({
      provider,
      redisUrl: "redis://test",
      QueueClass,
      ActivityModel: { findById: jest.fn().mockResolvedValue(activity) }
    });

    await expect(
      service.enqueue({
        activityId: "activity-1",
        courseKey: "transition-2"
      })
    ).rejects.toBe(queueError);

    expect(activity.feedbackGeneration.status).toBe("failed");
    expect(activity.feedbackGeneration.lastError).toBe("Redis unavailable");
  });

  it("processes jobs through the persistent generation operation", async () => {
    const processGeneration = jest.fn().mockResolvedValue({ status: "completed" });
    const QueueClass = createFakeQueueClass();
    const ActivityModel = { findById: jest.fn() };
    createActivityFeedbackQueue({
      provider,
      redisUrl: "redis://test",
      QueueClass,
      ActivityModel,
      processGeneration
    });

    const result = await QueueClass.instance.handler({
      data: {
        activityId: "activity-1",
        courseKey: "transition-2"
      }
    });

    expect(processGeneration).toHaveBeenCalledWith({
      activityId: "activity-1",
      courseKey: "transition-2",
      provider,
      ActivityModel,
      processingTimeoutMs: 0
    });
    expect(result).toEqual({ status: "completed" });
  });

  it("rejects invalid payloads before reading or queuing an Activity", async () => {
    const ActivityModel = { findById: jest.fn() };
    const service = createActivityFeedbackQueue({
      provider,
      redisUrl: "redis://test",
      QueueClass: createFakeQueueClass(),
      ActivityModel
    });

    await expect(service.enqueue({ activityId: "activity-1" })).rejects.toThrow(
      "courseKey"
    );
    expect(ActivityModel.findById).not.toHaveBeenCalled();
  });
});
