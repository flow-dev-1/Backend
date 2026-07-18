const { randomUUID } = require("crypto");
const {
  applyTransition2Week2Feedback,
  buildTransition2Week2Request,
  transition2Week2Integration
} = require("../../utils/aiFeedback/courseIntegrations/transition-2/week2");
const {
  getCourseIntegration
} = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: "Mindset is how I approach challenges." },
  { page: 4, answer: "Yes, it makes sense." },
  { page: 6, answer: { green: [1, 3, 5, 7], red: [0, 2, 4, 6] } },
  {
    page: 8,
    answer: "Okay, that hurt. But I need to figure out what went wrong."
  },
  {
    page: 10,
    answer: [
      { index: 0, value: "Honesty" },
      { index: 1, value: "Family" },
      { index: 2, value: "Growth" }
    ]
  },
  {
    page: 12,
    answer: {
      selectedValues: { 0: true, 3: true, 4: true, 6: true, 7: true },
      rankValues: {
        Growth: "1",
        Family: "2",
        Honesty: "3",
        Responsibility: "4",
        Hardwork: "5"
      }
    }
  },
  { page: 14, answer: "Sometimes." },
  {
    page: 16,
    answer: "I would consider the consequences and keep my commitment."
  }
];

describe("Transition 2 Week 2 feedback integration", () => {
  it("is discoverable through the course and week registry", () => {
    expect(getCourseIntegration("transition-2", 2)).toBe(
      transition2Week2Integration
    );
  });

  it("creates eight page-level targets without identity data", () => {
    const request = buildTransition2Week2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toEqual({
      courseKey: "transition-2",
      courseTitle: "Transition 2",
      weekNumber: 2,
      weekTitle: "Mindset and Values"
    });
    expect(request.targets).toHaveLength(8);
    expect(request).not.toHaveProperty("user");
    expect(request).not.toHaveProperty("email");
  });

  it("converts drag-and-drop and ranked values into readable text", () => {
    const request = buildTransition2Week2Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const dragTarget = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:6")
    );
    const valuesTarget = request.targets.find(({ targetId }) =>
      targetId.endsWith("page:12")
    );

    expect(dragTarget.answer).toContain("Growth Mindset: This is hard");
    expect(dragTarget.answer).toContain("Fixed Mindset: I failed once");
    expect(valuesTarget.answer).toContain("Selected values: Honesty");
    expect(valuesTarget.answer).toContain("1. Growth");
    expect(valuesTarget.answer).toContain("5. Hardwork");
  });

  it("skips unanswered activities and existing manual feedback", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 2).answer = " ";
    activities.find(({ page }) => page === 4).feedback = "Manual feedback";

    const request = buildTransition2Week2Request({
      requestId: randomUUID(),
      activities
    });
    const targetIds = request.targets.map(({ targetId }) => targetId);

    expect(targetIds).not.toContain("transition-2:week:2:page:2");
    expect(targetIds).not.toContain("transition-2:week:2:page:4");
    expect(targetIds).toContain("transition-2:week:2:page:6");
  });

  it("applies feedback by page without mutating activities", () => {
    const activities = buildActivities();
    const updated = applyTransition2Week2Feedback({
      activities,
      response: {
        results: [
          {
            targetId: "transition-2:week:2:page:2",
            status: "ready",
            feedback: "You have connected mindset with how you face challenges."
          },
          {
            targetId: "transition-2:week:2:page:6",
            status: "ready",
            feedback: "You accurately distinguished growth and fixed statements."
          }
        ]
      }
    });

    expect(updated).not.toBe(activities);
    expect(updated.find(({ page }) => page === 2).feedback).toContain("mindset");
    expect(updated.find(({ page }) => page === 6).feedback).toContain("growth");
    expect(activities.find(({ page }) => page === 2).feedback).toBeUndefined();
  });

  it("returns null without eligible answers and rejects unknown targets", () => {
    expect(
      buildTransition2Week2Request({ requestId: randomUUID(), activities: [] })
    ).toBeNull();

    expect(() =>
      applyTransition2Week2Feedback({
        activities: buildActivities(),
        response: {
          results: [
            {
              targetId: "transition-2:week:2:page:99",
              status: "ready",
              feedback: "Unknown"
            }
          ]
        }
      })
    ).toThrow("Unknown feedback target");
  });
});
