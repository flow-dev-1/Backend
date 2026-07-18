const SHARED_FEEDBACK_GUIDANCE = [
  "Compassion means seeing or understanding a need, caring about the person's feelings, and taking helpful action.",
  "The course summarises compassion as Seeing, Caring, and Doing.",
  "Compassionate Communication uses Observation, Feeling, Need, and Request.",
  "Feedback must encourage kindness, empathy, practical support, consent, safety, and healthy boundaries.",
  "Classify the response internally as thoughtful, off-track, or minimal. Unanswered responses are filtered before generation.",
  "For a thoughtful response, affirm the specific insight and connect it to the relevant course concept.",
  "For an off-track response, acknowledge the attempt, gently explain the relevant concept, and redirect the learner.",
  "For a minimal response, recognise the useful starting point and ask for one specific detail, feeling, reason, example, or action.",
  "Write two to four warm, age-appropriate sentences. Be specific to the answer and do not mention classifications or rubrics."
].join(" ");

const WEEK_1_LESSON_CONTEXT = [
  "LESSON FLOW: The lesson opens by asking the learner what compassion means before giving the formal explanation. Treat this as a prior-knowledge reflection: an incomplete but relevant answer can be a useful starting point and should not be shamed.",
  "The lesson defines compassion as understanding one's own or another person's feelings and wanting to provide help. It moves beyond simply feeling sorry for someone: the learner should notice a need, care about the person's experience, and take an appropriate action to support them. The memorable model is Seeing, Caring, and Doing.",
  "The lesson then asks what a theory means before explaining it. A theory is an explanation that helps people understand how or why something happens. The learner is not expected to name Compassionate Communication in this prior-knowledge answer, but a response about explanation, reasons, evidence, ideas, or understanding how something works is relevant.",
  "Compassionate Communication was developed by Marshall Rosenberg and is presented as a way to understand and express compassion through effective communication. It is also described as Non-Violent Communication, or NVC.",
  "NVC has four components. Observation means describing what is seen or heard without judgment. Feeling means expressing feelings honestly. Need means identifying the need connected to the feeling. Request means making a clear and specific request that could address the need.",
  "The lesson's school example involves feeling overwhelmed by homework while a classmate keeps interrupting. Observation: I notice you talk to me while I am finishing homework. Feeling: I feel stressed and distracted. Need: I need quiet time to complete my assignments. Request: Could you wait until I finish before talking? The example demonstrates honest communication without blame or violence.",
  "Everyday compassion includes speaking kindly, listening, helping, giving, and being patient. Speaking kindly communicates respect for feelings. Listening helps someone feel understood and important. Helping can make another person's day easier. Giving may involve time, possessions, or kind words. Patience means waiting calmly and supporting someone who needs more time.",
  "Compassion matters because it builds stronger and more supportive relationships, creates an environment where people feel valued and understood, and can give the helper a sense of purpose and fulfilment.",
  "The lesson previews self-compassion, compassion for others, and the Circle of Concern. It teaches that compassion can be expressed through small everyday actions as well as larger acts of help."
].join("\n");

const WEEK_1_SCENARIO_CONTEXT = [
  "ACTIVITY 3 EVALUATION: The worksheet contains five scenarios. Each scenario has separate Seeing, Caring, and Doing answers and each answer receives its own feedback.",
  "Seeing should focus on observable evidence from the scenario, such as sitting alone, looking lost, a disappointing result, exclusion from a game, teasing, embarrassment, or avoiding eye contact. Do not reward unsupported judgment or invented motives.",
  "Caring should show empathy by naming a plausible feeling or need while using uncertainty where appropriate, for example may feel sad, lonely, worried, confused, disappointed, embarrassed, excluded, unsafe, or in need of support. Do not present a guessed emotion as certain fact.",
  "Doing should propose a kind, practical, safe action connected to the need. Suitable actions can include checking in, listening, inviting without forcing, offering directions, encouraging the person, helping them study, including them in the game, speaking against teasing safely, or involving a trusted adult when needed.",
  "Scenario 1, classmate alone at lunch: strong responses notice the isolation and untouched food, consider sadness or loneliness, and suggest checking in, listening, sitting with them, or offering appropriate help.",
  "Scenario 2, new student is lost: strong responses notice uncertainty and difficulty finding the way, consider confusion or nervousness, and offer directions, accompany them, or introduce them to a safe source of help.",
  "Scenario 3, friend disappointed after a test: strong responses notice the effort and disappointment, consider sadness or frustration, and offer encouragement, listening, or study support without criticism.",
  "Scenario 4, student excluded from a game: strong responses notice the exclusion and isolation, consider loneliness or hurt, and invite them to join or address the exclusion without forcing participation.",
  "Scenario 5, classmate teased after a presentation mistake: strong responses notice the teasing, embarrassment, and avoidance of eye contact, consider shame or hurt, and offer reassurance, challenge the teasing safely, include the classmate, or seek trusted adult support if necessary."
].join("\n");

