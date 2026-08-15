import type { Source } from "../source-registry.ts";
import type { DocumentStorage } from "./document-storage.ts";

function contentDisposition(filename: string, inline: boolean) {
  const normalized = [...filename.normalize("NFKC")]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
  const fallback = normalized
    .replace(/[\\/"]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_")
    .slice(0, 150) || "document";
  const encoded = encodeURIComponent(normalized.replace(/[\\/]/g, "_")).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function parseRange(value: string | null, size: number) {
  if (!value) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    const length = Math.min(suffixLength, size);
    return { offset: size - length, length };
  }
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset < 0 || offset >= size || end < offset) return null;
  return { offset, length: Math.min(end, size - 1) - offset + 1 };
}

export async function serveSourceDocument(request: Request, source: Source, storage: DocumentStorage) {
  const document = source.document;
  if (
    source.access.status !== "local-fulltext" ||
    !document?.storageKey ||
    !document.checksumSha256 ||
    !document.fileSizeBytes ||
    !document.mimeType ||
    !document.originalFilename
  ) {
    return new Response("Document is not available", { status: 404 });
  }

  const metadata = await storage.head(document.storageKey);
  if (!metadata) return new Response("Document is not available", { status: 404 });
  const etag = `"${document.checksumSha256}"`;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": contentDisposition(document.originalFilename, document.format === "pdf"),
    "Content-Type": document.mimeType,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  });
  if (document.format === "html") headers.set("Content-Security-Policy", "sandbox");
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });

  const range = parseRange(request.headers.get("Range"), metadata.fileSizeBytes);
  if (range === null) {
    headers.set("Content-Range", `bytes */${metadata.fileSizeBytes}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Length", String(range?.length ?? metadata.fileSizeBytes));
  if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.fileSizeBytes}`);
  if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });

  const object = await storage.get(document.storageKey, range ?? undefined);
  if (!object) return new Response("Document is not available", { status: 404 });
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
