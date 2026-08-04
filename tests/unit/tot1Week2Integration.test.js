const { applyTot1Week2Feedback, buildTot1Week2Request } = require("../../utils/aiFeedback/courseIntegrations/tot-1/week2");

const activities = [
  { page: 2, answer: "SEL helps teachers understand emotions." },
  { page: 6, answer: [{ stepId: 2, value: { green: [0], orange: [1], red: [2] } }] },
  { page: 8, answer: "Interruptions are common triggers because they disrupt concentration." },
  { page: 14, answer: {
    scenario_1: { scenario: "A learner repeatedly leaves class", sonar: { 1: "I pause", 2: "I notice frustration", 3: "I name frustration", 4: "I consider the learner's need", 5: "I speak privately" } },
    scenario_2: { scenario: "A parent challenges me", sonar: { 1: "I breathe", 2: "I notice concern", 3: "I name anxiety", 4: "I ask what the parent needs", 5: "I listen and arrange a meeting" } },
    scenario_3: { scenario: "A learner refuses work", sonar: { 1: "I pause", 2: "I observe the learner", 3: "I name my concern", 4: "I ask what support is needed", 5: "I offer a calm choice" } }
  } },
  { page: 16, answer: {
    step_3: { rankings: { 1: "response_3", 2: "response_4", 3: "response_1", 4: "response_2" } },
    step_5: { rankings: { 1: "response_3", 2: "response_4", 3: "response_1", 4: "response_2" } },
    step_7: { rankings: { 1: "response_3", 2: "response_4", 3: "response_1", 4: "response_2" } },
    step_9: { rankings: { 1: "response_3", 2: "response_4", 3: "response_1", 4: "response_2" } },
    step_10: { answer: "Acknowledging feelings supports self-regulation." },
    step_11: { answer: "Public confrontation may escalate the situation." }
  } }
];

describe("TOT 1 Week 2 AI feedback integration", () => {
  test("builds page and independent multi-response targets", () => {
    const request = buildTot1Week2Request({ requestId: "11111111-1111-4111-8111-111111111111", activities });
    expect(request.context.weekTitle).toBe("Self-Awareness and Emotional Regulation");
    expect(request.targets).toHaveLength(24);
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:2:page:14:step:6")).toMatchObject({ activityLabel: "Activity 4 - Scenario 2 - STOP", answer: "I breathe" });
    expect(request.targets.find(({ targetId }) => targetId === "tot-1:week:2:page:16:step:3").answer).toContain("Acknowledge their feelings");
  });

  test("applies page and step feedback without changing answers", () => {
    const originalAnswers = activities.map(({ answer }) => JSON.parse(JSON.stringify(answer)));
    const updated = applyTot1Week2Feedback({ activities, response: { results: [
      { targetId: "tot-1:week:2:page:2", status: "ready", feedback: "Clear recall." },
      { targetId: "tot-1:week:2:page:14:step:1", status: "ready", feedback: "A useful pause." },
      { targetId: "tot-1:week:2:page:16:step:10", status: "ready", feedback: "Good connection." }
    ] } });
    expect(updated.find(({ page }) => page === 2).feedback).toBe("Clear recall.");
    expect(updated.find(({ page }) => page === 14).feedback).toContainEqual({ stepId: 1, value: "A useful pause." });
    expect(updated.find(({ page }) => page === 16).feedback).toContainEqual({ stepId: 10, value: "Good connection." });
    expect(updated.map(({ answer }) => answer)).toEqual(originalAnswers);
  });

  test("skips a step that already has feedback", () => {
    const withFeedback = activities.map((activity) => activity.page === 14 ? { ...activity, feedback: [{ stepId: 1, value: "Existing" }] } : activity);
    const request = buildTot1Week2Request({ requestId: "22222222-2222-4222-8222-222222222222", activities: withFeedback });
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:2:page:14:step:1")).toBe(false);
    expect(request.targets.some(({ targetId }) => targetId === "tot-1:week:2:page:14:step:2")).toBe(true);
  });
});
