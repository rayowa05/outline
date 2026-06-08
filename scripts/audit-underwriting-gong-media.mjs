import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(__dirname, "..");
const trainingRoot = path.resolve(repoRoot, "../../_training/underwriting-training");
const reviewDate = process.env.UNDERWRITING_QA_DATE ?? "2026-06-04";
const reviewRoot = path.join(trainingRoot, "reviews", `gong-media-qa-${reviewDate}`);
const exportRoot = path.join(reviewRoot, "export");
const originalRoot = path.join(exportRoot, "originals");
const wavRoot = path.join(exportRoot, "wav-for-transcription");
const screenshotRoot = path.join(reviewRoot, "screenshots");
const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const runBrowser = process.argv.includes("--browser");
const runExport = !process.argv.includes("--browser-only");
const ffmpegBin = process.env.FFMPEG_BIN ?? "ffmpeg";

const selectionAliases = [
  {
    source: "Heather performance-based framing",
    embedded: ["Heather performance-based framing"],
  },
  {
    source: "Nick performance-based framing",
    embedded: ["Nick performance-based framing"],
  },
  {
    source: "Cameron no UCC / no PG combined limits explanation",
    embedded: ["Cameron limits / no UCC / no PG"],
  },
  {
    source: "Cameron profitability ask",
    embedded: ["Cameron profitability ask"],
  },
  {
    source: "Ciaran profitability follow-up",
    embedded: ["Ciaran profitability follow-up"],
  },
  {
    source: "Andrew / Matthew document exchange",
    embedded: ["Andrew / Matthew document exchange"],
  },
  {
    source: "Tim Net-1 simple path",
    embedded: ["Tim Net-1 simple path"],
  },
  {
    source: "Dave application not a contract",
    embedded: ["Dave application not a contract"],
  },
  {
    source: "Andrew Net-1 no financials",
    embedded: ["Andrew Net-1 no financials"],
  },
  {
    source: "Cameron proactive no UCC / no PG",
    embedded: ["Cameron proactive no UCC / no PG"],
  },
  {
    source: "Andrew / GovPlus validate-align-answer",
    embedded: ["Andrew / GovPlus validate-align-answer"],
  },
  {
    source: "Kurt no PG / no credit check",
    embedded: ["Kurt no PG / no credit check"],
  },
  {
    source: "Tim business underwriting",
    embedded: ["Tim business underwriting"],
  },
  {
    source: "Cameron / Shop LC KYC redirect",
    embedded: ["Cameron / Shop LC KYC redirect"],
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, destination) {
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

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

function publicPathToFile(publicPath) {
  return path.join(repoRoot, "public", publicPath.replace(/^\//, ""));
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  const parts = String(value).split(":").map(Number);
  if (parts.some((item) => Number.isNaN(item))) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function parseDuration(output) {
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function ffmpeg(args, options = {}) {
  const result = spawnSync(ffmpegBin, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  return {
    code: result.status ?? 1,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
}

function mediaInfo(filePath) {
  const result = ffmpeg(["-hide_banner", "-i", filePath]);
  const output = `${result.stderr}\n${result.stdout}`;
  return {
    audio: /Audio:/i.test(output),
    duration: parseDuration(output),
    raw: output,
    video: /Video:/i.test(output),
  };
}

function volumeInfo(filePath) {
  const result = ffmpeg([
    "-hide_banner",
    "-i",
    filePath,
    "-af",
    "volumedetect",
    "-vn",
    "-sn",
    "-dn",
    "-f",
    "null",
    "-",
  ]);
  const output = `${result.stderr}\n${result.stdout}`;
  const meanMatch = output.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  const maxMatch = output.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  return {
    code: result.code,
    maxVolumeDb: maxMatch ? Number(maxMatch[1]) : null,
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : null,
    raw: output,
  };
}

function convertToWav(inputPath, outputPath) {
  ensureDir(path.dirname(outputPath));
  return ffmpeg([
    "-hide_banner",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

function finding(severity, check, detail, item = {}) {
  return { severity, check, detail, ...item };
}

function sourceDuration(segment) {
  const start = parseTimestamp(segment.startTimestamp);
  const end = parseTimestamp(segment.endTimestamp);
  return start == null || end == null ? null : Number((end - start).toFixed(3));
}

function getClipSegments(sectionKey, clip, clipIndex) {
  const [lessonKey, sectionId] = sectionKey.split(":");
  const [moduleNumber, lessonNumber] = lessonKey.split("-").map(Number);
  if (clip.ranges?.some((range) => range.mediaSrc)) {
    return clip.ranges
      .filter((range) => range.mediaSrc)
      .map((range, rangeIndex) => ({
        approvedText: range.approvedText,
        callId: clip.callId,
        caveat: clip.caveat,
        clipIndex,
        displayMode: clip.displayMode ?? "video",
        endTimestamp: range.endTimestamp,
        label: clip.label,
        lessonEnd: clip.lessonEnd,
        lessonKey,
        lessonNumber,
        lessonStart: clip.lessonStart,
        mediaSrc: range.mediaSrc,
        moduleNumber,
        rangeIndex,
        sectionId,
        sectionKey,
        speaker: clip.speaker,
        startTimestamp: range.startTimestamp,
        status: clip.status,
        topic: clip.topic,
      }));
  }
  if (!clip.mediaSrc) {
    return [];
  }
  return [
    {
      approvedText: clip.approvedText,
      callId: clip.callId,
      caveat: clip.caveat,
      clipIndex,
      displayMode: clip.displayMode ?? "video",
      endTimestamp: clip.endTimestamp,
      label: clip.label,
      lessonEnd: clip.lessonEnd,
      lessonKey,
      lessonNumber,
      lessonStart: clip.lessonStart,
      mediaSrc: clip.mediaSrc,
      moduleNumber,
      rangeIndex: 0,
      sectionId,
      sectionKey,
      speaker: clip.speaker,
      startTimestamp: clip.startTimestamp,
      status: clip.status,
      topic: clip.topic,
    },
  ];
}

function getData() {
  const { underwritingGongEvidenceBySection } = loadTsExports(
    "app/scenes/underwritingGongEvidenceData.ts"
  );
  const { underwritingLessonProductionData } = loadTsExports(
    "app/scenes/underwritingLessonProductionData.ts"
  );
  const { underwritingCourse } = loadTsExports("app/scenes/learningData.ts");
  const approvedSelections = JSON.parse(
    fs.readFileSync(
      path.join(trainingRoot, "scripts/gong-approved-clip-selections.json"),
      "utf8"
    )
  );
  return {
    approvedSelections,
    underwritingCourse,
    underwritingGongEvidenceBySection,
    underwritingLessonProductionData,
  };
}

function inventoryLessonAssets(data, findings) {
  const assets = [];
  for (const module of data.underwritingCourse.modules.filter((item) =>
    [1, 2].includes(item.number)
  )) {
    for (const lesson of module.lessons) {
      const lessonKey = `${module.number}-${lesson.number}`;
      const production = data.underwritingLessonProductionData[lessonKey];
      const media = production?.media ?? {};
      for (const [kind, publicPath] of [
        ["lesson-audio", media.audioSrc],
        ["captions", media.captionsSrc],
        ["aaf", media.timelineSrc],
      ]) {
        if (!publicPath) {
          findings.push(
            finding("fail", "Lesson asset reference", `${lessonKey} has no ${kind}.`, {
              lessonKey,
            })
          );
          continue;
        }
        const sourcePath = publicPathToFile(publicPath);
        const exists = fs.existsSync(sourcePath);
        const exportPath = path.join(
          originalRoot,
          `module-${module.number}`,
          `lesson-${lesson.number}`,
          path.basename(sourcePath)
        );
        if (exists && runExport) {
          copyFile(sourcePath, exportPath);
        }
        const item = {
          exists,
          exportPath,
          kind,
          lessonKey,
          moduleTitle: module.title,
          publicPath,
          sourcePath,
          title: lesson.title,
        };
        if (!exists) {
          findings.push(
            finding("fail", "Lesson asset exists", `${lessonKey} ${kind} missing: ${sourcePath}`, item)
          );
        }
        if (exists && kind === "lesson-audio") {
          const info = mediaInfo(sourcePath);
          const volume = volumeInfo(sourcePath);
          item.duration = info.duration;
          item.hasAudio = info.audio;
          item.meanVolumeDb = volume.meanVolumeDb;
          if (!info.audio || !info.duration || info.duration < 1) {
            findings.push(
              finding("fail", "Lesson audio playable", `${lessonKey} audio has no usable audio stream.`, item)
            );
          }
          if (volume.meanVolumeDb != null && volume.meanVolumeDb < -60) {
            findings.push(
              finding("fail", "Lesson audio not silent", `${lessonKey} audio appears silent.`, item)
            );
          }
        }
        assets.push(item);
      }
    }
  }
  return assets;
}

function inventoryGongAssets(data, findings) {
  const embeddedSegments = Object.entries(data.underwritingGongEvidenceBySection)
    .flatMap(([sectionKey, clips]) =>
      clips.flatMap((clip, clipIndex) => getClipSegments(sectionKey, clip, clipIndex))
    )
    .sort((left, right) => {
      if (left.lessonKey !== right.lessonKey) {
        return left.lessonKey.localeCompare(right.lessonKey);
      }
      return (left.lessonStart ?? 0) - (right.lessonStart ?? 0);
    });

  for (const segment of embeddedSegments) {
    const sourcePath = publicPathToFile(segment.mediaSrc);
    const exists = fs.existsSync(sourcePath);
    const sourceStem = path.basename(sourcePath, path.extname(sourcePath));
    const basename = `${segment.lessonKey}-${slug(sourceStem)}-${segment.rangeIndex + 1}${path.extname(sourcePath)}`;
    const exportPath = path.join(originalRoot, "gong-clips", basename);
    const wavPath = path.join(
      wavRoot,
      basename.replace(/\.[^.]+$/, ".wav")
    );
    segment.exists = exists;
    segment.exportPath = exportPath;
    segment.sourceDuration = sourceDuration(segment);
    segment.sourcePath = sourcePath;
    segment.wavPath = wavPath;

    if (!exists) {
      findings.push(
        finding("fail", "Gong media exists", `${segment.label} missing: ${sourcePath}`, segment)
      );
      continue;
    }

    if (runExport) {
      copyFile(sourcePath, exportPath);
    }

    const info = mediaInfo(sourcePath);
    const volume = volumeInfo(sourcePath);
    segment.duration = info.duration;
    segment.hasAudio = info.audio;
    segment.hasVideo = info.video;
    segment.meanVolumeDb = volume.meanVolumeDb;
    segment.maxVolumeDb = volume.maxVolumeDb;

    if (!info.audio || !info.duration || info.duration < 1) {
      findings.push(
        finding("fail", "Gong audio playable", `${segment.label} has no usable audio stream.`, segment)
      );
    }
    if (volume.meanVolumeDb != null && volume.meanVolumeDb < -60) {
      findings.push(
        finding("fail", "Gong audio not silent", `${segment.label} appears silent.`, segment)
      );
    }

    if (runExport) {
      const conversion = convertToWav(sourcePath, wavPath);
      segment.wavConverted = conversion.code === 0 && fs.existsSync(wavPath);
      const wavInfo = segment.wavConverted ? mediaInfo(wavPath) : {};
      segment.wavDuration = wavInfo.duration ?? null;
      if (!segment.wavConverted) {
        findings.push(
          finding("fail", "Gong WAV export", `${segment.label} failed WAV conversion.`, segment)
        );
      }
    }

    if (segment.displayMode === "video" && segment.mediaSrc.endsWith(".mp4")) {
      const posterPath = sourcePath.replace(/\.mp4$/, ".jpg");
      segment.posterPath = posterPath;
      segment.posterExists = fs.existsSync(posterPath);
      if (!segment.posterExists) {
        findings.push(
          finding("review", "Gong poster exists", `${segment.label} has no poster image.`, segment)
        );
      } else if (runExport) {
        copyFile(
          posterPath,
          path.join(originalRoot, "gong-clips", `${basename.replace(/\.[^.]+$/, "")}.jpg`)
        );
      }
    }

    if (segment.lessonStart == null || segment.lessonEnd == null) {
      findings.push(
        finding("fail", "Gong lesson timing", `${segment.label} has no lessonStart/lessonEnd.`, segment)
      );
    }

    if (
      segment.sourceDuration != null &&
      segment.duration != null &&
      Math.abs(segment.sourceDuration - segment.duration) > 2 &&
      !/final|part|documents|govplus|shoplc|application|cameron-limits/i.test(segment.mediaSrc)
    ) {
      findings.push(
        finding(
          "review",
          "Gong duration vs timestamp",
          `${segment.label} duration ${segment.duration.toFixed(1)}s differs from source timestamp window ${segment.sourceDuration.toFixed(1)}s.`,
          segment
        )
      );
    }
  }

  return embeddedSegments;
}

function reconcileSelections(data, embeddedSegments, findings) {
  const embeddedLabels = new Set(embeddedSegments.map((item) => item.label));
  const disqualified = data.approvedSelections.filter((item) => item.status === "disqualified");
  for (const item of disqualified) {
    if (embeddedLabels.has(item.clipLabel)) {
      findings.push(
        finding("fail", "Disqualified Gong excluded", `Disqualified selection is embedded: ${item.clipLabel}`, item)
      );
    }
  }

  for (const alias of selectionAliases) {
    const source = data.approvedSelections.find((item) => item.clipLabel === alias.source);
    if (!source || source.status === "disqualified") {
      continue;
    }
    const embeddedCount = alias.embedded.reduce(
      (count, label) => count + embeddedSegments.filter((item) => item.label === label).length,
      0
    );
    if (!embeddedCount) {
      findings.push(
        finding("fail", "Approved Gong embedded", `Approved selection not embedded: ${alias.source}`, {
          source,
        })
      );
    }
  }
}

async function auditBrowserPlayback(embeddedSegments, findings) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    findings.push(
      finding("fail", "Browser QA dependency", `Playwright could not load: ${error.message}`)
    );
    return [];
  }

  ensureDir(screenshotRoot);
  const browserResults = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  try {
    await page.goto(`${baseUrl}/auth/dev-ray`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    for (const segment of embeddedSegments) {
      if (segment.lessonStart == null || segment.lessonEnd == null) {
        continue;
      }
      const lessonUrl = `${baseUrl}/learning/underwriting-training/module-${segment.moduleNumber}/lesson-${segment.lessonNumber}`;
      const reviewUrl = `${lessonUrl}?review=1`;
      const screenshotStem = path.basename(
        segment.sourcePath ?? segment.mediaSrc,
        path.extname(segment.sourcePath ?? segment.mediaSrc)
      );
      const screenshotPath = path.join(
        screenshotRoot,
        `${segment.lessonKey}-${slug(screenshotStem)}-${segment.rangeIndex + 1}.png`
      );

      await page.goto(reviewUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
      await page.waitForFunction(() => typeof window.__uwReviewSeek === "function", null, {
        timeout: 30_000,
      });
      await page.evaluate((time) => window.__uwReviewSeek?.(time), segment.lessonStart + 0.08);
      await page.waitForTimeout(500);
      const visualState = await page.evaluate((expectedSrc) => {
        const board = document.querySelector("[data-testid='gong-evidence-board']");
        const visibleOverflow = Array.from(board?.querySelectorAll("*") ?? [])
          .map((item) => {
            const rect = item.getBoundingClientRect();
            const style = window.getComputedStyle(item);
            return {
              height: Number(rect.height.toFixed(1)),
              overflowX: item.scrollWidth > item.clientWidth + 2,
              overflowY: item.scrollHeight > item.clientHeight + 2,
              tag: item.tagName.toLowerCase(),
              text: (item.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
              visible:
                rect.width > 2 &&
                rect.height > 2 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) !== 0,
              width: Number(rect.width.toFixed(1)),
            };
          })
          .filter((item) => item.visible && item.text && (item.overflowX || item.overflowY))
          .slice(0, 8);
        const media = Array.from(document.querySelectorAll("[data-gong-media='true']")).map((item) => {
          const rect = item.getBoundingClientRect();
          const style = window.getComputedStyle(item);
          return {
            controls: item.hasAttribute("controls"),
            currentTime: Number(item.currentTime.toFixed(3)),
            duration: Number.isFinite(item.duration) ? Number(item.duration.toFixed(3)) : null,
            muted: item.muted,
            paused: item.paused,
            src: item.currentSrc || item.getAttribute("src") || "",
            tag: item.tagName.toLowerCase(),
            visible:
              rect.width > 2 &&
              rect.height > 2 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity) !== 0,
            volume: item.volume,
          };
        });
        const matching = media.filter((item) => item.src.endsWith(expectedSrc));
        return {
          boardVisible: Boolean(board),
          matchingMediaCount: matching.length,
          media,
          visibleOverflow,
          text: document.querySelector("[data-testid='lesson-player']")?.innerText ?? "",
        };
      }, segment.mediaSrc);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      if (!visualState.boardVisible) {
        findings.push(
          finding("fail", "Gong visual render", `${segment.label} did not render Gong board in review mode.`, {
            screenshotPath,
            segment,
            visualState,
          })
        );
      }
      if (!visualState.matchingMediaCount) {
        findings.push(
          finding("fail", "Gong media DOM source", `${segment.label} did not render expected media src.`, {
            screenshotPath,
            segment,
            visualState,
          })
        );
      }
      const visibleNativeControls = visualState.media.filter((item) => item.visible && item.controls);
      if (visibleNativeControls.length) {
        findings.push(
          finding("fail", "No nested native controls", `${segment.label} has visible native media controls.`, {
            screenshotPath,
            segment,
            visibleNativeControls,
          })
        );
      }
      if (visualState.visibleOverflow.length) {
        findings.push(
          finding("fail", "Gong visual text overflow", `${segment.label} has visible overflowing text in the Gong card.`, {
            overflow: visualState.visibleOverflow,
            screenshotPath,
            segment,
          })
        );
      }

      await page.goto(lessonUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
      await page.evaluate(
        ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
        {
          key: `dashfi.learning.underwriting.lesson-progress.${segment.moduleNumber}.${segment.lessonNumber}`,
          value: {
            completedCheckpointIds: ["checkpoint-1", "checkpoint-2", "checkpoint-3", "checkpoint-4"],
            lessonCompleted: false,
            maxWatched: Math.max(0, segment.lessonStart - 2),
            updatedAt: new Date().toISOString(),
          },
        }
      );
      await page.goto(lessonUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForSelector("[data-testid='lesson-player']", { timeout: 30_000 });
      await page.evaluate((time) => {
        const media = document.querySelector("[data-testid='lesson-audio']");
        if (!media) {
          return;
        }
        media.currentTime = Math.max(0, time - 0.12);
        media.dispatchEvent(new Event("timeupdate", { bubbles: true }));
      }, segment.lessonStart);
      const playButton = page.getByRole("button", { name: /play/i }).first();
      await playButton.click({ timeout: 10_000 });
      await page.waitForTimeout(1600);
      const playbackState = await page.evaluate((expectedSrc) => {
        const lessonAudio = document.querySelector("[data-testid='lesson-audio']");
        const media = Array.from(document.querySelectorAll("[data-gong-media='true']")).map((item) => ({
          currentTime: Number(item.currentTime.toFixed(3)),
          duration: Number.isFinite(item.duration) ? Number(item.duration.toFixed(3)) : null,
          muted: item.muted,
          paused: item.paused,
          src: item.currentSrc || item.getAttribute("src") || "",
          tag: item.tagName.toLowerCase(),
          volume: item.volume,
        }));
        return {
          expected: media.filter((item) => item.src.endsWith(expectedSrc)),
          lessonAudio: lessonAudio
            ? {
                currentTime: Number(lessonAudio.currentTime.toFixed(3)),
                paused: lessonAudio.paused,
              }
            : null,
          media,
        };
      }, segment.mediaSrc);

      const expectedPlayback = playbackState.expected[0];
      if (!expectedPlayback || expectedPlayback.paused || expectedPlayback.currentTime <= 0.2) {
        findings.push(
          finding("fail", "Gong audible browser playback", `${segment.label} did not start and advance in browser playback.`, {
            playbackState,
            segment,
          })
        );
      }
      if (expectedPlayback?.muted || expectedPlayback?.volume === 0) {
        findings.push(
          finding("fail", "Gong browser audio unmuted", `${segment.label} is muted or volume is zero in browser playback.`, {
            playbackState,
            segment,
          })
        );
      }
      if (playbackState.lessonAudio && !playbackState.lessonAudio.paused) {
        findings.push(
          finding("fail", "Lesson pauses during Gong", `${segment.label} did not pause lesson narration during Gong playback.`, {
            playbackState,
            segment,
          })
        );
      }

      browserResults.push({
        playbackState,
        screenshotPath,
        segment,
        visualState,
      });
    }
  } finally {
    await browser.close();
  }

  return browserResults;
}

function writeReports({ browserResults, embeddedSegments, findings, lessonAssets }) {
  ensureDir(reviewRoot);
  const manifest = {
    browserResults,
    embeddedSegments,
    findings,
    generatedAt: new Date().toISOString(),
    lessonAssets,
  };
  fs.writeFileSync(path.join(reviewRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

  const hardFailures = findings.filter((item) => item.severity === "fail");
  const reviewItems = findings.filter((item) => item.severity === "review");
  const lines = [
    "# Underwriting Gong Media QA",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Browser runtime QA: ${runBrowser ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    hardFailures.length
      ? `Hard failures: ${hardFailures.length}`
      : "Hard failures: 0",
    `Review items: ${reviewItems.length}`,
    `Lesson assets checked: ${lessonAssets.length}`,
    `Embedded Gong media segments checked: ${embeddedSegments.length}`,
    "",
    "## Embedded Gong Segments",
    "",
    "| Lesson | Label | Speaker | Source window | Media duration | Media | WAV |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
    ...embeddedSegments.map((segment) =>
      [
        segment.lessonKey,
        segment.label,
        segment.speaker,
        `${segment.startTimestamp ?? ""} - ${segment.endTimestamp ?? ""}`,
        segment.duration == null ? "" : segment.duration.toFixed(2),
        segment.mediaSrc,
        segment.wavPath ? path.relative(reviewRoot, segment.wavPath) : "",
      ]
        .map((value) => String(value).replace(/\|/g, "\\|"))
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    ),
    "",
  ];

  if (hardFailures.length) {
    lines.push("## Hard Failures", "");
    for (const item of hardFailures) {
      lines.push(`- **${item.check}:** ${item.detail}`);
    }
    lines.push("");
  }

  if (reviewItems.length) {
    lines.push("## Review Items", "");
    for (const item of reviewItems) {
      lines.push(`- **${item.check}:** ${item.detail}`);
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(reviewRoot, "qa-summary.md"), lines.join("\n"));

  if (runExport) {
    const zipPath = path.join(reviewRoot, `underwriting-gong-media-export-${reviewDate}.zip`);
    try {
      fs.rmSync(zipPath, { force: true });
      execFileSync("zip", ["-qr", zipPath, "export", "manifest.json", "qa-summary.md"], {
        cwd: reviewRoot,
      });
    } catch (error) {
      findings.push(
        finding("review", "Export zip", `Could not create export zip: ${error.message}`)
      );
      fs.writeFileSync(path.join(reviewRoot, "manifest.json"), JSON.stringify({
        browserResults,
        embeddedSegments,
        findings,
        generatedAt: new Date().toISOString(),
        lessonAssets,
      }, null, 2));
    }
  }
}

async function main() {
  ensureDir(reviewRoot);
  ensureDir(exportRoot);
  const findings = [];
  const data = getData();
  const lessonAssets = inventoryLessonAssets(data, findings);
  const embeddedSegments = inventoryGongAssets(data, findings);
  reconcileSelections(data, embeddedSegments, findings);
  const browserResults = runBrowser
    ? await auditBrowserPlayback(embeddedSegments, findings)
    : [];
  writeReports({ browserResults, embeddedSegments, findings, lessonAssets });

  const hardFailureCount = findings.filter((item) => item.severity === "fail").length;
  const reviewCount = findings.filter((item) => item.severity === "review").length;
  const result = {
    hardFailureCount,
    reviewCount,
    reviewRoot,
    segments: embeddedSegments.length,
    summaryPath: path.join(reviewRoot, "qa-summary.md"),
    zipPath: path.join(reviewRoot, `underwriting-gong-media-export-${reviewDate}.zip`),
  };
  console.log(JSON.stringify(result, null, 2));
  if (hardFailureCount) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
