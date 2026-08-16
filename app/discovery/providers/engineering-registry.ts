import { engineeringRegistryRecords, type EngineeringRegistryRecord } from "../engineering-registry.ts";
import type {
  DiscoveryQuery,
  DiscoverySearchOptions,
  LiteratureDiscoveryProvider,
  ProviderSearchResult,
} from "../types.ts";

export interface EngineeringRegistryProviderOptions {
  records?: readonly EngineeringRegistryRecord[];
}
export class EngineeringRegistryDiscoveryProvider implements LiteratureDiscoveryProvider {
  readonly id = "engineering-registry" as const;
  private readonly records: readonly EngineeringRegistryRecord[];

  constructor(options: EngineeringRegistryProviderOptions = {}) {
    this.records = options.records ?? engineeringRegistryRecords;
  }

  async search(query: DiscoveryQuery, options: DiscoverySearchOptions): Promise<ProviderSearchResult> {
    if (query.provider !== this.id) throw new Error(`Engineering registry cannot serve provider ${query.provider}`);
    const requestedTypes = new Set(query.requestedSourceTypes ?? []);
    const matching = this.records.filter((record) =>
      record.topicIds.includes(query.topicId)
      && (!query.engineeringLayer || record.knowledgeLayers.includes(query.engineeringLayer))
      && (requestedTypes.size === 0 || requestedTypes.has(record.sourceType)),
    );
    const maxResults = Math.min(query.resultLimit, options.maxResults);
    return {
      provider: this.id,
      queryId: query.id,
      records: matching.slice(0, maxResults),
      pagesFetched: 1,
      rawRecordsFetched: matching.length,
    };
  }
}
