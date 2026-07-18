const { randomUUID } = require("crypto");
const {
  applyTransition2Week4Feedback,
  buildTransition2Week4Request,
  transition2Week4Integration
} = require("../../utils/aiFeedback/courseIntegrations/transition-2/week4");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: { 1: "I stayed out too late.", 2: "Independence" } },
  { page: 4, answer: "Choice" },
  { page: 6, answer: "I will plan every Sunday evening." },
  { page: 8, answer: "The week was not planned before it started." },
  { page: 10, answer: "Spending without a budget." },
  {
    page: 12,
    answer: {
      textAnswer: "People who are focused and kind.",
      ratings: {
        "Meeting new people": "3",
        "Saying no to peer pressure": "4",
        "Resolving disagreements calmly": "2",
        "Keeping friendships balanced with academics": "5"
      }
    }
  },
  { page: 14, answer: { selectedOption: 2 } },
  { page: 16, answer: "I study better alone." },
  { page: 18, answer: { selectedOption: 0 } },
  {
    page: 20,
    answer: {
      textAnswers: {
        1: "I sometimes let freedom get out of control.",
        3: "I will use a weekly timetable."
      },
      checkboxAnswers: { 2: true }
    }
  }
];

describe("Transition 2 Week 4 feedback integration", () => {
  it("is registered for Transition 2 Week 4", () => {
    expect(getCourseIntegration("transition-2", 4)).toBe(
      transition2Week4Integration
    );
  });

  it("creates eight page targets and five response targets", () => {
    const request = buildTransition2Week4Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context.weekTitle).toBe("Freedom and Responsibility");
    expect(request.targets).toHaveLength(13);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual(
      expect.arrayContaining([
        "transition-2:week:4:page:12:step:1",
        "transition-2:week:4:page:12:step:2",
        "transition-2:week:4:page:20:step:1",
        "transition-2:week:4:page:20:step:2",
        "transition-2:week:4:page:20:step:3"
      ])
    );
  });

  it("formats both structured activities as readable context", () => {
    const request = buildTransition2Week4Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const socialCircle = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:12:step:1")
    );
    const socialRatings = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:12:step:2")
    );
    const struggleArea = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:20:step:2")
    );
    const improvement = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:20:step:3")
    );

    expect(socialCircle.answer).toContain("People who are focused and kind");
    expect(socialRatings.answer).toContain("Meeting new people: 3 out of 5");
    expect(struggleArea.answer).toBe("Managing time");
    expect(improvement.answer).toContain("I will use a weekly timetable");
  });

  it("formats indexed choices as their displayed text", () => {
    const request = buildTransition2Week4Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.targets.find(({ targetId }) => targetId.endsWith("page:14")).answer)
      .toContain("two hours maximum");
    expect(request.targets.find(({ targetId }) => targetId.endsWith("page:18")).answer)
      .toBe("Week 2.");
  });

  it("skips unanswered and already reviewed activities", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 4).answer = " ";
    activities.find(({ page }) => page === 6).feedback = "Manual feedback";
    const request = buildTransition2Week4Request({
      requestId: randomUUID(),
      activities
    });
    const ids = request.targets.map(({ targetId }) => targetId);

    expect(ids).not.toContain("transition-2:week:4:page:4");
    expect(ids).not.toContain("transition-2:week:4:page:6");
  });

  it("stores two Activity 6 and three Activity 10 feedback entries", () => {
    const activities = buildActivities();
    const updated = applyTransition2Week4Feedback({
      activities,
      response: {
        results: [{
          targetId: "transition-2:week:4:page:12:step:1",
          status: "ready",
          feedback: "You have identified a positive social circle."
        }, {
          targetId: "transition-2:week:4:page:12:step:2",
          status: "ready",
          feedback: "Your ratings show clear social-skill growth areas."
        }, {
          targetId: "transition-2:week:4:page:20:step:1",
          status: "ready",
          feedback: "This is an honest reflection on freedom."
        }, {
          targetId: "transition-2:week:4:page:20:step:2",
          status: "ready",
          feedback: "Recognising time management as a challenge is useful."
        }, {
          targetId: "transition-2:week:4:page:20:step:3",
          status: "ready",
          feedback: "A weekly timetable is a practical improvement."
        }]
      }
    });

    expect(updated.find(({ page }) => page === 12).feedback).toHaveLength(2);
    expect(updated.find(({ page }) => page === 20).feedback).toHaveLength(3);
    expect(updated.find(({ page }) => page === 12).feedback[0]).toEqual({
      stepId: 1,
      value: "You have identified a positive social circle."
    });
    expect(activities.find(({ page }) => page === 12).feedback).toBeUndefined();
  });

  it("returns null for no eligible answers and rejects unknown targets", () => {
    expect(buildTransition2Week4Request({
      requestId: randomUUID(),
      activities: []
    })).toBeNull();

    expect(() => applyTransition2Week4Feedback({
      activities: buildActivities(),
      response: {
        results: [{
          targetId: "transition-2:week:4:page:99",
          status: "ready",
          feedback: "Unknown"
        }]
      }
    })).toThrow("Unknown feedback target");
  });
});
