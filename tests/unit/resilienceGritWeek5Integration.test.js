const { randomUUID } = require("crypto");
const {
  applyResilienceGritWeek5Feedback,
  buildResilienceGritWeek5Request,
  resilienceGritWeek5Integration
} = require("../../utils/aiFeedback/courseIntegrations/resilience-grit/week5");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const copingSkills = [
  "Take deep breaths and count to ten.",
  "Talk to someone you trust.",
  "Ask for help or guidance from a teacher or friend.",
  "Write down how you feel in a journal.",
  "Break the problem into smaller steps and focus on one at a time.",
  "Visualize yourself doing well and succeeding.",
  "Do an activity like drawing or playing a game.",
  "Take a short walk or move to a quiet space to cool down.",
  "Practice positive self-talk, like I can handle this.",
  "Take deep breaths and count to ten."
];

const buildActivities = () => [{
  page: 2,
  answer: "Coping skills are healthy ways to handle stress and difficult emotions."
}, {
  page: 4,
  answer: Array.from({ length: 5 }, (_, index) => ({
    index,
    value: `Challenge ${index + 1}`
  }))
}, {
  page: 6,
  answer: copingSkills.map((value, index) => ({ stepId: index + 2, value }))
}];

describe("Resilience and Grit Week 5 feedback integration", () => {
  it("is registered with healthy coping guidance", () => {
    expect(getCourseIntegration("resilience-grit", 5))
      .toBe(resilienceGritWeek5Integration);
    const request = buildResilienceGritWeek5Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context.guidance).toContain("Healthy coping skills");
    expect(request.context.guidance).toContain("personal coping toolbox");
  });

  it("creates three targets and labels all ten coping matches", () => {
    const request = buildResilienceGritWeek5Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets).toHaveLength(3);
    expect(request.targets[1].answer).toContain("5. Challenge 5");
    expect(request.targets[2].answer).toContain("Situation 1:");
    expect(request.targets[2].answer).toContain("Situation 10:");
    expect(request.targets[2].answer).toContain("Selected coping skill:");
  });

  it("preserves manual feedback and applies generated feedback immutably", () => {
    const activities = buildActivities();
    activities[0].feedback = "Manual feedback";
    const request = buildResilienceGritWeek5Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(2);

    const updated = applyResilienceGritWeek5Feedback({
      activities,
      response: { results: [{
        targetId: "resilience-grit:week:5:page:6",
        status: "ready",
        feedback: "You selected several safe coping strategies that fit the situations."
      }] }
    });
    expect(updated[2].feedback).toContain("safe coping strategies");
    expect(updated[2].answer).toEqual(activities[2].answer);
    expect(activities[2].feedback).toBeUndefined();
  });
});
