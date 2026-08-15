/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { sources } from "../app/data.ts";
import { R2DocumentStorage, type R2BucketLike } from "../app/storage/document-storage.ts";
import { serveSourceDocument } from "../app/storage/document-serving.ts";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  DOCUMENTS?: R2BucketLike;
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

    const documentRoute = /^\/library\/([^/]+)\/document$/.exec(url.pathname);
    if (documentRoute && (request.method === "GET" || request.method === "HEAD")) {
      const source = sources.find((item) => item.slug === decodeURIComponent(documentRoute[1]));
      if (!source) return new Response("Source not found", { status: 404 });
      if (source.access.status !== "local-fulltext" || !source.document?.storageKey) {
        return new Response("Document is not available", { status: 404 });
      }
      if (!env.DOCUMENTS) return new Response("Document storage is unavailable", { status: 503 });
      try {
        return await serveSourceDocument(request, source, new R2DocumentStorage(env.DOCUMENTS));
      } catch {
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
