const { randomUUID } = require("crypto");
const {
  applyResilienceGritWeek1Feedback,
  buildResilienceGritWeek1Request,
  resilienceGritWeek1Integration
} = require("../../utils/aiFeedback/courseIntegrations/resilience-grit/week1");
const { getCourseIntegration } = require("../../utils/aiFeedback/courseIntegrations");
const { resolveCourseKey } = require("../../utils/aiFeedback/resolveCourseKey");

const buildActivities = () => [
  { page: 2, answer: "Resilience is bouncing back after a difficult experience." },
  { page: 4, answer: [{ value: "I recovered after failing a test." }] },
  { page: 6, answer: "Grit means continuing toward a goal when it is difficult." },
  { page: 8, answer: [{ stepId: 2, value: { green: [2, 3], red: [0, 1] } }] },
  {
    page: 10,
    answer: [2, 3, 4, 5].map((stepId, index) => ({
      stepId,
      value: {
        0: `Challenge ${index + 1}`,
        1: `I cannot do challenge ${index + 1} yet, but I can practise.`
      }
    }))
  }
];

describe("Resilience and Grit Week 1 feedback integration", () => {
  it("is registered and resolves production course identifiers", () => {
    expect(getCourseIntegration("resilience-grit", 1))
      .toBe(resilienceGritWeek1Integration);
    expect(resolveCourseKey({ title: "Resilience and Grit" }))
      .toBe("resilience-grit");
    expect(resolveCourseKey({ url: "resilience-grit" }))
      .toBe("resilience-grit");
  });

  it("creates one target for every editable Week 1 activity", () => {
    const request = buildResilienceGritWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toMatchObject({
      courseKey: "resilience-grit",
      weekNumber: 1,
      weekTitle: "Introduction to Resilience and Grit"
    });
    expect(request.context.guidance).toContain("Power of Yet");
    expect(request.context.guidance).toContain("thoughtful, off-track, or minimal");
    expect(request.targets).toHaveLength(5);
    expect(request.targets.map(({ targetId }) => targetId)).toEqual([
      "resilience-grit:week:1:page:2",
      "resilience-grit:week:1:page:4",
      "resilience-grit:week:1:page:6",
      "resilience-grit:week:1:page:8",
      "resilience-grit:week:1:page:10"
    ]);
  });

  it("sends readable drag-and-drop groups and all four Yet pairs", () => {
    const request = buildResilienceGritWeek1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });
    const sort = request.targets.find(({ targetId }) => targetId.endsWith("page:8"));
    const yet = request.targets.find(({ targetId }) => targetId.endsWith("page:10"));

    expect(sort.answer).toContain("Resilience: Emma recovers");
    expect(sort.answer).toContain("Grit: Sam keeps practising");
    expect(yet.answer).toContain("Pair 1");
    expect(yet.answer).toContain("Pair 4");
    expect(yet.answer).toContain("Yet statement:");
  });

  it("skips existing feedback and preserves answers while applying feedback", () => {
    const activities = buildActivities();
    activities[1].feedback = "Manual feedback";
    const request = buildResilienceGritWeek1Request({
      requestId: randomUUID(),
      activities
    });
    expect(request.targets).toHaveLength(4);
    expect(request.targets.some(({ targetId }) => targetId.endsWith("page:4")))
      .toBe(false);

    const updated = applyResilienceGritWeek1Feedback({
      activities,
      response: {
        results: [{
          targetId: "resilience-grit:week:1:page:10",
          status: "ready",
          feedback: "Your Yet statements connect each challenge with continued practice."
        }]
      }
    });
    expect(updated[4].feedback).toContain("continued practice");
    expect(updated[4].answer).toEqual(activities[4].answer);
    expect(activities[4].feedback).toBeUndefined();
  });
});
