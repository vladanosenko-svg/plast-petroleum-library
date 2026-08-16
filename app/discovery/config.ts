import type { DiscoveryLimits } from "./types.ts";

export const DEFAULT_DISCOVERY_LIMITS: DiscoveryLimits = {
  maxQueriesPerTopicPerLanguage: 2,
  maxResultsPerQuery: 25,
  maxPagesPerQuery: 2,
  maxTotalResultsPerRun: 500,
  concurrency: 1,
  requestDelayMs: 250,
  requestTimeoutMs: 15_000,
  maxRetries: 3,
  retryBaseDelayMs: 750,
};

export const ANONYMOUS_OPENALEX_DEMO_LIMITS = {
  maximumTopics: 2,
  maximumQueriesPerTopicPerLanguage: 2,
  maximumResultsPerQuery: 10,
  maximumPagesPerQuery: 1,
} as const;

export function validateDiscoveryLimits(limits: DiscoveryLimits) {
  const positiveIntegerFields = [
    "maxQueriesPerTopicPerLanguage",
    "maxResultsPerQuery",
    "maxPagesPerQuery",
    "maxTotalResultsPerRun",
    "concurrency",
    "requestTimeoutMs",
    "maxRetries",
    "retryBaseDelayMs",
  ] as const;
  for (const field of positiveIntegerFields) {
    if (!Number.isSafeInteger(limits[field]) || limits[field] <= 0) {
      throw new Error(`${field} must be a positive integer`);
    }
  }
  if (!Number.isSafeInteger(limits.requestDelayMs) || limits.requestDelayMs < 0) {
    throw new Error("requestDelayMs must be a non-negative integer");
  }
  if (limits.maxResultsPerQuery > 1000) throw new Error("maxResultsPerQuery cannot exceed 1000");
  if (limits.concurrency > 3) throw new Error("concurrency cannot exceed 3");
  return limits;
}
