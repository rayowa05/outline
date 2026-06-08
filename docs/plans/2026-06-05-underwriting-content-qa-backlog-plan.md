# Underwriting Training Content QA Backlog Plan

Date: 2026-06-05
Scope: Underwriting Training content QA
Mode: Audit and backlog only. No fixes without explicit approval.

## Access Rule

Do not include Chris Thurman on the QA/backlog review artifact access list.

Recommended reviewers:

- Ray Owais
- John Molnar
- Mark Brazil
- Lukas Geipel

## Audit Goal

Create a prioritized backlog of content issues across the Underwriting Training course. The audit should identify what needs to be fixed, why it matters, and where it occurs. It should not make code, quiz, slide, or script changes during the audit pass.

## Source Inputs

Use these as source-of-truth inputs:

- Production LMS at `https://kb.dash.fi/learning`
- Local course source in `/Users/rayowais/claude-projects/dashfi-lms/outline`
- Underwriting scripts and review artifacts in `/Users/rayowais/claude-projects/_training/underwriting-training`
- Final quiz content in `shared/learning/underwritingQuizContent.ts`
- Lesson content data in `app/scenes/underwritingLessonProductionData.ts`
- Gong evidence data in `app/scenes/underwritingGongEvidenceData.ts`

## QA Passes

### Pass 1: Content Accuracy

Check whether slides, narration, skill checks, quizzes, and notes are consistent with underwriting rules.

Flag:

- Incorrect underwriting guidance
- Overly deterministic claims
- Missing caveats
- Product positioning errors
- Unsupported claims about Net One, float, KYC, KYB, bank connection, documents, guarantees, credit checks, or terms

### Pass 2: Script And Slide Alignment

Compare the lesson transcript/talk track to the visible slide state.

Flag:

- Slide appears too early or too late
- Slide does not match what the narrator is explaining
- Missing tactic/step/signal slides
- Visual box content contradicts or distracts from the narration
- Dead space or layout that hides learning content

### Pass 3: Gong Clip Alignment

Check Gong clip timing and framing.

Flag:

- Narrator gets cut off before or after a Gong clip
- Gong ID is spoken aloud
- Clip starts too late or too early
- Clip ends before the rep/customer finishes the intended statement
- Video exposes customer-sensitive information that should be script-only

### Pass 4: Quiz And Skill Check Clarity

Check every knowledge check and embedded skill check.

Flag:

- Ambiguous question stems
- Overlapping answer options
- Randomization/numbering issues
- Correct answer not clearly tied to training
- Feedback that does not explain why an answer is right or wrong
- Banned terminology such as `charge card`

Use question IDs or question stems, not randomized question numbers.

### Pass 5: Learner Experience

Check whether a new learner can understand what to do and why.

Flag:

- Missing learner clarity before quizzes
- Unclear pass/fail implications
- Missing next-step buttons
- Notes not visible or not saved by module
- Confusing labels or navigation
- Mobile/desktop layout issues that affect comprehension

## Backlog Format

Each finding should use this format:

| Field | Required |
|---|---|
| Severity | Critical, High, Medium, Low |
| Area | Lesson, slide, Gong clip, skill check, quiz, UI, reporting |
| Location | Module, lesson, timestamp, quiz ID/question stem |
| Issue | What is wrong |
| Evidence | What was observed |
| Standard | Which standard it violates |
| Recommended Fix | What should change |
| Status | Backlog, Ready to fix, Needs Ray, Fixed, Verified |

## Severity Rules

Critical:

- Incorrect underwriting guidance
- Sensitive customer information exposed
- Quiz answer/logic wrong
- Learner blocked from progressing

High:

- Slide and narration mismatch that harms learning
- Gong timing cuts off important context
- Quiz ambiguity likely to confuse competent learners

Medium:

- Visual polish or copy issue that reduces clarity but does not change meaning
- Missing reinforcement slide

Low:

- Minor copy, spacing, or consistency issue

## Output Artifacts

Create:

1. `underwriting-content-qa-backlog-2026-06-05.md`
2. Optional screenshot folder if visual QA is run:
   - `reviews/content-qa-2026-06-05/screenshots/`
3. Optional summary:
   - `reviews/content-qa-2026-06-05/qa-summary.md`

## Stop Rule

Do not fix anything during this audit pass. The output is a backlog only.
