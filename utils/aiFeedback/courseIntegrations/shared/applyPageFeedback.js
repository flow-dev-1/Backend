const { hasExistingFeedback } = require("./normalizers");

const applyPageFeedback = ({ activities, results, targetPages }) => {
  if (!Array.isArray(activities)) {
    throw new TypeError("Activities must be an array");
  }

  if (!Array.isArray(results)) {
    throw new TypeError("Feedback results must be an array");
  }

  if (!targetPages || typeof targetPages !== "object") {
    throw new TypeError("Target page mapping is required");
  }

  const seenTargets = new Set();
  const feedbackByPage = new Map();

  results.forEach((result) => {
    const targetId = result?.targetId;
    if (typeof targetId !== "string" || seenTargets.has(targetId)) {
      throw new TypeError(`Invalid or duplicate feedback target: ${targetId}`);
    }
    seenTargets.add(targetId);

    if (!Object.prototype.hasOwnProperty.call(targetPages, targetId)) {
      throw new TypeError(`Unknown feedback target: ${targetId}`);
    }
    const page = targetPages[targetId];

    const matchingActivities = activities.filter(
      (activity) => Number(activity?.page) === Number(page)
    );
    if (matchingActivities.length !== 1) {
      throw new TypeError(
        `Feedback target ${targetId} must map to exactly one saved activity`
      );
    }

    if (result.status === "skipped") return;
    if (result.status !== "ready" || typeof result.feedback !== "string") {
      throw new TypeError(`Invalid feedback result for target: ${targetId}`);
    }

    const feedback = result.feedback.trim();
    if (!feedback) {
      throw new TypeError(`Empty feedback result for target: ${targetId}`);
    }

    feedbackByPage.set(Number(page), feedback);
  });

  return activities.map((activity) => {
    const page = Number(activity?.page);
    const feedback = feedbackByPage.get(page);

    if (!feedback || hasExistingFeedback(activity?.feedback)) return activity;

    return {
      ...activity,
      feedback
    };
  });
};

module.exports = {
  applyPageFeedback
};
