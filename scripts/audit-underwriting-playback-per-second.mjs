import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(__dirname, "..");
const trainingRoot = path.resolve(repoRoot, "../../_training/underwriting-training");
const qaDate = process.env.UNDERWRITING_QA_DATE ?? "2026-06-07";
const reviewRoot = path.join(trainingRoot, "reviews", `playback-audit-${qaDate}`);
const rawRoot = path.join(reviewRoot, "raw-screenshots");
const evidenceRoot = path.join(reviewRoot, "failure-evidence");
const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const keepRaw = process.env.QA_KEEP_RAW === "1";
const sampleIntervalMs = Number(process.env.QA_SAMPLE_INTERVAL_MS ?? "1000");
const playbackRate = Number(process.env.QA_PLAYBACK_RATE ?? "1");
const maxSeconds = Number(process.env.QA_MAX_SECONDS ?? "0");
const selectedLessons = parseLessonSelection(process.env.QA_LESSONS);
const viewportProfiles = (process.env.QA_VIEWPORTS ?? "desktop")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const viewports = {
  desktop: { width: 1365, height: 900, deviceScaleFactor: 1, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
};

function loadTsExports(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({
    console,
    exports: module.exports,
    module,
    require,
  });
  vm.runInContext(transpiled, context, { filename: absolutePath });
  return module.exports;
}

const { underwritingCourse } = loadTsExports("app/scenes/learningData.ts");
const { underwritingLessonProductionData } = loadTsExports(
  "app/scenes/underwritingLessonProductionData.ts"
);
const {
  underwritingGongEvidenceBySection,
  underwritingGongNarrationSkipsByLesson,
} = loadTsExports("app/scenes/underwritingGongEvidenceData.ts");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function parseLessonSelection(value) {
  if (!value) {
    return null;
  }
  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function getPlayableLessons() {
  return underwritingCourse.modules.flatMap((module) =>
    module.lessons
      .filter((lesson) => lesson.kind !== "quiz")
      .map((lesson) => ({
        lesson,
        lessonKey: `${module.number}-${lesson.number}`,
        module,
        production:
          underwritingLessonProductionData[`${module.number}-${lesson.number}`],
      }))
      .filter((item) => {
        if (!selectedLessons) {
          return true;
        }
        return (
          selectedLessons.has(item.lessonKey) ||
          selectedLessons.has(`module-${item.module.number}/lesson-${item.lesson.number}`)
        );
      })
  );
}

function getLessonGongEvidence(lessonKey) {
  return Object.entries(underwritingGongEvidenceBySection)
    .filter(([key]) => key.startsWith(`${lessonKey}:`))
    .flatMap(([, clips]) => clips);
}

function getActiveTimedGongClip(lessonKey, time) {
  const clips = getLessonGongEvidence(lessonKey).filter(
    (clip) =>
      clip.lessonStart !== null &&
      clip.lessonStart !== undefined &&
      clip.lessonEnd !== null &&
      clip.lessonEnd !== undefined
  );
  return clips
    .filter((clip) => time >= clip.lessonStart - 0.1 && time <= clip.lessonEnd + 0.1)
    .sort((a, b) => b.lessonStart - a.lessonStart)[0];
}

function isInsideStrictGongPlaybackWindow(clip, time) {
  if (
    clip?.lessonStart === null ||
    clip?.lessonStart === undefined ||
    clip?.lessonEnd === null ||
    clip?.lessonEnd === undefined
  ) {
    return false;
  }
  return time >= clip.lessonStart + 0.75 && time <= clip.lessonEnd - 0.5;
}

function getActiveNarrationSkip(lessonKey, time) {
  return (underwritingGongNarrationSkipsByLesson[lessonKey] ?? []).find(
    (skip) => time >= skip.start && time <= skip.end
  );
}

function getActiveSection(production, time) {
  return (production.sections ?? []).find(
    (section) => time >= section.start && time < section.end
  );
}

function getExpectedAt(lessonKey, production, time) {
  const gongClip = getActiveTimedGongClip(lessonKey, time);
  const section = getActiveSection(production, time);
  const skip = getActiveNarrationSkip(lessonKey, time);
  return {
    gongClip,
    section,
    skip,
    title:
      gongClip?.topic ??
      gongClip?.label ??
      section?.stageTitle ??
      section?.title ??
      "",
  };
}

async function authenticate(page) {
  await page.goto(`${baseUrl}/auth/dev-ray`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
}

async function prepareLesson(page, item) {
  const introKey = `dashfi.learning.underwriting.lesson-intro.${item.lessonKey}`;
  await page.goto(`${baseUrl}/learning/underwriting-training/module-${item.module.number}/lesson-${item.lesson.number}?review=1`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  await page.evaluate((key) => {
    window.localStorage.setItem(key, "dismissed");
  }, introKey);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
  await page.waitForSelector("[data-testid='lesson-audio'], [data-testid='lesson-video']", {
    state: "attached",
    timeout: 30_000,
  });
  await page.evaluate((rate) => {
    document.querySelectorAll("audio, video").forEach((media) => {
      media.playbackRate = rate;
    });
  }, playbackRate);
}

async function resetScrollPosition(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
      document.scrollingElement.scrollLeft = 0;
    }
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    document.querySelectorAll("*").forEach((element) => {
      if (element.scrollTop > 0) {
        element.scrollTop = 0;
      }
      if (element.scrollLeft > 0) {
        element.scrollLeft = 0;
      }
    });
  });
}

async function startPlayback(page) {
  const playButton = page.getByRole("button", { name: /play lesson/i });
  if ((await playButton.count()) > 0) {
    await playButton.click({ timeout: 10_000 });
  } else {
    await page.evaluate(() => {
      const media = document.querySelector("[data-testid='lesson-audio'], [data-testid='lesson-video']");
      return media?.play();
    });
  }
  await page.waitForTimeout(500);
  await resetScrollPosition(page);
}

async function collectState(page) {
  return page.evaluate(() => {
    const player = document.querySelector("[data-testid='lesson-player']");
    const stage = document.querySelector("[data-testid='lesson-stage-body']");
    const visual = document.querySelector("[data-testid='lesson-stage-visual']");
    const primary = document.querySelector("[data-testid='lesson-audio'], [data-testid='lesson-video']");
    const playerRect = player?.getBoundingClientRect();
    const media = Array.from(document.querySelectorAll("audio, video")).map((item) => {
      const rect = item.getBoundingClientRect();
      const style = window.getComputedStyle(item);
      return {
        controls: item.hasAttribute("controls"),
        currentTime: Number(item.currentTime.toFixed(3)),
        duration: Number.isFinite(item.duration) ? Number(item.duration.toFixed(3)) : null,
        ended: item.ended,
        gong: item.getAttribute("data-gong-media") === "true",
        height: Number(rect.height.toFixed(1)),
        muted: item.muted,
        paused: item.paused,
        src: item.currentSrc || item.getAttribute("src") || "",
        tag: item.tagName.toLowerCase(),
        testid: item.getAttribute("data-testid") ?? "",
        visible:
          rect.width > 2 &&
          rect.height > 2 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0,
        width: Number(rect.width.toFixed(1)),
      };
    });
    const overflowing = Array.from(player?.querySelectorAll("*") ?? [])
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
        return {
          childElementCount: element.childElementCount,
          display: style.display,
          height: Number(rect.height.toFixed(1)),
          outsidePlayer: playerRect
            ? rect.left < playerRect.left - 2 ||
              rect.right > playerRect.right + 2 ||
              rect.top < playerRect.top - 2 ||
              rect.bottom > playerRect.bottom + 2
            : false,
          overflowX: element.scrollWidth > element.clientWidth + 2,
          overflowY: element.scrollHeight > element.clientHeight + 2,
          tag: element.tagName.toLowerCase(),
          text: text.slice(0, 160),
          width: Number(rect.width.toFixed(1)),
        };
      })
      .filter((item) => {
        if (!item.text || item.display === "none") {
          return false;
        }
        const isTextLeaf =
          item.childElementCount === 0 ||
          ["button", "h1", "h2", "h3", "h4", "li", "p", "span", "strong"].includes(item.tag);
        return isTextLeaf && (item.overflowX || item.overflowY || item.outsidePlayer);
      })
      .slice(0, 12);
    return {
      bodyText: document.body.innerText ?? "",
      checkpointOverlayVisible: Boolean(document.querySelector("[data-testid='lesson-checkpoint-overlay']")),
      media,
      overflowing,
      playerText: player?.innerText ?? "",
      primary: primary
        ? {
            currentTime: Number(primary.currentTime.toFixed(3)),
            duration: Number.isFinite(primary.duration)
              ? Number(primary.duration.toFixed(3))
              : null,
            ended: primary.ended,
            paused: primary.paused,
            src: primary.currentSrc || primary.getAttribute("src") || "",
          }
        : null,
      stageText: stage?.innerText ?? "",
      title: document.title,
      url: window.location.href,
      visualText: visual?.innerText ?? "",
    };
  });
}

