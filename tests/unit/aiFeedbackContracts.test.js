const { randomUUID } = require("crypto");
const {
  validateGenerationRequest,
  validateGenerationResponse,
  validateGenerationExchange
} = require("../../utils/aiFeedback/contracts");

const buildRequest = () => ({
  requestId: randomUUID(),
  context: {
    courseKey: "transition-2",
    courseTitle: "Transition 2",
    weekNumber: 1,
    weekTitle: "Defining Your Next Chapter"
  },
  targets: [
    {
      targetId: "activity:6:step:2",
      activityLabel: "Activity 3",
      question: "What is your reason for going to secondary school?",
      answer: "I want to prepare for my future.",
      responseType: "reflection"
    }
  ]
});

describe("AI feedback contracts", () => {
  it("accepts a normalized activity-feedback request", () => {
    const { error } = validateGenerationRequest(buildRequest());

    expect(error).toBeUndefined();
  });

  it("rejects duplicate target IDs", () => {
    const request = buildRequest();
    request.targets.push({ ...request.targets[0] });

    const { error } = validateGenerationRequest(request);

    expect(error).toBeDefined();
  });

  it("rejects identity fields that must not be sent to the provider", () => {
    const request = buildRequest();
    request.context.email = "student@example.com";

    const { error } = validateGenerationRequest(request);

    expect(error).toBeDefined();
  });

  it("accepts ready and skipped feedback results", () => {
    const requestId = randomUUID();
    const { error } = validateGenerationResponse({
      requestId,
      results: [
        {
          targetId: "activity:1",
          status: "ready",
          feedback: "You clearly connected this goal to your future plans."
        },
        {
          targetId: "activity:2",
          status: "skipped",
          reason: "No meaningful response was provided."
        }
      ]
    });

    expect(error).toBeUndefined();
  });

  it("rejects a ready result without feedback", () => {
    const { error } = validateGenerationResponse({
      requestId: randomUUID(),
      results: [{ targetId: "activity:1", status: "ready" }]
    });

    expect(error).toBeDefined();
  });

  it("rejects feedback longer than 45 words", () => {
    const feedback = Array.from({ length: 46 }, (_, index) => `word${index}`).join(" ");
    const { error } = validateGenerationResponse({
      requestId: randomUUID(),
      results: [{ targetId: "activity:1", status: "ready", feedback }]
    });

    expect(error).toBeDefined();
    expect(error.message).toContain("no more than 45 words");
  });

  it("rejects feedback containing more than two sentences", () => {
    const { error } = validateGenerationResponse({
      requestId: randomUUID(),
      results: [{
        targetId: "activity:1",
        status: "ready",
        feedback: "You identified the need. Your action was helpful. Add one reason next time."
      }]
    });

    expect(error).toBeDefined();
    expect(error.message).toContain("no more than 2 sentences");
  });

  it.each([
    "- You identified a helpful action.",
    "• You identified a helpful action.",
    "1. You identified a helpful action.",
    "You identified a helpful action — now explain why it helps."
  ])("rejects list or decorative-dash formatting: %s", (feedback) => {
    const { error } = validateGenerationResponse({
      requestId: randomUUID(),
      results: [{ targetId: "activity:1", status: "ready", feedback }]
    });

    expect(error).toBeDefined();
    expect(error.message).toContain("plain prose");
  });

  it("allows normal hyphenated terms in prose", () => {
    const { error } = validateGenerationResponse({
      requestId: randomUUID(),
      results: [{
        targetId: "activity:1",
        status: "ready",
        feedback: "You connected self-compassion to responding kindly after a mistake."
      }]
    });

    expect(error).toBeUndefined();
  });

  it("accepts a response containing exactly the requested targets", () => {
    const request = buildRequest();
    const response = {
      requestId: request.requestId,
      results: [
        {
          targetId: request.targets[0].targetId,
          status: "ready",
          feedback: "You connected this reason clearly to your future."
        }
      ]
    };

    const { error } = validateGenerationExchange(request, response);

    expect(error).toBeUndefined();
  });

  it("rejects a response for a different request or target", () => {
    const request = buildRequest();
    const response = {
      requestId: request.requestId,
      results: [
        {
          targetId: "activity:wrong",
          status: "ready",
          feedback: "Feedback for the wrong activity."
        }
      ]
    };

    const { error } = validateGenerationExchange(request, response);

    expect(error).toBeDefined();
  });
});
