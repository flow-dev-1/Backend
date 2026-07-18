const { randomUUID } = require("crypto");
const {
  applyTransition2Week1Feedback,
  buildTransition2Week1Request,
  transition2Week1Integration
} = require("../../utils/aiFeedback/courseIntegrations/transition-2/week1");
const {
  getCourseIntegration
} = require("../../utils/aiFeedback/courseIntegrations");

const buildActivities = () => [
  { page: 2, answer: "I want to study engineering." },
  { page: 4, answer: 3 },
  {
    page: 6,
    answer: {
      checkboxAnswers: { 1: true, 3: true, 4: true },
      textAnswer: "To meet people from different backgrounds"
    }
  },
  {
    page: 8,
    answer: { checkboxAnswers: { 0: true, 2: true, 6: true } }
  },
  {
    page: 10,
    answer: {
      textAnswer: "It will prepare me for the career I want.",
      sentenceAnswer: {
        reason: "I enjoy solving practical problems",
        identity: "keeps learning even when work is difficult"
      }
    }
  },
  {
    page: 12,
    answer: {
      2: "Yes, my long-term goal would help me continue.",
      4: "I would compare the opportunity with my long-term plan.",
      6: "I would seek another opinion and keep improving.",
      8: "My goal should not depend on attending the same school as my friend."
    }
  }
];

