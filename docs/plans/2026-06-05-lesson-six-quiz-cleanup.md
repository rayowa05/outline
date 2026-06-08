# Lesson Six and Quiz Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use crucible:build to implement this plan task-by-task.

**Goal:** Clean up Lesson 6 application-process slides, clean up Lesson 5 Reading the Signals slides, remove charge-card language from skill checks and quizzes, simplify Financials 101 quiz content, and verify quiz review logic after removing questions.

**Architecture:** Keep the existing lesson player and quiz infrastructure. Update lesson production data for Lesson 5 and Lesson 6 timing/slide content, update shared quiz content, and make shared quiz UI changes so both Module 1 and Module 2 quizzes inherit the same behavior.

**Tech Stack:** React, styled-components, TypeScript, shared quiz data, existing LMS API grading and attempt storage.

---

## Current Findings

- Module 2 Lesson 6 is `2-6` in `app/scenes/underwritingLessonProductionData.ts`.
- Module 2 Lesson 5 is `2-5` in `app/scenes/underwritingLessonProductionData.ts`.
- Lesson 6 currently has six broad sections that do not match the narration detail:
  - Application is not underwriting
  - What starts the review
  - Document handoff
  - Underwriting timing
  - Proposal follows review
  - Finish Module Two
- Lesson 6 skill check 1 currently says: `final charge card terms and limits`.
- Lesson 6 skill check 3 currently says: `Walk them through the next bank connection fallback path.`
- Lesson 5 currently uses broad slides like `Financial signals`, `Revenue trajectory`, `Debt direction`, and `Operational maturity`; the source captions show more specific narration for:
  - financial signals,
  - personal credit cards funding ads,
  - burn exceeding revenue with short runway,
  - industry signals,
  - resellers, distributors, dropshippers,
  - manufacturers,
  - service providers,
  - pre-revenue DTC brands,
  - and the final point that these are not automatic qualifications, just signals to flag.
- Module 2 quiz also has application-process questions that should be checked for charge-card wording and clearer bank fallback wording.
- The quiz UI is shared by Module 1 and Module 2, so the recent quiz behavior changes already apply to quiz 2:
  - answer option shuffle,
  - question shuffle on retake,
  - full quiz retake,
  - correct/incorrect review coloring,
  - second-attempt hints,
  - confetti and explicit next action.
- The quiz intro block color is also shared, so changing it to light purple will apply to both quizzes.
- The phase label is rendered by `QuestionCard` as `Question {number} · {phase}` in `app/scenes/UnderwritingQuiz.tsx`; removing it applies to both quizzes.
- Financials 101 Q7 current correct source answer is option `b`.
- Financials 101 Q5 should be removed.
- Financials 101 Q12 should be removed; if a stale page showed it as both wrong and correct, likely causes are either stale frontend state after the previous content change or review-state confusion from shuffled display labels. Removing Q12 and rebuilding is the right cleanup, then QA should specifically retest score/missed behavior.

## Task 1: Remove Charge-Card Language Everywhere in Training Checks/Quizzes

**Files:**
- Modify: `app/scenes/underwritingLessonProductionData.ts`
- Modify: `shared/learning/underwritingQuizContent.ts`

**Change:**
- Search `charge card`, `charge-card`, and any casing variants across skill checks and quizzes.
- Replace with `card`, `corporate card`, or `high-limit card` depending on context.
- For Lesson 6 skill check 1, reword the question to:
  - `True or false: once the application is approved through KYB and KYC business verification, the prospect has final card terms and limits and the card is ready to use.`
- Update correct/incorrect feedback:
  - Application approval does not mean the prospect has a card yet.
  - Application approval means the business has passed KYB/KYC verification and is ready for underwriting.
  - Terms and limits come from underwriting.

## Task 2: Rebuild Lesson 6 Slide Sections Around the Talk Track

**Files:**
- Modify: `app/scenes/underwritingLessonProductionData.ts`
- Possibly modify render helpers in `app/scenes/UnderwritingLesson.tsx` only if existing visual kinds cannot support the requested slides.

