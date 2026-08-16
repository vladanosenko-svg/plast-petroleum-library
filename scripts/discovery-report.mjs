import { topicCorpusProfiles, selectCoverageSources } from "../app/corpus-planning.ts";
import { sources } from "../app/data.ts";
import { isRussianDiscoveryProvider } from "../app/discovery/types.ts";
import { candidatesPath, readJsonArray, runsPath } from "./discovery-support.mjs";

const candidates = await readJsonArray(candidatesPath);
const runs = await readJsonArray(runsPath);
const verifiedSources = selectCoverageSources(sources);
const countBy = (values) => Object.entries(values)
  .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"));
const providerCounts = {};
const languageCounts = { ru: 0, en: 0, other: 0, unknown: 0 };
const queryLanguageCounts = { ru: 0, en: 0, both: 0, unknown: 0 };
const topicCounts = {};
const internationalTopicCounts = {};
const russianTopicCounts = {};
const sourceTypeCounts = {};
const accessHintCounts = {};
let withDoi = 0;
let withIsbn = 0;
let withoutCrossProviderIdentifier = 0;
let withOpenAccessMetadata = 0;
let internationalCandidates = 0;
let russianCandidates = 0;
let russianOnlyCandidates = 0;
let internationalRussianOverlaps = 0;
let before2000 = 0;
let recent = 0;

for (const candidate of candidates) {
  const providers = new Set(candidate.provenance.map((item) => item.provider));
  const hasInternational = providers.has("openalex") || providers.has("crossref");
  const hasRussian = [...providers].some((provider) => isRussianDiscoveryProvider(provider));
  for (const provider of providers) providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;
  if (hasInternational) internationalCandidates += 1;
  if (hasRussian) russianCandidates += 1;
  if (hasRussian && !hasInternational) russianOnlyCandidates += 1;
  if (hasRussian && hasInternational) internationalRussianOverlaps += 1;

  const language = candidate.language ?? "unknown";
  languageCounts[language] = (languageCounts[language] ?? 0) + 1;
  const queryLanguages = new Set(candidate.provenance.map((item) => item.queryLanguage));
  if (queryLanguages.has("ru") && queryLanguages.has("en")) queryLanguageCounts.both += 1;
  else if (queryLanguages.has("ru")) queryLanguageCounts.ru += 1;
  else if (queryLanguages.has("en")) queryLanguageCounts.en += 1;
  else queryLanguageCounts.unknown += 1;

  for (const topicId of candidate.topicIds) {
    topicCounts[topicId] = (topicCounts[topicId] ?? 0) + 1;
    if (hasInternational) internationalTopicCounts[topicId] = (internationalTopicCounts[topicId] ?? 0) + 1;
    if (hasRussian) russianTopicCounts[topicId] = (russianTopicCounts[topicId] ?? 0) + 1;
  }
  const sourceType = candidate.sourceType ?? "unknown";
  sourceTypeCounts[sourceType] = (sourceTypeCounts[sourceType] ?? 0) + 1;
  const accessHint = candidate.accessHint ?? "unknown";
  accessHintCounts[accessHint] = (accessHintCounts[accessHint] ?? 0) + 1;
  if (candidate.identifiers.doi) withDoi += 1;
  if ((candidate.identifiers.isbn?.length ?? 0) > 0) withIsbn += 1;
  if (!candidate.identifiers.doi
      && (candidate.identifiers.isbn?.length ?? 0) === 0
      && !candidate.identifiers.openAlexId
      && !candidate.identifiers.crossrefId) withoutCrossProviderIdentifier += 1;
  if (candidate.openAccess?.isOpenAccess !== undefined || candidate.urls?.openAccess) withOpenAccessMetadata += 1;
  if (candidate.publicationYear && candidate.publicationYear < 2000) before2000 += 1;
  if (candidate.publicationYear && candidate.publicationYear >= 2015) recent += 1;
}

const russianBooks = candidates.filter((candidate) =>
  candidate.provenance.some((item) => isRussianDiscoveryProvider(item.provider))
  && ["book", "textbook", "study-guide", "monograph", "methodical-material"].includes(candidate.sourceType),
).length;
const russianArticles = candidates.filter((candidate) =>
  candidate.provenance.some((item) => isRussianDiscoveryProvider(item.provider))
  && ["journal-article", "review-article"].includes(candidate.sourceType),
).length;
const russianDissertations = candidates.filter((candidate) =>
  candidate.provenance.some((item) => isRussianDiscoveryProvider(item.provider))
  && ["dissertation", "thesis-abstract"].includes(candidate.sourceType),
).length;

console.log("PLAST DISCOVERY STAGING REPORT\n");
console.log(`Total candidates: ${candidates.length}`);
console.log(`Discovery runs: ${runs.length}`);
console.log(`Verified production sources: ${verifiedSources.length}`);
console.log(`International candidates: ${internationalCandidates}`);
console.log(`Russian-provider candidates: ${russianCandidates}`);
console.log(`Russian-only candidates: ${russianOnlyCandidates}`);
console.log(`International/Russian exact overlaps: ${internationalRussianOverlaps}`);
console.log(`With DOI: ${withDoi}`);
console.log(`With ISBN: ${withIsbn}`);
console.log(`Without cross-provider identifier: ${withoutCrossProviderIdentifier}`);
console.log(`OA metadata available: ${withOpenAccessMetadata}`);
console.log(`Old sources before 2000: ${before2000}`);
console.log(`Recent sources (2015+): ${recent}`);
console.log(`Russian books/textbooks/guides: ${russianBooks}`);
console.log(`Russian articles: ${russianArticles}`);
console.log(`Russian dissertations/abstracts: ${russianDissertations}`);

console.log("\nProvider breakdown:");
for (const [provider, count] of countBy(providerCounts)) console.log(`  ${provider.padEnd(24)} ${count}`);
console.log("\nMetadata language:");
for (const [language, count] of countBy(languageCounts)) console.log(`  ${language.padEnd(24)} ${count}`);
console.log("\nQuery-language yield:");
for (const [language, count] of countBy(queryLanguageCounts)) console.log(`  ${language.padEnd(24)} ${count}`);
console.log("\nCandidates by source type:");
for (const [type, count] of countBy(sourceTypeCounts)) console.log(`  ${type.padEnd(24)} ${count}`);
console.log("\nDiscovery access hints:");
for (const [hint, count] of countBy(accessHintCounts)) console.log(`  ${hint.padEnd(24)} ${count}`);

console.log("\nTopic coverage potential:");
console.log("  Topic                            Verified  International  Russian  Total");
for (const [topicId, total] of countBy(topicCounts).slice(0, 20)) {
  const verified = verifiedSources.filter((source) => source.topicIds.includes(topicId)).length;
  console.log(`  ${topicId.padEnd(32)} ${String(verified).padStart(8)}  ${String(internationalTopicCounts[topicId] ?? 0).padStart(13)}  ${String(russianTopicCounts[topicId] ?? 0).padStart(7)}  ${String(total).padStart(5)}`);
}

if (candidates.length === 0) {
  console.log("\nStaging пуст. Выполните controlled discovery run с явным --topic.");
} else if (topicCorpusProfiles.length !== 65) {
  throw new Error("Corpus profile regression: expected 65 topics");
}
