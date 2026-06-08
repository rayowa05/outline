# Underwriting Next Navigation and Answer Randomization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use crucible:build to implement this plan task-by-task.

**Goal:** Make lesson/module completion feel guided instead of dead-ended, and randomize answer order for skill checks and module quizzes without breaking scoring.

**Architecture:** Extend the existing lesson rail and quiz screen rather than creating new navigation surfaces. Keep routing deterministic from the current lesson/module state, but make option display order randomized per quiz attempt/checkpoint display. Server scoring remains based on stable option IDs.

**Tech Stack:** React, TypeScript, styled-components, existing Outline learning backend, shared underwriting quiz content.

---

## Current State Verified

### Coming Up Next

- `UnderwritingLesson.tsx` already has a `RailNextUp` box inside the Objectives tab.
- It currently shows:
  - `Coming up next` when a `nextLesson` exists.
  - `Module complete` when no `nextLesson` exists.
- It does not include a button.
- It does not auto-select the Objectives tab when the lesson ends.
- At the last lesson in a module, it currently does not route to the module quiz.

### Answer Order

Module quiz correct-answer distribution is mixed, but static:

- Module 1 quiz: `B, D, A, C, C, D, B, C, B, D, B, B`
- Module 2 quiz: `B, A, B, B, D, C, C, D, C, A, D, B`

This is not the same as per-attempt randomization. Skill checks also currently render options in source order.

Conclusion: answer positions are not all A/B, but we should still add real randomization because the order does not change today.

## Task 1: Auto-Select Objectives When Lesson Ends

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`

Behavior:

- When the lesson reaches completion and `lessonCompleted` flips to true, auto-select the Objectives tab.
- Do this even if the learner is currently on Lesson Path or Skill Checks.
- Do not run in review mode.
- Do not repeatedly steal focus after the learner manually changes tabs post-completion.

Implementation detail:

- Add a ref such as `completionRailAutoSelectedRef`.
- In an effect:
  - if `lessonCompleted && !reviewMode && !completionRailAutoSelectedRef.current`, call `setActiveRailTab("objectives")`.
  - then set the ref to true.
- Reset the ref when `lessonKey` changes.

## Task 2: Add a CTA Button to Coming Up Next

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`
- Use existing helpers in `app/utils/routeHelpers.ts`

Button logic:

- If `nextLesson` exists and `nextLesson.kind !== "quiz"`:
  - label: `Next lesson`
  - href: `underwritingLessonPath(activeModule, nextLesson.number)`
- If `nextLesson` exists and `nextLesson.kind === "quiz"`:
  - label: `Take module quiz`
  - href: `underwritingQuizPath(activeModule)`
- If no `nextLesson`, but the module has a quiz:
  - label: `Take module quiz`
  - href: `underwritingQuizPath(activeModule)`
- If no `nextLesson` and no module quiz:
  - label: `Course overview`
  - href: `underwritingTrainingPath()`

UI:

- Add a white button inside `RailNextUp`.
- Button should be disabled or visually secondary until `lessonCompleted` is true.
- The button should still be visible before completion so learners understand where the flow goes next.
- Copy can stay compact:
  - label line: `Coming up next`
  - title line: next lesson/quiz title
  - meta line: lesson/quiz duration
  - button: `Next lesson` or `Take module quiz`

## Task 3: Quiz Pass Celebration and Return to Overview

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`

Behavior:

- On successful quiz submission:
  - show a brief confetti/completion animation.
  - show clear copy: `Module {n} complete`.
  - after a short delay, route to `underwritingTrainingPath()`.
- Keep a visible `Module map` button for users who do not wait for the auto-route.
- Do not auto-route after a failed quiz.

Implementation detail:

- Use a lightweight CSS confetti burst, not a new animation dependency.
- Add state like `celebrating`.
- In the `quizSubmit` success handler:
  - if `response.data.passed`, set `celebrating` true.
  - call `window.setTimeout(() => history.push(underwritingTrainingPath()), 1800)`.
  - cleanup timeout on unmount.

## Task 4: Randomize Skill Check Answer Order

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`

Rules:

- Use stable option IDs for correctness.
- Shuffle display order when the checkpoint overlay opens.
- Do not mutate `checkpoint.options`.
- Keep the option label shown to learners as display position, not source ID, to avoid showing a static A/B/C pattern.

Implementation detail:

- Add a small deterministic shuffle helper:
  - input: options, seed string
  - output: shuffled options
- Seed can include `checkpoint.id`, current timestamp bucket, and learner-local random value stored in component state.
- In `CheckpointOverlay`, derive `displayOptions` with `useMemo`.
- Render display labels `A`, `B`, `C`, `D` based on shuffled index.
- Keep `onAnswer(option)` passing the original option object.

## Task 5: Randomize Module Quiz Answer Order Per Attempt

**Files:**
- Modify: `app/scenes/UnderwritingQuiz.tsx`
- Modify if needed: `server/routes/api/learning/learning.ts`

Rules:

- Server scoring must continue using stable option IDs.
- Client display order should change per quiz start/attempt.
- The `answers` payload should submit original option IDs, not display labels.
- `questionSnapshot` should store the displayed option order for auditability.

Recommended implementation:

- On quiz start, create an `attemptSeed` from `startedAt`, `quiz.id`, and a random local value.
- Shuffle each question's options using that seed plus question ID.
- Render display labels from shuffled position.
- Submit:
  - `answers`: `{ [questionId]: originalOptionId }`
  - `displayOrder`: `{ [questionId]: originalOptionIdsInDisplayedOrder }`
- Extend `LearningQuizSubmitSchema` to accept optional `displayOrder`.
- Store `displayOrder` in `LearningQuizAttempt.answers` and/or `questionSnapshot`.

Why this matters:

- The learner sees a fresh order each attempt.
- The server still scores from stable option IDs.
- Reporting/auditing can reconstruct what the learner saw.

## Task 6: QA Checklist

Manual QA:

- Finish a lesson while on Lesson Path tab: Objectives tab auto-selects.
- Finish a lesson while on Skill Checks tab: Objectives tab auto-selects.
- Mid-module next-up button says `Next lesson` and routes correctly.
- Last lesson next-up button says `Take module quiz`.
- Passing Module 1 quiz shows module completion celebration and returns to course overview.
- Failed quiz stays on quiz page.
- Module quiz answer order changes on a new attempt.
- Skill check answer order changes when a skill check is opened fresh.
- Correctness still works after shuffling.

Commands:

- `yarn tsc -p tsconfig.json --noEmit`
- focused `oxlint` on changed files
- `yarn build`

## Open Decision

- Button availability before lesson completion:
  - Recommendation: show the button before completion but disable it until the lesson completes. This gives clarity without letting learners skip ahead accidentally.
