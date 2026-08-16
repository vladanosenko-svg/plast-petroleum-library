import type {
  PublicationMetadata,
  SourceAuthor,
  SourceLanguage,
  SourceType,
} from "../source-registry.ts";

export const internationalDiscoveryProviders = ["openalex", "crossref"] as const;
export const russianDiscoveryProviders = ["cyberleninka", "kpfu"] as const;
export const engineeringDiscoveryProviders = ["engineering-registry"] as const;
export const discoveryProviders = [
  ...internationalDiscoveryProviders,
  ...russianDiscoveryProviders,
] as const;
export const allDiscoveryProviders = [
  ...discoveryProviders,
  ...engineeringDiscoveryProviders,
] as const;
export type DiscoveryProvider = (typeof allDiscoveryProviders)[number];
export type DiscoveryQueryLanguage = "ru" | "en";
export type DiscoveryAccessHint = "metadata-only" | "external-fulltext" | "unknown";

export const engineeringKnowledgeLayers = [
  "THEORY",
  "METHODOLOGY",
  "SOFTWARE_TRAINING",
  "PRACTICE",
  "EXAMPLES_DATASETS",
] as const;
export type EngineeringKnowledgeLayer = (typeof engineeringKnowledgeLayers)[number];

export const engineeringAuthorities = [
  "OFFICIAL_VENDOR",
  "UNIVERSITY",
  "PROFESSIONAL_SOCIETY",
  "GOVERNMENT",
  "STANDARDS_BODY",
  "DOMAIN_LIBRARY",
  "RESEARCH_ORGANIZATION",
  "UNKNOWN",
] as const;
export type EngineeringAuthority = (typeof engineeringAuthorities)[number];

// Availability describes how a user may reach the material. It is deliberately
// independent from copyright, licence and downstream processing permission.
export const engineeringAccessAvailabilities = [
  "OPEN",
  "AUTH_REQUIRED",
  "MEMBER_ONLY",
  "PAID",
  "UNKNOWN",
] as const;
export type EngineeringAccessAvailability = (typeof engineeringAccessAvailabilities)[number];

export const engineeringRelationshipTypes = [
  "USES_DATASET",
  "TRAINING_FOR",
  "DOCUMENTS_PRODUCT",
  "EXAMPLE_FOR",
  "BENCHMARK_FOR",
  "COMPANION_TO",
] as const;
export type EngineeringRelationshipType = (typeof engineeringRelationshipTypes)[number];

export function isRussianDiscoveryProvider(
  provider: DiscoveryProvider,
): provider is (typeof russianDiscoveryProviders)[number] {
  return (russianDiscoveryProviders as readonly DiscoveryProvider[]).includes(provider);
}

export function isEngineeringDiscoveryProvider(
  provider: DiscoveryProvider,
): provider is (typeof engineeringDiscoveryProviders)[number] {
  return (engineeringDiscoveryProviders as readonly DiscoveryProvider[]).includes(provider);
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
  engineeringLayer?: EngineeringKnowledgeLayer;
  requestedSourceTypes?: SourceType[];
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
  originProviderId?: string;
  authority?: EngineeringAuthority;
  officialSource?: boolean;
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

export interface EngineeringAccessMetadata {
  availability: EngineeringAccessAvailability;
  license?: string;
  rightsNote?: string;
  evidenceUrl?: string;
}

export interface EngineeringSoftwareMetadata {
  vendorId: string;
  productIds: string[];
  productNames: string[];
  suite?: string;
  softwareVersion?: string;
  documentVersion?: string;
  releaseDate?: string;
}

export interface EngineeringRelationship {
  type: EngineeringRelationshipType;
  targetId: string;
  note?: string;
}

export interface EngineeringCandidateMetadata {
  knowledgeLayers: EngineeringKnowledgeLayer[];
  authority: EngineeringAuthority;
  access: EngineeringAccessMetadata;
  software?: EngineeringSoftwareMetadata;
  relationships?: EngineeringRelationship[];
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
  description?: string;
  keywords?: string[];
  authors: SourceAuthor[];
  publicationYear?: number;
  sourceType?: SourceType;
  language?: SourceLanguage;
  identifiers: DiscoveryIdentifiers;
  publication?: PublicationMetadata;
  urls?: DiscoveryUrls;
  openAccess?: DiscoveryOpenAccess;
  qualitySignals?: DiscoveryQualitySignals;
  engineering?: EngineeringCandidateMetadata;
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
  engineeringCandidates: number;
  withOpenAccessMetadata: number;
  fieldConflicts: number;
  materialTypeDistribution: Record<string, number>;
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
