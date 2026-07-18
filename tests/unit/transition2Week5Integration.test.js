const { randomUUID } = require("crypto");
const {
  applyTransition2Week5Feedback,
  buildTransition2Week5Request,
  transition2Week5Integration
} = require("../../utils/aiFeedback/courseIntegrations/transition-2/week5");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");

const smart = {
  s: "Join the debate club",
  m: "Attend four meetings",
  a: "Set aside Wednesday evenings",
  r: "Build confidence and friendships",
  t: "Complete this during first semester"
};

const buildActivities = () => [
  {
    page: 2,
    answer: [
      { value: "Managing my time" },
      { value: "Making friends" },
      { value: "Keeping up with assignments" },
      { value: "Managing money" },
      { value: "Handling stress" }
    ]
  },
  { page: 4, answer: "Reaching out for support would help me most." },
  { page: 6, answer: [{ stepId: 6, value: smart }] },
  {
    page: 8,
    answer: [
      { stepId: 1, value: "Join a club in my first semester." },
      { stepId: 2, value: smart }
    ]
  }
];

describe("Transition 2 Week 5 feedback integration", () => {
  it("is registered for Transition 2 Week 5", () => {
    expect(getCourseIntegration("transition-2", 5)).toBe(
      transition2Week5Integration
    );
  });

  it("creates three page targets and two Activity 4 response targets", () => {
    const request = buildTransition2Week5Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context.weekTitle).toBe("Goal Setting and Resilience");
    expect(request.targets).toHaveLength(5);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "transition-2:week:5:page:2",
      "transition-2:week:5:page:4",
      "transition-2:week:5:page:6",
      "transition-2:week:5:page:8:step:1",
      "transition-2:week:5:page:8:step:2"
    ]);
  });

  it("formats lists and SMART answers as readable text", () => {
    const request = buildTransition2Week5Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const challenges = request.targets[0].answer;
    const smartMeaning = request.targets[2].answer;
    const smartGoal = request.targets[4].answer;

    expect(challenges).toContain("1. Managing my time");
    expect(challenges).toContain("5. Handling stress");
    expect(smartMeaning).toContain("Specific: Join the debate club");
    expect(smartGoal).toContain("Time-bound: Complete this during first semester");
  });

  it("skips unanswered and already reviewed targets", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 4).answer = " ";
    activities.find(({ page }) => page === 6).feedback = "Manual feedback";
    activities.find(({ page }) => page === 8).feedback = [
      { stepId: 1, value: "Manual goal feedback" }
    ];
    const request = buildTransition2Week5Request({
      requestId: randomUUID(),
      activities
    });
    const ids = request.targets.map(({ targetId }) => targetId);

    expect(ids).not.toContain("transition-2:week:5:page:4");
    expect(ids).not.toContain("transition-2:week:5:page:6");
    expect(ids).not.toContain("transition-2:week:5:page:8:step:1");
    expect(ids).toContain("transition-2:week:5:page:8:step:2");
  });

  it("stores two independent Activity 4 feedback entries", () => {
    const activities = buildActivities();
    const updated = applyTransition2Week5Feedback({
      activities,
      response: {
        results: [{
          targetId: "transition-2:week:5:page:8:step:1",
          status: "ready",
          feedback: "Joining a club is a clear and useful first-semester goal."
        }, {
          targetId: "transition-2:week:5:page:8:step:2",
          status: "ready",
          feedback: "Your SMART details make the goal measurable and time-bound."
        }]
      }
    });

    expect(updated.find(({ page }) => page === 8).feedback).toEqual([
      {
        stepId: 1,
        value: "Joining a club is a clear and useful first-semester goal."
      },
      {
        stepId: 2,
        value: "Your SMART details make the goal measurable and time-bound."
      }
    ]);
    expect(activities.find(({ page }) => page === 8).feedback).toBeUndefined();
  });

  it("returns null without answers and rejects unknown targets", () => {
    expect(buildTransition2Week5Request({
      requestId: randomUUID(),
      activities: []
    })).toBeNull();

    expect(() => applyTransition2Week5Feedback({
      activities: buildActivities(),
      response: {
        results: [{
          targetId: "transition-2:week:5:page:99",
          status: "ready",
          feedback: "Unknown"
        }]
      }
    })).toThrow("Unknown feedback target");
  });
});
