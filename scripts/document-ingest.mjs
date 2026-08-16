import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sources } from "../app/data.ts";
import { validateDocumentManifest } from "../app/document-manifest.ts";
import { inspectDocument } from "../app/storage/document-validation.ts";

const mimeTypes = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".epub": "application/epub+zip",
  ".html": "text/html",
  ".htm": "text/html",
  ".txt": "text/plain",
};

function parseArguments(values) {
  const options = { approveLocalStorage: false, replace: false, remove: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--approve-local-storage") options.approveLocalStorage = true;
    else if (value === "--replace") options.replace = true;
    else if (value === "--remove") options.remove = true;
    else if (["--source", "--file", "--endpoint"].includes(value)) options[value.slice(2)] = values[++index];
    else throw new Error(`Неизвестный аргумент: ${value}`);
  }
  return options;
}

function filenameHeader(filename) {
  return Buffer.from(filename, "utf8").toString("base64url");
}

async function updateManifest(manifestPath, update) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  update(manifest);
  const normalized = Object.fromEntries(Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right, "en")));
  const issues = validateDocumentManifest(normalized, sources);
  if (issues.length > 0) throw new Error(issues.map((issue) => `${issue.sourceId}.${issue.path}: ${issue.message}`).join("\n"));
  const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, manifestPath);
}

function refuse(message) {
  console.error(`INGESTION REFUSED\n${message}`);
  process.exitCode = 1;
}

let options;
try {
  options = parseArguments(process.argv.slice(2));
} catch (error) {
  refuse(error instanceof Error ? error.message : String(error));
}

if (options) {
  const source = sources.find((item) => item.id === options.source || item.slug === options.source);
  const endpoint = options.endpoint ?? process.env.PLAST_DOCUMENT_INGESTION_URL;
  const token = process.env.PLAST_DOCUMENT_INGESTION_TOKEN;
  const sitesAuthToken = process.env.PLAST_SITES_AUTH_TOKEN;
  const manifestPath = fileURLToPath(new URL("../app/data/source-documents.json", import.meta.url));

  if (!source) refuse("Source не найден");
  else if (!endpoint) refuse("Нужен --endpoint или PLAST_DOCUMENT_INGESTION_URL");
  else if (!token || token.length < 32) refuse("PLAST_DOCUMENT_INGESTION_TOKEN отсутствует или слишком короткий");
  else if (options.remove) {
    if (!source.document?.checksumSha256 || !source.document.storageKey) refuse("Source не имеет document в manifest");
    else {
      const extension = source.document.storageKey.split(".").pop() ?? "";
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/_internal/document-ingestion/${encodeURIComponent(source.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(sitesAuthToken ? { "OAI-Sites-Authorization": `Bearer ${sitesAuthToken}` } : {}),
          "X-Document-Checksum": source.document.checksumSha256,
          "X-Document-Extension": extension,
        },
      });
      if (!response.ok) refuse(`R2 DELETE завершился HTTP ${response.status}`);
      else {
        await updateManifest(manifestPath, (manifest) => delete manifest[source.id]);
        console.log(`Source: ${source.id}\nStorage key: ${source.document.storageKey}\nR2 outcome: deleted\nManifest: updated`);
      }
    }
  } else if (!options.file) refuse("Нужен --file");
  else if (source.access.status !== "local-fulltext" && !options.approveLocalStorage) {
    refuse("Source имеет metadata-only/external доступ; нужен явный --approve-local-storage");
  } else if (source.document?.storageKey && !options.replace) {
    refuse("Source уже имеет document; для замены нужен --replace");
  } else {
    const filePath = resolve(options.file);
    const filename = basename(filePath);
    const bytes = await readFile(filePath);
    const declaredMimeType = mimeTypes[extname(filename).toLocaleLowerCase("en-US")] ?? "application/octet-stream";
    try {
      const inspected = await inspectDocument({ bytes, filename, declaredMimeType });
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/_internal/document-ingestion/${encodeURIComponent(source.id)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(sitesAuthToken ? { "OAI-Sites-Authorization": `Bearer ${sitesAuthToken}` } : {}),
          "Content-Type": inspected.mimeType,
          "X-Document-Filename-B64": filenameHeader(inspected.originalFilename),
          "X-Approve-Local-Storage": String(options.approveLocalStorage),
          "X-Replace-Document": String(options.replace),
        },
        body: bytes,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.manifestEntry) {
        refuse(`${result.message ?? result.reason ?? `R2 PUT завершился HTTP ${response.status}`}`);
      } else {
        const remoteDocument = result.manifestEntry.document;
        if (
          remoteDocument.checksumSha256 !== inspected.checksumSha256
          || remoteDocument.fileSizeBytes !== inspected.fileSizeBytes
          || remoteDocument.mimeType !== inspected.mimeType
        ) {
          throw new Error("Remote verification metadata не совпадает с локальной инспекцией");
        }
        await updateManifest(manifestPath, (manifest) => {
          if (manifest[source.id] && !options.replace) throw new Error("Manifest уже содержит document; нужен --replace");
          manifest[source.id] = result.manifestEntry;
        });
        console.log([
          `Source: ${source.id}`,
          `File: ${filePath}`,
          `Format: ${inspected.format}`,
          `Size: ${inspected.fileSizeBytes}`,
          `SHA-256: ${inspected.checksumSha256}`,
          `Storage key: ${remoteDocument.storageKey}`,
          `R2 outcome: ${result.outcome}`,
          "HEAD verification: success",
          "Manifest: updated atomically",
        ].join("\n"));
      }
    } catch (error) {
      refuse(error instanceof Error ? error.message : String(error));
    }
  }
}
