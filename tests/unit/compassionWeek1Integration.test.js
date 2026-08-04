const { randomUUID } = require("crypto");
const {
  applyCompassionWeek1Feedback,
  buildCompassionWeek1Request,
  compassionWeek1Integration
} = require("../../utils/aiFeedback/courseIntegrations/compassion/week1");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  {
    page: 2,
    answer: "Compassion means noticing when someone needs help and doing something kind."
  },
  {
    page: 4,
    answer: "A theory explains how or why something happens."
  },
  {
    page: 6,
    answer: [2, 3, 4, 5, 6].map((stepId) => ({
      stepId,
      value: {
        0: `I notice the details in scenario ${stepId}.`,
        1: `The person may feel upset in scenario ${stepId}.`,
        2: `I would listen and offer practical help in scenario ${stepId}.`
      }
    }))
  }
];

describe("Compassion Week 1 feedback integration", () => {
  it("is registered with production guidance", () => {
    expect(getCourseIntegration("compassion", 1)).toBe(compassionWeek1Integration);
    const request = buildCompassionWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toMatchObject({
      courseKey: "compassion",
      weekNumber: 1,
      weekTitle: "Introduction to Compassion"
    });
    expect(request.context.guidance).toContain("Seeing, Caring, and Doing");
    expect(request.context.guidance).toContain("thoughtful, off-track, or minimal");
  });

  it("creates two page targets and fifteen response targets", () => {
    const request = buildCompassionWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.targets).toHaveLength(17);
    expect(request.targets[0].targetId).toBe("compassion:week:1:page:2");
    expect(request.targets[1].targetId).toBe("compassion:week:1:page:4");
    expect(request.targets[2]).toMatchObject({
      targetId: "compassion:week:1:page:6:step:2:response:0",
      activityLabel: "Activity 3 - Scenario 1 - Seeing"
    });
    expect(request.targets[16].targetId)
      .toBe("compassion:week:1:page:6:step:6:response:2");
  });

  it("gives each response its scenario and dimension context", () => {
    const request = buildCompassionWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const caring = request.targets.find(({ targetId }) =>
      targetId.endsWith("step:4:response:1")
    );

    expect(caring.question).toContain("studied hard but did not do well");
    expect(caring.question).toContain("Caring:");
    expect(caring.answer).toContain("may feel upset");
  });

  it("skips only existing response feedback without skipping its neighbours", () => {
    const activities = buildActivities();
    activities[2].answer[0].feedback = { 1: "Manual caring feedback" };
    const request = buildCompassionWeek1Request({
      requestId: randomUUID(),
      activities
    });
    const ids = request.targets.map(({ targetId }) => targetId);

    expect(ids).toContain("compassion:week:1:page:6:step:2:response:0");
    expect(ids).not.toContain("compassion:week:1:page:6:step:2:response:1");
    expect(ids).toContain("compassion:week:1:page:6:step:2:response:2");
  });

  it("stores nested scenario feedback without mutating answers", () => {
    const activities = buildActivities();
    const updated = applyCompassionWeek1Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:1:page:6:step:2:response:0",
          status: "ready",
          feedback: "You noticed the visible signs without making a judgment."
        }, {
          targetId: "compassion:week:1:page:6:step:2:response:2",
          status: "ready",
          feedback: "Listening and offering help turns care into compassionate action."
        }]
      }
    });
    const scenario = updated.find(({ page }) => page === 6).answer[0];

    expect(scenario.feedback).toEqual({
      0: "You noticed the visible signs without making a judgment.",
      2: "Listening and offering help turns care into compassionate action."
    });
    expect(activities[2].answer[0].feedback).toBeUndefined();
  });

  it("applies page feedback and rejects unknown targets", () => {
    const activities = buildActivities();
    const updated = applyCompassionWeek1Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:1:page:2",
          status: "ready",
          feedback: "Your answer connects noticing a need with taking kind action."
        }]
      }
    });
    expect(updated[0].feedback).toContain("kind action");

    expect(() => applyCompassionWeek1Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:1:page:99",
          status: "ready",
          feedback: "Unknown"
        }]
      }
    })).toThrow("Unknown feedback target");
  });
});
