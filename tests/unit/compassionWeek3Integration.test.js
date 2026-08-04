const { randomUUID } = require("crypto");
const {
  applyCompassionWeek3Feedback,
  buildCompassionWeek3Request,
  compassionWeek3Integration
} = require("../../utils/aiFeedback/courseIntegrations/compassion/week3");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: "Being kind to myself when I make mistakes." },
  { page: 4, answer: "A" },
  { page: 6, answer: "I felt heard, supported, and less alone." },
  {
    page: 8,
    answer: ["listen", "help with work", "encourage", "be patient", "include them"]
      .map((value, index) => ({ index, value }))
  },
  { page: 10, answer: "I am sorry I ignored how you felt. You deserved support, and I will listen next time." }
];

describe("Compassion Week 3 feedback integration", () => {
  it("is registered with Week 3 teaching guidance", () => {
    expect(getCourseIntegration("compassion", 3)).toBe(compassionWeek3Integration);
    const request = buildCompassionWeek3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.context).toMatchObject({
      courseKey: "compassion",
      weekNumber: 3,
      weekTitle: "Compassion for Others"
    });
    expect(request.context.guidance).toContain("Seeing, Caring, and Doing");
    expect(request.context.guidance).toContain("accepts responsibility without excuses");
  });

  it("creates all five editable feedback targets", () => {
    const request = buildCompassionWeek3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "compassion:week:3:page:2",
      "compassion:week:3:page:4",
      "compassion:week:3:page:6",
      "compassion:week:3:page:8",
      "compassion:week:3:page:10"
    ]);
    expect(request.targets[1].answer).toBe("A");
    expect(request.targets[3].answer).toContain("1. listen");
    expect(request.targets[3].answer).toContain("5. include them");
  });

  it("preserves existing manual feedback", () => {
    const activities = buildActivities();
    activities[1].feedback = "Manual scenario feedback";
    const request = buildCompassionWeek3Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets.map(({ targetId }) => targetId))
      .not.toContain("compassion:week:3:page:4");
  });

  it("stores generated feedback without mutating activities", () => {
    const activities = buildActivities();
    const updated = applyCompassionWeek3Feedback({
      activities,
      response: {
        results: [{
          targetId: "compassion:week:3:page:10",
          status: "ready",
          feedback: "Your apology accepts responsibility and promises a compassionate next step."
        }]
      }
    });
    expect(updated[4].feedback).toContain("accepts responsibility");
    expect(activities[4].feedback).toBeUndefined();
  });
});
