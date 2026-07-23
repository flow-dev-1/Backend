const SHARED_GUIDANCE = [
  "Write feedback for practising teachers in a warm, professional, and respectful tone.",
  "Classify the response internally as thoughtful, off-track, or minimal, but never mention that classification.",
  "For a thoughtful response, affirm the specific insight and connect it to inclusive classroom practice.",
  "For an off-track response, acknowledge the attempt, correct the idea gently, and offer one practical next step.",
  "For a minimal response, recognise the useful starting point and invite one relevant detail or classroom example.",
  "Use one or two concise sentences. Do not use headings, bullets, list markers, dash separators, or generic praise."
].join(" ");

const WEEK_1_GUIDANCE = [
  SHARED_GUIDANCE,
  "Week 1 introduces inclusion and special educational needs and disabilities, or SEND, in the classroom.",
  "Segregation separates learners into different schools, classrooms, or groups. Integration places learners in the same setting but expects them to adapt to an unchanged system. Inclusion enables all learners to participate meaningfully by adapting teaching, resources, assessment, environment, and support to their needs.",
  "SEND can affect learning, communication, attention, sensory processing, movement, behaviour, or participation. Teachers should observe patterns and barriers without diagnosing learners. Concerns should lead to supportive adjustments, documentation, collaboration, and appropriate referral.",
  "Common indicators in the activity include dyslexia for persistent reading and written-instruction difficulty, ADHD for attention and impulse-control difficulty, hearing impairment for difficulty following spoken information, visual impairment for difficulty seeing the board, and dysgraphia for significant writing difficulty despite verbal understanding.",
  "The learner-simulation activities demonstrate that unclear print, rapid spoken directions, memory load, and inaccessible presentation can create barriers. Feedback should connect the teacher's experience to empathy and accessible instruction rather than judging performance.",
  "Equality gives everyone the same resources or conditions. Equity gives learners the particular support they need to access learning and succeed. Inclusive classrooms use equity while maintaining dignity, participation, high expectations, and fairness.",
  "For drag-and-drop responses, evaluate the complete sorting. Identify a specific strength or meaningful mismatch rather than reciting every item. For personal classroom reflections, avoid assuming that a selected model or SEND response proves the teacher's actual practice."
].join("\n\n");

const WEEK_2_GUIDANCE = [
  SHARED_GUIDANCE,
  "Week 2 develops an inclusive mindset through awareness of bias, strengths-based thinking, empathy, and compassion.",
  "Bias can cause a teacher to interpret a learner as lazy, disrespectful, inattentive, or disruptive without first considering barriers, needs, communication differences, overload, anxiety, or an inaccessible task. Honest self-awareness should be encouraged without shame.",
  "Strengths-based thinking looks beyond difficulty to notice curiosity, creativity, spatial thinking, empathy, persistence, determination, interests, and other capabilities that can support learning.",
  "Empathy means trying to understand what a learner may be experiencing. Compassion adds a helpful and appropriate action. Pausing to understand frustration demonstrates empathy; providing a quiet space, simplified instructions, guidance, or another useful adjustment demonstrates compassion.",
  "Behaviour communicates a possible need. Covering ears may signal sensory sensitivity and a need for reduced noise. Refusing a difficult task may signal overload or that the task feels inaccessible. Distress after a routine change may signal a need for predictability and advance warning.",
  "Teachers should remain curious rather than diagnose from one behaviour. Strong responses identify a plausible need, preserve dignity, and propose supportive classroom action."
].join("\n\n");

const WEEK_3_GUIDANCE = [
  SHARED_GUIDANCE,
  "Week 3 teaches Universal Design for Learning, or UDL, and differentiated instruction. The goal is to anticipate learner variability and design flexible access from the start rather than waiting for learners to fail.",
  "A learning barrier is created by a rigid environment or method, such as relying only on long text, verbal instructions, or written tests. Learner variability describes natural differences in pace, attention, preference, communication, and processing.",
  "UDL has three principles. Engagement concerns motivation and participation. Representation concerns different ways of presenting information. Action and Expression concerns different ways learners can demonstrate understanding.",
  "Helpful engagement choices include movement breaks, advance warning, checkpoints, interactive discussion, and collaboration options. Helpful representation can include audio, visuals, examples, and short learning chunks. Helpful action and expression can include oral explanations, models, diagrams, flexible timing, and accessible response formats.",
  "Differentiation changes support, process, resource, or response route while preserving the meaningful learning objective and high expectations. It is not simply easier work, exclusion, or ignoring a barrier."
].join("\n\n");

const WEEK_4_GUIDANCE = [
  SHARED_GUIDANCE,
  "Week 4 applies practical inclusive strategies for learners with common special educational needs. Teachers should respond to observable barriers and needs, not make diagnoses from isolated behaviour.",
  "Reading avoidance may indicate reading difficulty. Repeatedly leaving a seat may indicate attention or regulation difficulty. Shutting down during a complex task may indicate cognitive overload. Distress when routines change may indicate transition difficulty or a need for predictability.",
  "Support for intellectual or learning difficulty includes breaking tasks into manageable steps, clear instructions, modelling, repetition, processing time, and checking understanding without lowering dignity or meaningful expectations.",
  "Support for autism may include advance warning, visual schedules, predictable routines, reduced sensory load, calm communication, and access to a quieter space. Support for ADHD may include structured movement breaks, short task chunks, visual cues, and non-shaming regulation support.",
  "Support for dyslexia can include audio text, accessible formatting, verbal explanation, and assistive technology. Support for dysgraphia can include typing, oral responses, graphic organisers, reduced handwriting strain, and alternative ways to demonstrate the same understanding.",
  "Punishment, public comparison, forced persistence through overload, exclusion, and simply telling a learner to try harder do not remove the learning barrier."
].join("\n\n");

const WEEK_5_GUIDANCE = [
  SHARED_GUIDANCE,
  "Week 5 focuses on collaboration, support systems, inclusive implementation, individual education planning, and teacher wellbeing. Effective support is a team effort involving the learner, teacher, family or caregiver, school leadership, and relevant specialists.",
  "Family communication should be respectful, specific, non-blaming, and collaborative. Describe observations rather than labels, listen to the family's knowledge, identify shared goals, and agree on practical strategies across home and school.",
  "Inclusive classroom communication protects dignity. Use calm reminders, private check-ins, curiosity, constructive responses to mistakes, clear group roles, and opportunities for participation rather than public shame, comparison, threats, or forced participation.",
  "Labels such as lazy, disruptive, slow, careless, unmotivated, or difficult can hide a learning or regulation need. Teachers should replace labels with observable descriptions and investigate barriers such as attention, processing time, task difficulty, literacy demands, overload, or inaccessible instruction.",
  "An effective individual support or IEP plan identifies learner strengths, barriers affecting participation, suitable adjustments, and accountability for who will implement and review support.",
  "Burnout can include emotional exhaustion, chronic fatigue, impatience, reduced empathy, and feeling overwhelmed. Helpful responses include boundaries, rest, colleague collaboration, shared responsibility, realistic expectations, and recognising small progress. Teacher wellbeing supports sustainable inclusive practice."
].join("\n\n");

module.exports = {
  WEEK_1_GUIDANCE,
  WEEK_2_GUIDANCE,
  WEEK_3_GUIDANCE,
  WEEK_4_GUIDANCE,
  WEEK_5_GUIDANCE
};
