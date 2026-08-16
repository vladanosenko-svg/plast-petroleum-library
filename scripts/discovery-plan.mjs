import { buildDiscoveryPlan } from "../app/discovery/query-planner.ts";
import {
  parseCliArguments,
  resolveLimits,
  resolveProviders,
  resolveTopicIds,
} from "./discovery-support.mjs";

try {
  const options = parseCliArguments(process.argv.slice(2));
  const topicIds = resolveTopicIds(options);
  const providers = resolveProviders(options);
  const limits = resolveLimits(options);
  const plan = buildDiscoveryPlan(topicIds, { providers, limits });

  console.log("PLAST DISCOVERY PLAN\n");
  for (const topicId of topicIds) {
    console.log(topicId);
    for (const query of plan.filter((item) => item.topicId === topicId)) {
      console.log(`  ${query.provider.padEnd(9)} ${query.language.toUpperCase()}  "${query.query}"  limit=${query.resultLimit}`);
    }
    console.log();
  }
  console.log(`Topics: ${topicIds.length}`);
  console.log(`Queries: ${plan.length}`);
  console.log(`Maximum configured raw results: ${Math.min(plan.length * limits.maxResultsPerQuery, limits.maxTotalResultsPerRun)}`);
  console.log("Network requests: 0");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
