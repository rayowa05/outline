# Underwriting LMS Deployment Readiness

## Launch Preconditions

- Confirm authenticated browser QA is available. If Chrome DevTools cannot attach or the page only loads the login screen, visual QA is blocked and must be escalated before launch.
- For local QA, do not require manual login through `localhost`. Local development should use the guarded localhost auth bypass (`LOCALHOST_AUTH_BYPASS=true`, `LOCALHOST_AUTH_BYPASS_EMAIL=ray@dash.fi`) so visual QA can be run without repeated login failures.
- Run source/static checks: `yarn oxlint`, `yarn tsc -p tsconfig.json --noEmit`, and `yarn build`.
- Probe LMS routes for module map, each lesson, both quizzes, reporting, leaderboard, and progress pages.
- Confirm Module 1 and Module 2 quiz gates require 100% before the next module unlocks.
- Confirm learner mode cannot scrub forward in lessons. Final QA can still use `?review=1`.
- Confirm Module 1 quiz pass shows the next-module CTA, Module 2 quiz pass shows the next-module CTA, and final Module 3 completion shows course completion celebration.
- Confirm failed quizzes require a full retake and create a persisted failed attempt.
- Confirm reporting shows quiz attempts and quiz failures/retries per learner.
- Confirm module notes persist per module and remain visible in the module quiz.
- Confirm production migrations for learning assignments, quiz attempts, and module notes have run before assigning reps.

## Deployment Steps

1. Run final local QA in an authenticated browser session.
2. Export or capture final screenshots for Module 1 quiz, Module 2 quiz, Lesson 5, Lesson 6, and Module 3 completion.
3. Run final build/type/lint checks.
4. Run database migrations in the deployment environment.
5. Deploy the LMS code to `kb.dash.fi`.
6. Smoke test as an admin and as a learner.
7. Assign the underwriting course to the launch audience.
8. Send the initial email invitation after the admin smoke test passes.
9. Monitor reporting for assignment creation, starts, quiz failures, and completions.

## Backlog

- Recalculate module map durations after extended Gong clips. The current module durations are stale because learner time now includes inserted Gong call media.
- Build a duration audit that sums lesson narration, inserted Gong media, workflow videos, required quiz estimates, and job aid time.
- Build email invitation launch flow using the existing Outline learning reminder foundation.
- Add Slack notifications and reminders after email launch is stable.
- Add post-deployment retro checklist for any LMS changes that could affect non-underwriting pages.
- Add richer reporting filters for quiz failure count by module, learner, manager, and cohort.
- Add visual regression screenshots for key LMS routes once authenticated browser capture is stable.

## QA Items To Test Manually

- Learner cannot drag the timeline forward past watched time.
- Learner cannot click a future Lesson Path row to jump ahead.
- Learner can replay already-watched sections.
- `?review=1` allows final QA seeking and section jumping.
- Module 1 quiz pass unlocks Module 2 and shows “Go to next module.”
- Module 2 quiz pass unlocks Module 3 and shows “Go to next module.”
- Module 3 final lesson completion shows course-complete celebration.
- Reporting increments failed quiz count after each failed submission.
- Reporting exports quiz attempts and quiz failures in CSV.
