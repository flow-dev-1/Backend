# TOT 1 AI Feedback Audit

## Sources

- Teaching context: `AI automated feedback documents/Expanded TOT 1.docx.md`
- Feedback rubric: `AI automated feedback documents/ToT1 AI Feedback.docx`
- Live data: `Frontend/src/components/dashboard/pages/my-courses/TOT/data/activity.js`
- Feedback UI: `Frontend/src/components/dashboard/pages/my-courses/TOT/feedback/weeks/`

The deleted Online Course System Feedback document is not a source.

## Rules

- Generate feedback only for editable activities, never pre-assessments or assessments.
- Use page IDs and step IDs, never array position.
- Send only the current week's teaching context.
- Keep scenario or section feedback separate when the UI displays it separately.
- Convert selections and drag-and-drop data to meaningful text before sending them to AI.

## Incorrect Live Titles

| Week | Live title | Correct title |
| --- | --- | --- |
| 1 | Introduction to Resilience and Grit | Understanding SEL and Positive Psychology |
| 2 | Developing Resilience | Self-Awareness and Emotional Regulation |
| 3 | Understanding Adaptability | Building Relationships and Creating a Safe Classroom |
| 4 | The Role of Support Systems | Growth Mindset and Resilience for Educators |
| 5 | Coping Skills | Integrating SEL into Teaching Methods |
| 6 | Coping Skills | Teacher Well-Being and Sustainable SEL Practices |

Use the correct titles in AI context without changing persisted page IDs.

## Page Targets

### Week 1

Exclude page 2 (pre-assessment) and page 4 (mood check with fixed feedback).

| Page | Response | Feedback |
| --- | --- | --- |
| 6 | Ten-item experience self-check | page summary |
| 8 | Classroom without emotional awareness | page response |
| 10 | SEL versus Not SEL drag-and-drop | scenario-specific where displayed separately |
| 12 | Effect of teacher emotional state | page response using option text |
| 14 | SEL competency matching | structured/scenario feedback |
| 16 | Personal strengths list | page response |
| 18 | Three strength scenarios | one per scenario |
| 20 | Gratitude list | page response |
| 22 | Well-being and balance selection | page response using option text |
| 23 | Two strength-based reframes | one per scenario |

Defect: the Mood Checker block currently reads page 6 feedback, while Activity 2 also uses page 6. Separate page 4 and page 6 before wiring AI display.

### Week 2 - Implemented

Exclude page 4 (pre-assessment). Targets: page 2 recall, page 6 trigger sorting, page 8 trigger reflection, page 10 three teacher-memory responses, page 12 escalation selection, page 14 SONAR scenarios, and page 16 ranking plus reflections. SONAR scenarios require separate feedback.

### Week 3 - Implemented

Exclude page 2 (pre-assessment). Targets are pages 4, 6, 8, 10, and 12. Use separate feedback for the two relationship reflections, heard/ignored scenarios, positive-reinforcement responses, and each complete restorative-conflict scenario. The UI currently selects these pages by array destructuring; replace that with explicit IDs.

### Week 4 - Implemented

Exclude page 2 (pre-assessment). Pages 4 and 6 are not currently editable in admin feedback. Targets are page 8 mindset sorting/reflection, page 10 teaching timeline, page 12 praise scenarios, and page 14 resilience journal. Preserve separate feedback positions for timeline stages and scenario responses.

### Week 5 - Implemented

Exclude page 2 (pre-assessment). Targets are page 4 SEL-in-every-subject reflection, page 6 subject plus SEL skill, page 8 complete game design, page 10 scenario matching, and page 12 routine redesign.

Defect: the feedback screen destructures non-video pages by position, treating pre-assessment page 2 as `activity1` and risking omission or mislabeling of page 12. Replace this with explicit IDs.

### Week 6 - Implemented

Page 2 is not currently editable in admin feedback. Targets are page 4 burnout check-in, page 6 recharge list, page 8 gratitude reflection, page 10 support-circle placements, and page 12 implementation plan. Page 12 requires feedback per independently displayed section (steps 3-9), not one generic page response.

## Document Coverage

`ToT1 AI Feedback.docx` covers all six weeks and is the primary rubric. Its assessment-feedback sections must be ignored because assessments are auto-graded. Week 1 pages 12, 14, and 22 do not have clear one-to-one rubric headings, but their rules can be derived from the expanded script; no additional document is required.

## Required Work

1. Add `context.js` with shared rubric and Week 1-6 contexts.
2. Add and register `week1.js` through `week6.js`.
3. Resolve `TOT 1`, `TOT Course 1`, and titles containing `Feel It. Teach It. Transform Lives`.
4. Fix Week 1 page 4/page 6 feedback association.
5. Replace positional page selection, especially in Weeks 3 and 5.
6. Ensure every AI target has a visible, editable feedback position.
7. Add request, apply, resolver, and enqueue tests, including Week 6.
8. Implement and test one week at a time, beginning with Week 1.

## Progress

- Week 1: implemented and registered. Mixed page-level and scenario-level feedback is wired to the frontend and covered by focused tests.
- Week 2: implemented and registered. Page feedback, 15 SONAR response positions, four ranking positions, and two reflection positions share one backend/frontend feedback structure.
- Week 3: implemented and registered. Explicit page IDs replace positional selection, and all 17 visible response-level feedback positions are independently wired.
- Week 4: implemented and registered. The Activity 1 cross-page feedback defect is fixed, all timeline and reframe responses are independent, and the missing fourth Activity 4 feedback position is now visible.
- Week 5: implemented and registered. Explicit page IDs restore the omitted page 4 activity, correct all shifted labels, and wire 11 genuine page/response feedback targets.
- Week 6: implemented and registered. Six well-being responses, three page-level activities, and eight independent implementation-plan positions are wired and tested.
