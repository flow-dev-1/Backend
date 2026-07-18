const {
  enqueueFeedbackAfterSubmission
} = require("../../utils/aiFeedback/enqueueFeedbackAfterSubmission");
const {
  normalizeCourseIdentifier,
  resolveCourseKey
} = require("../../utils/aiFeedback/resolveCourseKey");

describe("enqueue feedback after course submission", () => {
  it("resolves the Transition 2 course key consistently", () => {
    expect(normalizeCourseIdentifier(" Transition 2 ")).toBe("transition-2");
    expect(resolveCourseKey({ title: "Transition 2" })).toBe("transition-2");
    expect(resolveCourseKey({ title: "Another Course" })).toBeNull();
  });

  it("resolves the Compassion course key consistently", () => {
    expect(normalizeCourseIdentifier(" Compassion Course ")).toBe("compassion-course");
    expect(resolveCourseKey({ title: "Compassion" })).toBe("compassion");
    expect(resolveCourseKey({ url: "compassion-course" })).toBe("compassion");
  });

  it("enqueues the persisted Activity for a supported course week", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued", jobId: "job-1" })
    };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-1" },
        course: { title: "Transition 2" },
        week: "1",
        queueService
      })
    ).resolves.toEqual({ status: "queued", jobId: "job-1" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "activity-1",
      courseKey: "transition-2"
    });
  });

  it("does not touch the queue for unsupported courses or weeks", async () => {
    const queueService = { enqueue: jest.fn() };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-1" },
        course: { title: "Transition 2" },
        week: 6,
        queueService
      })
    ).resolves.toEqual({ status: "unsupported" });

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-1" },
        course: { title: "Other Course" },
        week: 1,
        queueService
      })
    ).resolves.toEqual({ status: "unsupported" });

    expect(queueService.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues Transition 2 Week 2 after its integration is registered", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued", jobId: "job-2" })
    };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-2" },
        course: { title: "Transition 2" },
        week: 2,
        queueService
      })
    ).resolves.toEqual({ status: "queued", jobId: "job-2" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "activity-2",
      courseKey: "transition-2"
    });
  });

  it("enqueues Transition 2 Week 3 after its integration is registered", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued", jobId: "job-3" })
    };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-3" },
        course: { title: "Transition 2" },
        week: 3,
        queueService
      })
    ).resolves.toEqual({ status: "queued", jobId: "job-3" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "activity-3",
      courseKey: "transition-2"
    });
  });

  it("enqueues Transition 2 Week 4 after its integration is registered", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued", jobId: "job-4" })
    };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-4" },
        course: { title: "Transition 2" },
        week: 4,
        queueService
      })
    ).resolves.toEqual({ status: "queued", jobId: "job-4" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "activity-4",
      courseKey: "transition-2"
    });
  });

  it("enqueues Transition 2 Week 5 after its integration is registered", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued", jobId: "job-5" })
    };

    await expect(
      enqueueFeedbackAfterSubmission({
        activity: { _id: "activity-5" },
        course: { title: "Transition 2" },
        week: 5,
        queueService
      })
    ).resolves.toEqual({ status: "queued", jobId: "job-5" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "activity-5",
      courseKey: "transition-2"
    });
  });

  it("enqueues Compassion Week 1 after its integration is registered", async () => {
    const queueService = {
      enqueue: jest.fn().mockResolvedValue({
        status: "queued",
        jobId: "compassion-job-1"
      })
    };

    await expect(enqueueFeedbackAfterSubmission({
      activity: { _id: "compassion-activity-1" },
      course: { title: "Compassion" },
      week: 1,
      queueService
    })).resolves.toEqual({ status: "queued", jobId: "compassion-job-1" });

    expect(queueService.enqueue).toHaveBeenCalledWith({
      activityId: "compassion-activity-1",
      courseKey: "compassion"
    });
  });

  it("requires a persisted Activity for a supported submission", async () => {
    await expect(
      enqueueFeedbackAfterSubmission({
        activity: {},
        course: { title: "Transition 2" },
        week: 1,
        queueService: { enqueue: jest.fn() }
      })
    ).rejects.toThrow("persisted Activity");
  });
});
