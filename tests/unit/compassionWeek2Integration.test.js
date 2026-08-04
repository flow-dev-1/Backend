const { randomUUID } = require("crypto");
const {
  applyCompassionWeek2Feedback,
  buildCompassionWeek2Request,
  compassionWeek2Integration
} = require("../../utils/aiFeedback/courseIntegrations/compassion/week2");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: "Being patient and kind to myself when I make a mistake." },
  { page: 4, answer: "I know the result hurt, but one mistake does not define me. I can learn and try again." },
  {
    page: 6,
    answer: [
      { id: 1, value: "someone listens carefully and spends time with me" },
      { id: 2, value: "a friend checks on me when I am quiet" },
      { id: 3, value: "I feel overwhelmed by school work" },
      { id: 4, value: "ask how I am feeling before giving advice" }
    ]
  }
];

describe("Compassion Week 2 feedback integration", () => {
  it("is registered with script-derived Week 2 guidance", () => {
    expect(getCourseIntegration("compassion", 2)).toBe(compassionWeek2Integration);
    const request = buildCompassionWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toMatchObject({
      courseKey: "compassion",
      weekNumber: 2,
      weekTitle: "Self-Compassion"
    });
    expect(request.context.guidance).toContain("same patience, comfort, and understanding");
    expect(request.context.guidance).toContain("Mindfulness");
    expect(request.context.guidance).toContain("Setting boundaries");
  });

  it("creates two page targets and four separate prompt targets", () => {
    const request = buildCompassionWeek2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.targets).toHaveLength(6);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "compassion:week:2:page:2",
      "compassion:week:2:page:4",
      "compassion:week:2:page:6:prompt:1",
      "compassion:week:2:page:6:prompt:2",
      "compassion:week:2:page:6:prompt:3",
      "compassion:week:2:page:6:prompt:4"
    ]);
  });

  it("skips only targets that already have feedback", () => {
    const activities = buildActivities();
    activities[0].feedback = "Manual definition feedback";
    activities[2].answer[1].feedback = "Manual care feedback";
    const request = buildCompassionWeek2Request({
      requestId: randomUUID(),
      activities
    });
    const ids = request.targets.map(({ targetId }) => targetId);

    expect(ids).not.toContain("compassion:week:2:page:2");
    expect(ids).not.toContain("compassion:week:2:page:6:prompt:2");
    expect(ids).toContain("compassion:week:2:page:4");
    expect(ids).toContain("compassion:week:2:page:6:prompt:1");
  });

  it("stores each prompt feedback without mutating the source answers", () => {
    const activities = buildActivities();
    const updated = applyCompassionWeek2Feedback({
      activities,
      response: {
        results: [
          {
            targetId: "compassion:week:2:page:6:prompt:1",
            status: "ready",
            feedback: "You clearly identify attentive listening as a way you experience love."
          },
          {
            targetId: "compassion:week:2:page:6:prompt:3",
            status: "ready",
            feedback: "Recognising overwhelm can help you ask for support before the pressure grows."
          }
        ]
      }
    });
    const prompts = updated.find(({ page }) => page === 6).answer;

    expect(prompts[0].feedback).toContain("attentive listening");
    expect(prompts[2].feedback).toContain("ask for support");
    expect(activities[2].answer[0].feedback).toBeUndefined();
  });

  it("applies page feedback and rejects unknown targets", () => {
    const activities = buildActivities();
    const updated = applyCompassionWeek2Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:2:page:4",
          status: "ready",
          feedback: "Your letter acknowledges the hurt and offers a realistic way forward."
        }]
      }
    });
    expect(updated[1].feedback).toContain("realistic way forward");

    expect(() => applyCompassionWeek2Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:2:page:99",
          status: "ready",
          feedback: "Unknown"
        }]
      }
    })).toThrow("Unknown feedback target");
  });
});
