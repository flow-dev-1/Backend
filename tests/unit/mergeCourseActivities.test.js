const {
  getActivityIdentifier,
  mergeCourseActivities
} = require("../../utils/mergeCourseActivities");

describe("mergeCourseActivities", () => {
  it("merges page-based course records and lets incoming answers win", () => {
    const result = mergeCourseActivities(
      [{ page: 2, answer: "old" }, { page: 4, answer: "saved" }],
      [{ page: 2, answer: "new" }, { page: 6, answer: "incoming" }]
    );
    expect(result).toEqual([
      { page: 2, answer: "new" },
      { page: 4, answer: "saved" },
      { page: 6, answer: "incoming" }
    ]);
  });

  it("merges Self-Awareness activity-based records without emptying them", () => {
    const result = mergeCourseActivities(
      [{ activity: 2, answers: ["old"] }, { activity: 4, answers: ["saved"] }],
      [{ activity: 2, answers: ["new"] }, { activity: 6, buckets: { yes: [] } }]
    );
    expect(result).toEqual([
      { activity: 2, answers: ["new"] },
      { activity: 4, answers: ["saved"] },
      { activity: 6, buckets: { yes: [] } }
    ]);
  });

  it("uses schema-prefixed identifiers and preserves unkeyed records", () => {
    expect(getActivityIdentifier({ page: 2 })).toBe("page:2");
    expect(getActivityIdentifier({ activity: 2 })).toBe("activity:2");
    expect(mergeCourseActivities([], [{ note: "preserve me" }]))
      .toEqual([{ note: "preserve me" }]);
  });
});