**Change:**
- Replace the current broad Lesson 6 section list with timing-aligned sections that match the application process talk track:
  - Step 1: Qualification
  - Step 2: Business details
  - Step 3: Identity verification
  - Step 4: Terms and conditions
  - Step 5: Finalize
  - Bank connection: three/four fallback paths
  - Documents upload
  - After submit: transition to underwriting
- Use existing slide methodology: clear title, direct stage copy, no vague placeholder language.
- If timestamps cannot be confidently assigned from existing section timing, inspect `captions.srt` for Lesson 6 and align sections to exact narration lines.

**Bank connection slide content:**
- Fastest path: Plaid Connect.
- If Plaid does not work: enter routing and account numbers.
- Next fallback: micro deposit.
- Last fallback: upload a recent bank statement directly in the application.
- Represent failures visually as path progression, e.g. Plaid with X, then manual/micro-deposit path, then statement upload if needed.

**Documents slide content:**
- Final document upload items should be shown as a separate section, not buried in bank connection.

**After-submit slide content:**
- Application submitted means the deal transitions to underwriting.
- Do not imply terms, limits, or card availability are final.

## Task 3: Rebuild Lesson 5 Reading the Signals Slides Around the Talk Track

**Files:**
- Modify: `app/scenes/underwritingLessonProductionData.ts`
- Inspect source: `/Users/rayowais/claude-projects/_training/underwriting-training/scripts/Audio Files/Subtitles/M1P1_5.srt`
- Possibly modify render helpers in `app/scenes/UnderwritingLesson.tsx` only if existing visual kinds cannot support the requested signal-list slides.

**Change:**
- Replace generic Lesson 5 sections with timing-aligned slides that follow the actual narration.
- Use the subtitles/script to place slide boundaries where the narrator changes topics.

**Required slides:**
- `Financial signals`
- `Signal 1: Personal credit cards are funding ads`
- `Signal 2: Burn exceeds revenue with short runway`
- `Industry signals`
- `Resellers`
- `Distributors`
- `Dropshippers`
- `Manufacturers`
- `Service providers`
- `Pre-revenue DTC brands`
- Final slide:
  - Title: `None of these are automatic qualifications`
  - Subtitle/copy: `Just flag them`

**Acceptance checks:**
- The slide visible during each narration beat names the actual signal being discussed.
- No generic “operational maturity” or “choose the path” slide is shown while the narrator is naming specific industry categories.
- Final slide makes the learning point explicit: these are flags, not automatic qualifications.

## Task 4: Update Lesson 6 Skill Check 3

**Files:**
- Modify: `app/scenes/underwritingLessonProductionData.ts`

**Change:**
- Replace the vague correct answer:
  - `Walk them through the next bank connection fallback path.`
- With the specific next path:
  - `Have them use the manual bank connection path: enter routing and account numbers so the account can be verified by micro deposit.`
- Update feedback to explicitly name micro deposit.

## Task 5: Remove Phase Labels from Quiz Cards

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Change quiz card metadata from `Question {question.number} · {question.phase}` to only `Question {question.number}`.
- Keep the `phase` data field in source for backend snapshots/reporting unless we confirm it is fully unused.

**Result:**
- Applies to Module 1 and Module 2 quizzes because the quiz component is shared.

## Task 6: Make Quiz Intro Block Light Purple

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Restyle `IntroPanel` from black to light purple/lavender.
- Make text dark enough for accessibility.
- Preserve the text:
  - `Required module quiz`
  - `100% required to pass`
  - notes guidance
- Keep the question carousel directly underneath.

**Result:**
- Applies to both module quizzes.

## Task 7: Explore and Implement Quiz Question Carousel Placement

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Replace the full vertical question stack with a carousel-style question area underneath the quiz intro block.
- Show one question at a time or a compact carousel viewport that avoids long vertical scrolling.
- Add clear previous/next controls and a compact progress indicator.
- Preserve all required behavior:
  - all questions must be answered before submit,
  - answer selections persist while navigating,
  - post-submit review still shows correct/incorrect states,
  - failed retake resets the full quiz,
  - shuffled question order remains stable during an attempt.

**Acceptance checks:**
- Questions appear directly below the lighter quiz intro block.
- Learner can navigate through all questions without losing answers.
- Submit state still knows when every question is answered.
- Review mode still clearly exposes missed/correct answers; if one-question-at-a-time review is too hidden, add a missed-question navigation shortcut.

