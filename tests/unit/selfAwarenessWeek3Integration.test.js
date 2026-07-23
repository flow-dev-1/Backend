const { randomUUID } = require("crypto");
const {
  applySelfAwarenessWeek3Feedback,
  buildSelfAwarenessWeek3Request,
  selfAwarenessWeek3Integration
} = require("../../utils/aiFeedback/courseIntegrations/self-awareness/week3");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { activity: 2, answers: ["Mindset is how I think about myself and challenges."] },
  { activity: 4, answers: ["I show a growth mindset when I practise after making mistakes."] },
  {
    activity: 6,
    answers: [
      "Abilities can improve with practice.",
      "Mistakes can teach me something.",
      "I can ask for help.",
      "Challenges help me grow.",
      "Trying a new strategy can help.",
      "I will ask my teacher for help when maths is difficult."
    ]
  }
];

describe("Self-Awareness Week 3 feedback integration", () => {
  it("is registered", () => {
    expect(getCourseIntegration("self-awareness", 3))
      .toBe(selfAwarenessWeek3Integration);
  });

  it("creates four editable targets and keeps Activity 3 responses separate", () => {
    const request = buildSelfAwarenessWeek3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context).toMatchObject({
      courseKey: "self-awareness",
      weekNumber: 3,
      weekTitle: "Understanding Mindset"
    });
    expect(request.context.guidance).toContain("fixed mindset");
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "self-awareness:week:3:activity:2",
      "self-awareness:week:3:activity:4",
      "self-awareness:week:3:activity:6:lessons",
      "self-awareness:week:3:activity:6:growth-action"
    ]);
    expect(request.targets[2].answer).toContain("5. Trying a new strategy");
    expect(request.targets[3].answer).toContain("ask my teacher");
  });

  it("requires all five lesson responses before generating their grouped feedback", () => {
    const activities = buildActivities();
    activities[2].answers[3] = "";
    const request = buildSelfAwarenessWeek3Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets.some(({ targetId }) => targetId.endsWith(":lessons")))
      .toBe(false);
    expect(request.targets.some(({ targetId }) => targetId.endsWith(":growth-action")))
      .toBe(true);
  });

  it("preserves manual feedback and applies feedback to the correct Activity 3 slot", () => {
    const activities = buildActivities();
    activities[2].feedback = ["Manual lessons feedback"];
    const updated = applySelfAwarenessWeek3Feedback({
      activities,
      response: {
        results: [{
          targetId: "self-awareness:week:3:activity:6:growth-action",
          status: "ready",
          feedback: "Asking your teacher for help gives your goal a clear action you can use when maths becomes difficult."
        }]
      }
    });
    expect(updated[2].feedback[0]).toBe("Manual lessons feedback");
    expect(updated[2].feedback[1]).toContain("clear action");
    expect(updated[2].answers).toEqual(activities[2].answers);
    expect(activities[2].feedback[1]).toBeUndefined();
  });
});
