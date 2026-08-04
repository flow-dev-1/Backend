const { randomUUID } = require("crypto");
const {
  applyCompassionWeek5Feedback,
  buildCompassionWeek5Request,
  compassionWeek5Integration
} = require("../../utils/aiFeedback/courseIntegrations/compassion/week5");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const activities = () => [{
  page: 2,
  answer: [
    { id: 1, value: "B" },
    { id: 3, value: "A" },
    { id: 5, value: "C" },
    { id: 7, value: "C" }
  ]
}];

describe("Compassion Week 5 feedback integration", () => {
  it("is registered with all four scenario rules", () => {
    expect(getCourseIntegration("compassion", 5)).toBe(compassionWeek5Integration);
    const request = buildCompassionWeek5Request({ requestId: randomUUID(), activities: activities() });
    expect(request.context.weekNumber).toBe(5);
    expect(request.context.guidance).toContain("forgotten homework");
    expect(request.context.guidance).toContain("sibling is rude to a waiter");
    expect(request.context.guidance).toContain("nervous new student");
    expect(request.context.guidance).toContain("friend failed");
  });

  it("creates one target for each scenario with its selected option", () => {
    const request = buildCompassionWeek5Request({ requestId: randomUUID(), activities: activities() });
    expect(request.targets).toHaveLength(4);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "compassion:week:5:page:2:scenario:1",
      "compassion:week:5:page:2:scenario:3",
      "compassion:week:5:page:2:scenario:5",
      "compassion:week:5:page:2:scenario:7"
    ]);
    expect(request.targets[0].question).toContain("Selected option B");
    expect(request.targets[2].question).toContain("without permission");
  });

  it("skips only a scenario that already has feedback", () => {
    const source = activities();
    source[0].answer[1].feedback = "Manual waiter feedback";
    const request = buildCompassionWeek5Request({ requestId: randomUUID(), activities: source });
    expect(request.targets).toHaveLength(3);
    expect(request.targets.map(({ targetId }) => targetId))
      .not.toContain("compassion:week:5:page:2:scenario:3");
  });

  it("stores each scenario feedback without mutating answer selections", () => {
    const source = activities();
    const updated = applyCompassionWeek5Feedback({
      activities: source,
      response: { results: [{
        targetId: "compassion:week:5:page:2:scenario:5",
        status: "ready",
        feedback: "You wanted to include the student, but asking first would respect his choice."
      }] }
    });
    expect(updated[0].answer[2]).toEqual({
      id: 5,
      value: "C",
      feedback: "You wanted to include the student, but asking first would respect his choice."
    });
    expect(source[0].answer[2].feedback).toBeUndefined();
  });
});
