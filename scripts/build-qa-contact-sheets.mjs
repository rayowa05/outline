import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const qaRoot = path.resolve(
  repoRoot,
  "../../_training/underwriting-training/reviews/launch-qa-2026-06-04"
);
const screenshotRoot = path.join(qaRoot, "screenshots");
const sheetRoot = path.join(qaRoot, "contact-sheets");

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

function walkLessonDirs(passDir) {
  const lessonDirs = [];
  for (const moduleName of fs.readdirSync(passDir)) {
    const modulePath = path.join(passDir, moduleName);
    if (!fs.statSync(modulePath).isDirectory()) {
      continue;
    }
    for (const lessonName of fs.readdirSync(modulePath)) {
      const lessonPath = path.join(modulePath, lessonName);
      if (fs.statSync(lessonPath).isDirectory()) {
        lessonDirs.push({ moduleName, lessonName, lessonPath });
      }
    }
  }
  return lessonDirs.sort((a, b) =>
    `${a.moduleName}/${a.lessonName}`.localeCompare(`${b.moduleName}/${b.lessonName}`)
  );
}

function htmlForLesson({ moduleName, lessonName, lessonPath }, passName) {
  const files = fs
    .readdirSync(lessonPath)
    .filter((file) => file.endsWith(".png"))
    .sort();
  const cards = files
    .map((file) => {
      const absolutePath = path.join(lessonPath, file);
      const label = file
        .replace(/^\d+-/, "")
        .replace(/-\d+\.\d+s\.png$/, "")
        .replace(/-/g, " ");
      return `<figure><img src="file://${absolutePath}" /><figcaption>${label}</figcaption></figure>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${passName} ${moduleName} ${lessonName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #f7f5ef;
      color: #20302d;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    h1 {
      margin: 0 0 18px;
      font-size: 26px;
      line-height: 1.1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    figure {
      margin: 0;
      padding: 10px;
      background: #fffcf5;
      border: 1px solid #dedad1;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      border: 1px solid #d7d1c6;
    }
    figcaption {
      margin-top: 8px;
      color: #555a52;
      font-size: 12px;
      line-height: 1.35;
      text-transform: uppercase;
      letter-spacing: 0;
    }
  </style>
</head>
<body>
  <h1>${passName} / ${moduleName} / ${lessonName}</h1>
  <div class="grid">${cards}</div>
</body>
</html>`;
}

async function run() {
  ensureDir(sheetRoot);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  for (const passName of fs.readdirSync(screenshotRoot).filter((name) => name.startsWith("pass-")).sort()) {
    const passDir = path.join(screenshotRoot, passName);
    const passSheetDir = path.join(sheetRoot, passName);
    ensureDir(passSheetDir);
    for (const lesson of walkLessonDirs(passDir)) {
      const htmlPath = path.join(
        passSheetDir,
        `${slug(`${lesson.moduleName}-${lesson.lessonName}`)}.html`
      );
      const pngPath = htmlPath.replace(/\.html$/, ".png");
      fs.writeFileSync(htmlPath, htmlForLesson(lesson, passName));
      await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
      await page.screenshot({ path: pngPath, fullPage: true });
      console.log(pngPath);
    }
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
