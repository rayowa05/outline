import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (_err) {
  ({ chromium } = require(path.join(os.homedir(), "node_modules/playwright")));
}
const { sequelize } = require("../build/server/storage/database.js");
const { buildAdmin, buildCollection } = require("../build/server/test/factories.js");
const documentCreator = require("../build/server/commands/documentCreator.js").default;
const { createContext } = require("../build/server/context.js");
const { H5PModule } = require("../build/server/models/index.js");
const {
  extractH5PPackageToStorage,
} = require("../build/server/utils/h5p.js");

const BASE_URL = "http://127.0.0.1:3000";

async function main() {
  const packagePath = path.join(os.tmpdir(), `h5p-gate-${Date.now()}.h5p`);
  await download(
    "https://api.h5p.org/v1/content-types/H5P.MultiChoice",
    packagePath
  );

  const user = await buildAdmin({
    email: `h5p-gate-${Date.now()}@dash.fi`,
    name: "H5P Gate Tester",
  });
  const collection = await buildCollection({
    name: "H5P Rendering Gate",
    teamId: user.teamId,
    userId: user.id,
  });

  const moduleId = randomUUID();
  let documentPath = "";

  await sequelize.transaction(async (transaction) => {
    const ctx = {
      ...createContext({ user, transaction }),
      state: {
        auth: {
          user,
          token: user.getSessionToken(),
          type: "app",
        },
        transaction,
      },
      request: {
        ip: "127.0.0.1",
      },
      ip: "127.0.0.1",
    };

    const extracted = await extractH5PPackageToStorage(packagePath, moduleId);
    await H5PModule.createWithCtx(ctx, {
      moduleId,
      title: extracted.title,
      contentType: extracted.contentType,
      documentId: null,
      teamId: user.teamId,
      userId: user.id,
    });

    const document = await documentCreator(ctx, {
      title: "H5P Rendering Gate",
      collectionId: collection.id,
      publish: true,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Inline H5P rendering gate.",
              },
            ],
          },
          {
            type: "h5p",
            attrs: {
              moduleId,
              title: extracted.title,
              contentType: extracted.contentType,
            },
          },
        ],
      },
    });

    await H5PModule.update(
      { documentId: document.id },
      { where: { moduleId }, transaction }
    );

    documentPath = document.path;
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error(`browser console error: ${message.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.error(`browser page error: ${err.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.error(
        `browser response ${response.status()}: ${response.request().method()} ${response.url()}`
      );
    }
  });
  page.on("requestfailed", (request) => {
    console.error(
      `browser request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`
    );
  });

  await page.goto(`${BASE_URL}/auth/redirect?token=${user.getTransferToken()}`, {
    waitUntil: "networkidle",
  });
  await page.goto(`${BASE_URL}${documentPath}`, { waitUntil: "networkidle" });

  try {
    await waitForRenderedH5P(page);
  } catch (err) {
    const failureScreenshotPath = path.join(
      os.tmpdir(),
      "h5p-rendering-gate-failure.png"
    );
    await page.screenshot({ path: failureScreenshotPath, fullPage: true });
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const h5pJsonResponse = await page
      .evaluate(async (id) => {
        const response = await fetch(`/api/h5p.content/${id}/h5p.json`);
        return {
          status: response.status,
          text: await response.text(),
        };
      }, moduleId)
      .catch((fetchErr) => ({
        status: 0,
        text:
          fetchErr instanceof Error
            ? fetchErr.message
            : "Unable to fetch h5p.json",
      }));
    console.error(
      JSON.stringify(
        {
          currentUrl: page.url(),
          documentPath,
          failureScreenshotPath,
          h5pJsonResponse,
          bodyText,
        },
        null,
        2
      )
    );
    throw err;
  }

  const trackingResult = await verifyTracking(page);

  const result = await page.evaluate(() => ({
    title: document.title,
    hasH5PNode: !!document.querySelector(".component-h5p"),
    hasH5PContent: !!document.querySelector(".h5p-content"),
    hasMultiChoice: !!document.querySelector(".h5p-multichoice"),
    text: document.body.innerText,
    errorText: document.querySelector(".component-h5p")?.textContent ?? "",
  }));

  const screenshotPath = path.join(os.tmpdir(), "h5p-rendering-gate.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}${documentPath}`, { waitUntil: "networkidle" });
  await waitForRenderedH5P(page);

  const mobileResult = await page.evaluate(() => ({
    hasH5PNode: !!document.querySelector(".component-h5p"),
    hasH5PContent: !!document.querySelector(".h5p-content"),
    hasMultiChoice: !!document.querySelector(".h5p-multichoice"),
    text: document.body.innerText,
  }));
  const mobileScreenshotPath = path.join(
    os.tmpdir(),
    "h5p-rendering-gate-mobile.png"
  );
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
  await browser.close();

  fs.rmSync(packagePath, { force: true });

  console.log(
    JSON.stringify(
      {
        ...result,
        moduleId,
        documentPath,
        screenshotPath,
        mobile: {
          ...mobileResult,
          screenshotPath: mobileScreenshotPath,
        },
        tracking: trackingResult,
      },
      null,
      2
    )
  );
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", reject);
  });
}

async function waitForRenderedH5P(page) {
  await page.waitForSelector(".component-h5p", { timeout: 15000 });
  await page.waitForSelector(".h5p-content", { timeout: 30000 });
  await page.waitForSelector(".h5p-multichoice", { timeout: 30000 });
  await page
    .getByText("What color does the blackcurrant berry actually have?")
    .waitFor({
      timeout: 30000,
    });
}

async function verifyTracking(page) {
  const trackingResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/h5p.track"),
    { timeout: 15000 }
  );

  await page.getByText("Very dark purple", { exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();

  const response = await trackingResponsePromise;
  const json = await response.json().catch(() => undefined);

  if (response.status() !== 200) {
    throw new Error(`H5P tracking returned HTTP ${response.status()}`);
  }

  return {
    status: response.status(),
    body: json,
  };
}

let exitCode = 0;

main()
  .catch((err) => {
    console.error(err);
    exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
    process.exit(exitCode);
  });
