const { randomUUID } = require("crypto");
const { applySelfAwarenessWeek5Feedback, buildSelfAwarenessWeek5Request, selfAwarenessWeek5Integration } = require("../../utils/aiFeedback/courseIntegrations/self-awareness/week5");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { activity: 2, answers: ["Emotional intelligence means understanding feelings and managing how I respond."] },
  { activity: 4, answers: ["Happy", "Sad"] },
  { activity: 6, answers: {
    IWill: ["Listen to Alex", "Say no and attend class", "Use the feedback", "Talk to a trusted adult", "Ask for feedback and keep practising"],
    IWillNot: ["Ignore Alex", "Skip class", "Argue with everyone", "Hide everything", "Decide I have no ability"]
  } },
  { activity: 8, answers: { 0: "Happy", 1: "Anxiety" } }
];

describe("Self-Awareness Week 5 feedback integration", () => {
  it("is registered and creates only the six editable targets", () => {
    expect(getCourseIntegration("self-awareness", 5)).toBe(selfAwarenessWeek5Integration);
    const request = buildSelfAwarenessWeek5Request({ requestId: randomUUID(), activities: buildActivities() });
    expect(request.context.weekTitle).toBe("Understanding Emotional Intelligence");
    expect(request.context.guidance).toContain("Sarah and Alex");
    expect(request.targets).toHaveLength(6);
    expect(request.targets.some(({ targetId }) => targetId.includes("activity:4"))).toBe(false);
    expect(request.targets.some(({ targetId }) => targetId.includes("activity:8"))).toBe(false);
  });

  it("keeps each scenario's I will and I will not responses together", () => {
    const request = buildSelfAwarenessWeek5Request({ requestId: randomUUID(), activities: buildActivities() });
    expect(request.targets[1].answer).toBe("I will: Listen to Alex\nI will not: Ignore Alex");
    expect(request.targets[5].answer).toContain("Ask for feedback and keep practising");
  });

  it("preserves manual scenario feedback and applies by scenario index", () => {
    const activities = buildActivities();
    activities[2].feedback = ["Manual Sarah and Alex feedback"];
    const updated = applySelfAwarenessWeek5Feedback({ activities, response: { results: [{
      targetId: "self-awareness:week:5:activity:6:scenario:2", status: "ready",
      feedback: "Saying no and attending class shows a clear boundary that protects your learning despite peer pressure."
    }] } });
    expect(updated[2].feedback[0]).toBe("Manual Sarah and Alex feedback");
    expect(updated[2].feedback[1]).toContain("clear boundary");
    expect(activities[2].feedback[1]).toBeUndefined();
  });
});
