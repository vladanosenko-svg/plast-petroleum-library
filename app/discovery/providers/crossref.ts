import { requestJson, type JsonRequestPolicy } from "../http-client.ts";
import type {
  DiscoveryQuery,
  DiscoverySearchOptions,
  LiteratureDiscoveryProvider,
  ProviderSearchResult,
} from "../types.ts";

interface CrossrefProviderOptions {
  contactEmail?: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export class CrossrefDiscoveryProvider implements LiteratureDiscoveryProvider {
  readonly id = "crossref" as const;
  private readonly contactEmail?: string;
  private readonly fetchImpl?: typeof fetch;
  private readonly sleep?: (milliseconds: number) => Promise<void>;

  constructor(options: CrossrefProviderOptions = {}) {
    this.contactEmail = options.contactEmail?.trim() || undefined;
    this.fetchImpl = options.fetchImpl;
    this.sleep = options.sleep;
  }

  async search(query: DiscoveryQuery, options: DiscoverySearchOptions): Promise<ProviderSearchResult> {
    const records: unknown[] = [];
    const seenCursors = new Set<string>();
    let cursor = "*";
    let pagesFetched = 0;

    while (pagesFetched < options.maxPages && records.length < options.maxResults) {
      if (seenCursors.has(cursor)) throw new Error("Crossref returned a repeated pagination cursor");
      seenCursors.add(cursor);
      const rows = Math.min(100, options.pageSize ?? 100, options.maxResults - records.length);
      const url = new URL("https://api.crossref.org/works");
      url.searchParams.set("query.bibliographic", query.query);
      url.searchParams.set("rows", String(rows));
      url.searchParams.set("cursor", cursor);
      if (this.contactEmail) url.searchParams.set("mailto", this.contactEmail);

      const userAgent = this.contactEmail
        ? `PLAST-Literature-Discovery/0.1 (mailto:${this.contactEmail})`
        : "PLAST-Literature-Discovery/0.1";
      const policy: JsonRequestPolicy = {
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        retryBaseDelayMs: options.retryBaseDelayMs,
        fetchImpl: this.fetchImpl,
        sleep: this.sleep,
      };
      const payload = await requestJson(
        url,
        { headers: { Accept: "application/json", "User-Agent": userAgent } },
        policy,
      );
      if (!isRecord(payload) || !isRecord(payload.message) || !Array.isArray(payload.message.items)) {
        throw new Error("Crossref returned an invalid response schema");
      }
      records.push(...payload.message.items.slice(0, options.maxResults - records.length));
      pagesFetched += 1;
      const nextCursor = typeof payload.message["next-cursor"] === "string" ? payload.message["next-cursor"] : undefined;
      if (!nextCursor || payload.message.items.length < rows) break;
      cursor = nextCursor;
    }

    return { provider: this.id, queryId: query.id, records, pagesFetched };
  }
}
