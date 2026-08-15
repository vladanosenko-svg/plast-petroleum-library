import { allTopics, sources } from "../app/data.ts";
import {
  corpusPlan,
  getCorpusCoverageStatuses,
  getCorpusDiscoveryQueue,
  selectCoverageSources,
  topicCorpusProfiles,
  validateCorpusPlan,
} from "../app/corpus-planning.ts";

const issues = validateCorpusPlan();
if (issues.length > 0) {
  console.error("Corpus plan validation failed:");
  for (const issue of issues) console.error(`- ${issue.topicId ?? "plan"}.${issue.path}: ${issue.message}`);
  process.exitCode = 1;
} else {
  const productionSources = selectCoverageSources(sources);
  const coverage = getCorpusCoverageStatuses(sources);
  const coverageByTopic = new Map(coverage.map((item) => [item.topicId, item]));
  const profileByTopic = new Map(topicCorpusProfiles.map((profile) => [profile.topicId, profile]));
  const summary = { complete: 0, good: 0, partial: 0, low: 0, empty: 0 };
  for (const item of coverage) summary[item.status] += 1;

  console.log("PLAST Corpus Coverage\n");
  console.log(`Unique production sources: ${productionSources.length} / ${corpusPlan.uniqueSourceTarget.ideal}`);
  console.log(`Corpus range: ${corpusPlan.uniqueSourceTarget.minimum}–${corpusPlan.uniqueSourceTarget.maximum} unique sources`);
  console.log("Language preference: RU primary, EN secondary (quality takes precedence; no hard quota)\n");
  console.log(`${"Topic".padEnd(43)} ${"Priority".padEnd(12)} Coverage`);
  console.log("-".repeat(68));
  for (const topic of allTopics) {
    const item = coverageByTopic.get(topic.id);
    const profile = profileByTopic.get(topic.id);
    const title = topic.title.length > 42 ? `${topic.title.slice(0, 39)}...` : topic.title;
    console.log(`${title.padEnd(43)} ${profile.priority.padEnd(12)} ${String(item.coverageScore).padStart(3)}%  ${item.status}`);
  }

  console.log("\nSUMMARY\n");
  for (const status of ["complete", "good", "partial", "low", "empty"]) {
    console.log(`Topics ${status.padEnd(8)}: ${String(summary[status]).padStart(2)} / ${coverage.length}`);
  }

  console.log("\nTOP DISCOVERY PRIORITIES\n");
  getCorpusDiscoveryQueue(sources).slice(0, 10).forEach((item, index) => {
    const missing = item.coverage.gaps
      .filter((gap) => gap.dimension !== "total")
      .map((gap) => `${gap.missing} ${gap.dimension}`)
      .join(", ");
    console.log(`${index + 1}. ${item.title}`);
    console.log(`   priority: ${item.priority}`);
    console.log(`   coverage: ${item.coverage.coverageScore}%`);
    console.log(`   missing: ${missing || "minimum composition satisfied"}`);
  });
}
