import type {
  PublicationMetadata,
  SourceAuthor,
  SourceLanguage,
  SourceType,
} from "../source-registry.ts";

export const internationalDiscoveryProviders = ["openalex", "crossref"] as const;
export const russianDiscoveryProviders = ["cyberleninka", "kpfu"] as const;
export const discoveryProviders = [
  ...internationalDiscoveryProviders,
  ...russianDiscoveryProviders,
] as const;
export type DiscoveryProvider = (typeof discoveryProviders)[number];
export type DiscoveryQueryLanguage = "ru" | "en";
export type DiscoveryAccessHint = "metadata-only" | "external-fulltext" | "unknown";

export function isRussianDiscoveryProvider(
  provider: DiscoveryProvider,
): provider is (typeof russianDiscoveryProviders)[number] {
  return (russianDiscoveryProviders as readonly DiscoveryProvider[]).includes(provider);
}

export interface DiscoveryLimits {
  maxQueriesPerTopicPerLanguage: number;
  maxResultsPerQuery: number;
  maxPagesPerQuery: number;
  maxTotalResultsPerRun: number;
  concurrency: number;
  requestDelayMs: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
}

export interface DiscoveryQuery {
  id: string;
  topicId: string;
  language: DiscoveryQueryLanguage;
  query: string;
  provider: DiscoveryProvider;
  resultLimit: number;
}

export interface DiscoverySearchOptions {
  maxResults: number;
  maxPages: number;
  pageSize?: number;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
}

export interface ProviderSearchResult {
  provider: DiscoveryProvider;
  queryId: string;
  records: unknown[];
  pagesFetched: number;
  rawRecordsFetched?: number;
}

export interface LiteratureDiscoveryProvider {
  id: DiscoveryProvider;
  search(query: DiscoveryQuery, options: DiscoverySearchOptions): Promise<ProviderSearchResult>;
}

export interface DiscoveryProvenance {
  provider: DiscoveryProvider;
  providerRecordId: string;
  queryId: string;
  topicId: string;
  queryLanguage: DiscoveryQueryLanguage;
  discoveredAt: string;
  landingPage?: string;
}

export interface DiscoveryIdentifiers {
  doi?: string;
  isbn?: string[];
  issn?: string[];
  openAlexId?: string;
  crossrefId?: string;
}

export interface DiscoveryUrls {
  landingPage?: string;
  doi?: string;
  openAccess?: string;
}

export interface DiscoveryOpenAccess {
  isOpenAccess?: boolean;
  status?: string;
  license?: string;
}

export interface DiscoveryQualitySignals {
  openAlexCitedByCount?: number;
  crossrefReferencedByCount?: number;
  isRetracted?: boolean;
}

export interface DiscoveryFieldConflict {
  field: string;
  values: string[];
}

export interface DiscoveryCandidate {
  id: string;
  title: string;
  normalizedTitle: string;
  authors: SourceAuthor[];
  publicationYear?: number;
  sourceType?: SourceType;
  language?: SourceLanguage;
  identifiers: DiscoveryIdentifiers;
  publication?: PublicationMetadata;
  urls?: DiscoveryUrls;
  openAccess?: DiscoveryOpenAccess;
  qualitySignals?: DiscoveryQualitySignals;
  accessHint?: DiscoveryAccessHint;
  providerMetadata?: Record<string, string | string[]>;
  topicIds: string[];
  provenance: DiscoveryProvenance[];
  fieldConflicts?: DiscoveryFieldConflict[];
  recordStatus: "candidate";
}

export interface DiscoveryProviderRunStatus {
  provider: DiscoveryProvider;
  queriesAttempted: number;
  queriesSucceeded: number;
  queriesFailed: number;
  rawRecords: number;
  acceptedRecords: number;
  errors: string[];
}

export interface DiscoveryRunSummary {
  uniqueCandidates: number;
  exactMerged: number;
  ruCandidates: number;
  enCandidates: number;
  bothQueryLanguages: number;
  withDoi: number;
  withIsbn: number;
  withoutStrongIdentifier: number;
  russianProviderCandidates: number;
  withOpenAccessMetadata: number;
  fieldConflicts: number;
  examples: string[];
}

export interface DiscoveryRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  topicIds: string[];
  providers: DiscoveryProvider[];
  limits: DiscoveryLimits;
  queriesAttempted: number;
  queriesSucceeded: number;
  queriesFailed: number;
  rawRecords: number;
  normalizedCandidates: number;
  status: "completed" | "partial" | "failed";
  providerStatuses: DiscoveryProviderRunStatus[];
  summary: DiscoveryRunSummary;
}

export interface DiscoveryExecutionResult {
  run: DiscoveryRun;
  candidates: DiscoveryCandidate[];
}
