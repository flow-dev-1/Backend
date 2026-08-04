const { randomUUID } = require("crypto");
const {
  applySelfAwarenessWeek1Feedback,
  buildSelfAwarenessWeek1Request,
  selfAwarenessWeek1Integration
} = require("../../utils/aiFeedback/courseIntegrations/self-awareness/week1");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");
const { resolveCourseKey } = require("../../utils/aiFeedback/resolveCourseKey");

const QUESTIONS = [
  "Did you get the same color as the color you identified for yourself earlier?",
  "What was different? Why do you think this was different?",
  "Do you agree with this new result?"
];

const buildActivities = () => [
  { activity: 2, answers: ["Self-awareness is understanding my feelings and actions."] },
  { activity: 4, answers: ["Personality is how someone thinks, feels, and behaves."] },
  {
    activity: 6,
    buckets: {
      yes: [{ content: "I am honest and tell the truth." }],
      no: [{ content: "I enjoy meeting new people." }],
      sometimes: [{ content: "I like to try new things." }]
    }
  },
  {
    activity: 8,
    answer: {
      selectedPersonality: "Analytic",
      explanation: "I enjoy facts and think carefully before deciding."
    }
  },
  {
    activity: 14,
    answers: QUESTIONS.map((questionText, index) => ({
      questionText,
      answer: ["No, I chose a different colour.", "The test showed more analytic traits.", "Yes, because it matches how I solve problems."][index]
    }))
  }
];

describe("Self-Awareness Week 1 feedback integration", () => {
  it("is registered and resolves production course identifiers", () => {
    expect(getCourseIntegration("self-awareness", 1))
      .toBe(selfAwarenessWeek1Integration);
    expect(resolveCourseKey({ title: "Self-Awareness" })).toBe("self-awareness");
    expect(resolveCourseKey({ url: "self-awareness-course" })).toBe("self-awareness");
  });

  it("creates every editable Week 1 feedback target", () => {
    const request = buildSelfAwarenessWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toMatchObject({
      courseKey: "self-awareness",
      weekNumber: 1,
      weekTitle: "Introduction to Self-Awareness"
    });
    expect(request.context.guidance).toContain("four personality colours");
    expect(request.targets).toHaveLength(7);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "self-awareness:week:1:activity:2",
      "self-awareness:week:1:activity:4",
      "self-awareness:week:1:activity:6",
      "self-awareness:week:1:activity:8",
      "self-awareness:week:1:activity:14:reflection:agree",
      "self-awareness:week:1:activity:14:reflection:match",
      "self-awareness:week:1:activity:14:reflection:difference"
    ]);
  });

  it("sends readable bucket labels and keeps the three reflections separate", () => {
    const request = buildSelfAwarenessWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const dragDrop = request.targets.find(({ targetId }) => targetId.endsWith("activity:6"));
    expect(dragDrop.answer).toContain("Yes: I am honest");
    expect(dragDrop.answer).toContain("Sometimes: I like to try new things");
    expect(request.targets.at(-3).answer).toContain("Yes, because");
    expect(request.targets.at(-2).answer).toContain("No, I chose");
    expect(request.targets.at(-1).answer).toContain("analytic traits");
  });

  it("preserves manual feedback and applies generated feedback by slot", () => {
    const activities = buildActivities();
    activities[4].feedback = ["Manual agreement feedback"];
    const request = buildSelfAwarenessWeek1Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(6);
    expect(request.targets.some(({ targetId }) => targetId.endsWith("reflection:agree")))
      .toBe(false);

    const updated = applySelfAwarenessWeek1Feedback({
      activities,
      response: {
        results: [{
          targetId: "self-awareness:week:1:activity:14:reflection:difference",
          status: "ready",
          feedback: "You identified a specific difference and connected it to your analytic traits."
        }]
      }
    });
    expect(updated[4].feedback[0]).toBe("Manual agreement feedback");
    expect(updated[4].feedback[2]).toContain("specific difference");
    expect(updated[4].answers).toEqual(activities[4].answers);
    expect(activities[4].feedback[2]).toBeUndefined();
  });
});
