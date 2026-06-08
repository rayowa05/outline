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
const qaDate = process.env.UNDERWRITING_QA_DATE ?? "2026-06-05";
const reviewRoot = path.resolve(
  repoRoot,
  `../../_training/underwriting-training/reviews/launch-qa-${qaDate}`
);
const screenshotRoot = path.join(reviewRoot, "screenshots");
const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const passes = Number(process.env.QA_PASSES ?? "3");
const smokeOnly = process.env.QA_SMOKE_ONLY === "1";
const randomizationOnly = process.env.QA_RANDOMIZATION_ONLY === "1";
const skipBrowserQa = process.env.QA_SKIP_BROWSER === "1";
const modulesToAudit = (process.env.QA_MODULES ?? "1,2")
  .split(",")
  .map((item) => Number(item.trim()))
  .filter(Number.isFinite);
const viewportProfiles = (process.env.QA_VIEWPORTS ?? "desktop")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const viewports = {
  desktop: { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
};
const rawIdPattern = /\b\d{16,}\b/g;

function loadTsExports(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({
    exports: module.exports,
    module,
    require,
    console,
  });
  vm.runInContext(transpiled, context, { filename: absolutePath });
  return module.exports;
}

const {
  underwritingLessonProductionData,
} = loadTsExports("app/scenes/underwritingLessonProductionData.ts");
const {
  underwritingGongEvidenceBySection,
  underwritingGongNarrationSkipsByLesson,
} = loadTsExports("app/scenes/underwritingGongEvidenceData.ts");
const { underwritingCourse } = loadTsExports("app/scenes/learningData.ts");
const { underwritingQuizzes } = loadTsExports(
  "shared/learning/underwritingQuizContent.ts"
);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function seededRandom(seed) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;

    return ((hash >>> 0) % 1000000) / 1000000;
  };
}

function shuffleBySeed(items, seed) {
  const random = seededRandom(seed);
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function optionLabel(index) {
  return String.fromCharCode(65 + index);
}

function collectCorrectPositionSpread(options, seedFactory, sampleCount = 80) {
  const positions = new Map();

  for (let index = 0; index < sampleCount; index += 1) {
    const displayOptions = shuffleBySeed(options, seedFactory(index));
    const correctIndex = displayOptions.findIndex((option) => option.correct);
    const label = optionLabel(correctIndex);
    positions.set(label, (positions.get(label) ?? 0) + 1);
  }

  return Object.fromEntries([...positions.entries()].sort());
}

function evaluatePositionSpread(spread, optionCount) {
  const visiblePositions = Object.keys(spread).length;

  if (visiblePositions <= 1) {
    return {
      severity: "fail",
      check: "Answer option randomization",
      detail: `Correct answer appeared in only ${visiblePositions} position across sampled attempts: ${JSON.stringify(spread)}`,
    };
  }

  if (optionCount >= 4 && visiblePositions < 3) {
    return {
      severity: "review",
      check: "Answer option randomization spread",
      detail: `Correct answer appeared in ${visiblePositions} positions across sampled attempts: ${JSON.stringify(spread)}`,
    };
  }

  return null;
}

function parseSrtTime(value) {
  const match = value.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) {
    return 0;
  }
  const [, hours, minutes, seconds, millis] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis) / 1000
  );
}

