import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { chromium } from "playwright";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const baseUrl = process.env.LMS_BASE_URL ?? "http://localhost:3000";
const outputDir =
  process.env.UNDERWRITING_REVIEW_OUTPUT_DIR ??
  "/Users/rayowais/claude-projects/_training/underwriting-training/production/learning-hub-v1/review-packets";
const dateStamp = process.env.UNDERWRITING_REVIEW_DATE ?? "2026-06-03";
const moduleFilter = new Set(
  (process.env.UNDERWRITING_MODULE_FILTER ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
);

const slidePdfPath = path.join(
  outputDir,
  `underwriting-slides-review-${dateStamp}.pdf`
);
const quizPdfPath = path.join(
  outputDir,
  `underwriting-quizzes-review-${dateStamp}.pdf`
);
const combinedPdfPath = path.join(
  outputDir,
  `underwriting-modules-1-2-slides-and-quizzes-review-${dateStamp}.pdf`
);
const screenshotDir = path.join(outputDir, "slide-screenshots");

function includeModule(module) {
  return moduleFilter.size === 0 || moduleFilter.has(Number(module.number));
}

function loadTsExports(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    console,
    exports: module.exports,
    module,
    require,
  });
  return module.exports;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getTrainingCourse() {
  const { underwritingCourse } = loadTsExports("app/scenes/learningData.ts");
  const { underwritingLessonProductionData } = loadTsExports(
    "app/scenes/underwritingLessonProductionData.ts"
  );

  return {
    course: underwritingCourse,
    productionData: underwritingLessonProductionData,
  };
}

function getSlideRows(course, productionData) {
  return course.modules.filter(includeModule).flatMap((module) =>
    module.lessons.flatMap((lesson) => {
      const lessonKey = `${module.number}-${lesson.number}`;
      const production = productionData[lessonKey];

      return (production?.sections ?? []).map((section, index) => ({
        index,
        lesson,
        lessonKey,
        module,
        section,
        url: `${baseUrl}/learning/underwriting-training/module-${module.number}/lesson-${lesson.number}?review=1&section=${index + 1}`,
      }));
    })
  );
}

function getQuizRows(course, productionData) {
  return course.modules.filter(includeModule).flatMap((module) =>
    module.lessons.flatMap((lesson) => {
      const lessonKey = `${module.number}-${lesson.number}`;
      const production = productionData[lessonKey];

      return (production?.checkpoints ?? []).map((checkpoint, index) => ({
        checkpoint,
        index,
        lesson,
        lessonKey,
        module,
      }));
    })
  );
}