function evaluateSample({
  elapsedSecond,
  expected,
  previousState,
  screenshotPath,
  state,
  strictGongPlaybackExpected,
}) {
  const findings = [];
  const playerText = state.playerText || "";
  const visibleText = [state.playerText, state.stageText, state.visualText]
    .filter(Boolean)
    .join("\n");
  const lowerPlayerText = playerText.toLowerCase();
  const lowerVisibleText = visibleText.toLowerCase();
  const primary = state.primary;
  const renderedGong = state.media.filter((item) => item.gong);
  const visibleGong = renderedGong.filter((item) => item.visible);
  const playingGong = renderedGong.filter((item) => !item.paused && !item.ended);
  const activeMedia = playingGong[0] ?? (!primary?.paused ? primary : null);

  if (!primary) {
    findings.push(finding("fail", "Primary lesson media exists", "No lesson audio/video element found."));
  }

  if (!activeMedia && !primary?.ended) {
    findings.push(
      finding(
        "fail",
        "Playback continues",
        "Neither narration nor Gong media was playing during the sample."
      )
    );
  }

  if (previousState?.primary && primary && !expected.gongClip && !expected.skip) {
    const delta = primary.currentTime - previousState.primary.currentTime;
    if (!primary.paused && delta < 0.25 / Math.max(1, playbackRate)) {
      findings.push(
        finding(
          "fail",
          "Narration time advances",
          `Primary media advanced only ${delta.toFixed(3)}s since previous sample.`
        )
      );
    }
  }

  if (expected.gongClip) {
    const displayMode = expected.gongClip.displayMode ?? "video";
    const talkTrackVisible =
      displayMode === "talkTrack" &&
      lowerVisibleText.includes("talk track") &&
      lowerVisibleText
        .includes((expected.gongClip.approvedText ?? expected.gongClip.prime ?? "").slice(0, 18).toLowerCase());

    if (strictGongPlaybackExpected && !renderedGong.length) {
      findings.push(
        finding(
          "fail",
          "Expected Gong media rendered",
          `${expected.gongClip.label} should be active but no Gong media element was found.`
        )
      );
    }
    if (strictGongPlaybackExpected && !playingGong.length) {
      findings.push(
        finding(
          "fail",
          "Expected Gong media playing",
          `${expected.gongClip.label} should be playing at this timestamp.`
        )
      );
    }
    if (strictGongPlaybackExpected && displayMode === "video" && !visibleGong.length) {
      findings.push(
        finding(
          "fail",
          "Expected Gong video visible",
          `${expected.gongClip.label} is a video clip but no visible Gong video was found.`
        )
      );
    }
    if (strictGongPlaybackExpected && displayMode === "talkTrack" && !talkTrackVisible) {
      findings.push(
        finding(
          "fail",
          "Expected Gong talk track visible",
          `${expected.gongClip.label} is a talk-track clip but the visible transcript card was not detected.`
        )
      );
    }
    if (
      !lowerVisibleText
        .includes((expected.gongClip.topic ?? expected.gongClip.label).slice(0, 18).toLowerCase())
    ) {
      findings.push(
        finding(
          "review",
          "Gong visual context",
          `Expected visible Gong context for "${expected.gongClip.topic ?? expected.gongClip.label}".`
        )
      );
    }
  } else if (visibleGong.length && !expected.skip) {
    findings.push(
      finding(
        "review",
        "Unexpected Gong media visible",
        `Gong media is visible outside an expected Gong window: ${visibleGong
          .map((item) => path.basename(item.src))
          .join(", ")}`
      )
    );
  }

  if (expected.title && !lowerVisibleText.includes(expected.title.toLowerCase())) {
    findings.push(
      finding(
        "review",
        "Slide timing/title",
        `Expected visible title/context "${expected.title}" at ${elapsedSecond}s.`
      )
    );
  }

  const rawIds = playerText.match(/\b\d{16,}\b/g) ?? [];
  if (rawIds.length) {
    findings.push(
      finding("fail", "No raw Gong IDs", `Visible player text includes raw IDs: ${rawIds.join(", ")}`)
    );
  }

  if (lowerPlayerText.includes("judgment check")) {
    findings.push(finding("fail", "Knowledge check naming", "Visible text still says Judgment Check."));
  }

  if (lowerPlayerText.includes("charge card")) {
    findings.push(finding("fail", "No charge-card wording", "Visible text still says charge card."));
  }

  const visibleNativeGongControls = state.media.filter(
    (item) => item.gong && item.visible && item.controls
  );
  if (visibleNativeGongControls.length) {
    findings.push(
      finding(
        "fail",
        "No Gong native controls",
        "Visible embedded Gong media is showing native controls."
      )
    );
  }

  if (state.overflowing.length) {
    findings.push(
      finding(
        "review",
        "Visual overflow",
        state.overflowing.map((item) => `${item.tag}: ${item.text}`).join(" | ")
      )
    );
  }

  if (!state.stageText.trim() && !expected.gongClip) {
    findings.push(finding("review", "Slide visual exists", "Stage body was empty."));
  }

  return findings.map((item) => ({
    ...item,
    elapsedSecond,
    expectedTitle: expected.title,
    screenshotPath,
  }));
}

