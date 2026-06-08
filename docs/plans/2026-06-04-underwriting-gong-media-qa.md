# Underwriting Gong Media QA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use build to implement this plan task-by-task.

**Goal:** Prove every Module 1-2 narration asset and Module 2 Gong evidence clip is embedded, exportable, playable, timed correctly, and reviewable, then fix every defect found.

**Architecture:** Keep QA tooling additive and isolated from learner runtime until a concrete failure requires a runtime fix. Generate a dated review bundle containing original media, converted WAVs, screenshots, JSON/Markdown findings, and a zip for Ray's audit. Use repeatable automated checks first, then browser runtime checks for visual playback/timing.

**Tech Stack:** Node ESM scripts, TypeScript transpile via `typescript`, Playwright, ffmpeg, existing underwriting lesson data, local public training media.

---

### Task 1: Inventory And Export Bundle

**Files:**
- Create: `scripts/audit-underwriting-gong-media.mjs`
- Output: `../_training/underwriting-training/reviews/gong-media-qa-2026-06-04/`

**Steps:**
1. Load `app/scenes/underwritingGongEvidenceData.ts`, `app/scenes/underwritingLessonProductionData.ts`, and `app/scenes/learningData.ts`.
2. Inventory all Module 1-2 lesson narration WAVs, captions, and AAF timelines.
3. Inventory every embedded Gong media segment, including split clips.
4. Copy originals into the review bundle.
5. Convert every Gong MP3/MP4 to mono 16 kHz WAV for transcription/audibility review.
6. Write `manifest.json`, `manifest.md`, and `underwriting-gong-media-export-2026-06-04.zip`.

**Pass Criteria:**
- Every referenced file exists.
- Every exported audio file converts to WAV.
- Every audio-bearing file has measurable non-zero duration and does not appear silent.
- Approved/disqualified source status is reconciled with embedded clips.

### Task 2: Automated Media Integrity And Timing Audit

**Files:**
- Modify: `scripts/audit-underwriting-gong-media.mjs`

**Steps:**
1. Measure media duration with ffmpeg.
2. Parse configured Gong timestamps and lesson insertion windows.
3. Flag missing posters for visible video clips.
4. Flag suspicious duration mismatches for non-edited clips.
5. Flag embedded clips sourced from disqualified selections.
6. Flag approved selections with no embedded equivalent.

**Pass Criteria:**
- No missing media.
- No conversion failures.
- No disqualified clip embedded.
- Every embedded Gong clip has a lesson insertion point and a media file.

### Task 3: Browser Runtime Playback Audit

**Files:**
- Modify: `scripts/audit-underwriting-gong-media.mjs`
- Existing reference: `scripts/qa-underwriting-launch.mjs`

**Steps:**
1. Launch Playwright against `QA_BASE_URL` or local `localhost:3000`.
2. Visit every Module 2 lesson with Gong evidence.
3. Seek to each Gong insertion point in review mode and screenshot the frame.
4. In learner mode, start playback just before each insertion point.
5. Verify lesson narration pauses, Gong media begins playing, media `currentTime` advances, and visual/talk-track mode matches the data.
6. For clips short enough to wait safely, verify lesson narration resumes after Gong media ends.

**Pass Criteria:**
- Every Gong insertion renders the expected Gong board.
- Every Gong media element can start and advance in browser playback.
- No visible native controls are shown inside the custom player.
- Lesson resumes after the clip where runtime wait is feasible.

### Task 4: Fix Failures

**Files:**
- Modify only files implicated by findings, expected candidates:
  - `app/scenes/UnderwritingLesson.tsx`
  - `app/scenes/underwritingGongEvidenceData.ts`
  - `public/training/underwriting/gong-clips/*`

**Steps:**
1. Fix missing or wrong media references.
2. Fix disqualified or unapproved clip references.
3. Fix Gong card text/layout overflow.
4. Fix playback/timing transition bugs.
5. Re-run Tasks 1-3.

**Pass Criteria:**
- Fresh QA run has no hard failures.
- Remaining review notes are explicitly editorial/content-only, not playback, embedding, export, or layout defects.

### Task 5: Final Report

**Files:**
- Output: `../_training/underwriting-training/reviews/gong-media-qa-2026-06-04/qa-summary.md`

**Steps:**
1. Summarize what was audited.
2. List what passed.
3. List defects fixed.
4. List remaining items that need Ray/editorial review, if any.
5. Link the export bundle and report files.

**Pass Criteria:**
- Ray can open one folder/zip and audit the exact media, WAV conversions, screenshots, and findings.
