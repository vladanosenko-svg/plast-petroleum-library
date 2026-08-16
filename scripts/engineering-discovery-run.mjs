import { validateDiscoveryLimits } from "../app/discovery/config.ts";
import { buildEngineeringDiscoveryPlan } from "../app/discovery/engineering-query-planner.ts";
import { validateEngineeringRegistries } from "../app/discovery/engineering-registry.ts";
import { mergeDiscoveryStaging } from "../app/discovery/merge.ts";
import { EngineeringRegistryDiscoveryProvider } from "../app/discovery/providers/engineering-registry.ts";
import { runDiscovery } from "../app/discovery/runner.ts";
import {
  atomicWriteJson,
  candidatesPath,
  parseCliArguments,
  readJsonArray,
  resolveLimits,
  resolveTopicIds,
  runsPath,
} from "./discovery-support.mjs";

try {
  validateEngineeringRegistries();
  const options = parseCliArguments(process.argv.slice(2));
  const topicIds = resolveTopicIds(options, { requireExplicit: true });
  const limits = validateDiscoveryLimits({
    ...resolveLimits(options),
    maxPagesPerQuery: 1,
    concurrency: Math.min(3, Number(options.concurrency ?? 3)),
    requestDelayMs: 0,
  });
  const queries = buildEngineeringDiscoveryPlan(topicIds);
  const provider = new EngineeringRegistryDiscoveryProvider();
  const result = await runDiscovery({ queries, providers: new Map([[provider.id, provider]]), limits });
  const existingCandidates = await readJsonArray(candidatesPath);
  const existingRuns = await readJsonArray(runsPath);
  const stagedCandidates = mergeDiscoveryStaging(existingCandidates, result.candidates);
  const stagedRuns = [...existingRuns, result.run].sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt, "en") || left.id.localeCompare(right.id, "en"),
  );
  await atomicWriteJson(candidatesPath, stagedCandidates);
  await atomicWriteJson(runsPath, stagedRuns);

  console.log("ENGINEERING DISCOVERY SUMMARY\n");
  console.log(`Status: ${result.run.status}`);
  console.log(`Topics: ${result.run.topicIds.join(", ")}`);
  console.log(`Raw registry matches: ${result.run.rawRecords}`);
  console.log(`Exact merged: ${result.run.summary.exactMerged}`);
  console.log(`Unique engineering candidates: ${result.run.summary.engineeringCandidates}`);
  console.log("\nMaterial distribution:");
  for (const [type, count] of Object.entries(result.run.summary.materialTypeDistribution)) {
    console.log(`  ${type.padEnd(20)} ${count}`);
  }
  console.log(`\nCurrent shared staging: ${stagedCandidates.length}`);
  console.log("No files were downloaded; only metadata and landing URLs were staged.");
  if (result.run.status === "failed") process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
