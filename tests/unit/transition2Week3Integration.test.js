const { randomUUID } = require("crypto");
const {
  applyTransition2Week3Feedback,
  buildTransition2Week3Request,
  transition2Week3Integration
} = require("../../utils/aiFeedback/courseIntegrations/transition-2/week3");
const {
  getCourseIntegration
} = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: 8 },
  { page: 4, answer: { selectedOption: 1 } },
  {
    page: 6,
    answer: Array.from({ length: 10 }, (_, index) => ({
      stepId: index + 1,
      value: index % 2 === 0 ? "A" : "B"
    }))
  },
  { page: 8, answer: "I am supportive, but I can listen more carefully." },
  { page: 10, answer: { selectedOption: 1, value: "Wants." } },
  {
    page: 12,
    answer: [
      {
        stepId: 2,
        value: {
          orange: [0, 2, 4, 7],
          pink: [1, 3, 5, 8],
          red: [6, 9]
        }
      }
    ]
  }
];

describe("Transition 2 Week 3 feedback integration", () => {
  it("is discoverable through the course and week registry", () => {
    expect(getCourseIntegration("transition-2", 3)).toBe(
      transition2Week3Integration
    );
  });

  it("creates five page targets and ten scenario targets with the correct context", () => {
    const request = buildTransition2Week3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toEqual({
      courseKey: "transition-2",
      courseTitle: "Transition 2",
      weekNumber: 3,
      weekTitle: "Social and Financial Intelligence"
    });
    expect(request.targets).toHaveLength(15);
    expect(request).not.toHaveProperty("user");
    expect(request).not.toHaveProperty("email");
  });

  it("creates distinct scenario prompts and readable budget buckets", () => {
    const request = buildTransition2Week3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const firstScenario = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:6:step:1")
    );
    const lastScenario = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:6:step:10")
    );
    const budget = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:12")
    );

    expect(firstScenario.question).toContain("Scenario 1: Tola");
    expect(firstScenario.answer).toBe("Supportive Friend");
    expect(lastScenario.question).toContain("Scenario 10: Kene");
    expect(lastScenario.answer).toBe("Draining Friend");
    expect(budget.answer).toContain("Needs: Hostel rent, Groceries");
    expect(budget.answer).toContain("Wants: Netflix subscription");
    expect(budget.answer).toContain("Savings: Emergency fund");
  });

  it("converts indexed selections and ratings to readable text", () => {
    const request = buildTransition2Week3Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.targets.find(({ targetId }) => targetId.endsWith("page:2")).answer)
      .toBe("8 out of 10");
    expect(request.targets.find(({ targetId }) => targetId.endsWith("page:4")).answer)
      .toBe("I will try to stay focused");
    expect(request.targets.find(({ targetId }) => targetId.endsWith("page:10")).answer)
      .toBe("Wants.");
  });

  it("skips unanswered and manually reviewed activities", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 8).answer = " ";
    activities.find(({ page }) => page === 10).feedback = "Manual feedback";

    const request = buildTransition2Week3Request({
      requestId: randomUUID(),
      activities
    });
    const targetIds = request.targets.map(({ targetId }) => targetId);

    expect(targetIds).not.toContain("transition-2:week:3:page:8");
    expect(targetIds).not.toContain("transition-2:week:3:page:10");
  });

  it("applies page and scenario feedback without mutation", () => {
    const activities = buildActivities();
    const updated = applyTransition2Week3Feedback({
      activities,
      response: {
        results: [
          {
            targetId: "transition-2:week:3:page:6:step:1",
            status: "ready",
            feedback: "Tola's practical help is a supportive friendship behaviour."
          },
          {
            targetId: "transition-2:week:3:page:6:step:2",
            status: "ready",
            feedback: "Amarachi's pressure can drain your focus and should be addressed."
          },
          {
            targetId: "transition-2:week:3:page:12",
            status: "ready",
            feedback: "Your budget separates immediate needs from optional wants."
          }
        ]
      }
    });

    expect(updated).not.toBe(activities);
    expect(updated.find(({ page }) => page === 6).feedback).toEqual([
      { stepId: 1, value: "Tola's practical help is a supportive friendship behaviour." },
      { stepId: 2, value: "Amarachi's pressure can drain your focus and should be addressed." }
    ]);
    expect(updated.find(({ page }) => page === 12).feedback).toContain("budget");
    expect(activities.find(({ page }) => page === 6).feedback).toBeUndefined();
  });

  it("returns null without eligible answers and rejects unknown targets", () => {
    expect(
      buildTransition2Week3Request({ requestId: randomUUID(), activities: [] })
    ).toBeNull();

    expect(() =>
      applyTransition2Week3Feedback({
        activities: buildActivities(),
        response: {
          results: [
            {
              targetId: "transition-2:week:3:page:99",
              status: "ready",
              feedback: "Unknown"
            }
          ]
        }
      })
    ).toThrow("Unknown feedback target");
  });
});