## Task 8: Remove Financials 101 Q5 and Q12

**Files:**
- Modify: `shared/learning/underwritingQuizContent.ts`
- Verify: `server/routes/api/learning/learning.ts`
- Verify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Remove `module-1-financials-101-quiz-q5`.
- Remove `module-1-financials-101-quiz-q12`.
- Renumber remaining Financials 101 questions sequentially so the UI and missed-question summary do not show gaps.
- Preserve stable question IDs unless there is a strong reason to regenerate IDs; if IDs are preserved, only `number` changes.

**Bug checks after removal:**
- `maxScore` should equal new question count.
- `scorePercent` should divide by the new count.
- Missed summary should show the new question numbers.
- Existing saved attempts remain historical snapshots and do not need migration.

## Task 9: Rewrite Financials 101 Q7 Without Numbers

**Files:**
- Modify: `shared/learning/underwritingQuizContent.ts`

**Current correct answer:**
- Source option `b`.

**New stem:**
- `A prospect is requesting a very high limit on Net-30. During discovery, they mention that they have a very low balance in the bank but seem confident this is enough. What should you be thinking?`

**New correct answer:**
- `The bank balance relative to the limit request matters. The underwriting team wants to see significantly more than the limit in the bank; set expectations accordingly.`

**Change:**
- Remove numeric dollar values from stem, answer, and feedback.
- Keep the learning objective: balance relative to requested limit matters.

## Task 10: Rewrite Financials 101 Q10 Correct Answer / Distractors

**Files:**
- Modify: `shared/learning/underwritingQuizContent.ts`

**Change:**
- Current correct answer says this `may not be a prospect for Dash-fi`; soften and make it more operational:
  - The corporate structure question matters.
  - Who controls balance sheet and credit decisions matters.
  - Highlight that structure clearly in the application / underwriting notes.
- Make the `Proceed with discovery and let underwriting sort out the structure` distractor more obviously wrong:
  - Wrong because it does not highlight the control/structure issue.
  - Wrong because it treats a discovery finding as someone else's problem.

## Task 11: Verify Quiz 2 Inherits Quiz 1 UI/Behavior Fixes

**Files:**
- Inspect: `app/scenes/UnderwritingQuiz.tsx`
- Inspect: `shared/learning/underwritingQuizContent.ts`

**Confirm:**
- Module 2 quiz uses the same `UnderwritingQuiz` component.
- Shared changes apply to both quizzes:
  - no phase label,
  - light-purple intro panel,
  - answer review colors,
  - full retake,
  - reshuffle on retake,
  - second-attempt hints,
  - pass celebration with explicit next action.

## Task 12: Verification

**Commands:**
- `rg -n "charge card|charge-card" app/scenes shared/learning`
- `rg -n "module-1-financials-101-quiz-q5|module-1-financials-101-quiz-q12" shared/learning/underwritingQuizContent.ts`
- `yarn oxlint app/scenes/UnderwritingQuiz.tsx app/scenes/UnderwritingLesson.tsx app/scenes/underwritingLessonProductionData.ts shared/learning/underwritingQuizContent.ts`
- `yarn tsc -p tsconfig.json --noEmit`
- `yarn build`

**Manual QA:**
- Module 2 Lesson 6:
  - verify slide at each application-process step,
  - verify bank connection fallback sequence,
  - verify documents slide,
  - verify after-submit transition-to-underwriting slide,
  - verify skill checks 1 and 3 copy.
- Module 2 Lesson 5:
  - verify financial signal slides align to the narration,
  - verify personal-card and burn/runway slides appear at the right talk-track moments,
  - verify industry-signal slides name the specific categories,
  - verify final slide says these are not automatic qualifications and should just be flagged.
- Module 1 quiz:
  - verify Q5/Q12 removed,
  - verify Q7 no numbers,
  - verify Q10 softened,
  - verify carousel navigation and answer persistence,
  - verify score/missed summary after removing questions.
- Module 2 quiz:
  - verify no phase labels,
  - verify light-purple intro block,
  - verify carousel behavior,
  - verify shared quiz behavior matches Module 1.
