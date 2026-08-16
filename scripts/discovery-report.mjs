import { topicCorpusProfiles } from "../app/corpus-planning.ts";
import { sources } from "../app/data.ts";
import { selectCoverageSources } from "../app/corpus-planning.ts";
import { candidatesPath, readJsonArray, runsPath } from "./discovery-support.mjs";

const candidates = await readJsonArray(candidatesPath);
const runs = await readJsonArray(runsPath);
const countBy = (values) => Object.entries(values).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"));
const providerCounts = { openalex: 0, crossref: 0, both: 0 };
const languageCounts = { ru: 0, en: 0, both: 0, unknown: 0 };
const topicCounts = {};
const sourceTypeCounts = {};
let withDoi = 0;
let withOpenAccessMetadata = 0;

for (const candidate of candidates) {
  const providers = new Set(candidate.provenance.map((item) => item.provider));
  if (providers.size === 2) providerCounts.both += 1;
  else if (providers.has("openalex")) providerCounts.openalex += 1;
  else if (providers.has("crossref")) providerCounts.crossref += 1;
  const queryLanguages = new Set(candidate.provenance.map((item) => item.queryLanguage));
  if (queryLanguages.has("ru") && queryLanguages.has("en")) languageCounts.both += 1;
  else if (queryLanguages.has("ru")) languageCounts.ru += 1;
  else if (queryLanguages.has("en")) languageCounts.en += 1;
  else languageCounts.unknown += 1;
  for (const topicId of candidate.topicIds) topicCounts[topicId] = (topicCounts[topicId] ?? 0) + 1;
  const sourceType = candidate.sourceType ?? "unknown";
  sourceTypeCounts[sourceType] = (sourceTypeCounts[sourceType] ?? 0) + 1;
  if (candidate.identifiers.doi) withDoi += 1;
  if (candidate.openAccess?.isOpenAccess !== undefined || candidate.urls?.openAccess) withOpenAccessMetadata += 1;
}

console.log("PLAST DISCOVERY STAGING REPORT\n");
console.log(`Total candidates: ${candidates.length}`);
console.log(`Discovery runs: ${runs.length}`);
console.log(`Verified production sources: ${selectCoverageSources(sources).length}`);
console.log(`With DOI: ${withDoi}`);
console.log(`Without DOI: ${candidates.length - withDoi}`);
console.log(`OA metadata available: ${withOpenAccessMetadata}`);
console.log("\nProvider overlap:");
console.log(`  OpenAlex only: ${providerCounts.openalex}`);
console.log(`  Crossref only: ${providerCounts.crossref}`);
console.log(`  Both providers: ${providerCounts.both}`);
console.log("\nQuery-language yield:");
console.log(`  RU only: ${languageCounts.ru}`);
console.log(`  EN only: ${languageCounts.en}`);
console.log(`  Both: ${languageCounts.both}`);
console.log(`  Unknown: ${languageCounts.unknown}`);
console.log("\nCandidates by source type:");
for (const [type, count] of countBy(sourceTypeCounts)) console.log(`  ${type.padEnd(24)} ${count}`);
console.log("\nTop discovered topics:");
for (const [topicId, count] of countBy(topicCounts).slice(0, 20)) {
  const profile = topicCorpusProfiles.find((item) => item.topicId === topicId);
  console.log(`  ${(profile?.topicId ?? topicId).padEnd(32)} ${count}`);
}
