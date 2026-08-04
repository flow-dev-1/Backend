const { randomUUID } = require("crypto");
const { getCourseIntegration } = require("./courseIntegrations");

const orchestrateFeedbackGeneration = async ({
  courseKey,
  weekNumber,
  activities,
  provider,
  requestId = randomUUID()
}) => {
  if (!provider || typeof provider.generate !== "function") {
    throw new TypeError("A valid feedback provider is required");
  }

  const integration = getCourseIntegration(courseKey, weekNumber);
  if (!integration) {
    throw new Error(
      `No AI feedback integration for course ${courseKey}, week ${weekNumber}`
    );
  }

  const request = integration.buildRequest({ requestId, activities });
  if (!request) {
    return {
      status: "no_targets",
      activities,
      feedbackResponse: null,
      generatedTargetCount: 0,
      skippedTargetCount: 0
    };
  }

  const response = await provider.generate(request);
  const updatedActivities = integration.applyFeedback({
    activities,
    response
  });

  return {
    status: "completed",
    activities: updatedActivities,
    feedbackResponse: response,
    generatedTargetCount: response.results.filter(
      ({ status }) => status === "ready"
    ).length,
    skippedTargetCount: response.results.filter(
      ({ status }) => status === "skipped"
    ).length
  };
};

module.exports = {
  orchestrateFeedbackGeneration
};
