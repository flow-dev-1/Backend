const { randomUUID } = require("crypto");
const {
  applyResilienceGritWeek3Feedback,
  buildResilienceGritWeek3Request,
  resilienceGritWeek3Integration
} = require("../../utils/aiFeedback/courseIntegrations/resilience-grit/week3");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [{
  page: 2,
  answer: "Adaptability means changing your plan when circumstances change."
}, {
  page: 4,
  answer: { green: [0, 2, 4, 6, 8], red: [1, 3, 5, 7, 9] }
}, {
  page: 5,
  answer: [2, 3, 4, 5, 6].map((stepId, index) => ({
    stepId,
    value: `I would make a suitable new plan for scenario ${index + 1}.`
  }))
}];

describe("Resilience and Grit Week 3 feedback integration", () => {
  it("is registered with adaptability guidance", () => {
    expect(getCourseIntegration("resilience-grit", 3))
      .toBe(resilienceGritWeek3Integration);
    const request = buildResilienceGritWeek3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context.guidance).toContain("adjust to new situations");
    expect(request.context.guidance).toContain("distinct feedback");
  });

  it("creates two activity targets and five separate scenario targets", () => {
    const request = buildResilienceGritWeek3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets).toHaveLength(7);
    expect(request.targets[1].answer).toContain("Adaptability: Ability to adjust");
    expect(request.targets[1].answer).toContain("Not adaptability: Expecting everything");
    expect(request.targets[2]).toMatchObject({
      targetId: "resilience-grit:week:3:page:5:scenario:1",
      activityLabel: "Activity 3 - Scenario 1"
    });
    expect(request.targets[6].targetId)
      .toBe("resilience-grit:week:3:page:5:scenario:5");
  });

  it("skips only a scenario with existing manual feedback", () => {
    const activities = buildActivities();
    activities[2].feedback = [{ stepId: 2, value: "Manual scenario feedback" }];
    const request = buildResilienceGritWeek3Request({
      requestId: randomUUID(),
      activities
    });
    const ids = request.targets.map(({ targetId }) => targetId);
    expect(ids).toContain("resilience-grit:week:3:page:5:scenario:1");
    expect(ids).not.toContain("resilience-grit:week:3:page:5:scenario:2");
    expect(ids).toContain("resilience-grit:week:3:page:5:scenario:3");
  });

  it("stores scenario feedback with the UI's step IDs without mutating answers", () => {
    const activities = buildActivities();
    const updated = applyResilienceGritWeek3Feedback({
      activities,
      response: { results: [{
        targetId: "resilience-grit:week:3:page:5:scenario:1",
        status: "ready",
        feedback: "Breaking the workload into smaller priorities is a practical adjustment."
      }, {
        targetId: "resilience-grit:week:3:page:5:scenario:5",
        status: "ready",
        feedback: "Changing roles when problems arise would make this plan more adaptable."
      }] }
    });
    expect(updated[2].feedback).toEqual([{ stepId: 1, value: expect.any(String) }, {
      stepId: 5,
      value: expect.any(String)
    }]);
    expect(updated[2].answer).toEqual(activities[2].answer);
    expect(activities[2].feedback).toBeUndefined();
  });
});
