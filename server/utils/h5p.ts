import path from "node:path";
import type { Readable } from "node:stream";
import { lookup } from "mime-types";
import type { Entry, ZipFile } from "yauzl";
import yauzl from "yauzl";
import { ValidationError } from "@server/errors";
import FileStorage from "@server/storage/files";

interface H5PPackageDefinition {
  title?: string;
  mainLibrary?: string;
}

export interface ExtractedH5PPackage {
  title: string;
  contentType: string;
  storedPaths: string[];
}

/**
 * Extracts an uploaded H5P package into configured file storage.
 *
 * @param filePath The temporary uploaded .h5p file path.
 * @param moduleId The module identifier used as the storage prefix.
 * @returns metadata from the H5P package.
 */
export async function extractH5PPackageToStorage(
  filePath: string,
  moduleId: string
): Promise<ExtractedH5PPackage> {
  const zip = await openZip(filePath);
  const storedPaths: string[] = [];
  let h5pJson: H5PPackageDefinition | undefined;
  let hasContentJson = false;

  await readZipEntries(zip, async (entry) => {
    const safePath = sanitizeZipPath(entry.fileName);
    if (!safePath) {
      return;
    }

    const buffer = await readEntryBuffer(zip, entry);

    if (safePath === "h5p.json") {
      h5pJson = parseH5PJson(buffer);
    }

    if (safePath === "content/content.json") {
      hasContentJson = true;
    }

    await FileStorage.store({
      body: buffer,
      contentLength: buffer.byteLength,
      contentType: lookup(safePath) || "application/octet-stream",
      key: getH5PStorageKey(moduleId, safePath),
      acl: "private",
    });
    storedPaths.push(safePath);
  });

  if (!h5pJson) {
    throw ValidationError("H5P package is missing h5p.json");
  }

  if (!hasContentJson) {
    throw ValidationError("H5P package is missing content/content.json");
  }

  if (!h5pJson.mainLibrary) {
    throw ValidationError("H5P package is missing mainLibrary");
  }

  return {
    title: h5pJson.title || "Untitled H5P module",
    contentType: h5pJson.mainLibrary,
    storedPaths,
  };
}

/**
 * Builds the object storage key for an extracted H5P file.
 *
 * @param moduleId The H5P module identifier.
 * @param filePath The normalized package-relative path.
 * @returns storage key for the extracted file.
 */
export function getH5PStorageKey(moduleId: string, filePath: string) {
  return `h5p/${moduleId}/${filePath}`;
}

function openZip(filePath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zip) => {
      if (err) {
        reject(err);
        return;
      }

      if (!zip) {
        reject(new Error("Unable to open H5P package"));
        return;
      }

      resolve(zip);
    });
  });
}

function readZipEntries(
  zip: ZipFile,
  onEntry: (entry: Entry) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    zip.on("entry", (entry) => {
      void onEntry(entry)
        .then(() => zip.readEntry())
        .catch((err) => {
          zip.close();
          reject(err);
        });
    });
    zip.on("end", resolve);
    zip.on("error", reject);
    zip.readEntry();
  });
}

function readEntryBuffer(zip: ZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      if (!stream) {
        reject(new Error("Unable to read H5P package entry"));
        return;
      }

      streamToBuffer(stream).then(resolve).catch(reject);
    });
  });
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function sanitizeZipPath(entryPath: string) {
  if (entryPath.endsWith("/")) {
    return undefined;
  }

  const normalized = path.posix.normalize(entryPath).replace(/^\/+/, "");
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("__MACOSX/")
  ) {
    return undefined;
  }

  return normalized;
}

function parseH5PJson(buffer: Buffer): H5PPackageDefinition {
  try {
    return JSON.parse(buffer.toString("utf8")) as H5PPackageDefinition;
  } catch (_err) {
    throw ValidationError("H5P package contains invalid h5p.json");
  }
}
