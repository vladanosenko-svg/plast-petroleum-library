import { requestJson, type JsonRequestPolicy } from "../http-client.ts";
import type {
  DiscoveryQuery,
  DiscoverySearchOptions,
  LiteratureDiscoveryProvider,
  ProviderSearchResult,
} from "../types.ts";

interface OpenAlexProviderOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export class OpenAlexDiscoveryProvider implements LiteratureDiscoveryProvider {
  readonly id = "openalex" as const;
  private readonly apiKey?: string;
  private readonly fetchImpl?: typeof fetch;
  private readonly sleep?: (milliseconds: number) => Promise<void>;

  constructor(options: OpenAlexProviderOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.fetchImpl = options.fetchImpl;
    this.sleep = options.sleep;
  }

  async search(query: DiscoveryQuery, options: DiscoverySearchOptions): Promise<ProviderSearchResult> {
    const records: unknown[] = [];
    const seenCursors = new Set<string>();
    let cursor = "*";
    let pagesFetched = 0;

    while (pagesFetched < options.maxPages && records.length < options.maxResults) {
      if (seenCursors.has(cursor)) throw new Error("OpenAlex returned a repeated pagination cursor");
      seenCursors.add(cursor);
      const url = new URL("https://api.openalex.org/works");
      url.searchParams.set("search", query.query);
      url.searchParams.set("per_page", String(Math.min(100, options.pageSize ?? 100, options.maxResults - records.length)));
      url.searchParams.set("cursor", cursor);
      url.searchParams.set(
        "select",
        "id,doi,title,display_name,publication_year,type,language,cited_by_count,is_retracted,primary_location,best_oa_location,open_access,authorships,ids,biblio",
      );
      if (this.apiKey) url.searchParams.set("api_key", this.apiKey);

      const policy: JsonRequestPolicy = {
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        retryBaseDelayMs: options.retryBaseDelayMs,
        fetchImpl: this.fetchImpl,
        sleep: this.sleep,
      };
      const payload = await requestJson(url, { headers: { Accept: "application/json" } }, policy);
      if (!isRecord(payload) || !Array.isArray(payload.results) || !isRecord(payload.meta)) {
        throw new Error("OpenAlex returned an invalid response schema");
      }
      records.push(...payload.results.slice(0, options.maxResults - records.length));
      pagesFetched += 1;
      const nextCursor = typeof payload.meta.next_cursor === "string" ? payload.meta.next_cursor : undefined;
      if (!nextCursor || payload.results.length === 0) break;
      cursor = nextCursor;
    }

    return { provider: this.id, queryId: query.id, records, pagesFetched };
  }
}
