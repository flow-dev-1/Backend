const { applyTot1Week5Feedback, buildTot1Week5Request } = require("../../utils/aiFeedback/courseIntegrations/tot-1/week5");

const activities = [
  { page: 4, answer: "Yes, reflection and teamwork can support SEL in every subject." },
  { page: 6, answer: [{ subject: "Mathematics", skill: "Responsible decision-making" }] },
  { page: 8, answer: [{ game: "Choice Path", instructions: "Teams discuss choices and consequences.", connection: "Learners practise decision-making and listening." }] },
  { page: 10, answer: ["B", "D", "C", "A"].map((value, index) => ({ stepId: index + 2, value })) },
  { page: 12, answer: "We begin each lesson with a short emotional check-in." }
];

describe("TOT 1 Week 5 AI feedback integration", () => {
  test("builds all eleven real activity feedback targets", () => {
    const request = buildTot1Week5Request({ requestId: "55555555-5555-4555-8555-555555555555", activities });
    expect(request.context.weekTitle).toBe("Integrating SEL into Teaching Methods");
    expect(request.targets).toHaveLength(11);
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:5:page:10:step:2").answer).toBe("Resilience");
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:5:page:8:step:3").answer).toContain("decision-making");
  });

  test("applies page and response feedback without changing answers", () => {
    const answers = activities.map(({ answer }) => JSON.parse(JSON.stringify(answer)));
    const updated = applyTot1Week5Feedback({ activities, response: { results: [
      { targetId: "tot-1:week:5:page:4", status: "ready", feedback: "Clear connection." },
      { targetId: "tot-1:week:5:page:8:step:3", status: "ready", feedback: "The SEL link is explicit." }
    ] } });
    expect(updated.find(({ page }) => page === 4).feedback).toBe("Clear connection.");
    expect(updated.find(({ page }) => page === 8).feedback).toContainEqual({ stepId: 3, value: "The SEL link is explicit." });
    expect(updated.map(({ answer }) => answer)).toEqual(answers);
  });

  test("skips only a response with existing feedback", () => {
    const input = activities.map((activity) => activity.page === 6 ? { ...activity, feedback: [{ stepId: 1, value: "Existing" }] } : activity);
    const request = buildTot1Week5Request({ requestId: "66666666-6666-4666-8666-666666666666", activities: input });
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:5:page:6:step:1")).toBe(false);
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:5:page:6:step:2")).toBe(true);
  });
});
