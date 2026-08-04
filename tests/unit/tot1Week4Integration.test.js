const { applyTot1Week4Feedback, buildTot1Week4Request } = require("../../utils/aiFeedback/courseIntegrations/tot-1/week4");

const activities = [
  { page: 8, answer: [{ stepId: 2, value: { green: [1, 2, 4, 6, 9], red: [0, 3, 5, 7, 8] } }, { stepId: 3, value: "I sometimes hear students say they cannot improve." }] },
  { page: 10, answer: { 5: { 1: "Classroom management", 2: "Peer support" }, 4: { 1: "A learner improved", 2: "Patience" }, 3: { 1: "Receiving feedback", 2: "I can adapt" }, 2: { 1: "My first difficult class", 2: "I asked for help" }, 1: { 1: "Helping learners", 2: "I hoped to make a difference" } } },
  { page: 12, answer: [
    { reframe: "Your strategy worked; explain what helped you succeed." },
    { reframe: "This is difficult, but we can try another strategy." },
    { reframe: "Let us examine the repeated mistake and practise differently." },
    { reframe: "You have not developed this skill yet; support and practice can help." }
  ] },
  { page: 14, answer: [
    { value: "I learned to manage a difficult class." }, { value: "The student showed courage." },
    { value: "The student showed organisation." }, { value: "Listening made me a better teacher." }
  ] }
];

describe("TOT 1 Week 4 AI feedback integration", () => {
  test("builds every editable Week 4 feedback target", () => {
    const request = buildTot1Week4Request({ requestId: "55555555-5555-4555-8555-555555555555", activities });
    expect(request.context.weekTitle).toBe("Growth Mindset and Resilience for Educators");
    expect(request.targets).toHaveLength(20);
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:4:page:8:step:2").answer).toContain("Growth mindset");
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:4:page:10:step:10").answer).toContain("make a difference");
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:4:page:14:step:5").answer).toContain("Listening");
  });

  test("applies independent feedback while preserving answers", () => {
    const answers = activities.map(({ answer }) => JSON.parse(JSON.stringify(answer)));
    const updated = applyTot1Week4Feedback({ activities, response: { results: [
      { targetId: "tot-1:week:4:page:10:step:1", status: "ready", feedback: "This names a useful focus." },
      { targetId: "tot-1:week:4:page:14:step:5", status: "ready", feedback: "Listening is a concrete area of growth." }
    ] } });
    expect(updated.find(({ page }) => page === 10).feedback).toContainEqual({ stepId: 1, value: "This names a useful focus." });
    expect(updated.find(({ page }) => page === 14).feedback).toContainEqual({ stepId: 5, value: "Listening is a concrete area of growth." });
    expect(updated.map(({ answer }) => answer)).toEqual(answers);
  });

  test("skips only responses with existing feedback", () => {
    const input = activities.map((activity) => activity.page === 12 ? { ...activity, feedback: [{ stepId: 3, value: "Existing" }] } : activity);
    const request = buildTot1Week4Request({ requestId: "66666666-6666-4666-8666-666666666666", activities: input });
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:4:page:12:step:3")).toBe(false);
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:4:page:12:step:4")).toBe(true);
  });
});
