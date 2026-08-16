import { buildEngineeringDiscoveryPlan, buildUniversityDiscoveryPlan } from "../app/discovery/engineering-query-planner.ts";
import { parseCliArguments, resolveTopicIds } from "./discovery-support.mjs";

try {
  const options = parseCliArguments(process.argv.slice(2));
  const topicIds = resolveTopicIds(options);
  const registryPlan = buildEngineeringDiscoveryPlan(topicIds);
  const universityPlan = buildUniversityDiscoveryPlan(topicIds);

  console.log("ENGINEERING & PRACTICAL DISCOVERY PLAN\n");
  console.log(`Topics: ${topicIds.length}`);
  console.log(`Curated registry queries: ${registryPlan.length}`);
  console.log(`Whitelisted university queries: ${universityPlan.length}`);
  for (const query of registryPlan.slice(0, 40)) {
    console.log(`${query.id}\n  ${query.query}\n  types: ${query.requestedSourceTypes.join(", ")}`);
  }
  if (registryPlan.length > 40) console.log(`\n... ещё ${registryPlan.length - 40} registry queries`);
  console.log("\nUniversity whitelist examples:");
  for (const query of universityPlan.slice(0, 12)) console.log(`  ${query.universityId}: ${query.query}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
