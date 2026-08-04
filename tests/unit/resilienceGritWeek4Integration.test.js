const { randomUUID } = require("crypto");
const {
  applyResilienceGritWeek4Feedback,
  buildResilienceGritWeek4Request,
  resilienceGritWeek4Integration
} = require("../../utils/aiFeedback/courseIntegrations/resilience-grit/week4");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [{
  page: 2,
  answer: "A support system is a group of people who help you through challenges."
}, {
  page: 4,
  answer: [
    { index: 0, value: "My mother" },
    { index: 1, value: "My teacher" },
    { index: 2, value: "My best friend" }
  ]
}, {
  page: 6,
  answer: [
    { id: "1", text: "Parent" },
    { id: "2", text: "Teacher" },
    { id: "3", text: "Friend" },
    { id: "4", text: "Coach" },
    { id: "5", text: "Mentor" }
  ]
}];

describe("Resilience and Grit Week 4 feedback integration", () => {
  it("is registered with support-system guidance", () => {
    expect(getCourseIntegration("resilience-grit", 4))
      .toBe(resilienceGritWeek4Integration);
    const request = buildResilienceGritWeek4Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context.guidance).toContain("Asking for help");
    expect(request.context.guidance).toContain("healthy boundaries");
  });

  it("creates three targets with readable support-network lists", () => {
    const request = buildResilienceGritWeek4Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets).toHaveLength(3);
    expect(request.targets[1].answer).toBe(
      "1. My mother\n2. My teacher\n3. My best friend"
    );
    expect(request.targets[2].answer).toContain("1. Parent");
    expect(request.targets[2].answer).toContain("5. Mentor");
  });

  it("preserves manual feedback and applies generated feedback immutably", () => {
    const activities = buildActivities();
    activities[1].feedback = "Manual feedback";
    const request = buildResilienceGritWeek4Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(2);

    const updated = applyResilienceGritWeek4Feedback({
      activities,
      response: { results: [{
        targetId: "resilience-grit:week:4:page:6",
        status: "ready",
        feedback: "You identified several people who may offer different kinds of support."
      }] }
    });
    expect(updated[2].feedback).toContain("different kinds of support");
    expect(updated[2].answer).toEqual(activities[2].answer);
    expect(activities[2].feedback).toBeUndefined();
  });
});
