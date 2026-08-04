const { getCourseIntegration } = require("./courseIntegrations");
const {
  getActivityFeedbackQueueService
} = require("./queue");
const { resolveCourseKey } = require("./resolveCourseKey");

const enqueueFeedbackAfterSubmission = async ({
  activity,
  course,
  week,
  queueService
}) => {
  const courseKey = resolveCourseKey(course);
  const weekNumber = Number(week);

  if (!courseKey || !Number.isInteger(weekNumber)) {
    return { status: "unsupported" };
  }
  if (!getCourseIntegration(courseKey, weekNumber)) {
    return { status: "unsupported" };
  }

  const activityId = String(activity?._id || "");
  if (!activityId) {
    throw new TypeError("A persisted Activity is required to enqueue feedback");
  }

  const feedbackQueue = queueService || getActivityFeedbackQueueService();
  return feedbackQueue.enqueue({ activityId, courseKey });
};

module.exports = {
  enqueueFeedbackAfterSubmission
};
