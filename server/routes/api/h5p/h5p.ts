import { randomUUID } from "node:crypto";
import Router from "koa-router";
import { lookup } from "mime-types";
import env from "@server/env";
import { NotFoundError, ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import multipart from "@server/middlewares/multipart";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, H5PModule } from "@server/models";
import { authorize } from "@server/policies";
import FileStorage from "@server/storage/files";
import type { APIContext } from "@server/types";
import fetch from "@server/utils/fetch";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import {
  extractH5PPackageToStorage,
  getH5PStorageKey,
} from "@server/utils/h5p";
import * as T from "./schema";

const router = new Router();

router.post(
  "h5p.upload",
  auth(),
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  multipart({
    maximumFileSize: env.FILE_STORAGE_UPLOAD_MAX_SIZE,
  }),
  validate(T.H5PUploadSchema),
  transaction(),
  async (ctx: APIContext<T.H5PUploadReq>) => {
    const { documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { file } = ctx.input;

    if (!file.originalFilename?.toLowerCase().endsWith(".h5p")) {
      throw ValidationError("Only .h5p files can be uploaded");
    }

    if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        transaction: ctx.state.transaction,
      });
      authorize(user, "update", document);
    }

    authorize(user, "createAttachment", user.team);

    const moduleId = randomUUID();
    const extracted = await extractH5PPackageToStorage(
      file.filepath,
      moduleId
    );

    const module = await H5PModule.createWithCtx(ctx, {
      moduleId,
      title: extracted.title,
      contentType: extracted.contentType,
      documentId: documentId ?? null,
      teamId: user.teamId,
      userId: user.id,
    });

    ctx.body = {
      data: {
        moduleId: module.moduleId,
        title: module.title,
        contentType: module.contentType,
      },
    };
  }
);

router.post(
  "h5p.track",
  auth(),
  rateLimiter(RateLimiterStrategy.OneHundredPerMinute),
  validate(T.H5PTrackSchema),
  async (ctx: APIContext<T.H5PTrackReq>) => {
    const { moduleId, moduleTitle, contentType, statement } = ctx.input.body;
    const { user } = ctx.state.auth;

    const module = await H5PModule.findOne({
      where: {
        moduleId,
        teamId: user.teamId,
      },
    });

    if (!module) {
      throw NotFoundError("H5P module not found");
    }

    await authorizeModuleAccess(user, module);

    if (!env.H5P_TRACKING_URL) {
      ctx.body = {
        data: {
          tracked: false,
          reason: "not_configured",
        },
      };
      return;
    }

    const payload = mapXAPIStatement({
      statement,
      userEmail: user.email ?? user.id,
      userName: user.name,
      moduleId,
      moduleTitle: moduleTitle || module.title,
      contentType: contentType || module.contentType,
    });

    try {
      const response = await fetch(env.H5P_TRACKING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        timeout: 5000,
      });

      if (!response.ok) {
        Logger.warn("H5P tracking endpoint rejected event", {
          status: response.status,
          moduleId,
        });
        ctx.body = {
          data: {
            tracked: false,
            status: response.status,
          },
        };
        return;
      }

      ctx.body = {
        data: {
          tracked: true,
        },
      };
    } catch (err) {
      Logger.warn("H5P tracking endpoint failed", {
        moduleId,
        error: err instanceof Error ? err.message : err,
      });
      ctx.body = {
        data: {
          tracked: false,
        },
      };
    }
  }
);

router.get(
  "h5p.content/:moduleId/:filePath*",
  auth(),
  async (ctx: APIContext) => {
    const { moduleId, filePath: requestedPath } = ctx.params;
    const { user } = ctx.state.auth;
    const filePath = requestedPath || "h5p.json";

    const module = await H5PModule.findOne({
      where: {
        moduleId,
        teamId: user.teamId,
      },
    });

    if (!module) {
      throw NotFoundError("H5P module not found");
    }

    await authorizeModuleAccess(user, module);

    const stream = await FileStorage.getFileStream(
      getH5PStorageKey(moduleId, filePath)
    );

    if (!stream) {
      throw NotFoundError("H5P content not found");
    }

    ctx.type = lookup(filePath) || "application/octet-stream";
    ctx.set("Cache-Control", "private, max-age=300");
    ctx.body = stream;
  }
);

async function authorizeModuleAccess(
  user: APIContext["state"]["auth"]["user"],
  module: H5PModule
) {
  if (!module.documentId) {
    if (module.userId !== user.id) {
      throw NotFoundError("H5P module not found");
    }

    return;
  }

  const document = await Document.findByPk(module.documentId, {
    userId: user.id,
  });

  authorize(user, "read", document);
}

function mapXAPIStatement({
  statement,
  userEmail,
  userName,
  moduleId,
  moduleTitle,
  contentType,
}: {
  statement: Record<string, unknown>;
  userEmail: string;
  userName: string;
  moduleId: string;
  moduleTitle?: string | null;
  contentType?: string | null;
}) {
  const result = getRecord(statement.result);
  const score = getRecord(result?.score);
  const object = getRecord(statement.object);
  const definition = getRecord(object?.definition);

  return {
    user_email: userEmail,
    user_name: userName,
    module_id: moduleId,
    module_title: moduleTitle,
    content_type: contentType,
    event_type: getEventType(statement),
    question_text: getLanguageValue(definition?.description),
    answer_given: getString(result?.response),
    answer_correct:
      typeof result?.success === "boolean" ? result.success : undefined,
    score: getNumber(score?.raw),
    max_score: getNumber(score?.max),
    duration_seconds: parseDurationSeconds(getString(result?.duration)),
    raw_xapi: statement,
  };
}

function getEventType(statement: Record<string, unknown>) {
  const verb = getRecord(statement.verb);
  const verbId = getString(verb?.id);

  if (verbId) {
    return verbId.split("/").filter(Boolean).pop() || verbId;
  }

  const display = getRecord(verb?.display);
  return getLanguageValue(display) || "interacted";
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getLanguageValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  const record = getRecord(value);
  if (!record) {
    return undefined;
  }

  return (
    getString(record["en-US"]) ||
    getString(record.en) ||
    getString(Object.values(record).find((item) => typeof item === "string"))
  );
}

function parseDurationSeconds(duration?: string) {
  if (!duration) {
    return undefined;
  }

  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  );
  if (!match) {
    return undefined;
  }

  const [, days, hours, minutes, seconds] = match;
  return Math.round(
    (Number(days ?? 0) * 24 + Number(hours ?? 0)) * 3600 +
      Number(minutes ?? 0) * 60 +
      Number(seconds ?? 0)
  );
}

export default router;