function finding(severity, check, detail) {
  return { check, detail, severity };
}

async function auditLesson(page, viewportName, item) {
  if (!item.production?.media) {
    return {
      findings: [
        finding("fail", "Production media exists", "Lesson has no production media attached."),
      ],
      lessonKey: item.lessonKey,
      lessonTitle: item.lesson.title,
      moduleTitle: item.module.title,
      sampleCount: 0,
      viewport: viewportName,
    };
  }

  const lessonSlug = `m${item.module.number}-l${item.lesson.number}-${slug(item.lesson.title)}`;
  const rawDir = path.join(rawRoot, viewportName, lessonSlug);
  const evidenceDir = path.join(evidenceRoot, viewportName, lessonSlug);
  ensureDir(rawDir);
  ensureDir(evidenceDir);
  await prepareLesson(page, item);
  await startPlayback(page);

  const findings = [];
  const samples = [];
  let previousState = null;
  const startedAt = Date.now();
  const totalDuration = item.production.sections.at(-1)?.end ?? 0;
  const auditLimit = maxSeconds > 0 ? Math.min(maxSeconds, totalDuration + 8) : totalDuration + 8;

  for (let elapsedSecond = 0; elapsedSecond <= auditLimit; elapsedSecond += 1) {
    if (elapsedSecond > 0) {
      const targetTime = startedAt + elapsedSecond * sampleIntervalMs;
      const waitMs = Math.max(0, targetTime - Date.now());
      await page.waitForTimeout(waitMs);
    }

    await resetScrollPosition(page);
    await page.evaluate((rate) => {
      document.querySelectorAll("audio, video").forEach((media) => {
        media.playbackRate = rate;
      });
    }, playbackRate);

    const state = await collectState(page);
    const currentTime = state.primary?.currentTime ?? elapsedSecond;
    const expected = getExpectedAt(item.lessonKey, item.production, currentTime);
    const strictGongPlaybackExpected = isInsideStrictGongPlaybackWindow(
      expected.gongClip,
      currentTime
    );
    const rawPath = path.join(rawDir, `${String(elapsedSecond).padStart(4, "0")}-${currentTime.toFixed(1)}s.png`);
    await page.screenshot({ path: rawPath, fullPage: false });
    const sampleFindings = evaluateSample({
      elapsedSecond,
      expected,
      previousState,
      screenshotPath: rawPath,
      state,
      strictGongPlaybackExpected,
    });

    if (sampleFindings.length) {
      const evidencePath = path.join(evidenceDir, path.basename(rawPath));
      fs.copyFileSync(rawPath, evidencePath);
      for (const sampleFinding of sampleFindings) {
        findings.push({
          ...sampleFinding,
          screenshotPath: evidencePath,
        });
      }
    }

    samples.push({
      elapsedSecond,
      expectedTitle: expected.title,
      gongLabel: expected.gongClip?.label ?? "",
      primaryTime: state.primary?.currentTime ?? null,
      primaryPaused: state.primary?.paused ?? null,
      visibleGongCount: state.media.filter((media) => media.gong && media.visible).length,
      renderedGongCount: state.media.filter((media) => media.gong).length,
      playingGongCount: state.media.filter((media) => media.gong && !media.paused).length,
    });

    previousState = state;
    if (state.primary?.ended || state.primary?.currentTime >= totalDuration - 0.25) {
      break;
    }
  }

  if (!keepRaw) {
    fs.rmSync(rawDir, { force: true, recursive: true });
  }

  return {
    findings,
    lessonKey: item.lessonKey,
    lessonTitle: item.lesson.title,
    moduleTitle: item.module.title,
    sampleCount: samples.length,
    samples,
    viewport: viewportName,
  };
}

