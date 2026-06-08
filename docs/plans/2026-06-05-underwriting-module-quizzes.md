# Underwriting Module Quizzes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use crucible:build to implement this plan task-by-task.

**Goal:** Add quiz-only lessons for the end of Module 1 and Module 2 with 100% pass requirements, durable quiz scoring, module-gated progression, module-scoped notes, and time-based leaderboard support.

**Architecture:** Keep the quizzes attached to the modules they certify, not in a separate fourth module. Store quiz attempts and module notes in the Outline/Postgres learning backend so scores, attempts, pass status, notes, and completion timing can be queried. Mirror the latest quiz/module summary into `LearningAssignment.progress` for fast overview rendering while keeping canonical attempt history in dedicated tables.

**Tech Stack:** React, TypeScript, styled-components, Koa API routes, Sequelize models/migrations, Postgres JSONB, existing Outline API client.

---

## Confirmed Source Content

- Module 1 quiz source: `../../_training/underwriting-training/scripts/quiz-0-financial-101.md`
- Module 2 quiz source: `../../_training/underwriting-training/scripts/quiz-1-discovery.md`
- Each quiz currently has 12 scenario questions.
- Required pass threshold is changed from the source-file 80% threshold to 100%.
- Notes should be allowed and visible during quizzes.

## Placement Decision

The original plan described "post-module quiz questions" for a 3-module, 13-lesson course. It did not describe a separate fourth module just for quizzes.

Implement the agreed quiz-only lesson approach:

- Module 1 Lesson 5: `Financials 101 Quiz`
- Module 2 Lesson 7: `Discovery and Positioning Quiz`

Progression rules:

- Module 1 Quiz must be passed at 100% before Module 2 lessons are available.
- Module 2 Quiz must be passed at 100% before Module 3 lessons are available.
- A failed quiz does not complete the module. Learner can review notes and retake.
- Course completion requires all required lessons, required skill checks, and required module quizzes passed at 100%.

## Data Model

### Task 1: Add quiz attempt persistence

**Files:**
- Create: `server/models/LearningQuizAttempt.ts`
- Modify: `server/models/index.ts`
- Create: `server/migrations/YYYYMMDDHHMMSS-create-learning-quiz-attempts.js`
- Modify: `server/routes/api/learning/schema.ts`
- Modify: `server/routes/api/learning/learning.ts`

**Table:** `learning_quiz_attempts`

Columns:

- `id`
- `courseId`
- `moduleNumber`
- `quizId`
- `attemptNumber`
- `score`
- `maxScore`
- `scorePercent`
- `passed`
- `requiredPercent`
- `startedAt`
- `submittedAt`
- `durationSeconds`
- `answers` JSONB: selected option IDs, correctness, question IDs
- `questionSnapshot` JSONB: question/order/options shown for auditability
- `userId`
- `teamId`
- timestamps

Indexes:

- unique-ish query support: `teamId,userId,courseId,moduleNumber,attemptNumber`
- reporting: `teamId,courseId,moduleNumber,passed,submittedAt`
- leaderboard: `teamId,courseId,userId,submittedAt`

API additions:

- `learning.quizStart`: creates/returns active quiz session metadata and records `startedAt`.
- `learning.quizSubmit`: validates answers server-side, stores attempt, returns score, pass/fail, required threshold, next unlocked module.

Important rule:

- Client can display and collect answers, but server must compute the score from trusted quiz data.

### Task 2: Extend assignment progress summary

**Files:**
- Modify: `server/models/LearningAssignment.ts`
- Modify: `server/routes/api/learning/learning.ts`

Extend `LearningProgressState`:

```ts
quizzes?: Record<
  string,
  {
    moduleNumber: number;
    quizId: string;
    passed: boolean;
    bestScore: number;
    maxScore: number;
    bestScorePercent: number;
    requiredPercent: number;
    attemptCount: number;
    lastAttemptAt: string;
    passedAt?: string;
  }
>;
courseStartedAt?: string;
courseCompletedAt?: string;
completionSeconds?: number;
```

Completion logic:

