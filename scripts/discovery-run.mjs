import { ANONYMOUS_OPENALEX_DEMO_LIMITS, validateDiscoveryLimits } from "../app/discovery/config.ts";
import { mergeDiscoveryStaging } from "../app/discovery/merge.ts";
import { CrossrefDiscoveryProvider } from "../app/discovery/providers/crossref.ts";
import { OpenAlexDiscoveryProvider } from "../app/discovery/providers/openalex.ts";
import { buildDiscoveryPlan } from "../app/discovery/query-planner.ts";
import { runDiscovery } from "../app/discovery/runner.ts";
import {
  atomicWriteJson,
  candidatesPath,
  parseCliArguments,
  readJsonArray,
  resolveLimits,
  resolveProviders,
  resolveTopicIds,
  runsPath,
} from "./discovery-support.mjs";

function assertOpenAlexConfiguration(topicIds, providers, limits) {
  if (!providers.includes("openalex") || process.env.OPENALEX_API_KEY?.trim()) return;
  const demoAllowed =
    topicIds.length <= ANONYMOUS_OPENALEX_DEMO_LIMITS.maximumTopics &&
    limits.maxQueriesPerTopicPerLanguage <= ANONYMOUS_OPENALEX_DEMO_LIMITS.maximumQueriesPerTopicPerLanguage &&
    limits.maxResultsPerQuery <= ANONYMOUS_OPENALEX_DEMO_LIMITS.maximumResultsPerQuery &&
    limits.maxPagesPerQuery <= ANONYMOUS_OPENALEX_DEMO_LIMITS.maximumPagesPerQuery;
  if (!demoAllowed) {
    throw new Error("OPENALEX_API_KEY обязателен для полноценного OpenAlex run; без ключа разрешён только tiny demo: ≤2 topics, --limit ≤10, --max-pages 1");
  }
  console.warn("OPENALEX_API_KEY не задан: используется только ограниченный anonymous demo allowance OpenAlex.");
}

try {
  const options = parseCliArguments(process.argv.slice(2));
  const topicIds = resolveTopicIds(options, { requireExplicit: true });
  const providers = resolveProviders(options);
  const limits = validateDiscoveryLimits(resolveLimits(options));
  if (process.env.DISCOVERY_CONTACT_EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.DISCOVERY_CONTACT_EMAIL)) {
    throw new Error("DISCOVERY_CONTACT_EMAIL должен быть корректным email");
  }
  assertOpenAlexConfiguration(topicIds, providers, limits);
  const queries = buildDiscoveryPlan(topicIds, { providers, limits });
  const providerAdapters = new Map([
    ["openalex", new OpenAlexDiscoveryProvider({ apiKey: process.env.OPENALEX_API_KEY })],
    ["crossref", new CrossrefDiscoveryProvider({ contactEmail: process.env.DISCOVERY_CONTACT_EMAIL })],
  ]);
  const result = await runDiscovery({ queries, providers: providerAdapters, limits });
  const existingCandidates = await readJsonArray(candidatesPath);
  const existingRuns = await readJsonArray(runsPath);
  const stagedCandidates = mergeDiscoveryStaging(existingCandidates, result.candidates);
  const stagedRuns = [...existingRuns, result.run].sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt, "en") || left.id.localeCompare(right.id, "en"),
  );
  await atomicWriteJson(candidatesPath, stagedCandidates);
  await atomicWriteJson(runsPath, stagedRuns);

  console.log("\nDISCOVERY SUMMARY\n");
  console.log(`Run: ${result.run.id}`);
  console.log(`Status: ${result.run.status}`);
  console.log(`Topics: ${result.run.topicIds.join(", ")}`);
  for (const status of result.run.providerStatuses) {
    console.log(`\n${status.provider}`);
    console.log(`  queries: ${status.queriesSucceeded}/${status.queriesAttempted} succeeded`);
    console.log(`  raw records: ${status.rawRecords}`);
    for (const error of status.errors) console.log(`  error: ${error}`);
  }
  console.log(`\nTotal raw: ${result.run.rawRecords}`);
  console.log(`Exact merged: ${result.run.summary.exactMerged}`);
  console.log(`Unique candidates in run: ${result.run.summary.uniqueCandidates}`);
  console.log(`RU query candidates: ${result.run.summary.ruCandidates}`);
  console.log(`EN query candidates: ${result.run.summary.enCandidates}`);
  console.log(`With DOI: ${result.run.summary.withDoi}`);
  console.log(`With OA metadata: ${result.run.summary.withOpenAccessMetadata}`);
  console.log(`Current staged candidates: ${stagedCandidates.length}`);
  if (result.run.summary.examples.length > 0) {
    console.log("\nExamples:");
    result.run.summary.examples.forEach((title, index) => console.log(`  ${index + 1}. ${title}`));
  }
  if (result.run.status === "failed") process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