const WEEK_1_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_1_LESSON_CONTEXT,
  WEEK_1_SCENARIO_CONTEXT,
  "OUTPUT RULE: Base feedback on the learner's exact answer and the specific question. Do not merely summarise the lesson. Do not repeat identical feedback across different scenario responses."
].join("\n\n");

const WEEK_2_LESSON_CONTEXT = [
  "LESSON FLOW: The lesson first asks what self-compassion means before teaching the definition. Treat the answer as prior knowledge: affirm relevant ideas and gently add what is missing.",
  "Self-compassion means being kind and understanding toward yourself, especially when things do not go as planned. It means treating yourself with the same patience, comfort, and understanding you would offer a good friend.",
  "After a mistake, poor grade, difficult day, or disappointment, self-compassion replaces harsh self-criticism with gentle and constructive words. It acknowledges the difficulty while remembering that mistakes are normal and can become opportunities to learn and improve.",
  "The self-compassion letter asks the learner to remember a real mistake or setback and write to themselves as they would write to a friend. A strong letter acknowledges what happened and the learner's feelings, offers comfort without dismissing the difficulty, avoids shame, and includes realistic encouragement or a constructive next step.",
  "Positive self-talk means speaking kindly rather than critically after a mistake. Self-care means making time for healthy activities that support wellbeing, such as reading, walking, resting, or spending time with supportive people.",
  "Mindfulness means noticing and accepting feelings without judging them. Setting boundaries means saying no when necessary and protecting one's wellbeing; caring for oneself supports the ability to care for others.",
  "The four reflection prompts identify how the learner personally experiences compassion: I feel loved when, I feel cared for when, I need support when, and I wish someone would. Feedback should respond to the exact need or preference expressed, validate healthy needs, and encourage clear, safe communication without inventing circumstances.",
  "Self-compassion can feel unfamiliar at first. It is a continuing practice and habit, not perfection, avoidance of responsibility, denial of feelings, or an excuse to stop trying. It helps a person recover and grow after challenges."
].join("\n");

const WEEK_2_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_2_LESSON_CONTEXT,
  "OUTPUT RULE: Address the learner's exact answer. For the four personal prompts, keep each feedback distinct and specific to that prompt; do not repeat a generic paragraph across responses."
].join("\n\n");

const WEEK_3_LESSON_CONTEXT = [
  "LESSON FLOW: Week 3 moves from self-compassion to compassion for others. Compassion for others means noticing when another person needs help, caring about their feelings through empathy, and taking an appropriate action: Seeing, Caring, and Doing.",
  "The opening self-compassion question is a recap. Relevant answers mention treating oneself kindly and understandingly when mistakes, setbacks, or difficult feelings occur, as one would treat a good friend.",
  "In the break-period scenario, approaching the upset classmate and asking whether they are okay is the intended response. Ignoring them misses the visible need. Telling a trusted adult can be appropriate for safety, but should not automatically replace checking in, encouragement, or follow-up when it is safe to do so.",
  "Compassion starts by noticing signs that someone needs support, such as sadness, worry, isolation, or struggling with work. Empathy means trying to understand the person's feelings. Helpful action can include listening, kind or comforting words, a sincere compliment, practical help with a task, patience, encouragement, and safe adult support where needed.",
  "When reflecting on receiving compassion, strong answers name the help that was offered and honestly describe its emotional effect, such as feeling heard, supported, calmer, encouraged, valued, relieved, or less alone. Do not prescribe how the learner must have felt.",
  "The five-ways activity asks for practical ways to show compassion beyond merely naming the concept. Accept safe, respectful actions connected to another person's need. Encourage variety and specificity; repeated versions of the same action are a starting point but can be broadened.",
  "The compassion letter asks the learner to remember when a friend needed compassion but did not receive it. A thoughtful letter acknowledges what happened, validates the friend's feelings, accepts responsibility without excuses, gives a sincere apology, offers the kind words or support that should have been given, and may include a realistic commitment to act differently.",
  "Small acts of kindness can have a meaningful impact, strengthen trust and belonging, and create supportive relationships. Compassion should remain respectful, practical, safe, and responsive to what the other person needs."
].join("\n");