- Existing lesson progress remains.
- Badge eligibility must require:
  - all required lessons complete,
  - all required skill checks complete,
  - Module 1 quiz passed at 100%,
  - Module 2 quiz passed at 100%.
- `courseStartedAt` is first durable learner activity: lesson progress, note creation, or quiz start.
- `completionSeconds` is `completedAt - courseStartedAt`.

## Quiz Content and UI

### Task 3: Convert quiz markdown into typed LMS data

**Files:**
- Create: `app/scenes/underwritingQuizData.ts`
- Optional script: `scripts/extract-underwriting-quizzes.ts`

Data shape:

```ts
type UnderwritingQuiz = {
  id: string;
  moduleNumber: number;
  lessonNumber: number;
  title: string;
  requiredPercent: 100;
  sourcePath: string;
  questions: {
    id: string;
    phase: string;
    stem: string;
    options: {
      id: string;
      label: string;
      text: string;
      feedback: string;
      correct: boolean;
    }[];
  }[];
};
```

Quiz IDs:

- `module-1-financials-101-quiz`
- `module-2-discovery-positioning-quiz`

### Task 4: Add quiz-only lessons to the course map

**Files:**
- Modify: `app/scenes/learningData.ts`
- Modify: `app/scenes/UnderwritingTraining.tsx`

Add quiz lessons:

- Module 1 lesson count: 5
- Module 2 lesson count: 7
- Course lesson count display should distinguish video lessons from quizzes.

Recommended labels:

- Kind: add `quiz` to `LessonKind`
- Duration: `12-15 min`
- Status: ready only if the prerequisite module lessons are complete; locked if upstream quiz gate is not passed.

### Task 5: Build quiz screen

**Files:**
- Create or extend: `app/scenes/UnderwritingQuiz.tsx`
- Modify: `app/routes/authenticated.tsx`
- Modify: `app/utils/routeHelpers.ts`

Route:

- `/learning/underwriting-training/module-:moduleNumber/quiz`

Quiz intro copy requirements:

- Clearly state: "You need 100% to pass this module."
- Clearly state: "Take your time. Your module notes are available on this screen."
- Clearly state: "If you miss a question, review the lesson and retake the quiz."
- Do not imply speed matters for quiz score. Speed matters only for leaderboard after successful course completion.

Quiz behavior:

- Show all questions with answer choices.
- Show module notes in a scrollable side panel.
- Submit button remains disabled until all questions are answered.
- On submit, call `learning.quizSubmit`.
- If 100%: show pass state and unlock next module.
- If below 100%: show fail state, score, missed concepts, and links back to relevant module lessons.

## Module Notes

