const SHARED_FEEDBACK_GUIDANCE = [
  "Give warm, age-appropriate feedback grounded in the learner's exact response and the relevant lesson concept.",
  "Classify each supplied answer internally as thoughtful, off-track, or minimal. Unanswered responses are filtered before generation and must not receive AI feedback.",
  "For a thoughtful response, acknowledge one specific accurate idea from the answer and connect it to the relevant lesson concept.",
  "For an off-track response, acknowledge the attempt, correct one important misunderstanding gently, and redirect the learner to the relevant concept.",
  "For a minimal response, recognise any useful starting point and request or suggest one specific detail, example, reason, or practical action.",
  "Do not grade assessments, invent details about the learner, or praise an incorrect classification as correct.",
  "Keep grouped activity feedback specific to the submitted items rather than summarising the whole lesson.",
  "Avoid empty praise such as great job unless it is immediately supported by something specific in the learner's response."
].join(" ");

const WEEK_1_LESSON_CONTEXT = [
  "Week 1 introduces resilience, grit, growth mindset, and the Power of Yet.",
  "Resilience is the ability to bounce back after a challenge or setback and continue moving forward. It does not mean avoiding difficulty, never feeling upset, or solving everything perfectly.",
  "Grit is sustained passion, determination, and effort toward a longer-term goal, even when progress is slow, tiring, frustrating, or difficult.",
  "Resilience and grit overlap but are distinct: resilience helps a person recover after difficulty, while grit helps a person persist toward a goal over time.",
  "A growth mindset is the belief that abilities can improve through effort, practice, useful strategies, learning from mistakes, and asking for help.",
  "The Power of Yet changes a fixed statement such as I cannot do this into a growth-oriented statement such as I cannot do this yet, but I can improve with practice and support.",
  "For the challenge reflection, acknowledge the specific challenge and evidence of recovery. Do not assume the experience was easy or fully resolved.",
  "For the resilience-versus-grit sort, Sam practising piano and Chris continuing to write a book demonstrate grit. Emma recovering after a failed science project and Lucy responding constructively after losing a game demonstrate resilience.",
  "For the four challenge-and-yet pairs, evaluate whether each Yet statement keeps the original challenge honest while adding a realistic path involving effort, practice, strategy, time, or support. Avoid empty positivity that ignores the challenge.",
  "Useful ways to build these skills include setting a small consistent goal, facing rather than avoiding an appropriate challenge, practising after setbacks, trying another strategy, and asking a trusted person for help."
].join("\n");

const WEEK_1_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_1_LESSON_CONTEXT,
  "OUTPUT RULE: Return distinct, answer-specific feedback for all five activities. For Activity 5, comment on the four challenge-and-yet pairs as a set and identify one specific strong transformation or one pair that needs a more realistic action."
].join("\n\n");

const WEEK_2_LESSON_CONTEXT = [
  "Week 2 teaches the 7 Cs as building blocks that strengthen resilience: Competence, Confidence, Coping, Control, Character, Connections, and Contribution.",
  "Competence is the ability to use skills and knowledge to handle tasks and challenges. It grows through practice, trying, learning from mistakes, and improving rather than perfection.",
  "Confidence is belief in one's ability to face situations and take a first step. It grows through practice and successfully engaging with challenges.",
  "Coping means healthy skills and strategies for managing stress, challenges, and difficult emotions, such as breathing, talking to someone trusted, walking, drawing, or journaling.",
  "Control means recognising what can and cannot be changed and focusing on one's own preparation, choices, actions, and responses rather than controlling other people or every outcome.",
  "Character is the values and sense of right and wrong that guide choices, including honesty, kindness, and responsibility.",
  "Connections are trusted people such as family, friends, teachers, and mentors who provide encouragement, guidance, and support.",
  "Contribution is recognising that one can help others and make a positive difference, which builds purpose and resilience.",
  "The matching activity's correct sequence is Confidence, Connections, Character, Coping, Contribution, Competence, and Control.",
  "The opening question about a collapsed building is a short personal-experience check, not a test of resilience knowledge. Respond sensitively and do not invent details about what the learner witnessed.",
  "For the matching activity, evaluate the seven selections against their definitions and identify one exact strength or correction rather than merely listing all seven Cs again."
].join("\n");

const WEEK_2_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_2_LESSON_CONTEXT,
  "OUTPUT RULE: Keep Activity 1 sensitive to the learner's Yes or No response. For Activity 2, comment specifically on the submitted matches and gently correct one misconception when needed."
].join("\n\n");

