const {
  createBedrockClaudeFeedbackProvider
} = require("../providers");
const { createActivityFeedbackQueue } = require("./createActivityFeedbackQueue");

let service;

const getActivityFeedbackQueueService = () => {
  if (!service) {
    service = createActivityFeedbackQueue({
      provider: createBedrockClaudeFeedbackProvider()
    });
  }

  return service;
};

module.exports = {
  getActivityFeedbackQueueService
};
