const {
  applyTot1Week1Feedback,
  buildTot1Week1Request
} = require("../../utils/aiFeedback/courseIntegrations/tot-1/week1");

const requestId = "123e4567-e89b-42d3-a456-426614174000";

const makeActivities = () => [
  { page: 6, answer: [{ value: { green: [0, 2], red: [1, 3, 4, 5, 6, 7, 8, 9] } }] },
  { page: 8, answer: "Students would feel unseen and less safe to participate." },
  { page: 10, answer: [{ value: { green: [1, 3, 5], red: [0, 2, 4] } }] },
  { page: 12, answer: [{ stepId: 2, value: "3" }] },
  {
    page: 14,
    answer: Array.from({ length: 10 }, (_, index) => ({
      stepId: index + 2,
      value: ["A", "A", "B", "B", "C", "C", "D", "D", "E", "E"][index]
    }))
  },
  { page: 16, answer: [{ value: "Patient" }, { value: "Creative" }] },
  {
    page: 18,
    answer: [
      { stepId: 2, value: "Kindness" },
      { stepId: 3, value: "Courage" },
      { stepId: 4, value: "Leadership" }
    ]
  },
  { page: 20, answer: [{ value: "My students" }, { value: "My family" }] },
  { page: 22, answer: [{ stepId: 1, value: "C" }] },
  {
    page: 23,
    answer: [
      { stepId: 2, value: "My doubt shows how much I care about my impact." },
      { stepId: 3, value: "My high standards show commitment." }
    ]
  }
];

describe("TOT 1 Week 1 AI feedback integration", () => {
  it("builds readable page and scenario targets without assessments", () => {
    const request = buildTot1Week1Request({ requestId, activities: makeActivities() });

    expect(request.context).toMatchObject({ courseKey: "tot-1", weekNumber: 1 });
    expect(request.targets).toHaveLength(24);
    expect(request.targets.map(({ targetId }) => targetId)).not.toContain(
      "tot-1:week:1:page:2"
    );
    expect(request.targets.find(({ targetId }) =>
      targetId === "tot-1:week:1:page:12"
    )?.answer).toBe("Moderate impact");
    expect(request.targets.find(({ targetId }) =>
      targetId === "tot-1:week:1:page:14:step:2"
    )?.answer).toBe("Self-Awareness");
    expect(request.targets.find(({ targetId }) =>
      targetId === "tot-1:week:1:page:10:step:1"
    )?.answer).toContain("green");
  });

  it("applies page feedback and separate scenario feedback", () => {
    const activities = makeActivities();
    const request = buildTot1Week1Request({ requestId, activities });
    const response = {
      results: request.targets.map(({ targetId }, index) => ({
        targetId,
        status: "ready",
        feedback: `Relevant Week 1 feedback ${index + 1}.`
      }))
    };

    const updated = applyTot1Week1Feedback({ activities, response });
    expect(updated.find(({ page }) => page === 8).feedback).toBe(
      "Relevant Week 1 feedback 2."
    );
    expect(updated.find(({ page }) => page === 10).feedback).toEqual([
      { stepId: 1, value: "Relevant Week 1 feedback 7." },
      { stepId: 2, value: "Relevant Week 1 feedback 8." },
      { stepId: 3, value: "Relevant Week 1 feedback 9." }
    ]);
    expect(updated.find(({ page }) => page === 23).feedback).toHaveLength(2);
  });

  it("requests only feedback positions that are still missing", () => {
    const activities = makeActivities();
    activities.find(({ page }) => page === 8).feedback = "Already reviewed.";
    activities.find(({ page }) => page === 18).feedback = [
      { stepId: 2, value: "Scenario already reviewed." }
    ];

    const request = buildTot1Week1Request({ requestId, activities });
    expect(request.targets).toHaveLength(22);
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:1:page:8"))
      .toBe(false);
    expect(request.targets.some(({ targetId }) =>
      targetId === "tot-1:week:1:page:18:step:2"
    )).toBe(false);
  });
});