describe("Transition 2 Week 1 feedback adapter", () => {
  it("is discoverable through the course and week registry", () => {
    expect(getCourseIntegration("transition-2", 1)).toBe(transition2Week1Integration);
    expect(getCourseIntegration("transition-2", 99)).toBeNull();
  });

  it("creates five activity and four scenario targets without identity data", () => {
    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    expect(request.context).toEqual({
      courseKey: "transition-2",
      courseTitle: "Transition 2",
      weekNumber: 1,
      weekTitle: "Defining Your Next Chapter"
    });
    expect(request.targets).toHaveLength(9);
    expect(request).not.toHaveProperty("user");
    expect(request).not.toHaveProperty("email");
  });

  it("converts checkbox indexes and structured answers to readable text", () => {
    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities: buildActivities()
    });

    const activity3 = request.targets.find(({ targetId }) => targetId.endsWith("page:6"));
    const activity5 = request.targets.find(({ targetId }) => targetId.endsWith("page:10"));

    expect(activity3.answer).toContain("To build a future career");
    expect(activity3.answer).toContain("Other reason: To meet people from different backgrounds");
    expect(activity5.answer).toContain("Person I want to become: keeps learning");
  });

  it("skips unanswered activities and activities with existing feedback", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 2).answer = "   ";
    activities.find(({ page }) => page === 4).feedback = "Existing admin feedback";

    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities
    });

    expect(request.targets.map(({ targetId }) => targetId)).not.toContain(
      "transition-2:week:1:page:2"
    );
    expect(request.targets.map(({ targetId }) => targetId)).not.toContain(
      "transition-2:week:1:page:4"
    );
  });

  it("creates one target for each answered scenario", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 12).answer[4] = "";

    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities
    });
    const scenarioTargets = request.targets.filter(({ targetId }) =>
      targetId.includes("page:12:step:")
    );

    expect(scenarioTargets.map(({ targetId }) => targetId)).toEqual([
      "transition-2:week:1:page:12:step:2",
      "transition-2:week:1:page:12:step:6",
      "transition-2:week:1:page:12:step:8"
    ]);
    expect(scenarioTargets[0].activityLabel).toBe("Activity 6 - Scenario 1");
    expect(scenarioTargets[0].answer).toContain("long-term goal");
  });

  it("skips only scenarios that already have feedback", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 12).feedback = [
      { stepId: 4, value: "Manual scenario feedback" }
    ];

    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities
    });
    const targetIds = request.targets.map(({ targetId }) => targetId);

    expect(targetIds).not.toContain("transition-2:week:1:page:12:step:4");
    expect(targetIds).toContain("transition-2:week:1:page:12:step:2");
    expect(targetIds).toContain("transition-2:week:1:page:12:step:6");
    expect(targetIds).toContain("transition-2:week:1:page:12:step:8");
  });

  it("returns null when no eligible activity targets remain", () => {
    const request = buildTransition2Week1Request({
      requestId: randomUUID(),
      activities: []
    });

    expect(request).toBeNull();
  });

  it("applies ready feedback to the matching activity pages without mutation", () => {
    const activities = buildActivities();
    const response = {
      results: [
        {
          targetId: "transition-2:week:1:page:2",
          status: "ready",
          feedback: "Your engineering goal gives you a clear direction."
        },
        {
          targetId: "transition-2:week:1:page:4",
          status: "ready",
          feedback: "You have identified a moderate level of nervousness."
        }
      ]
    };

    const updated = applyTransition2Week1Feedback({ activities, response });

    expect(updated).not.toBe(activities);
    expect(updated.find(({ page }) => page === 2).feedback).toContain("engineering");
    expect(updated.find(({ page }) => page === 4).feedback).toContain("moderate");
    expect(activities.find(({ page }) => page === 2).feedback).toBeUndefined();
  });

  it("preserves manual feedback and leaves skipped targets unchanged", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 2).feedback = "Manual feedback";
    const response = {
      results: [
        {
          targetId: "transition-2:week:1:page:2",
          status: "ready",
          feedback: "Generated replacement"
        },
        {
          targetId: "transition-2:week:1:page:4",
          status: "skipped",
          reason: "No feedback required"
        }
      ]
    };

    const updated = applyTransition2Week1Feedback({ activities, response });

    expect(updated.find(({ page }) => page === 2).feedback).toBe("Manual feedback");
    expect(updated.find(({ page }) => page === 4).feedback).toBeUndefined();
  });

  it("writes and preserves feedback independently for each scenario", () => {
    const activities = buildActivities();
    activities.find(({ page }) => page === 12).feedback = [
      { stepId: 4, value: "Manual scenario 2 feedback" }
    ];
    const response = {
      results: [
        {
          targetId: "transition-2:week:1:page:12:step:2",
          status: "ready",
          feedback: "Scenario 1 generated feedback"
        },
        {
          targetId: "transition-2:week:1:page:12:step:4",
          status: "ready",
          feedback: "Scenario 2 generated replacement"
        },
        {
          targetId: "transition-2:week:1:page:12:step:6",
          status: "skipped",
          reason: "No feedback required"
        }
      ]
    };

    const updated = applyTransition2Week1Feedback({ activities, response });
    const feedback = updated.find(({ page }) => page === 12).feedback;

    expect(feedback).toEqual([
      { stepId: 4, value: "Manual scenario 2 feedback" },
      { stepId: 2, value: "Scenario 1 generated feedback" }
    ]);
    expect(activities.find(({ page }) => page === 12).feedback).toHaveLength(1);
  });

  it("rejects unknown, duplicate, or unmapped feedback targets", () => {
    const activities = buildActivities();
    const unknownResult = {
      targetId: "transition-2:week:1:page:99",
      status: "ready",
      feedback: "Unknown"
    };

    expect(() =>
      applyTransition2Week1Feedback({
        activities,
        response: { results: [unknownResult] }
      })
    ).toThrow("Unknown feedback target");

    expect(() =>
      applyTransition2Week1Feedback({
        activities,
        response: {
          results: [
            { ...unknownResult, targetId: "transition-2:week:1:page:2" },
            { ...unknownResult, targetId: "transition-2:week:1:page:2" }
          ]
        }
      })
    ).toThrow("duplicate feedback target");

    expect(() =>
      applyTransition2Week1Feedback({
        activities: activities.filter(({ page }) => page !== 2),
        response: {
          results: [
            { ...unknownResult, targetId: "transition-2:week:1:page:2" }
          ]
        }
      })
    ).toThrow("exactly one saved activity");

    expect(() =>
      applyTransition2Week1Feedback({
        activities,
        response: {
          results: [
            {
              targetId: "transition-2:week:1:page:2",
              status: "ready",
              feedback: "   "
            }
          ]
        }
      })
    ).toThrow("Empty feedback result");
  });
});