const WEEK_3_LESSON_CONTEXT = [
  "Week 3 teaches adaptability as the ability to adjust to new situations, changes, or challenges without losing sight of who you are.",
  "Adaptability does not require liking every change. It involves staying open, calming down enough to think, assessing the situation, trying another plan or strategy, seeking suitable help, and learning from the experience.",
  "Adaptable behaviour includes adjusting to new conditions, trying new approaches when one is not working, staying calm under pressure, and handling change constructively.",
  "Not-adaptable behaviour includes expecting everything to remain unchanged, rigidly repeating a failing approach, refusing all new options, avoiding or denying change, and panicking without pausing to assess the situation.",
  "Adaptability supports resilience because flexible problem-solving helps a person continue after unexpected change rather than becoming stuck.",
  "Activity 3 contains five separate situations and each response receives separate feedback. A useful answer should name a realistic adjustment, action, strategy, or source of support that fits that particular situation.",
  "For overwhelming schoolwork, useful adaptation can include prioritising tasks, making a revised schedule, breaking work into smaller steps, changing study methods, or asking a teacher or trusted person for help.",
  "For supporting a friend in difficulty, useful adaptation should remain attentive to the friend's needs and boundaries, such as listening, checking what support is wanted, and involving trusted help when safety requires it.",
  "For learning guitar through difficulty, useful adaptation can include changing practice methods, slowing down, seeking guidance, and learning from mistakes while continuing to practise.",
  "For uncertainty about an outcome, useful adaptation focuses on controllable actions, emotional regulation, preparation, and revising the plan as new information appears.",
  "For contributing at a charity event, useful adaptation can include taking a different role, coordinating with others, solving unexpected problems, and reflecting on what worked."
].join("\n");

const WEEK_3_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_3_LESSON_CONTEXT,
  "OUTPUT RULE: Produce distinct feedback for each of the five Activity 3 situations. Name the learner's specific proposed adjustment and never repeat identical feedback across scenarios."
].join("\n\n");

const WEEK_4_LESSON_CONTEXT = [
  "Week 4 teaches that support systems are trusted people who help a person stay strong, manage challenges, and bounce back through encouragement, advice, practical help, or listening.",
  "A support system can include family members, friends, teachers, mentors, teammates, and other safe trusted people. It does not need to be large; reliability, trust, safety, and mutual care matter more than size.",
  "Support can make difficulties feel less overwhelming, offer another perspective, strengthen confidence, and remind a person that they do not have to face every challenge alone.",
  "Asking for help is a sign of awareness and courage, not weakness. It recognises personal limits and creates an opportunity to learn, recover, or solve a problem with suitable support.",
  "Strong support networks require ongoing care. Useful actions include spending time together, communicating honestly and safely, listening, offering support in return, joining constructive groups, and reaching out when help is needed.",
  "For the definition reflection, relevant answers identify people or relationships that provide help, guidance, encouragement, safety, or a listening ear during difficult moments.",
  "For the three-person activity, respond to the selected people as a group. Do not infer private details or claim that a named person is trustworthy; instead recognise the learner's identified network and encourage considering the different kinds of safe support each person can offer.",
  "For the five-person relationship map, recognise the range of people named and encourage one practical way to strengthen, communicate with, or appropriately seek help from the network. Do not invent what those people think or feel about the learner.",
  "Feedback must support healthy boundaries. If a response suggests unsafe, harmful, or unreliable support, gently redirect the learner toward a trusted adult or appropriate safe source of help."
].join("\n");

const WEEK_4_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_4_LESSON_CONTEXT,
  "OUTPUT RULE: Base each feedback entry on the exact people or ideas submitted. Keep names as provided, avoid assumptions about relationships, and suggest at most one practical next step."
].join("\n\n");

const WEEK_5_LESSON_CONTEXT = [
  "Week 5 teaches coping skills as strategies and techniques that help a person handle stress, anxiety, difficult emotions, and challenges in constructive ways.",
  "Healthy coping skills support wellbeing and problem-solving over time. Unhealthy coping may provide temporary relief while creating more problems, such as avoiding every problem or taking frustration out on other people.",
  "Healthy examples in the lesson include slow deep breathing, physical movement, journaling, talking to a trusted person, mindfulness or meditation, calming music, creative activities, positive self-talk, breaking a problem into smaller steps, visualising success, and asking for guidance.",
  "Different coping skills work for different people and situations. A personal coping toolbox should contain several safe strategies that can be tried, evaluated, practised, and changed when one approach is not helping.",
  "Coping does not always remove the problem. It can calm the body or emotions enough to think clearly, communicate safely, seek help, and take a constructive next step.",
  "For the definition reflection, relevant responses mention dealing with, handling, or managing stress, emotions, challenges, or difficult situations.",
  "For the challenge list, recognise the learner's examples without assuming private details. Connect the set to choosing safe, situation-appropriate coping strategies rather than judging the learner for experiencing difficulty.",
  "For the ten matching situations, evaluate whether each selected coping skill is safe and reasonably useful for that situation. More than one healthy skill can be valid, so do not enforce a single answer when another selection is constructive.",
  "Strong matches connect the skill to the need: calming intense emotion before acting, seeking help for a learning problem, breaking work into steps, communicating after hurt, using supportive self-talk, or expressing feelings safely.",
  "If a selected strategy only distracts temporarily, feedback may acknowledge its short-term calming value and suggest pairing it with one problem-solving or support-seeking action."
].join("\n");

const WEEK_5_GUIDANCE = [
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_5_LESSON_CONTEXT,
  "OUTPUT RULE: For Activity 3, comment on the ten matches as a set. Identify one specific effective match or one selection that could fit the situation better; do not list or grade every pair."
].join("\n\n");

module.exports = {
  SHARED_FEEDBACK_GUIDANCE,
  WEEK_1_LESSON_CONTEXT,
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
