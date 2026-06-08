# Underwriting Content QA Backlog

Date: 2026-06-05
Status: Audit started, full visual/content QA still pending; some player UX fixes have shipped
Mode: Backlog and launch QA tracking

## Reviewers

- Ray Owais
- John Molnar
- Mark Brazil
- Lukas Geipel

Chris Thurman is intentionally not included on this QA/backlog review artifact.

## Findings

| ID | Severity | Area | Location | Issue | Evidence | Standard | Recommended Fix | Status |
|---|---|---|---|---|---|---|---|---|
| QA-001 | High | QA coverage | Full Underwriting Training course | Full content QA pass has not been executed end to end | Backlog plan existed, but findings table was still placeholder-only before this update | QA must separate planned work from verified findings | Run the full content QA pass across scripts, slides, Gong clips, skill checks, quizzes, desktop, and mobile; log evidence per finding | Backlog |
| QA-002 | High | Visual QA | Production LMS at `https://kb.dash.fi/learning` | Authenticated browser QA still needs to be run before launch | Deployment readiness plan requires authenticated screenshots for Module 1 quiz, Module 2 quiz, Lesson 5, Lesson 6, and Module 3 completion | We cannot claim visual correctness without eyes on the actual LMS | Run authenticated browser QA and capture screenshots for required pages/states | Backlog |
| QA-003 | Medium | Lesson slides | Module 2 Lesson 5, Reading the Signals | Static source appears updated to specific signal slides, but visual/timing QA is still unverified | Source now includes `Signal 1: Personal credit cards are funding ads`, `Signal 2: Burn exceeds revenue with short runway`, industry categories, and `None of these are automatic qualifications` | Slide content must match the narrator at the moment it is spoken | Verify each section against captions and screenshots on desktop/mobile; fix any timing or layout misses found | Ready to verify |
| QA-004 | Medium | Lesson slides | Module 2 Lesson 6, Application Process | Static source appears updated to application-process steps, but visual/timing QA is still unverified | Source now includes Step 1 Qualification, Step 2 Business details, Step 3 Identity verification, Step 4 Terms and conditions, Step 5 Finalize, bank fallback paths, documents, and transition to underwriting | Visual boxes must match the current narration and not create learner confusion | Verify every Lesson 6 slide visually and compare to captions; fix mismatched visuals or timestamps | Ready to verify |
| QA-005 | High | Quiz content | Module 1 Financials 101 Knowledge Check, `module-1-financials-101-quiz-q6` and `q7` | Some Financials 101 questions still contain numeric/deterministic wording Ray asked to remove or soften | Static source still includes `Runway is 10 months`, `$500K daily limit`, and `$600K in the bank` | Quiz questions should avoid over-deterministic underwriting math unless the exact numbers are intentional and approved | Compare against Claude final handoff doc and Ray feedback; rewrite Q6/Q7 if final content was not applied | Backlog |
| QA-006 | Medium | Quiz content | Module 1 and Module 2 quiz source | Final quiz handoff still needs source-to-handoff verification | Current source has 8 Module 1 questions and 9 Module 2 questions, but final handoff content must be compared question-by-question | QA feedback should use stable question IDs/stems, not randomized display numbers | Diff `shared/learning/underwritingQuizContent.ts` against `codex-quiz-final-june5.md` and log exact mismatches | Backlog |
| QA-007 | Low | Quiz metadata | `shared/learning/underwritingQuizContent.ts` | Phase metadata remains in quiz source, though it does not appear visible in the current quiz card UI | Source still contains `Phase 0.1`, `Phase 1.6`, etc.; `UnderwritingQuiz.tsx` currently renders `Question {question.number}` only | Learner-facing phase labels should not appear | Confirm phase labels do not appear in production UI, reporting, review summaries, or exports; remove from source only if they leak | Ready to verify |
| QA-008 | Medium | Quiz behavior | Module 1 and Module 2 quizzes | Browser QA still needs to confirm question order, answer shuffle, retake, and feedback behavior | Static source shows questions remain in source order and answer options shuffle by seed; this still needs actual UI testing | Learners need stable question numbers for QA while answers can shuffle per attempt | Test both quizzes: source-order questions, randomized answer options, full retake after fail, second-attempt hints, correct/incorrect review state | Backlog |
| QA-009 | High | Email delivery | `noreply@dash.fi` SMTP | Enrollment emails cannot be safely requeued until Gmail SMTP throttle clears | Transport verification returned Gmail `421-4.7.0 Try again later` | Do not claim delivery or requeue enrollment while SMTP verification fails | Re-run transport verification; send one Ray test email; then requeue cohort emails and monitor worker logs | Blocked |
| QA-010 | Medium | Email template | Learning enrollment email | Enrollment email is template-ready but not deployed, queued, or sent | Local render, server build, lint, and PDF preview passed; SMTP remains blocked | Email should be reviewed before first production send | Review PDF/HTML, approve copy/design, deploy, then send one test before cohort requeue | Ready for review |
| QA-011 | Medium | Deployment QA | Module map durations | Module duration estimates are stale after extended Gong clips | Deployment readiness backlog notes added Gong media changed learner time | Module map should set accurate time expectations | Recalculate module durations from narration, Gong clips, workflow videos, quiz estimates, and job aid time | Backlog |
| QA-012 | High | Launch smoke test | LMS production | Launch smoke test still needs admin/learner verification | Deployment readiness plan lists gates, notes, reporting, quiz attempts, no-forward-scrub, next-module CTAs, and completion celebration | Production launch needs both functional and reporting verification | Run production smoke test after deployment: learner path, admin/reporting path, migrations, persisted failures, notes, and completion | Backlog |
| QA-013 | Medium | Player UX | Lesson timeline scrubber | Timeline dragging was laborious in QA because the scrubber did not smoothly follow pointer movement across the range | Ray reported needing to keep dragging far right/outside the player to move ahead quickly during QA | Review-mode QA should allow fast scrub navigation; learner mode should still block forward seeking beyond watched progress | Add pointer-captured drag handling that maps pointer position to timeline time while preserving existing `seekTo` learner gating | Fixed in v43; production review-mode drag verified |

## Notes

Use question IDs or question stems for quiz feedback. Do not use randomized question numbers as the primary reference.

## Static Checks Completed

- `charge card` and `charge-card` are no longer found in `app/scenes` or `shared/learning`.
- Module quiz titles are `Financials 101 Knowledge Check` and `Discovery and Positioning Knowledge Check`.
- Module 1 quiz source currently has 8 questions.
- Module 2 quiz source currently has 9 questions.
- Current quiz component renders `Question {question.number}` without visible phase metadata.
- Current quiz component keeps questions in source order and shuffles answer options by seed.