function createPdfShell(title, body) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        margin: 0.42in;
        size: letter landscape;
      }

      * {
        box-sizing: border-box;
      }

      body {
        color: #20302d;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }

      .cover {
        align-content: center;
        background: #1c2018;
        color: #fff;
        display: grid;
        height: 7.65in;
        padding: 0.45in;
        page-break-after: always;
      }

      .cover h1 {
        color: #fff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 34px;
        line-height: 1.05;
        margin: 0 0 16px;
      }

      .cover p {
        color: rgba(255, 255, 255, 0.72);
        font-size: 16px;
        line-height: 1.45;
        margin: 0;
        max-width: 7.2in;
      }

      .cover .stamp,
      .eyebrow,
      .meta {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .cover .stamp {
        color: #edff3d;
        font-size: 12px;
        margin-bottom: 10px;
      }

      .page {
        page-break-after: always;
      }

      .page:last-child {
        page-break-after: auto;
      }

      .slide-page {
        display: grid;
        gap: 12px;
      }

      .label {
        align-items: start;
        border-bottom: 1px solid #dedad1;
        display: grid;
        gap: 6px;
        grid-template-columns: minmax(0, 1fr) auto;
        padding-bottom: 9px;
      }

      .eyebrow {
        color: #354cef;
        font-size: 10px;
      }

      h2 {
        font-size: 20px;
        line-height: 1.15;
        margin: 3px 0 0;
      }

      .meta {
        color: #777a73;
        font-size: 10px;
        text-align: right;
      }

      .slide-image {
        border: 1px solid #dedad1;
        border-radius: 8px;
        display: block;
        max-height: 6.25in;
        object-fit: contain;
        width: 100%;
      }

      .slide-frame {
        background: #1c2018;
        border: 1px solid #dedad1;
        border-radius: 10px;
        color: #fff;
        height: 6.25in;
        overflow: hidden;
        padding: 18px;
      }

      .stage {
        background:
          linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          #1c2018;
        background-size: 72px 72px;
        border-radius: 8px;
        display: grid;
        gap: 18px;
        grid-template-columns: 0.78fr 1fr;
        height: 100%;
        padding: 24px;
      }

      .stage.visualLead {
        grid-template-columns: 1.18fr 0.82fr;
      }

      .stage.metricLead {
        grid-template-columns: 0.62fr 1.38fr;
      }

      .stage.visualLead .copy {
        order: 2;
      }

      .stage.visualLead .visual {
        order: 1;
      }

      .stage.blue {
        background:
          linear-gradient(135deg, rgba(53, 76, 239, 0.26), rgba(255, 255, 255, 0.03)),
          #1c2018;
      }

      .stage.lime {
        background:
          linear-gradient(135deg, rgba(237, 255, 61, 0.18), rgba(255, 255, 255, 0.03)),
          #1c2018;
      }

      .stage.violet {
        background:
          linear-gradient(135deg, rgba(124, 77, 255, 0.24), rgba(255, 255, 255, 0.03)),
          #1c2018;
      }

      .stage.light {
        background:
          linear-gradient(135deg, rgba(255, 252, 245, 0.14), rgba(255, 255, 255, 0.03)),
          #1c2018;
      }

      .copy {
        align-content: center;
        display: grid;
      }

      .marker {
        background: #edff3d;
        border-radius: 4px;
        color: #123b39;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        padding: 7px 9px;
        text-transform: uppercase;
        width: fit-content;
      }

      .stage-title {
        color: #fff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 33px;
        font-weight: 500;
        letter-spacing: 0;
        line-height: 1.05;
        margin: 16px 0 0;
      }

      .stage-copy {
        color: rgba(255, 255, 255, 0.74);
        font-size: 15px;
        line-height: 1.42;
        margin: 14px 0 0;
      }

      .visual {
        align-self: stretch;
        background: rgba(255, 255, 255, 0.065);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        display: grid;
        overflow: hidden;
        padding: 18px;
      }

      .light .visual {
        background: #fffcf5;
      }

      .blue .visual {
        background: rgba(53, 76, 239, 0.28);
      }

      .lime .visual {
        background: rgba(237, 255, 61, 0.13);
      }

      .violet .visual {
        background: rgba(124, 77, 255, 0.24);
      }

      .board {
        align-content: center;
        display: grid;
        gap: 12px;
        min-height: 100%;
      }

      .visual-meta {
        color: #354cef;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .big-number {
        color: #edff3d;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 48px;
        font-weight: 900;
        line-height: 1;
      }

      .tile-grid,
      .flag-grid,
      .profile-board {
        display: grid;
        gap: 10px;
      }

      .tile-grid,
      .flag-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .tile,
      .flag,
      .profile-card,
      .stack-item,
      .statement-card,
      .path-card,
      .call-step,
      .deal-cell,
      .node,
      .takeaway-item {
        border-radius: 8px;
        line-height: 1.25;
        padding: 13px;
      }

      .tile,
      .profile-card,
      .statement-card,
      .path-card,
      .call-step,
      .node {
        background: #fffcf5;
        color: #20302d;
      }

      .tile strong,
      .profile-card strong,
      .statement-card strong,
      .path-card strong {
        display: block;
        font-size: 22px;
        line-height: 1.05;
        margin: 4px 0 6px;
      }

      .tile span,
      .profile-card span,
      .statement-card span,
      .path-card span {
        color: #777a73;
        font-size: 12px;
      }

      .accent {
        background: #edff3d !important;
        color: #123b39 !important;
      }

      .accent span,
      .accent strong {
        color: #123b39 !important;
      }

      .equation,
      .rule,
      .chip {
        background: #edff3d;
        border-radius: 7px;
        color: #123b39;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        font-weight: 900;
        padding: 11px 12px;
        text-align: center;
        text-transform: uppercase;
      }

      .row {
        align-items: center;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        padding: 13px;
      }

      .row span {
        color: rgba(255, 255, 255, 0.74);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .row strong {
        color: #fff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 24px;
      }

      .negative strong {
        color: #ffaaa6;
      }

      .formula,
      .term-options,
      .months,
      .days,
      .path-board,
      .packet-board,
      .call-board {
        display: grid;
        gap: 8px;
      }

      .formula,
      .term-options {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .months {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      .days {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .path-board,
      .packet-board {
        align-content: center;
        grid-template-columns: minmax(0, 1fr) 38px minmax(0, 1fr);
      }

      .call-board {
        align-content: center;
        grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr) 32px minmax(0, 1fr);
      }

      .term,
      .month,
      .day,
      .stack-item,
      .flag,
      .deal-cell,
      .slice {
        align-items: center;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 7px;
        color: #fff;
        display: flex;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        font-weight: 900;
        min-height: 40px;
        padding: 10px;
        text-transform: uppercase;
      }

      .month {
        justify-content: center;
        min-height: 34px;
      }

      .bar-row {
        align-items: center;
        color: #fff;
        display: grid;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        font-weight: 900;
        gap: 10px;
        grid-template-columns: 145px minmax(0, 1fr);
        text-transform: uppercase;
      }

      .bar {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        height: 10px;
        overflow: hidden;
      }

      .bar span {
        background: #edff3d;
        display: block;
        height: 100%;
      }

      .connector {
        align-self: center;
        background: #edff3d;
        border-radius: 999px;
        height: 4px;
      }

      .deal-grid {
        display: grid;
        gap: 7px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .line {
        background: rgba(237, 255, 61, 0.7);
        height: 30px;
        margin-left: 24px;
        width: 4px;
      }

      .caption {
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.78);
        font-size: 13px;
        line-height: 1.35;
        padding: 12px;
      }

      .slice {
        min-height: 30px;
      }

      .quiz-page {
        display: grid;
        gap: 12px;
      }

      .quiz-card {
        border: 1px solid #dedad1;
        border-radius: 8px;
        display: grid;
        gap: 10px;
        padding: 14px 16px;
      }

      .question {
        font-size: 22px;
        font-weight: 800;
        line-height: 1.18;
        margin: 0;
      }

      .answers {
        display: grid;
        gap: 8px;
      }

      .answer {
        border: 1px solid #dedad1;
        border-radius: 8px;
        display: grid;
        gap: 7px;
        grid-template-columns: 34px minmax(0, 1fr);
        padding: 10px;
      }

      .answer.correct {
        background: #eef8d5;
        border-color: rgba(118, 145, 31, 0.42);
      }

      .letter {
        align-items: center;
        background: #f2efe6;
        border-radius: 999px;
        display: flex;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-weight: 900;
        height: 28px;
        justify-content: center;
        width: 28px;
      }

      .correct .letter {
        background: #edff3d;
      }

      .answer-text {
        font-size: 15px;
        font-weight: 750;
        line-height: 1.25;
      }

      .feedback {
        color: #777a73;
        font-size: 13px;
        line-height: 1.3;
      }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function createCover(title, subtitle) {
  return `<section class="cover">
    <div class="stamp">Dash.fi Underwriting Training · ${dateStamp}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
  </section>`;
}

async function writePdf(html, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    displayHeaderFooter: false,
    path: outputPath,
    printBackground: true,
  });

  await browser.close();
}

function getSlideLayout(kind, index) {
  if (
    ["lossPattern", "netAssets", "runway", "financialLanguage"].includes(kind)
  ) {
    return "metricLead";
  }

  if (
    index % 3 === 1 ||
    kind === "documentPacket" ||
    kind === "underwritingCall"
  ) {
    return "visualLead";
  }

  return "copyLead";
}

function getSlideTone(kind, index) {
  if (["balanceSheet", "statements", "documentPacket", "profiles"].includes(kind)) {
    return "light";
  }

  if (["underwritingPaths", "terms", "evaluationMatrix"].includes(kind)) {
    return "blue";
  }

  if (["runway", "marginCushion", "takeaway"].includes(kind)) {
    return "lime";
  }

  if (["underwritingCall", "ownershipControl"].includes(kind)) {
    return "violet";
  }

  return index % 2 === 0 ? "dark" : "blue";
}

function visualLabel(kind) {
  const labels = {
    opener: "context",
    profiles: "profile board",
    exposure: "exposure",
    businessLens: "business lens",
    terms: "terms",
    takeaway: "takeaway",
    financialLanguage: "financial language",
    balanceSheet: "balance sheet",
    netAssets: "net assets",
    currentRatio: "current ratio",
    runway: "runway",
    statements: "statements",
    underwritingPaths: "path decision",
    documentPacket: "document packet",
    evaluationMatrix: "evaluation factors",
    underwritingCall: "underwriting call",
    lossPattern: "loss pattern",
    ownershipControl: "control risk",
    marginCushion: "margin cushion",
    redFlags: "red flags",
    workflowVideo: "workflow video",
  };

  return labels[kind] ?? kind;
}

function hasSectionText(section, pattern) {
  return pattern.test(`${section.title ?? ""} ${section.stageTitle ?? ""}`);
}

function renderBars(labels, values = [82, 68, 58, 44, 72]) {
  return labels
    .map(
      (label, index) => `<div class="bar-row">
        <span>${escapeHtml(label)}</span>
        <div class="bar"><span style="width:${values[index] ?? 60}%"></span></div>
      </div>`
    )
    .join("");
}

function renderVisual(kind, section) {
  if (kind === "financialLanguage") {
    return `<div class="board">
      <div class="visual-meta">Financials 101</div>
      <div class="big-number">- $11M</div>
      <div class="stack-item">Revenue present</div>
      <div class="stack-item">Customers present</div>
      <div class="stack-item accent">Balance sheet changed the picture</div>
    </div>`;
  }

  if (kind === "balanceSheet") {
    return `<div class="board">
      <div class="tile-grid">
        <div class="tile"><div class="visual-meta">Balance sheet</div><strong>Owns</strong><span>Cash, inventory, equipment, receivables</span></div>
        <div class="tile"><div class="visual-meta">Liabilities</div><strong>Owes</strong><span>Loans, payables, credit lines</span></div>
      </div>
      <div class="equation">Owns - Owes = Position</div>
    </div>`;
  }

  if (kind === "netAssets") {
    return `<div class="board">
      <div class="row"><span>Total assets</span><strong>$3.0M</strong></div>
      <div class="row negative"><span>Total liabilities</span><strong>-$4.5M</strong></div>
      <div class="row accent"><span>Net asset position</span><strong>-$1.5M</strong></div>
    </div>`;
  }

  if (kind === "currentRatio") {
    return `<div class="board">
      <div class="equation">Current assets / Current liabilities</div>
      <div class="tile-grid">
        <div class="tile accent"><div class="visual-meta">Example A</div><strong>1.25</strong><span>$100K / $80K</span></div>
        <div class="tile"><div class="visual-meta">Example B</div><strong>0.67</strong><span>$100K / $150K</span></div>
      </div>
    </div>`;
  }

  if (kind === "runway") {
    return `<div class="board">
      <div class="tile-grid">
        <div class="tile"><div class="visual-meta">Bank balance</div><strong>$600K</strong></div>
        <div class="tile"><div class="visual-meta">Monthly burn</div><strong>$50K</strong></div>
      </div>
      <div class="months">${Array.from({ length: 12 }, (_, index) => `<div class="month">M${index + 1}</div>`).join("")}</div>
      <div class="rule">12 months supports extended-term confidence</div>
    </div>`;
  }

  if (kind === "statements") {
    return `<div class="board">
      <div class="statement-card"><div class="visual-meta">P&amp;L</div><strong>Movie</strong><span>Revenue minus expenses over time.</span></div>
      <div class="statement-card"><div class="visual-meta">Balance sheet</div><strong>Photograph</strong><span>What the business owns and owes today.</span></div>
      <div class="statement-card accent"><div class="visual-meta">Gross margin</div><strong>Cushion</strong><span>Room to absorb a bad month.</span></div>
    </div>`;
  }

  if (kind === "underwritingPaths") {
    const applicationPath = hasSectionText(section, /application|proposal/i);
    const netOnePath = hasSectionText(section, /net-1|no financials|reassurance/i);

    return `<div class="path-board">
      <div class="path-card accent"><div class="visual-meta">${applicationPath ? "Step 01" : "Path A"}</div><strong>${applicationPath ? "Application" : "Net-1"}</strong><span>${
        applicationPath
          ? "Starts the review, but does not lock final terms."
          : netOnePath
            ? "Lighter review path without the extended-term statements packet."
            : "Application, KYC, bank proof, address, EIN."
      }</span></div>
      <div class="connector"></div>
      <div class="path-card"><div class="visual-meta">${applicationPath ? "Step 02" : "Path B"}</div><strong>${applicationPath ? "Underwriting" : "Extended terms"}</strong><span>${
        applicationPath
          ? "Reads profile, packet, timing, and supportable limits."
          : "Net-1 packet plus 24 months balance sheet and P&L."
      }</span></div>
    </div>`;
  }

  if (kind === "documentPacket") {
    const handoff = hasSectionText(section, /handoff|bank|fallback/i);
    const confidentiality = hasSectionText(section, /confidential|float|financial documents/i);

    return `<div class="packet-board">
      <div class="board">
        <div class="stack-item accent">${handoff ? "Bank connection" : "Application"}</div>
        <div class="stack-item accent">${handoff ? "Statement fallback" : "KYC / KYB"}</div>
        <div class="stack-item accent">${handoff ? "Clean upload" : "Bank proof"}</div>
        <div class="stack-item accent">${handoff ? "UW-ready handoff" : "EIN + address"}</div>
      </div>
      <div class="connector"></div>
      <div class="board">
        <div class="stack-item accent">${confidentiality ? "Requested terms packet" : "24 months monthly financials"}</div>
        <div class="stack-item">Balance sheet</div>
        <div class="stack-item">Income statement / P&amp;L</div>
      </div>
    </div>`;
  }

  if (kind === "underwritingCall") {
    const reasonAsk = hasSectionText(section, /reason|ask/i);
    const timing = hasSectionText(section, /timing|simple|next/i);

    return `<div class="call-board">
      <div class="call-step">${reasonAsk ? "Reason" : timing ? "Rep sets context" : "AE context"}</div>
      <div class="connector"></div>
      <div class="call-step accent">${reasonAsk ? "Question" : timing ? "Focused follow-up" : "Reid + customer call"}</div>
      <div class="connector"></div>
      <div class="call-step">${reasonAsk ? "Outcome" : timing ? "UW can decide" : "Terms calibrated"}</div>
    </div>`;
  }

  if (kind === "evaluationMatrix") {
    const proposal = hasSectionText(section, /proposal|application/i);
    const discovery = hasSectionText(section, /revenue|spend|signals/i);
    const labels = proposal
      ? ["Application", "Packet quality", "Profile read", "Timing", "Proposal"]
      : discovery
        ? ["Revenue", "Spend pattern", "Cash", "Debt", "Margins"]
        : ["Cash runway", "Revenue trajectory", "Profitability path", "Debt context", "Company structure"];

    return `<div class="board">${renderBars(labels)}</div>`;
  }

  if (kind === "lossPattern") {
    return `<div class="board">
      <div class="big-number">$6.7M</div>
      <div class="deal-grid">${Array.from({ length: 9 }, (_, index) => `<div class="deal-cell">Deal ${index + 1}</div>`).join("")}</div>
      <div class="rule">Pattern missed before underwriting</div>
    </div>`;
  }

  if (kind === "ownershipControl") {
    return `<div class="board">
      <div class="node accent">Parent company</div>
      <div class="line"></div>
      <div class="node">Operating entity</div>
      <div class="caption">Revenue shown here. Cash control may sit above.</div>
    </div>`;
  }

  if (kind === "marginCushion") {
    return `<div class="board">
      <div class="slice">Revenue</div>
      <div class="slice">Cost of goods</div>
      <div class="slice">Operating expense</div>
      <div class="slice accent">Repayment cushion</div>
      <div class="rule">Thin margin leaves little room for timing risk</div>
    </div>`;
  }

  if (kind === "redFlags") {
    const questionRisk = hasSectionText(section, /questions feel risky|objection/i);
    const concern = hasSectionText(section, /concern/i);
    const flags = questionRisk
      ? ["No reason given", "Exact numbers too early", "Defensive answer", "No softer follow-up"]
      : concern
        ? ["PG concern", "Credit check concern", "UCC concern", "Financials concern"]
        : ["Recent bankruptcy", "Thin gross margin", "Parent controls cash", "Revenue hides distress"];

    return `<div class="flag-grid">${flags.map((flag) => `<div class="flag">${escapeHtml(flag)}</div>`).join("")}</div>`;
  }

  if (kind === "profiles") {
    return `<div class="profile-board">
      <div class="profile-card"><div class="visual-meta">Profile 01</div><strong>Ad spend</strong><span>High daily limits for paid media volume.</span></div>
      <div class="profile-card"><div class="visual-meta">Profile 02</div><strong>Shipping</strong><span>Carrier spend already happening every day.</span></div>
      <div class="profile-card"><div class="visual-meta">Profile 03</div><strong>Supplier payments</strong><span>Inventory, raw materials, suppliers.</span></div>
    </div>`;
  }

  if (kind === "exposure") {
    return `<div class="board">
      <div><span class="big-number">$500K</span> <span class="chip">Net-15</span></div>
      <div class="days">
        <div class="day accent">Day 1 spend</div>
        <div class="day">Day 5</div>
        <div class="day">Day 10</div>
        <div class="day">Day 15 auto repay</div>
      </div>
      <div class="rule">We carry exposure until repayment</div>
    </div>`;
  }

  if (kind === "businessLens") {
    return `<div class="tile-grid">
      <div class="tile"><div class="visual-meta">Traditional lens</div><strong>Founder profile</strong><span>FICO, PG, personal credit history.</span></div>
      <div class="tile accent"><div class="visual-meta">Dash.fi lens</div><strong>Business performance</strong><span>Revenue, cash position, trajectory, profitability path.</span></div>
    </div>`;
  }

  if (kind === "terms") {
    return `<div class="board">
      <div class="term-options">
        <div class="term accent">Net-1</div><div class="term">Net-7</div><div class="term">Net-15</div><div class="term">Net-30</div>
      </div>
      ${renderBars(["Cash position", "Revenue trajectory", "Net asset position", "Profitability"], [62, 52, 36, 48])}
    </div>`;
  }

  if (kind === "takeaway") {
    return `<div class="board">
      <div class="chip">Lesson takeaways</div>
      <div class="takeaway-item">We carry repayment exposure.</div>
      <div class="takeaway-item">Underwriting reads the business.</div>
      <div class="takeaway-item">Terms match the financial profile.</div>
    </div>`;
  }

  if (kind === "workflowVideo") {
    return `<div class="board">
      <div class="visual-meta">Screen recording package</div>
      <div class="big-number" style="font-size:34px">Workflow walkthrough</div>
      <div class="caption">Video recording, process order, and KB job aid review attach to this lesson.</div>
    </div>`;
  }

  return `<div class="board">
    <div class="big-number" style="font-size:38px">dash.fi</div>
    <div class="tile-grid">
      <div class="flag">High-limit corporate cards</div>
      <div class="flag">No personal guarantee</div>
      <div class="flag">Cashback</div>
      <div class="flag">Float options available</div>
    </div>
  </div>`;
}

function renderSlideFrame(slide) {
  const section = slide.section;
  const layout = getSlideLayout(section.kind, slide.index);
  const tone = getSlideTone(section.kind, slide.index);

  return `<div class="slide-frame">
    <div class="stage ${layout} ${tone}">
      <div class="copy">
        <div class="marker">${escapeHtml(visualLabel(section.kind))}</div>
        <div class="stage-title">${escapeHtml(section.stageTitle)}</div>
        <p class="stage-copy">${escapeHtml(section.stageCopy)}</p>
      </div>
      <div class="visual">${renderVisual(section.kind, section)}</div>
    </div>
  </div>`;
}

async function createSlidePdf(slides) {
  const pages = slides
    .map((slide) => {
      const section = slide.section;
      const moduleTitle = `Module ${slide.module.number}: ${slide.module.title}`;
      const lessonTitle = `Lesson ${slide.lesson.number}: ${slide.lesson.title}`;

      return `<section class="page slide-page">
        <header class="label">
          <div>
            <div class="eyebrow">${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)}</div>
            <h2>Slide ${slide.index + 1}: ${escapeHtml(section.stageTitle)}</h2>
          </div>
          <div class="meta">
            ${escapeHtml(section.kind)}<br />
            ${formatTime(section.start)} - ${formatTime(section.end)}
          </div>
        </header>
        ${renderSlideFrame(slide)}
      </section>`;
    })
    .join("");

  const html = createPdfShell(
    "Underwriting Training Slide Review",
    `${createCover(
      "Underwriting Training Slide Review",
      "Every LMS slide/section captured from review mode and organized by module, lesson, and slide number."
    )}${pages}`
  );

  await writePdf(html, slidePdfPath);
}

async function createQuizPdf(quizzes) {
  const pages = quizzes
    .map(({ checkpoint, index, lesson, module }) => {
      const moduleTitle = `Module ${module.number}: ${module.title}`;
      const lessonTitle = `Lesson ${lesson.number}: ${lesson.title}`;

      const answers = checkpoint.options
        .map(
          (option) => `<div class="answer${option.correct ? " correct" : ""}">
            <div class="letter">${escapeHtml(option.id.toUpperCase())}</div>
            <div>
              <div class="answer-text">${escapeHtml(option.text)}</div>
              <div class="feedback">${escapeHtml(option.feedback)}</div>
            </div>
          </div>`
        )
        .join("");

      return `<section class="page quiz-page">
        <header class="label">
          <div>
            <div class="eyebrow">${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)}</div>
            <h2>Skill Check ${index + 1}: ${escapeHtml(checkpoint.label)}</h2>
          </div>
          <div class="meta">
            ${formatTime(checkpoint.placement)}<br />
            Review: ${escapeHtml(checkpoint.reviewTarget)}
          </div>
        </header>
        <article class="quiz-card">
          <p class="question">${escapeHtml(checkpoint.question)}</p>
          <div class="answers">${answers}</div>
        </article>
      </section>`;
    })
    .join("");

  const html = createPdfShell(
    "Underwriting Training Quiz Review",
    `${createCover(
      "Underwriting Training Quiz Review",
      "Every lesson skill check with answer choices, correct answer highlighting, feedback copy, timestamp, and review target."
    )}${pages}`
  );

  await writePdf(html, quizPdfPath);
}

function renderSlidePage(slide) {
  const section = slide.section;
  const moduleTitle = `Module ${slide.module.number}: ${slide.module.title}`;
  const lessonTitle = `Lesson ${slide.lesson.number}: ${slide.lesson.title}`;

  return `<section class="page slide-page">
    <header class="label">
      <div>
        <div class="eyebrow">${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)}</div>
        <h2>Slide ${slide.index + 1}: ${escapeHtml(section.stageTitle)}</h2>
      </div>
      <div class="meta">
        ${escapeHtml(section.kind)}<br />
        ${formatTime(section.start)} - ${formatTime(section.end)}
      </div>
    </header>
    ${renderSlideFrame(slide)}
  </section>`;
}

function renderQuizPage({ checkpoint, index, lesson, module }) {
  const moduleTitle = `Module ${module.number}: ${module.title}`;
  const lessonTitle = `Lesson ${lesson.number}: ${lesson.title}`;

  const answers = checkpoint.options
    .map(
      (option) => `<div class="answer${option.correct ? " correct" : ""}">
        <div class="letter">${escapeHtml(option.id.toUpperCase())}</div>
        <div>
          <div class="answer-text">${escapeHtml(option.text)}</div>
          <div class="feedback">${escapeHtml(option.feedback)}</div>
        </div>
      </div>`
    )
    .join("");

  return `<section class="page quiz-page">
    <header class="label">
      <div>
        <div class="eyebrow">${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)}</div>
        <h2>Quiz ${index + 1}: ${escapeHtml(checkpoint.label)}</h2>
      </div>
      <div class="meta">
        ${formatTime(checkpoint.placement)}<br />
        Review: ${escapeHtml(checkpoint.reviewTarget)}
      </div>
    </header>
    <article class="quiz-card">
      <p class="question">${escapeHtml(checkpoint.question)}</p>
      <div class="answers">${answers}</div>
    </article>
  </section>`;
}

async function createCombinedPdf(course, productionData) {
  const pages = course.modules
    .filter(includeModule)
    .flatMap((module) =>
      module.lessons.flatMap((lesson) => {
        const lessonKey = `${module.number}-${lesson.number}`;
        const production = productionData[lessonKey];
        const slidePages = (production?.sections ?? []).map((section, index) =>
          renderSlidePage({
            index,
            lesson,
            lessonKey,
            module,
            section,
          })
        );
        const quizPages = (production?.checkpoints ?? []).map((checkpoint, index) =>
          renderQuizPage({
            checkpoint,
            index,
            lesson,
            lessonKey,
            module,
          })
        );

        return [...slidePages, ...quizPages];
      })
    )
    .join("");

  const moduleLabel = moduleFilter.size
    ? `Modules ${[...moduleFilter].sort((a, b) => a - b).join(" and ")}`
    : "All Modules";

  const html = createPdfShell(
    `Underwriting Training ${moduleLabel} Slide and Quiz Review`,
    `${createCover(
      `Underwriting Training ${moduleLabel} Review`,
      "Every slide/section plus quiz/checkpoint pages, ordered by module and lesson for audit review."
    )}${pages}`
  );

  await writePdf(html, combinedPdfPath);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const { course, productionData } = getTrainingCourse();
  const slides = getSlideRows(course, productionData);
  const quizzes = getQuizRows(course, productionData);

  console.log(`Writing slide review PDF: ${slidePdfPath}`);
  await createSlidePdf(slides);

  console.log(`Writing quiz review PDF: ${quizPdfPath}`);
  await createQuizPdf(quizzes);

  if (process.env.UNDERWRITING_COMBINED_REVIEW === "1") {
    console.log(`Writing combined slide + quiz review PDF: ${combinedPdfPath}`);
    await createCombinedPdf(course, productionData);
  }

  console.log(
    JSON.stringify(
      {
        combinedPdfPath:
          process.env.UNDERWRITING_COMBINED_REVIEW === "1"
            ? combinedPdfPath
            : null,
        quizCount: quizzes.length,
        quizPdfPath,
        slideCount: slides.length,
        slidePdfPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
