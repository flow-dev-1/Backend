const { applyTot1Week3Feedback, buildTot1Week3Request } = require("../../utils/aiFeedback/courseIntegrations/tot-1/week3");

const activities = [
  { page: 4, answer: [{ stepId: 1, value: "I assumed the student was uninterested." }, { stepId: 2, value: "Listening privately helped us connect." }] },
  { page: 6, answer: ["D", "A", "B", "C", "E"].map((value, index) => ({ stepId: index + 2, value })) },
  { page: 8, answer: [{ stepId: 1, value: "The student feels heard and valued." }, { stepId: 2, value: "The student feels dismissed." }] },
  { page: 10, answer: [{ stepId: 3, strength: "Collaboration", praiseExample: "You listened carefully and added a useful idea." }, { stepId: 4, strength: "Kindness", praiseExample: "You noticed your peer was upset and offered support." }] },
  { page: 12, answer: [
    { reflect: "What was happening for you when you interrupted?", explain: "Interrupting stops others from learning.", suggestion: "Wait for your turn and raise your hand." },
    { reflect: "How do you think the comment affected your classmate?", explain: "The joke caused hurt and disrupted trust.", suggestion: "Listen, apologise, and agree not to repeat it." }
  ] }
];

describe("TOT 1 Week 3 AI feedback integration", () => {
  test("builds all visible feedback positions with meaningful selections", () => {
    const request = buildTot1Week3Request({ requestId: "33333333-3333-4333-8333-333333333333", activities });
    expect(request.context.weekTitle).toBe("Building Relationships and Creating a Safe Classroom");
    expect(request.targets).toHaveLength(17);
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:3:page:6:step:2").answer).toBe("Emotional Support");
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:3:page:10:step:3").answer).toContain("Praise:");
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:3:page:12:step:4").answer).toContain("classmate");
  });

  test("applies independent feedback without changing activity answers", () => {
    const answers = activities.map(({ answer }) => JSON.parse(JSON.stringify(answer)));
    const updated = applyTot1Week3Feedback({ activities, response: { results: [
      { targetId: "tot-1:week:3:page:4:step:1", status: "ready", feedback: "Useful self-awareness." },
      { targetId: "tot-1:week:3:page:12:step:4", status: "ready", feedback: "This invites empathy." }
    ] } });
    expect(updated.find(({ page }) => page === 4).feedback).toContainEqual({ stepId: 1, value: "Useful self-awareness." });
    expect(updated.find(({ page }) => page === 12).feedback).toContainEqual({ stepId: 4, value: "This invites empathy." });
    expect(updated.map(({ answer }) => answer)).toEqual(answers);
  });

  test("does not regenerate an existing response feedback", () => {
    const input = activities.map((activity) => activity.page === 10 ? { ...activity, feedback: [{ stepId: 3, value: "Existing" }] } : activity);
    const request = buildTot1Week3Request({ requestId: "44444444-4444-4444-8444-444444444444", activities: input });
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:3:page:10:step:3")).toBe(false);
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:3:page:10:step:4")).toBe(true);
  });
});
