# Learning Hub Navigation Tooltips And Launch QA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use build to implement this plan task-by-task.

**Goal:** Add first-time Learning Hub navigation guidance, make the top navigation buttons easier to see/use, verify skill-check answer randomization, and expand the launch smoke-test path for learner/admin/reporting flow.

**Architecture:** Keep the first-time guidance inside the shared `LearningNavigation` component so every Learning Hub page benefits from the same behavior. Preserve stable question order for QA and learners, but verify answer-option randomization for both lesson skill checks and module quizzes. Extend the existing Playwright launch QA script rather than introducing a second audit runner.

**Tech Stack:** React, styled-components, Outline route helpers, localStorage, Playwright QA script, oxlint, Vite build.

---

### Task 1: First-Time Navigation Tooltips

**Files:**
- Modify: `app/scenes/LearningNavigation.tsx`

**Steps:**
1. Add small nav help copy for each top-level Learning Hub destination.
2. Add localStorage-backed first-visit state keyed to `dashfi.learning.navigation.help.dismissed`.
3. Render a compact coachmark below the nav on first visit, with a dismiss button.
4. Add accessible `aria-label` copy to each nav link so hover/screen-reader users get the same intent.
5. Keep the coachmark non-blocking and avoid covering lesson content.

**Verification:**
- Open Learning Hub with localStorage cleared.
- Confirm coachmark appears once.
- Click dismiss.
- Reload and confirm it stays dismissed.

### Task 2: Bigger Top Navigation Buttons

**Files:**
- Modify: `app/scenes/LearningNavigation.tsx`
- Review: `app/scenes/LearningHero.tsx`

**Steps:**
1. Increase nav button height, padding, icon size, and minimum hit target.
2. Preserve one-line labels at desktop widths.
3. Let buttons wrap cleanly on smaller screens.
4. Keep `Certification Map` visually distinct with the purple treatment.

**Verification:**
- Check desktop lesson, course overview, progress, leaderboard, reporting.
- Check mobile wrap does not overflow.

### Task 3: Skill Check Answer Randomization Audit

**Files:**
- Review/modify: `app/scenes/UnderwritingLesson.tsx`
- Review/modify: `app/scenes/UnderwritingQuiz.tsx`
- Modify: `scripts/qa-underwriting-launch.mjs`

**Steps:**
1. Confirm lesson skill checks shuffle options at overlay mount.
2. Confirm module quizzes keep question order stable and shuffle answer options per attempt seed.
3. Add a static QA check that samples multiple seeds and reports whether correct answers appear across multiple option positions.
4. Keep question numbers stable for QA feedback.

**Verification:**
- Run the randomization QA script section.
- Confirm each audited question/checkpoint can place the correct answer in more than one visible position.

### Task 4: Broader Launch Smoke Test

**Files:**
- Modify: `scripts/qa-underwriting-launch.mjs`

**Steps:**
1. Add smoke checks for Learning Hub, My Progress, Leaderboard, Coaching Report, Certification Map, a lesson route, and a quiz route.
2. Assert each route loads its primary page text and nav.
3. Assert reporting surfaces attempt/failure language where applicable.
4. Preserve existing screenshot and result output paths.

**Verification:**
- Run a focused smoke pass with `QA_SMOKE_ONLY=1` against local or production base URL.
- Confirm `qa-results.md` records pass/fail findings.

### Task 5: Build, Visual QA, Deploy

**Files:**
- Modified source and script files above.

**Steps:**
1. Run targeted oxlint on changed TypeScript/TSX files.
2. Run `yarn vite:build`.
3. Use authenticated browser/CDP QA for the shared nav on production or local preview.
4. Deploy to Fly only after checks pass.
5. Verify Fly release health and the production page behavior.

**Verification:**
- Fly release is complete and one machine check passes.
- First-time coachmark and larger nav render in production.
- Smoke/randomization checks have a recorded result.
