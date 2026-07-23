const { randomUUID } = require("crypto");
const {
  applySelfAwarenessWeek2Feedback,
  buildSelfAwarenessWeek2Request,
  selfAwarenessWeek2Integration
} = require("../../utils/aiFeedback/courseIntegrations/self-awareness/week2");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { activity: 2, answers: ["Strengths are things I do well, while weaknesses are areas I can improve."] },
  { activity: 4, answers: { strengths: ["Good listener", "Problem Solver"] } },
  { activity: 5, answers: { weakness: ["Easily distracted", "Shy"] } },
  {
    activity: 7,
    answers: {
      strengthsQ1: ["Empathy", "Active Listening"],
      weaknessesQ1: ["Impatience"],
      strengthsQ2: ["Communication", "Team-work"],
      weaknessesQ2: ["De-organization"],
      strengthsQ3: ["Determination", "Resilience"],
      weaknessesQ3: ["Distraction"]
    }
  }
];

describe("Self-Awareness Week 2 feedback integration", () => {
  it("is registered", () => {
    expect(getCourseIntegration("self-awareness", 2))
      .toBe(selfAwarenessWeek2Integration);
  });

  it("creates six activity-only targets with three separate scenarios", () => {
    const request = buildSelfAwarenessWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context).toMatchObject({
      courseKey: "self-awareness",
      weekNumber: 2,
      weekTitle: "Strengths and Weaknesses"
    });
    expect(request.context.guidance).toContain("failed-test scenario");
    expect(request.targets).toHaveLength(6);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "self-awareness:week:2:activity:2",
      "self-awareness:week:2:activity:4",
      "self-awareness:week:2:activity:5",
      "self-awareness:week:2:activity:7:scenario:1",
      "self-awareness:week:2:activity:7:scenario:2",
      "self-awareness:week:2:activity:7:scenario:3"
    ]);
  });

  it("formats selections and scenario choices as readable labels", () => {
    const request = buildSelfAwarenessWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets[1].answer).toBe("Good listener, Problem Solver");
    expect(request.targets[3].answer).toContain("Selected strengths: Empathy, Active Listening");
    expect(request.targets[3].answer).toContain("Selected weaknesses: Impatience");
  });

  it("preserves manual feedback and applies generated scenario feedback by index", () => {
    const activities = buildActivities();
    activities[3].feedback = ["Manual scenario one feedback"];
    const request = buildSelfAwarenessWeek2Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(5);
    expect(request.targets.some(({ targetId }) => targetId.endsWith("scenario:1")))
      .toBe(false);

    const updated = applySelfAwarenessWeek2Feedback({
      activities,
      response: {
        results: [{
          targetId: "self-awareness:week:2:activity:7:scenario:2",
          status: "ready",
          feedback: "Your communication and teamwork choices would help the group share ideas and organise its next step."
        }]
      }
    });
    expect(updated[3].feedback[0]).toBe("Manual scenario one feedback");
    expect(updated[3].feedback[1]).toContain("communication and teamwork");
    expect(updated[3].answers).toEqual(activities[3].answers);
    expect(activities[3].feedback[1]).toBeUndefined();
  });
});