function parseSrt(publicPath) {
  if (!publicPath) {
    return [];
  }
  const absolutePath = path.join(repoRoot, "public", publicPath.replace(/^\//, ""));
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  return source
    .split(/\n\s*\n/g)
    .map((block) => {
      const lines = block.trim().split(/\r?\n/);
      const timing = lines.find((line) => line.includes("-->"));
      if (!timing) {
        return null;
      }
      const [startRaw, endRaw] = timing.split("-->").map((item) => item.trim());
      return {
        start: parseSrtTime(startRaw),
        end: parseSrtTime(endRaw),
        text: lines
          .slice(lines.indexOf(timing) + 1)
          .join(" ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      };
    })
    .filter(Boolean);
}

function captionWindow(captions, time) {
  return captions
    .filter((caption) => caption.end >= time - 4 && caption.start <= time + 4)
    .map((caption) => `[${caption.start.toFixed(1)}-${caption.end.toFixed(1)}] ${caption.text}`)
    .join(" ");
}

function getLesson(moduleNumber, lessonNumber) {
  const module = underwritingCourse.modules.find((item) => item.number === moduleNumber);
  const lesson = module?.lessons.find((item) => item.number === lessonNumber);
  return { module, lesson };
}

function getLessonEvents(lessonKey, production) {
  const events = [];
  const captions = parseSrt(production.media?.captionsSrc);

  production.sections.forEach((section, index) => {
    events.push({
      type: "section-start",
      id: section.id,
      label: `S${index + 1} ${section.title}`,
      time: section.start + 0.2,
      expectedTitle: section.stageTitle,
      expectedCopy: section.stageCopy,
      expectedKind: section.kind,
      scriptWindow: captionWindow(captions, section.start + 0.2),
    });

    const mid = section.start + Math.max(0.5, Math.min(8, (section.end - section.start) / 2));
    events.push({
      type: "section-mid",
      id: `${section.id}-mid`,
      label: `S${index + 1} midpoint`,
      time: mid,
      expectedTitle: section.stageTitle,
      expectedCopy: section.stageCopy,
      expectedKind: section.kind,
      scriptWindow: captionWindow(captions, mid),
    });

    const clips = underwritingGongEvidenceBySection[`${lessonKey}:${section.id}`] ?? [];
    clips.forEach((clip, clipIndex) => {
      const clipTime = clip.lessonStart ?? section.start + 0.4;
      events.push({
        type: "gong",
        id: `${section.id}-gong-${clipIndex + 1}`,
        label: clip.label,
        time: clipTime + 0.08,
        clip,
        expectedTitle: clip.topic ?? clip.label,
        expectedCopy: clip.prime,
        expectedKind: section.kind,
        scriptWindow: captionWindow(captions, clipTime),
      });
      if (clip.lessonEnd != null) {
        events.push({
          type: "gong-resume",
          id: `${section.id}-gong-${clipIndex + 1}-resume`,
          label: `${clip.label} resume`,
          time: clip.lessonEnd + 0.12,
          clip,
          expectedKind: section.kind,
          scriptWindow: captionWindow(captions, clip.lessonEnd + 0.12),
        });
      }
    });
  });

  (production.checkpoints ?? []).forEach((checkpoint, index) => {
    events.push({
      type: "checkpoint-review",
      id: checkpoint.id,
      label: `Checkpoint ${index + 1}: ${checkpoint.label}`,
      time: Math.max(0, checkpoint.placement - 0.1),
      checkpoint,
      scriptWindow: captionWindow(captions, checkpoint.placement),
    });
  });

  (underwritingGongNarrationSkipsByLesson[lessonKey] ?? []).forEach((skip, index) => {
    events.push({
      type: "skip-window",
      id: `skip-${index + 1}`,
      label: skip.reason,
      time: skip.start + 0.1,
      skip,
      scriptWindow: captionWindow(captions, skip.start + 0.1),
    });
  });

  return events
    .filter((event) => Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);
}

async function waitForLessonReady(page) {
  await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
  await page.waitForFunction(() => typeof window.__uwReviewSeek === "function", null, {
    timeout: 30_000,
  });
}

async function seekReview(page, time) {
  await page.evaluate((targetTime) => {
    window.__uwReviewSeek?.(targetTime);
  }, time);
  await page.waitForTimeout(500);
}

async function collectState(page) {
  return page.evaluate(() => {
    const player = document.querySelector("[data-testid='lesson-player']");
    const stage = document.querySelector("[data-testid='lesson-stage-body']");
    const visual = document.querySelector("[data-testid='lesson-stage-visual']");
    const text = player?.innerText ?? "";
    const bodyText = document.body.innerText ?? "";
    const media = Array.from(
      document.querySelectorAll("audio, video")
    ).map((item) => {
      const rect = item.getBoundingClientRect();
      const style = window.getComputedStyle(item);
      return {
        tag: item.tagName.toLowerCase(),
        testid: item.getAttribute("data-testid"),
        gong: item.getAttribute("data-gong-media") === "true",
        controls: item.hasAttribute("controls"),
        paused: item.paused,
        ended: item.ended,
        currentTime: Number(item.currentTime.toFixed(3)),
        duration: Number.isFinite(item.duration)
          ? Number(item.duration.toFixed(3))
          : null,
        src: item.currentSrc || item.getAttribute("src") || "",
        visible:
          rect.width > 2 &&
          rect.height > 2 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity) !== 0,
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
      };
    });
    const overflowing = Array.from(
      player?.querySelectorAll("*") ?? []
    )
      .map((item) => {
        const rect = item.getBoundingClientRect();
        const style = window.getComputedStyle(item);
        return {
          tag: item.tagName.toLowerCase(),
          childElementCount: item.childElementCount,
          text: (item.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
          overflowX: item.scrollWidth > item.clientWidth + 2,
          overflowY: item.scrollHeight > item.clientHeight + 2,
          outsidePlayer:
            rect.left < player.getBoundingClientRect().left - 2 ||
            rect.right > player.getBoundingClientRect().right + 2 ||
            rect.top < player.getBoundingClientRect().top - 2 ||
            rect.bottom > player.getBoundingClientRect().bottom + 2,
          display: style.display,
          position: style.position,
          width: Number(rect.width.toFixed(1)),
          height: Number(rect.height.toFixed(1)),
        };
      })
      .filter((item) => {
        if (!item.text || item.display === "none") {
          return false;
        }
        const textElement =
          item.childElementCount === 0 ||
          ["p", "h1", "h2", "h3", "h4", "strong", "span", "button", "li"].includes(item.tag);
        if (!textElement) {
          return false;
        }
        return item.overflowX || item.overflowY || item.outsidePlayer;
      })
      .slice(0, 12);
    return {
      url: window.location.href,
      title: document.title,
      playerText: text,
      bodyRawIds: bodyText.match(/\b\d{16,}\b/g) ?? [],
      playerRawIds: text.match(/\b\d{16,}\b/g) ?? [],
      stageText: stage?.innerText ?? "",
      visualText: visual?.innerText ?? "",
      media,
      overflowing,
      reviewModeVisible: Boolean(document.querySelector("[data-testid='lesson-review-mode']")),
      checkpointOverlayVisible: Boolean(document.querySelector("[data-testid='lesson-checkpoint-overlay']")),
    };
  });
}

function evaluateEvent(state, event) {
  const findings = [];
  const lowerPlayerText = state.playerText.toLowerCase();

  if (state.playerRawIds.length) {
    findings.push({
      severity: "fail",
      check: "No raw Gong IDs",
      detail: `Player text contains raw IDs: ${state.playerRawIds.join(", ")}`,
    });
  }

  if (lowerPlayerText.includes("real call")) {
    findings.push({
      severity: "fail",
      check: "No vague real-call label",
      detail: "Player text contains `real call`; use `Gong call` only when useful.",
    });
  }

  if (state.overflowing.length) {
    findings.push({
      severity: "review",
      check: "Text/layout overflow",
      detail: state.overflowing
        .map((item) => `${item.tag}: ${item.text}`)
        .join(" | "),
    });
  }

  const visibleNativeControls = state.media.filter(
    (item) => item.visible && item.controls && item.gong
  );
  if (visibleNativeControls.length) {
    findings.push({
      severity: "fail",
      check: "No player-in-player controls",
      detail: `Visible Gong media has native controls: ${visibleNativeControls
        .map((item) => item.src)
        .join(", ")}`,
    });
  }

  if (event.type === "gong") {
    if (!event.clip?.mediaSrc && !event.clip?.autoMediaSrc) {
      findings.push({
        severity: "fail",
        check: "Approved Gong media exists",
        detail: `${event.label} has no mediaSrc/autoMediaSrc.`,
      });
    }

    const anyGongMedia = state.media.some((item) => item.gong);
    if (!anyGongMedia) {
      findings.push({
        severity: "fail",
        check: "Approved Gong media rendered",
        detail: `${event.label} did not render Gong media at the active moment.`,
      });
    }

    const visibleGongVideos = state.media.filter(
      (item) => item.gong && item.tag === "video" && item.visible
    );
    if (event.clip?.displayMode === "talkTrack" && visibleGongVideos.length) {
      findings.push({
        severity: "fail",
        check: "Poor visual clips use audio-only treatment",
        detail: `${event.label} is talkTrack but a visible video is rendered.`,
      });
    }

    if (event.expectedCopy && !state.playerText.includes(event.expectedCopy.slice(0, 24))) {
      findings.push({
        severity: "review",
        check: "Gong setup copy",
        detail: `Expected setup begins with "${event.expectedCopy.slice(0, 80)}".`,
      });
    }
  }

  if (event.type === "section-start" || event.type === "section-mid") {
    const expectedTitle = event.expectedTitle ?? "";
    if (expectedTitle && !state.playerText.includes(expectedTitle)) {
      findings.push({
        severity: "review",
        check: "Slide matches section title",
        detail: `Expected visible title: ${expectedTitle}`,
      });
    }
  }

  if (event.type === "checkpoint-review" && !state.reviewModeVisible) {
    findings.push({
      severity: "review",
      check: "Review mode checkpoint behavior",
      detail: "Review mode badge was not visible near checkpoint audit moment.",
    });
  }

  return findings;
}

async function setLessonProgress(page, moduleNumber, lessonNumber, progress) {
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: `dashfi.learning.underwriting.lesson-progress.${moduleNumber}.${lessonNumber}`,
      value: progress,
    }
  );
}

async function clearLessonProgress(page, moduleNumber, lessonNumber) {
  await page.evaluate(
    (key) => {
      window.localStorage.removeItem(key);
    },
    `dashfi.learning.underwriting.lesson-progress.${moduleNumber}.${lessonNumber}`
  );
}

async function auditLearnerModeCheckpoint(
  page,
  moduleNumber,
  lessonNumber,
  checkpoint,
  checkpoints
) {
  const completedEarlierCheckpointIds = checkpoints
    .filter((item) => item.placement < checkpoint.placement)
    .map((item) => item.id);
  await setLessonProgress(page, moduleNumber, lessonNumber, {
    completedCheckpointIds: completedEarlierCheckpointIds,
    lessonCompleted: false,
    maxWatched: Math.max(0, checkpoint.placement - 2),
    updatedAt: new Date().toISOString(),
  });
  await page.goto(
    `${baseUrl}/learning/underwriting-training/module-${moduleNumber}/lesson-${lessonNumber}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
  await page.evaluate((placement) => {
    const media = document.querySelector("[data-testid='lesson-audio']");
    if (!media) {
      return;
    }
    media.currentTime = placement;
    media.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  }, checkpoint.placement + 0.05);
  await page.waitForTimeout(400);
  return collectState(page);
}

async function auditGongTransition(page, lessonKey, clip) {
  if (lessonKey !== "2-1" || !clip.lessonStart || !clip.lessonEnd) {
    return null;
  }

  const production = underwritingLessonProductionData[lessonKey];
  await setLessonProgress(page, 2, 1, {
    completedCheckpointIds: (production.checkpoints ?? []).map((item) => item.id),
    lessonCompleted: false,
    maxWatched: Math.max(0, clip.lessonStart - 2),
    updatedAt: new Date().toISOString(),
  });
  await page.goto(`${baseUrl}/learning/underwriting-training/module-2/lesson-1`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
  await page.evaluate((time) => {
    const media = document.querySelector("[data-testid='lesson-audio']");
    if (!media) {
      return;
    }
    media.currentTime = Math.max(0, time - 0.15);
    media.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  }, clip.lessonStart);
  await page.getByRole("button", { name: /play lesson/i }).click({ timeout: 10_000 });
  await page.waitForTimeout(1300);
  const started = await page.evaluate(() => {
    const media = Array.from(document.querySelectorAll("[data-gong-media='true']"));
    return media.map((item) => ({
      tag: item.tagName.toLowerCase(),
      paused: item.paused,
      currentTime: Number(item.currentTime.toFixed(3)),
      src: item.currentSrc || item.getAttribute("src") || "",
    }));
  });
  return { started };
}

function runRandomizationAudit() {
  const results = [];

  Object.entries(underwritingLessonProductionData).forEach(
    ([lessonKey, production]) => {
      (production.checkpoints ?? []).forEach((checkpoint) => {
        const spread = collectCorrectPositionSpread(
          checkpoint.options,
          (index) => `${checkpoint.id}:qa-seed-${index}`
        );
        const finding = evaluatePositionSpread(spread, checkpoint.options.length);
        results.push({
          type: "skill-check",
          lessonKey,
          id: checkpoint.id,
          label: checkpoint.label,
          optionCount: checkpoint.options.length,
          spread,
          findings: finding ? [finding] : [],
        });
      });
    }
  );

  underwritingQuizzes.forEach((quiz) => {
    quiz.questions.forEach((question) => {
      const spread = collectCorrectPositionSpread(
        question.options,
        (index) => `${quiz.id}:${question.id}:qa-start-${index}:qa-attempt-${index}`
      );
      const finding = evaluatePositionSpread(spread, question.options.length);
      results.push({
        type: "module-quiz",
        quizId: quiz.id,
        id: question.id,
        label: `Question ${question.number}: ${question.concept}`,
        optionCount: question.options.length,
        spread,
        findings: finding ? [finding] : [],
      });
    });
  });

  return results;
}

async function authenticateIfLocal(page) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl)) {
    return;
  }

  await page.goto(`${baseUrl}/auth/dev-ray`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
}

async function runSmokeChecks(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await authenticateIfLocal(page);

  const smokeRoutes = [
    {
      id: "learning-hub",
      path: "/learning",
      expected: ["DashFi Learning Hub", "Underwriting Training"],
    },
    {
      id: "my-progress",
      path: "/learning/my-progress",
      expected: ["My Progress", "knowledge checks"],
    },
    {
      id: "leaderboard",
      path: "/learning/leaderboard",
      expected: ["Leaderboard", "knowledge checks"],
    },
    {
      id: "coaching-report",
      path: "/learning/reporting",
      expected: ["Coaching Report", "attempts"],
    },
    {
      id: "certification-map",
      path: "/learning/underwriting-training",
      expected: ["Underwriting Training", "Financials 101"],
    },
    {
      id: "lesson-player",
      path: "/learning/underwriting-training/module-1/lesson-1?review=1",
      expected: ["Why Underwriting Exists", "PLAY"],
    },
    {
      id: "module-quiz",
      path: "/learning/underwriting-training/module-1/quiz",
      expected: ["Financials 101 Knowledge Check", "100% required"],
    },
  ];

  const results = [];

  for (const route of smokeRoutes) {
    const url = `${baseUrl}${route.path}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(800);
    const state = await page.evaluate(() => ({
      title: document.title,
      bodyText: document.body.innerText ?? "",
      navVisible: Boolean(
        document.querySelector("[data-testid='learning-navigation']")
      ),
      url: window.location.href,
    }));
    const findings = [];

    if (!state.navVisible) {
      findings.push({
        severity: "fail",
        check: "Learning navigation visible",
        detail: "Shared Learning Hub navigation was not visible.",
      });
    }

    route.expected.forEach((text) => {
      if (!state.bodyText.includes(text)) {
        findings.push({
          severity: "fail",
          check: "Expected page text",
          detail: `Expected page to include "${text}".`,
        });
      }
    });

    results.push({
      route,
      state: {
        title: state.title,
        url: state.url,
      },
      findings,
    });
  }

  await context.close();
  return results;
}

async function run() {
  ensureDir(reviewRoot);
  ensureDir(screenshotRoot);

  const randomizationResults = runRandomizationAudit();
  const randomizationJsonPath = path.join(reviewRoot, "randomization-results.json");
  fs.writeFileSync(
    randomizationJsonPath,
    JSON.stringify(randomizationResults, null, 2)
  );

  const randomizationLines = [
    "# Skill Check And Quiz Randomization Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Type | Item | Correct position spread | Result |",
    "| --- | --- | --- | --- |",
  ];
  randomizationResults.forEach((result) => {
    randomizationLines.push(
      `| ${result.type} | ${String(result.label).replace(/\|/g, "\\|")} | ${JSON.stringify(result.spread).replace(/\|/g, "\\|")} | ${
        result.findings.length
          ? result.findings.map((finding) => finding.severity).join(", ")
          : "pass"
      } |`
    );
  });
  fs.writeFileSync(
    path.join(reviewRoot, "randomization-results.md"),
    randomizationLines.join("\n")
  );

  if (randomizationOnly || skipBrowserQa) {
    console.log(`Wrote ${randomizationJsonPath}`);
    console.log(`Wrote ${path.join(reviewRoot, "randomization-results.md")}`);
    return;
  }

  const browser = await chromium.launch({ headless: true });

  const smokeResults = await runSmokeChecks(browser);
  fs.writeFileSync(
    path.join(reviewRoot, "smoke-results.json"),
    JSON.stringify(smokeResults, null, 2)
  );
  const smokeLines = [
    "# Learning Hub Launch Smoke Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Route | Result | Findings |",
    "| --- | --- | --- |",
  ];
  smokeResults.forEach((result) => {
    smokeLines.push(
      `| ${result.route.id} | ${
        result.findings.length ? "fail" : "pass"
      } | ${
        result.findings
          .map((finding) => `${finding.check}: ${finding.detail}`)
          .join("; ") || ""
      } |`
    );
  });
  fs.writeFileSync(path.join(reviewRoot, "smoke-results.md"), smokeLines.join("\n"));

  if (smokeOnly) {
    await browser.close();
    console.log(`Wrote ${path.join(reviewRoot, "smoke-results.md")}`);
    console.log(`Wrote ${path.join(reviewRoot, "randomization-results.md")}`);
    return;
  }

  const allResults = [];
  const lessons = modulesToAudit.flatMap((moduleNumber) => {
    const module = underwritingCourse.modules.find((item) => item.number === moduleNumber);
    return module.lessons.map((lesson) => ({
      moduleNumber,
      lessonNumber: lesson.number,
      lesson,
      module,
      lessonKey: `${moduleNumber}-${lesson.number}`,
      production: underwritingLessonProductionData[`${moduleNumber}-${lesson.number}`],
    }));
  });

  for (const viewportName of viewportProfiles) {
    const viewport = viewports[viewportName];
    if (!viewport) {
      throw new Error(`Unknown QA viewport: ${viewportName}`);
    }

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12_000);
    await page.goto(`${baseUrl}/auth/dev-ray`, { waitUntil: "domcontentloaded", timeout: 30_000 });

    for (let pass = 1; pass <= passes; pass += 1) {
      for (const item of lessons) {
        if (!item.production) {
          allResults.push({
            pass,
            viewport: viewportName,
            lessonKey: item.lessonKey,
            lessonTitle: item.lesson.title,
            results: [
              {
                findings: [
                  {
                    severity: "fail",
                    check: "Production data exists",
                    detail: "No production blueprint found for this lesson.",
                  },
                ],
              },
            ],
          });
          continue;
        }

        const lessonDir = path.join(
          screenshotRoot,
          viewportName,
          `pass-${pass}`,
          `module-${item.moduleNumber}`,
          `lesson-${item.lessonNumber}-${slug(item.lesson.title)}`
        );
        ensureDir(lessonDir);

        const url = `${baseUrl}/learning/underwriting-training/module-${item.moduleNumber}/lesson-${item.lessonNumber}?review=1`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await waitForLessonReady(page);

        const events = getLessonEvents(item.lessonKey, item.production);
        const lessonResults = [];

        for (let index = 0; index < events.length; index += 1) {
          const event = events[index];
          await seekReview(page, event.time);
          const state = await collectState(page);
          const filename = `${String(index + 1).padStart(2, "0")}-${event.type}-${slug(event.label)}-${event.time.toFixed(1)}s.png`;
          const screenshotPath = path.join(lessonDir, filename);
          await page.screenshot({ path: screenshotPath, fullPage: false });
          const findings = evaluateEvent(state, event);
          lessonResults.push({
            event: {
              type: event.type,
              label: event.label,
              time: Number(event.time.toFixed(2)),
              expectedTitle: event.expectedTitle,
              expectedKind: event.expectedKind,
              scriptWindow: event.scriptWindow,
            },
            screenshotPath,
            state,
            findings,
          });
        }

        for (const [checkpointIndex, checkpoint] of (item.production.checkpoints ?? []).entries()) {
          const learnerMode = await auditLearnerModeCheckpoint(
            page,
            item.moduleNumber,
            item.lessonNumber,
            checkpoint,
            item.production.checkpoints ?? []
          );
          const filename = `${String(events.length + checkpointIndex + 1).padStart(2, "0")}-checkpoint-learner-mode-${slug(checkpoint.label)}-${checkpoint.placement.toFixed(1)}s.png`;
          const screenshotPath = path.join(lessonDir, filename);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          lessonResults.push({
            event: {
              type: "checkpoint-learner-mode",
              label: checkpoint.label,
              time: checkpoint.placement,
              scriptWindow: "",
            },
            screenshotPath,
            state: learnerMode,
            findings: learnerMode.checkpointOverlayVisible
              ? []
              : [
                  {
                    severity: "fail",
                    check: "Learner-mode skill check popup",
                    detail: `Checkpoint did not appear at ${checkpoint.placement}s.`,
                  },
                ],
          });
        }

        if (pass === 1 && item.lessonKey === "2-1" && viewportName === "desktop") {
          const clips = Object.values(underwritingGongEvidenceBySection)
            .flat()
            .filter((clip) => clip.lessonStart != null && ["Tim business health / no PG / no FICO", "Cameron limits / no UCC / no PG"].includes(clip.label));
          for (const clip of clips) {
            const transitionState = await auditGongTransition(page, item.lessonKey, clip);
            lessonResults.push({
              event: {
                type: "gong-transition-runtime",
                label: clip.label,
                time: clip.lessonStart,
                scriptWindow: "",
              },
              screenshotPath: null,
              state: transitionState,
              findings:
                transitionState?.started?.some((media) => media.currentTime > 0 && !media.paused)
                  ? []
                  : [
                      {
                        severity: "fail",
                        check: "Gong auto-start after lesson play",
                        detail: `${clip.label} did not show active playing Gong media after transition.`,
                      },
                    ],
            });
          }
        }

        allResults.push({
          pass,
          viewport: viewportName,
          lessonKey: item.lessonKey,
          moduleTitle: item.module.title,
          lessonTitle: item.lesson.title,
          screenshotDir: lessonDir,
          results: lessonResults,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  const jsonPath = path.join(reviewRoot, "qa-results.json");
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));

  const lines = [
    "# Module 1 And Module 2 Launch QA Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Passes requested: ${passes}`,
    "",
  ];

  for (const lesson of allResults) {
    const findings = (lesson.results ?? []).flatMap((result) =>
      (result.findings ?? []).map((finding) => ({ ...finding, event: result.event, screenshotPath: result.screenshotPath }))
    );
    lines.push(`## ${lesson.viewport} · Pass ${lesson.pass} · ${lesson.lessonKey} · ${lesson.lessonTitle}`);
    lines.push("");
    lines.push(`Screenshots: \`${path.relative(reviewRoot, lesson.screenshotDir ?? "")}\``);
    if (!findings.length) {
      lines.push("");
      lines.push("Automated checks: Pass.");
      lines.push("");
      continue;
    }
    lines.push("");
    lines.push("| Severity | Check | Event | Detail | Screenshot |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const finding of findings) {
      lines.push(
        `| ${finding.severity} | ${finding.check} | ${finding.event?.type ?? ""}: ${String(finding.event?.label ?? "").replace(/\|/g, "\\|")} | ${String(finding.detail).replace(/\|/g, "\\|")} | ${finding.screenshotPath ? path.relative(reviewRoot, finding.screenshotPath) : ""} |`
      );
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(reviewRoot, "qa-results.md"), lines.join("\n"));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${path.join(reviewRoot, "qa-results.md")}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
