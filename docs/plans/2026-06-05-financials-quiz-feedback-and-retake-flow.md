# Financials Quiz Feedback and Retake Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use crucible:build to implement this plan task-by-task.

**Goal:** Apply the Financials 101 final quiz feedback, improve lesson CTA layout, and update the quiz pass/fail flow so learners clearly review answers, retake the full quiz when needed, and advance cleanly after passing.

**Architecture:** Keep the quiz system in the existing React LMS flow. Update quiz content in the shared quiz source, update UI behavior in the quiz scene, and keep backend attempt storage compatible by preserving selected answers, display order, pass status, elapsed time, and snapshots.

**Tech Stack:** React, styled-components, TypeScript, zod API schemas, Sequelize models, existing Outline route/action API pattern.

---

## Current Source Reconciliation

- Q11 current correct source answer is option `b`: the 12% arbitrage reseller model is not a fit.
- Q12 current correct source answer is option `b`: high debt, small cash, young company means not ready; float looks like a lifeline.
- Because quiz answers are already shuffled, the displayed A/B/C letter in the browser may not match source option IDs.
- The current implementation shuffles answer options, but does not yet shuffle question order on retake.

## Task 1: Right-Align Lesson CTA Buttons

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`

**Change:**
- Update the `RailNextUp` layout so the CTA button sits on the right side of the "Coming up next" / "Module complete" row on desktop.
- Keep mobile responsive by stacking only when the container is genuinely narrow.
- Preserve the existing button labels:
  - `Next lesson`
  - `Take module quiz`
  - `Course overview`
- Make this apply across every lesson in every module because the component is shared.

**Acceptance checks:**
- Desktop: title/meta on left, CTA on right, no unnecessary vertical stacking.
- Mobile/narrow: readable stacked layout without overlap.
- Button stays disabled until the lesson is complete.

## Task 2: Remove Purple Concept/Hint Boxes from Quiz Questions

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Remove the rendered `Concept` box from `QuestionCard`.
- Leave the `concept` field in quiz data for now unless unused in all reporting/snapshots; do not delete data fields unnecessarily during this UI pass.
- Remove or stop using the `Concept` styled component if it becomes dead code.

**Acceptance checks:**
- Quiz questions show phase, question stem, and answer options only.
- No purple hint/concept box appears before first submission.

## Task 3: Improve Submit Review State

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- After the learner clicks Done/Submit, render every question in review mode.
- Correct answer option should render green.
- If the learner selected an incorrect option, their selected wrong option should render red.
- Correctly selected options should render green.
- Keep the summary panel that names which questions need review.
- Disable answer changes while in submitted review mode.

**Acceptance checks:**
- A perfect score shows all correct selected boxes in green.
- A failed score shows correct answers in green and the learner's wrong selections in red.
- Missed-question summary still lists the missed question numbers.

## Task 4: Update Financials 101 Quiz Copy

**Files:**
- Modify: `shared/learning/underwritingQuizContent.ts`
- Check source generator/source markdown if this file is regenerated elsewhere before editing directly.

**Q6 change:**
- Remove exact "10 months" runway language from the correct answer and feedback.
- Reframe the correct answer around:
  - positive runway signal,
  - not a guarantee of Net-30,
  - do more discovery on net asset / financial position,
  - submit context in underwriting notes,
  - set honest/direct expectations around terms.

**Q10 change:**
- Remove or replace current option `b`: "Ask the parent company's CFO to join the underwriting call."
- Preferred implementation: replace it with a better distractor instead of making Q10 a three-option question, so quiz UI and learner expectations remain consistent.

**Q11 change:**
- Reword stem:
  - "prospect is worth $1.5M in monthly spend"
  - remove "pipeline deal"
  - remove "charge card"; use "high-limit card" or "card"
- Current correct answer is a hard screen-out. Requested direction appears to change the correct answer to:
  - you've collected useful context,
  - submit it to underwriting,
  - underwriting determines viable limit based on financial situation,
  - set proper expectations.
- Update distractors and feedback so this is not contradicted by the old "not a fit" framing.

**Q12 change:**
- Current correct answer is a hard "not ready" screen-out.
- Requested direction appears to change the correct answer to:
  - recommend Net One as the starting path,
  - if they want float, submit additional documents/context so underwriting can determine availability,
  - set expectations that float is not guaranteed.
- Update distractors and feedback so option C is not wrongly close to the new correct answer unless intentionally revised.

**Acceptance checks:**
- No answer or feedback uses "charge card."
- Q6 no longer states exact runway months.
- Q11 and Q12 no longer conflict with the requested Net One / underwriting-expectation framing.

## Task 5: Full Retake Flow with Question Reorder

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`
- Verify compatibility: `server/routes/api/learning/learning.ts`

**Change:**
- On failed quiz, show review state first.
- Provide a clear `Retake full quiz` button.
- When retake starts:
  - clear selected answers,
  - clear submitted result view,
  - generate a new attempt seed,
  - reshuffle question order,
  - reshuffle answer order.
- Keep backend attempts as separate attempt records; do not overwrite previous failed attempts.

**Acceptance checks:**
- Learner cannot pass by correcting only missed questions in-place.
- Retake is a full quiz reset.
- Question order changes on retake.
- Answer order changes on retake.
- Backend still stores actual source question IDs and selected source option IDs, not display-only letters.

## Task 6: Second-Attempt Hints for Previously Missed Questions

**Files:**
- Modify: `shared/learning/underwritingQuizContent.ts`
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Change:**
- Add a separate `hint` field for quiz questions if the existing `concept` field is too terse or too internal.
- Only display hints during a retake.
- Only show hints for questions missed on the immediately previous failed attempt.
- Do not show hints before first submission.
- Draft hints for the missed-question behavior; submit them for review before considering them final content.

**Acceptance checks:**
- First attempt has no hints.
- Failed attempt records missed question IDs.
- Retake shows hints only on previously missed questions.
- Passing after a retake stores the successful attempt normally.

## Task 7: Longer Celebration and Explicit Next Action

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`
- Modify: `app/scenes/UnderwritingLesson.tsx` if final Module 3 completion is handled in the lesson scene.

**Change for Module 1/2 quiz pass:**
- Stop the fast auto-redirect after about 1.8 seconds.
- Keep confetti visible/looping longer.
- Show a completion modal or overlay with:
  - module completion message,
  - primary button: `Go to next module`.
- The button should navigate to the next module or course overview according to the course map.

**Change for final course completion:**
- When the final Module 3 HubSpot lesson/video is completed, show confetti and a modal:
  - `Congratulations, you've completed the course`
  - primary button can return to course overview or completion/reporting page, depending on existing LMS route.

**Acceptance checks:**
- Passing Module 1 quiz does not immediately kick the learner away before they see the celebration.
- Learner has an explicit next action.
- Final course completion has different copy from module completion.

## Task 8: QA Pass

**Commands:**
- `yarn oxlint app/scenes/UnderwritingQuiz.tsx app/scenes/UnderwritingLesson.tsx shared/learning/underwritingQuizContent.ts`
- `yarn tsc -p tsconfig.json --noEmit`
- `yarn build`

**Manual QA:**
- Financials 101 quiz first attempt:
  - no purple hints,
  - randomized answers,
  - submit wrong answer and verify green/red review state,
  - retake full quiz and verify question/order shuffle.
- Financials 101 quiz pass:
  - 100% required,
  - longer confetti,
  - explicit `Go to next module` action.
- Lesson CTA:
  - desktop right-aligned,
  - mobile readable,
  - every module uses shared layout.
- Final Module 3 lesson:
  - completion modal says course completed.
