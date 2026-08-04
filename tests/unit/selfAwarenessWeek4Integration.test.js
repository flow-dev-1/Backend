const { randomUUID } = require("crypto");
const { applySelfAwarenessWeek4Feedback, buildSelfAwarenessWeek4Request, selfAwarenessWeek4Integration } = require("../../utils/aiFeedback/courseIntegrations/self-awareness/week4");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { activity: 2, answers: ["Values are beliefs that guide my choices."] },
  { activity: 4, answers: ["Honesty", "Respect", "Kindness"] },
  { activity: 6, answers: [
    { q1: "Mum", q2: "Teacher", q3: "Friend" },
    { q1: "Responsible", q2: "Curious", q3: "Kind" },
    { q1: "Yes", q2: "I want to listen more", q3: "Yes" }
  ] },
  { activity: 8, answers: ["Integrity", "Empathy", "Courage", "Gratitude"] }
];

describe("Self-Awareness Week 4 feedback integration", () => {
  it("is registered and creates six editable targets", () => {
    expect(getCourseIntegration("self-awareness", 4)).toBe(selfAwarenessWeek4Integration);
    const request = buildSelfAwarenessWeek4Request({ requestId: randomUUID(), activities: buildActivities() });
    expect(request.context.weekTitle).toBe("Understanding Values");
    expect(request.context.guidance).toContain("Core values");
    expect(request.targets).toHaveLength(6);
  });

  it("formats all three important-person groups and core values", () => {
    const request = buildSelfAwarenessWeek4Request({ requestId: randomUUID(), activities: buildActivities() });
    expect(request.targets[2].answer).toContain("Person 3: Friend");
    expect(request.targets[3].answer).toContain("Perspective 2: Curious");
    expect(request.targets[4].answer).toContain("Reflection 2: I want to listen more");
    expect(request.targets[5].answer).toContain("Integrity, Empathy, Courage, Gratitude");
  });

  it("preserves manual feedback and applies by feedback index", () => {
    const activities = buildActivities();
    activities[2].feedback = ["Manual people feedback"];
    const updated = applySelfAwarenessWeek4Feedback({ activities, response: { results: [{
      targetId: "self-awareness:week:4:activity:6:perspectives", status: "ready",
      feedback: "You noticed that trusted people see responsibility, curiosity, and kindness in how you relate to them."
    }] } });
    expect(updated[2].feedback[0]).toBe("Manual people feedback");
    expect(updated[2].feedback[1]).toContain("responsibility");
    expect(activities[2].feedback[1]).toBeUndefined();
  });
});
