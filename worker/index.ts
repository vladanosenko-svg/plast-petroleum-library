/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { sources } from "../app/data.ts";
import { R2DocumentStorage, type R2BucketLike } from "../app/storage/document-storage.ts";
import { serveSourceDocument } from "../app/storage/document-serving.ts";
import { ingestControlledDocument, IngestionRefusedError } from "../app/storage/document-ingestion.ts";
import { MAX_DOCUMENT_SIZE_BYTES, generateStorageKey } from "../app/storage/document-validation.ts";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  DOCUMENTS?: R2BucketLike;
  DOCUMENT_INGESTION_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const ingestionRoute = /^\/_internal\/document-ingestion\/([^/]+)$/.exec(url.pathname);
    if (ingestionRoute && (request.method === "PUT" || request.method === "DELETE")) {
      const suppliedToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      const expectedToken = env.DOCUMENT_INGESTION_TOKEN ?? "";
      const authorized = expectedToken.length >= 32
        && suppliedToken.length === expectedToken.length
        && [...suppliedToken].reduce(
          (difference, character, index) => difference | (character.charCodeAt(0) ^ expectedToken.charCodeAt(index)),
          0,
        ) === 0;
      if (!authorized) return new Response("Not found", { status: 404 });
      if (!env.DOCUMENTS) return new Response("Document storage is unavailable", { status: 503 });

      const sourceId = decodeURIComponent(ingestionRoute[1]);
      const source = sources.find((item) => item.id === sourceId);
      if (!source) return Response.json({ outcome: "refused", reason: "source-not-found" }, { status: 404 });
      const storage = new R2DocumentStorage(env.DOCUMENTS);

      try {
        if (request.method === "DELETE") {
          const checksum = request.headers.get("X-Document-Checksum") ?? "";
          const extension = request.headers.get("X-Document-Extension") ?? "";
          const storageKey = generateStorageKey(source.id, checksum, extension);
          await storage.delete(storageKey);
          console.info(JSON.stringify({ sourceId, storageKey, operation: "delete", outcome: "success" }));
          return Response.json({ sourceId, storageKey, operation: "delete", outcome: "success" });
        }

        const contentLength = Number(request.headers.get("Content-Length") ?? 0);
        if (contentLength > MAX_DOCUMENT_SIZE_BYTES) {
          return Response.json({ outcome: "refused", reason: "file-too-large" }, { status: 413 });
        }
        const encodedFilename = request.headers.get("X-Document-Filename-B64") ?? "";
        const base64 = encodedFilename.replace(/-/g, "+").replace(/_/g, "/");
        const filenameBytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const filename = new TextDecoder().decode(filenameBytes);
        const result = await ingestControlledDocument({
          source,
          storage,
          document: {
            bytes: await request.arrayBuffer(),
            filename,
            declaredMimeType: request.headers.get("Content-Type") ?? "application/octet-stream",
          },
          approveLocalStorage: request.headers.get("X-Approve-Local-Storage") === "true",
          replace: request.headers.get("X-Replace-Document") === "true",
        });
        const storageKey = result.manifestEntry.document.storageKey;
        console.info(JSON.stringify({ sourceId, storageKey, operation: "put", outcome: result.duplicateBinary ? "duplicate" : "success" }));
        return Response.json({
          sourceId,
          operation: "put",
          outcome: result.duplicateBinary ? "duplicate" : "success",
          duplicateBinary: result.duplicateBinary,
          manifestEntry: result.manifestEntry,
          replacedStorageKey: result.replacedStorageKey,
        });
      } catch (error) {
        const reason = error instanceof IngestionRefusedError ? error.code : "ingestion-failed";
        console.error(JSON.stringify({ sourceId, operation: request.method.toLocaleLowerCase("en-US"), outcome: "error", reason }));
        return Response.json({ outcome: "refused", reason, message: error instanceof Error ? error.message : String(error) }, {
          status: error instanceof IngestionRefusedError ? 409 : 400,
        });
      }
    }

    const documentRoute = /^\/library\/([^/]+)\/document$/.exec(url.pathname);
    if (documentRoute && (request.method === "GET" || request.method === "HEAD")) {
      const source = sources.find((item) => item.slug === decodeURIComponent(documentRoute[1]));
      if (!source) return new Response("Source not found", { status: 404 });
      if (source.access.status !== "local-fulltext" || !source.document?.storageKey) {
        return new Response("Document is not available", { status: 404 });
      }
      if (!env.DOCUMENTS) return new Response("Document storage is unavailable", { status: 503 });
      try {
        const response = await serveSourceDocument(request, source, new R2DocumentStorage(env.DOCUMENTS));
        console.info(JSON.stringify({ sourceId: source.id, storageKey: source.document.storageKey, operation: request.method.toLocaleLowerCase("en-US"), outcome: response.ok ? "success" : `http-${response.status}` }));
        return response;
      } catch (error) {
        console.error(JSON.stringify({ sourceId: source.id, storageKey: source.document.storageKey, operation: request.method.toLocaleLowerCase("en-US"), outcome: "error", message: error instanceof Error ? error.message : String(error) }));
        return new Response("Document storage is temporarily unavailable", { status: 503 });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
