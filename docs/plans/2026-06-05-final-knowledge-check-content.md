# Final Knowledge Check Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use crucible:build to implement this plan task-by-task.

**Goal:** Ship the final Module 1 and Module 2 knowledge check questions from Claude Code into the LMS with correct learner-facing feedback behavior.

**Architecture:** Treat `shared/learning/underwritingQuizContent.ts` as the canonical source for both module knowledge checks. Keep the existing LMS quiz route and server scoring, but make the visible UI say "knowledge check" and render per-option feedback inline from the shared option data.

**Tech Stack:** React, TypeScript, styled-components, Outline/Fly deployment, shared LMS quiz content.

---

### Task 1: Confirm Final Content Shape

**Files:**

- Inspect: `/Users/rayowais/claude-projects/_training/underwriting-training/scripts/codex-quiz-final-june5.md`
- Inspect: `shared/learning/underwritingQuizContent.ts`

**Steps:**

1. Confirm there are two quizzes.
2. Confirm Module 1 has 8 questions.
3. Confirm Module 2 has 9 questions.
4. Confirm each question has exactly one correct answer and four options.

### Task 2: Clean Up Learner-Facing Copy

**Files:**

- Modify: `shared/learning/underwritingQuizContent.ts`
- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Steps:**

1. Remove bracketed authoring/debug markers from feedback copy.
2. Remove remaining "charge card" wording from quiz content.
3. Normalize visible quiz titles and buttons to "knowledge check."
4. Preserve stable question and option IDs so scoring and stored attempts still work.

### Task 3: Add Per-Option Feedback UI

**Files:**

- Modify: `app/scenes/UnderwritingQuiz.tsx`

**Steps:**

1. When a learner selects an option, render that option's `feedback` inline.
2. Style selected correct options green and selected incorrect options amber/red.
3. After submission, keep all correct answers visible and keep feedback visible for selected/correct options.

### Task 4: Verify and Deploy

**Commands:**

- `yarn prettier --write app/scenes/UnderwritingQuiz.tsx shared/learning/underwritingQuizContent.ts docs/plans/2026-06-05-final-knowledge-check-content.md`
- `yarn oxlint --type-aware app/scenes/UnderwritingQuiz.tsx shared/learning/underwritingQuizContent.ts`
- `yarn tsc --noEmit --pretty false`
- `yarn build`
- `~/.fly/bin/flyctl deploy -a dashfi-kb-staging`

**Production checks:**

- `curl -I https://kb.dash.fi/_health`
- `curl -I https://kb.dash.fi/learning`
- Verify deployed assets contain "Knowledge Check" and do not contain visible "Judgment check" or "charge card" quiz copy.
