const { randomUUID } = require("crypto");
const {
  applyCompassionWeek4Feedback,
  buildCompassionWeek4Request,
  compassionWeek4Integration
} = require("../../utils/aiFeedback/courseIntegrations/compassion/week4");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const activities = () => [
  { page: 2, answer: "I would ask a trusted adult and find a safe way to help them get food." },
  { page: 4, answer: { inner: [0, 1, 4, 5, 10], outer: [6, 7, 9, 11, 2, 3, 8] } },
  { page: 6, answer: { green: [0, 8], orange: [1, 4, 9], red: [2, 3, 5, 6, 7] } }
];

describe("Compassion Week 4 feedback integration", () => {
  it("is registered with Circle of Concern guidance", () => {
    expect(getCourseIntegration("compassion", 4)).toBe(compassionWeek4Integration);
    const request = buildCompassionWeek4Request({ requestId: randomUUID(), activities: activities() });
    expect(request.context.weekTitle).toBe("Circle of Concern");
    expect(request.context.guidance).toContain("safety, and boundaries");
  });

  it("creates three targets with readable drag-and-drop groups", () => {
    const request = buildCompassionWeek4Request({ requestId: randomUUID(), activities: activities() });
    expect(request.targets).toHaveLength(3);
    expect(request.targets[1].answer).toContain("inner: Mum, Dad");
    expect(request.targets[1].answer).toContain("outer: Stranger");
    expect(request.targets[2].answer).toContain("Inner Circle: Helping with chores at home");
    expect(request.targets[2].answer).toContain("Outer Circle: Helping an elderly neighbor");
    expect(request.targets[2].answer).toContain("Both: Smiling at someone");
  });

  it("preserves manual feedback and applies generated feedback immutably", () => {
    const source = activities();
    source[1].feedback = "Manual classification feedback";
    const request = buildCompassionWeek4Request({ requestId: randomUUID(), activities: source });
    expect(request.targets.map(({ targetId }) => targetId))
      .not.toContain("compassion:week:4:page:4");

    const updated = applyCompassionWeek4Feedback({
      activities: source,
      response: { results: [{
        targetId: "compassion:week:4:page:2",
        status: "ready",
        feedback: "You combine kindness with a safe and practical boundary."
      }] }
    });
    expect(updated[0].feedback).toContain("safe and practical boundary");
    expect(source[0].feedback).toBeUndefined();
  });
});