function writeReports(results) {
  ensureDir(reviewRoot);
  const jsonPath = path.join(reviewRoot, "playback-audit-results.json");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const lines = [
    "# Underwriting Playback Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Viewports: ${viewportProfiles.join(", ")}`,
    `Playback rate: ${playbackRate}`,
    `Raw screenshots kept: ${keepRaw ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    "| Viewport | Lesson | Samples | Fail | Review |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  for (const result of results) {
    const failCount = result.findings.filter((item) => item.severity === "fail").length;
    const reviewCount = result.findings.filter((item) => item.severity === "review").length;
    lines.push(
      `| ${result.viewport} | ${result.lessonKey} ${escapePipes(result.lessonTitle)} | ${result.sampleCount} | ${failCount} | ${reviewCount} |`
    );
  }

  lines.push("", "## Findings", "");
  for (const result of results) {
    lines.push(`### ${result.viewport} · ${result.lessonKey} · ${result.lessonTitle}`, "");
    if (!result.findings.length) {
      lines.push("No automated findings.", "");
      continue;
    }
    lines.push("| Severity | Second | Check | Detail | Evidence |");
    lines.push("| --- | ---: | --- | --- | --- |");
    for (const item of result.findings) {
      lines.push(
        `| ${item.severity} | ${item.elapsedSecond ?? ""} | ${escapePipes(item.check)} | ${escapePipes(item.detail)} | ${item.screenshotPath ? path.relative(reviewRoot, item.screenshotPath) : ""} |`
      );
    }
    lines.push("");
  }

  const mdPath = path.join(reviewRoot, "playback-audit-results.md");
  fs.writeFileSync(mdPath, lines.join("\n"));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

function escapePipes(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function run() {
  ensureDir(reviewRoot);
  ensureDir(evidenceRoot);
  if (keepRaw) {
    ensureDir(rawRoot);
  }

  const lessons = getPlayableLessons();
  if (!lessons.length) {
    throw new Error("No lessons selected for playback audit.");
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewportName of viewportProfiles) {
      const viewport = viewports[viewportName];
      if (!viewport) {
        throw new Error(`Unknown viewport: ${viewportName}`);
      }
      const context = await browser.newContext({
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        viewport: { height: viewport.height, width: viewport.width },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      await authenticate(page);
      for (const item of lessons) {
        console.log(`Auditing ${viewportName} ${item.lessonKey} ${item.lesson.title}`);
        results.push(await auditLesson(page, viewportName, item));
        writeReports(results);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (!keepRaw && fs.existsSync(rawRoot)) {
    fs.rmSync(rawRoot, { force: true, recursive: true });
  }
  writeReports(results);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
