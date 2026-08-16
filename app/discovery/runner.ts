import { validateDiscoveryLimits } from "./config.ts";
import { mergeDiscoveryCandidates } from "./merge.ts";
import { normalizeProviderRecord } from "./normalize.ts";
import { isRussianDiscoveryProvider } from "./types.ts";
import type {
  DiscoveryExecutionResult,
  DiscoveryLimits,
  DiscoveryProvider,
  DiscoveryProviderRunStatus,
  DiscoveryQuery,
  LiteratureDiscoveryProvider,
} from "./types.ts";

export interface RunDiscoveryInput {
  queries: readonly DiscoveryQuery[];
  providers: ReadonlyMap<DiscoveryProvider, LiteratureDiscoveryProvider>;
  limits: DiscoveryLimits;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function citationCount(candidate: DiscoveryExecutionResult["candidates"][number]) {
  return candidate.qualitySignals?.openAlexCitedByCount
    ?? candidate.qualitySignals?.crossrefReferencedByCount
    ?? 0;
}

export async function runDiscovery(input: RunDiscoveryInput): Promise<DiscoveryExecutionResult> {
  const limits = validateDiscoveryLimits(input.limits);
  const now = input.now ?? (() => new Date());
  const sleep = input.sleep ?? defaultSleep;
  const startedAt = now().toISOString();
  const providerIds = [...new Set(input.queries.map((query) => query.provider))].sort();
  const topicIds = [...new Set(input.queries.map((query) => query.topicId))].sort();
  const statusByProvider = new Map<DiscoveryProvider, DiscoveryProviderRunStatus>(
    providerIds.map((provider) => [provider, {
      provider,
      queriesAttempted: 0,
      queriesSucceeded: 0,
      queriesFailed: 0,
      rawRecords: 0,
      acceptedRecords: 0,
      errors: [],
    }]),
  );
  const normalized = [] as DiscoveryExecutionResult["candidates"];
  let nextQueryIndex = 0;
  let totalRawRecords = 0;
  let totalAcceptedRecords = 0;
  let queriesSucceeded = 0;
  let queriesFailed = 0;

  async function worker() {
    while (nextQueryIndex < input.queries.length && totalRawRecords < limits.maxTotalResultsPerRun) {
      const query = input.queries[nextQueryIndex];
      nextQueryIndex += 1;
      const provider = input.providers.get(query.provider);
      const providerStatus = statusByProvider.get(query.provider);
      if (!provider || !providerStatus) throw new Error(`Discovery provider is not configured: ${query.provider}`);
      providerStatus.queriesAttempted += 1;
      try {
        const result = await provider.search(query, {
          maxResults: Math.min(query.resultLimit, limits.maxResultsPerQuery),
          maxPages: limits.maxPagesPerQuery,
          timeoutMs: limits.requestTimeoutMs,
          maxRetries: limits.maxRetries,
          retryBaseDelayMs: limits.retryBaseDelayMs,
        });
        const remaining = Math.max(0, limits.maxTotalResultsPerRun - totalAcceptedRecords);
        const acceptedRecords = result.records.slice(0, remaining);
        const rawRecordsFetched = result.rawRecordsFetched ?? result.records.length;
        totalRawRecords += rawRecordsFetched;
        totalAcceptedRecords += acceptedRecords.length;
        providerStatus.rawRecords += rawRecordsFetched;
        providerStatus.acceptedRecords += acceptedRecords.length;
        providerStatus.queriesSucceeded += 1;
        queriesSucceeded += 1;
        const discoveredAt = now().toISOString();
        for (const record of acceptedRecords) {
          const candidate = normalizeProviderRecord(query.provider, record, query, discoveredAt);
          if (candidate) normalized.push(candidate);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        providerStatus.queriesFailed += 1;
        providerStatus.errors.push(`${query.id}: ${message}`);
        queriesFailed += 1;
      }
      if (limits.requestDelayMs > 0) await sleep(limits.requestDelayMs);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limits.concurrency, input.queries.length) }, () => worker()));
  const merged = mergeDiscoveryCandidates(normalized);
  const ruCandidates = merged.candidates.filter((candidate) =>
    candidate.provenance.some((item) => item.queryLanguage === "ru"),
  ).length;
  const enCandidates = merged.candidates.filter((candidate) =>
    candidate.provenance.some((item) => item.queryLanguage === "en"),
  ).length;
  const bothQueryLanguages = merged.candidates.filter((candidate) => {
    const languages = new Set(candidate.provenance.map((item) => item.queryLanguage));
    return languages.has("ru") && languages.has("en");
  }).length;
  const finishedAt = now().toISOString();
  const runStatus = queriesSucceeded === 0 ? "failed" : queriesFailed > 0 ? "partial" : "completed";

  return {
    candidates: merged.candidates,
    run: {
      id: `discovery-${startedAt.replace(/[:.]/g, "-")}-${topicIds.join("+")}`,
      startedAt,
      finishedAt,
      topicIds,
      providers: providerIds,
      limits,
      queriesAttempted: queriesSucceeded + queriesFailed,
      queriesSucceeded,
      queriesFailed,
      rawRecords: totalRawRecords,
      normalizedCandidates: normalized.length,
      status: runStatus,
      providerStatuses: [...statusByProvider.values()].sort((left, right) => left.provider.localeCompare(right.provider, "en")),
      summary: {
        uniqueCandidates: merged.candidates.length,
        exactMerged: merged.exactMerged,
        ruCandidates,
        enCandidates,
        bothQueryLanguages,
        withDoi: merged.candidates.filter((candidate) => Boolean(candidate.identifiers.doi)).length,
        withIsbn: merged.candidates.filter((candidate) => (candidate.identifiers.isbn?.length ?? 0) > 0).length,
        withoutStrongIdentifier: merged.candidates.filter((candidate) =>
          !candidate.identifiers.doi
          && (candidate.identifiers.isbn?.length ?? 0) === 0
          && !candidate.identifiers.openAlexId
          && !candidate.identifiers.crossrefId,
        ).length,
        russianProviderCandidates: merged.candidates.filter((candidate) =>
          candidate.provenance.some((item) => isRussianDiscoveryProvider(item.provider)),
        ).length,
        withOpenAccessMetadata: merged.candidates.filter((candidate) =>
          candidate.openAccess?.isOpenAccess !== undefined || Boolean(candidate.urls?.openAccess),
        ).length,
        fieldConflicts: merged.candidates.reduce((total, candidate) => total + (candidate.fieldConflicts?.length ?? 0), 0),
        examples: [...merged.candidates]
          .sort((left, right) => citationCount(right) - citationCount(left) || left.title.localeCompare(right.title, "en"))
          .slice(0, 10)
          .map((candidate) => candidate.title),
      },
    },
  };
}