### Task 6: Replace lesson-scoped textarea with module-scoped note entries

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`
- Create shared component: `app/scenes/UnderwritingModuleNotes.tsx`
- Create API schema/routes in `server/routes/api/learning/schema.ts` and `server/routes/api/learning/learning.ts`
- Create model: `server/models/LearningModuleNote.ts`
- Create migration: `server/migrations/YYYYMMDDHHMMSS-create-learning-module-notes.js`

Current behavior to replace:

- Current key is `dashfi.learning.underwriting.lesson-notes.{module}.{lesson}`.
- That makes notes lesson-scoped and unavailable across the module.

New behavior:

- Notes are tied to course + module + learner.
- Notes appear in every lesson within that module.
- Notes appear in that module's quiz.
- Notes panel scrolls independently.
- Each note entry is stamped with:
  - module number,
  - lesson number,
  - lesson title,
  - created timestamp,
  - updated timestamp if edited.

Recommended UX:

- Composer textarea: learner writes a note.
- Button: `Add note`.
- Note card label example: `Module 2 · Lesson 1 · Opening the Financial Conversation`.
- Notes list sorted newest first or oldest first; use oldest first for quiz review.
- Keep localStorage as short-term draft backup only, not canonical storage.

API additions:

- `learning.notesList`
- `learning.noteCreate`
- `learning.noteUpdate`
- `learning.noteDelete`

### Task 7: Add pre-lesson learner clarity window

**Files:**
- Modify: `app/scenes/UnderwritingLesson.tsx`

Behavior:

- Before the learner hits play, show a lightweight start window.
- Copy should explain:
  - take good notes,
  - notes follow them through the module,
  - module quiz requires 100%,
  - notes will be available during the quiz.
- The learner clicks `Start lesson`.
- Do not block review mode.

## Gating

### Task 8: Enforce module gates in backend and frontend

**Files:**
- Modify: `server/routes/api/learning/learning.ts`
- Modify: `app/scenes/UnderwritingTraining.tsx`
- Modify: `app/scenes/UnderwritingLesson.tsx`
- Modify: `app/scenes/UnderwritingQuiz.tsx`

Backend:

- `learning.overview` should return gate state:
  - `moduleNumber`
  - `locked`
  - `lockedReason`
  - `requiredQuizId`
  - `quizPassed`

Frontend:

- Locked module cards should be visually disabled.
- Attempting direct navigation to a locked module redirects to the course map or shows a lock screen.
- Passing Module 1 quiz unlocks Module 2.
- Passing Module 2 quiz unlocks Module 3.

## Leaderboard

### Task 9: Change leaderboard ranking to completion time

**Files:**
- Modify: `server/routes/api/learning/learning.ts`
- Modify: `app/scenes/LearningLeaderboard.tsx`
- Modify: `app/scenes/LearningReporting.tsx`

Ranking logic:

- Completed learners rank first by fastest `completionSeconds`.
- Ties break by fewer quiz attempts, then earlier `completedAt`.
- Incomplete learners appear below completed learners, sorted by progress percent.

Display fields:

- rank,
- learner name,
- completion time,
- quiz attempts,
- completedAt,
- badge/certified state.

Important fairness rule:

- Timer starts at first actual course activity, not assignment creation, so a learner is not penalized for being assigned earlier.

## Testing and QA

### Task 10: Backend tests

**Files:**
- Add tests near existing API route/model test patterns.

Test cases:

- 100% quiz attempt passes.
- 11/12 quiz attempt fails.
- Failed quiz does not unlock next module.
- Passed Module 1 quiz unlocks Module 2.
- Passed Module 2 quiz unlocks Module 3.
- Badge is not awarded until lessons, skill checks, and required quizzes are complete.
- Quiz attempts are queryable by learner, module, and team.
- Completion seconds use first activity time, not assignment time.

### Task 11: Frontend tests / manual QA

Manual QA:

- Module 1 notes persist across Lessons 1-4 and Module 1 quiz.
- Module 2 notes persist across Lessons 1-6 and Module 2 quiz.
- Notes include module/lesson stamps.
- Notes panel scrolls with long notes.
- Quiz intro clearly says 100% required.
- Failed quiz blocks next module.
- Passed quiz unlocks next module.
- Direct URL to locked module is blocked.
- Leaderboard ranks completed learners by fastest completion time.

Commands:

- `yarn tsc -p tsconfig.json --noEmit`
- `yarn test server/routes/api/learning`
- `yarn build`

Browser QA:

- Desktop course map.
- Mobile course map.
- Desktop lesson with pre-lesson note prompt.
- Mobile lesson with notepad.
- Desktop quiz screen with notes.
- Mobile quiz screen with notes.
- Leaderboard after seeded quiz attempts.

## Implementation Order

1. Backend quiz attempt model, migration, route schemas.
2. Backend quiz scoring and assignment progress/gating.
3. Backend module notes model and routes.
4. Typed quiz data conversion.
5. Quiz route/screen.
6. Module-scoped notes component in lessons and quizzes.
7. Pre-lesson learner clarity window.
8. Course map gating UI.
9. Leaderboard completion-time ranking.
10. Full QA pass.

## Open Decisions

- Whether notes can be edited after quiz submission. Recommendation: yes, because notes are a learning tool, not a graded artifact.
- Whether failed attempts should show exact correct answers or only concepts to review. Recommendation: show missed concepts and feedback, but do not turn the quiz into a memorization answer sheet.
- Whether Module 3 should also get its own quiz now. Current request is Module 1 and Module 2 only, but the original source set also includes Module 3 and final cumulative quiz files.
