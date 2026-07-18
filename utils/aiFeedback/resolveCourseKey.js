const normalizeCourseIdentifier = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COURSE_KEYS = new Map([
  ["transition-2", "transition-2"],
  ["transition2", "transition-2"],
  ["compassion", "compassion"],
  ["compassion-course", "compassion"]
]);

const resolveCourseKey = (course) => {
  const candidates = [course?.title, course?.url];

  for (const candidate of candidates) {
    const normalized = normalizeCourseIdentifier(candidate);
    if (COURSE_KEYS.has(normalized)) return COURSE_KEYS.get(normalized);
  }

  return null;
};

module.exports = {
  normalizeCourseIdentifier,
  resolveCourseKey
};
