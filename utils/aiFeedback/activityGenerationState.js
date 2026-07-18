const getGenerationState = (activity) => {
  const state = activity?.feedbackGeneration;
  if (!state) return {};
  return typeof state.toObject === "function" ? state.toObject() : { ...state };
};

const boundedErrorMessage = (error) =>
  String(error?.message || "Feedback generation failed").slice(0, 2000);

const createActivityNotFoundError = (activityId) => {
  const error = new Error(`Activity record not found: ${activityId}`);
  error.code = "ACTIVITY_NOT_FOUND";
  return error;
};

module.exports = {
  boundedErrorMessage,
  createActivityNotFoundError,
  getGenerationState
};