const WEEK_3_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_3_LESSON_CONTEXT,
  "OUTPUT RULE: Use the exact activity and learner answer. For the five-ways activity, comment on the set as a whole, identify specific useful actions, and suggest variety only when needed. Never claim the learner chose the intended scenario option when they did not."
].join("\n\n");

const WEEK_4_LESSON_CONTEXT = [
  "LESSON FLOW: Week 4 teaches the Circle of Concern and how compassion changes with relationship, familiarity, safety, and boundaries. Compassion does not require treating a stranger exactly like a close family member.",
  "The inner circle generally includes close family, close friends, trusted relatives, and other close trusted relationships. The outer circle generally includes strangers, acquaintances, unfamiliar community members, and classmates or adults who are not personally close. Context matters: labels such as teacher, classmate, cousin, driver, or family friend do not automatically prove closeness, so feedback should acknowledge reasonable context while checking the learner's boundary reasoning.",
  "When an unfamiliar hungry person asks for lunch, a compassionate answer notices the need and responds kindly while considering personal safety, consent, hygiene, available alternatives, and trusted-adult support. Sharing may be kind when safe and comfortable, but compassion can also mean finding another safe way to help. Do not shame a learner for maintaining a boundary.",
  "Some actions are especially suitable for the inner circle, such as intimate caregiving or sustained personal support. Some are suitable for the outer circle, such as limited practical help for a neighbour or stranger. Many actions can suit both circles, including smiling, respectful kindness, safe help, inclusion, standing up against bullying, and helping with an appropriate task.",
  "Listening to personal problems, entering private spaces, sharing private information, money, food, or significant time requires stronger trust, consent, comfort, and safety. Being compassionate means being kind without overextending oneself or ignoring risk.",
  "Evaluate classifications by the reasoning implied by the complete set, not by demanding one rigid answer where context could reasonably change the circle. Correct clear misconceptions gently, especially placing obvious strangers in the inner circle without any trusted relationship or treating boundaries as a lack of compassion."
].join("\n");

const WEEK_4_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_4_LESSON_CONTEXT,
  "OUTPUT RULE: Refer to specific classified people or actions from the learner's answer. Praise sound boundary reasoning, identify at most the most important questionable classifications, and explain how relationship context or safety changes the answer."
].join("\n\n");

const WEEK_5_LESSON_CONTEXT = [
  "LESSON FLOW: Week 5 applies Compassionate Communication to four real-life scenarios using Observation, Feeling, Need, and Request. Feedback evaluates the learner's selected action, explains its compassionate strengths or limitations, and gives a practical improvement without shaming them.",
  "Scenario 1, forgotten homework: Option B is strongest because it notices worry, acknowledges the feeling and need, and offers practical academic support. Option A notices the problem but stops before helpful action. Option C offers useful support but should first confirm the friend's consent before involving a teacher.",
  "Scenario 2, sibling is rude to a waiter: Option A is strongest because a respectful apology acknowledges the harm and restores dignity. Ignoring the incident leaves the harm unaddressed. A generous tip may be kind but does not replace acknowledgment, respect, and an apology.",
  "Scenario 3, nervous new student: Option A is strongest because it offers inclusion while allowing the student to choose. Ignoring the student misses an opportunity for belonging. Pulling them into a game without permission disregards consent and may increase discomfort.",
  "Scenario 4, friend failed while learner scored highest: Option C is strongest because it encourages the friend, separates one result from their ability, and offers study help. Bragging or criticism can deepen hurt; ignoring the friend's feelings can increase isolation even when the learner is entitled to feel proud of their own result.",
  "Across all scenarios, compassion combines accurate observation, empathy, practical action, consent, dignity, and healthy boundaries. Feedback must be specific to the selected option and must not falsely praise an incorrect choice."
].join("\n");

const WEEK_5_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_5_LESSON_CONTEXT,
  "OUTPUT RULE: Produce distinct feedback for each scenario. Name the useful or problematic part of the selected action and give one concrete compassionate improvement. Do not repeat identical wording across scenarios."
].join("\n\n");

module.exports = {
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_1_LESSON_CONTEXT,
  WEEK_1_SCENARIO_CONTEXT,
  WEEK_1_GUIDANCE,
  WEEK_2_LESSON_CONTEXT,
  WEEK_2_GUIDANCE,
  WEEK_3_LESSON_CONTEXT,
  WEEK_3_GUIDANCE,
  WEEK_4_LESSON_CONTEXT,
  WEEK_4_GUIDANCE,
  WEEK_5_LESSON_CONTEXT,
  WEEK_5_GUIDANCE
};
