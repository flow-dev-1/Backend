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
  ["compassion-course", "compassion"],
  ["resilience-and-grit", "resilience-grit"],
  ["resilience-grit", "resilience-grit"],
  ["self-awareness", "self-awareness"],
  ["self-awareness-course", "self-awareness"],
  ["emotional-regulation", "emotional-regulation"],
  ["emotional-regulation-course", "emotional-regulation"],
  ["tot-2", "tot-2"],
  ["tot2", "tot-2"],
  ["tot-course-2", "tot-2"],
  ["leaving-no-learner-behind", "tot-2"],
  ["training-of-trainers-2", "tot-2"]
]);

const resolveCourseKey = (course) => {
  const candidates = [course?.title, course?.url];

  for (const candidate of candidates) {
    const normalized = normalizeCourseIdentifier(candidate);
    if (COURSE_KEYS.has(normalized)) return COURSE_KEYS.get(normalized);
    if (normalized.includes("leaving-no-learner-behind")) return "tot-2";
  }

  return null;
};

module.exports = {
  normalizeCourseIdentifier,
  resolveCourseKey
};
