const { randomUUID } = require("crypto");
const {
  applyResilienceGritWeek2Feedback,
  buildResilienceGritWeek2Request,
  resilienceGritWeek2Integration
} = require("../../utils/aiFeedback/courseIntegrations/resilience-grit/week2");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [{
  page: 2,
  answer: "A"
}, {
  page: 4,
  answer: [
    "Confidence",
    "Connections",
    "Character",
    "Coping",
    "Contribution",
    "Competence",
    "Control"
  ].map((value, index) => ({ stepId: index + 2, value }))
}];

describe("Resilience and Grit Week 2 feedback integration", () => {
  it("is registered with the 7 Cs teaching context", () => {
    expect(getCourseIntegration("resilience-grit", 2))
      .toBe(resilienceGritWeek2Integration);
    const request = buildResilienceGritWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context.guidance).toContain("Competence");
    expect(request.context.guidance).toContain("Contribution");
  });

  it("creates two targets with human-readable answers", () => {
    const request = buildResilienceGritWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets).toHaveLength(2);
    expect(request.targets[0].answer).toBe("Yes");
    expect(request.targets[1].answer).toContain("Selected C: Confidence");
    expect(request.targets[1].answer).toContain("Selected C: Control");
  });

  it("matches selections by step ID rather than array position", () => {
    const activities = buildActivities();
    activities[1].answer.reverse();
    const request = buildResilienceGritWeek2Request({
      requestId: randomUUID(),
      activities
    });

    expect(request.targets[1].answer).toMatch(
      /Belief in your ability[\s\S]*Selected C: Confidence/
    );
    expect(request.targets[1].answer).toMatch(
      /Understanding what you can influence[\s\S]*Selected C: Control/
    );
  });

  it("preserves manual feedback and applies generated feedback immutably", () => {
    const activities = buildActivities();
    activities[0].feedback = "Manual feedback";
    const request = buildResilienceGritWeek2Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(1);

    const updated = applyResilienceGritWeek2Feedback({
      activities,
      response: { results: [{
        targetId: "resilience-grit:week:2:page:4",
        status: "ready",
        feedback: "Your matches connect each definition to the correct resilience building block."
      }] }
    });
    expect(updated[1].feedback).toContain("building block");
    expect(activities[1].feedback).toBeUndefined();
  });
});
