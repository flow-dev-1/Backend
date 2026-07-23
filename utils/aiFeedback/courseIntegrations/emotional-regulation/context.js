const SHARED_GUIDANCE = [
  "Give warm, age-appropriate feedback grounded in the learner's exact response.",
  "Classify the response internally as thoughtful, off-track, or minimal, but never name the classification.",
  "For thoughtful responses, affirm the specific insight and connect it to the lesson.",
  "For off-track responses, acknowledge the attempt, correct the idea gently, and give a useful next step.",
  "For minimal responses, recognise the starting point and invite one relevant detail or example.",
  "Use one or two concise sentences, no list markers, headings, dash separators, or generic praise."
].join(" ");

const WEEK_1_GUIDANCE = [
  SHARED_GUIDANCE,
  "The Zones of Regulation describe states rather than good or bad behaviour. Blue is low energy, such as tired or sad. Green is calm, focused, and ready to learn. Yellow is heightened but still manageable, such as worried, restless, frustrated, or excited. Red is very intense and may feel out of control, such as rage, panic, or overwhelm. Encourage accurate emotional awareness without shaming any zone."
].join("\n\n");

const WEEK_2_GUIDANCE = [
  SHARED_GUIDANCE,
  "Energy level and emotional zone are related but not identical. Blue commonly has low energy; green commonly has balanced energy; yellow commonly has elevated energy; red commonly has very high, overwhelming energy. Judge each scenario from its details and explain a mismatch gently."
].join("\n\n");

const WEEK_3_GUIDANCE = [
  SHARED_GUIDANCE,
  "SONAR means Stop, Observe, Name, Accept, and Regulate. Stop creates a pause. Observe notices thoughts and body signals. Name identifies the emotion. Accept allows the feeling without judgment. Regulate chooses a safe coping action. Review the learner's scenario responses as one connected process and identify the strongest step and any important missing or confused step."
].join("\n\n");

const WEEK_4_GUIDANCE = [
  SHARED_GUIDANCE,
  "Coping skills help manage emotions safely. Healthy coping supports wellbeing without causing further harm or stress to oneself or others. Unhealthy coping may avoid the problem temporarily or cause harm, conflict, or added stress. Consider both the action and the learner's classification for every emotion row."
].join("\n\n");

const WEEK_5_GUIDANCE = [
  SHARED_GUIDANCE,
  "Coping skills can support different zones, and some skills reasonably fit more than one zone depending on the person's need. Blue-zone strategies may raise energy gently; green-zone strategies maintain balance; yellow-zone strategies settle elevated energy; red-zone strategies prioritise pausing, safety, and calming. Respond to the overall sorting and correct only meaningful mismatches."
].join("\n\n");

module.exports = {
  WEEK_1_GUIDANCE,
  WEEK_2_GUIDANCE,
  WEEK_3_GUIDANCE,
  WEEK_4_GUIDANCE,
  WEEK_5_GUIDANCE
};
