import { isEngineeringDiscoveryProvider } from "../app/discovery/types.ts";
import { candidatesPath, readJsonArray, runsPath } from "./discovery-support.mjs";

const allCandidates = await readJsonArray(candidatesPath);
const runs = await readJsonArray(runsPath);
const candidates = allCandidates.filter((candidate) =>
  candidate.provenance?.some((item) => isEngineeringDiscoveryProvider(item.provider)),
);
const distribution = {
  BOOK: 0,
  MANUAL: 0,
  TUTORIAL: 0,
  PRESENTATION: 0,
  CASE_STUDY: 0,
  TECHNICAL_REPORT: 0,
  DATASET: 0,
  EXAMPLE_MODEL: 0,
  OTHER: 0,
};
const access = {};
const authorities = {};
const origins = {};
let withVersion = 0;
let withRelationships = 0;
let officialVendor = 0;

function bucket(type) {
  if (["book", "book-chapter", "textbook", "study-guide", "monograph"].includes(type)) return "BOOK";
  if (["manual", "software-documentation"].includes(type)) return "MANUAL";
  if (["tutorial", "training-material", "workflow", "lecture-note", "course-material", "methodical-material"].includes(type)) return "TUTORIAL";
  if (["presentation", "webinar"].includes(type)) return "PRESENTATION";
  if (type === "case-study") return "CASE_STUDY";
  if (["technical-report", "recommended-practice", "standard", "release-notes"].includes(type)) return "TECHNICAL_REPORT";
  if (["dataset", "benchmark"].includes(type)) return "DATASET";
  if (type === "example-model") return "EXAMPLE_MODEL";
  return "OTHER";
}

for (const candidate of candidates) {
  distribution[bucket(candidate.sourceType)] += 1;
  const availability = candidate.engineering?.access?.availability ?? "UNKNOWN";
  access[availability] = (access[availability] ?? 0) + 1;
  const authority = candidate.engineering?.authority ?? "UNKNOWN";
  authorities[authority] = (authorities[authority] ?? 0) + 1;
  const candidateOrigins = new Set((candidate.provenance ?? []).map((item) => item.originProviderId).filter(Boolean));
  for (const origin of candidateOrigins) origins[origin] = (origins[origin] ?? 0) + 1;
  if (candidate.engineering?.software?.softwareVersion || candidate.engineering?.software?.documentVersion) withVersion += 1;
  if ((candidate.engineering?.relationships?.length ?? 0) > 0) withRelationships += 1;
  if (candidate.engineering?.authority === "OFFICIAL_VENDOR") officialVendor += 1;
}

const countLines = (values) => Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"));
console.log("PLAST 3D.3 ENGINEERING DISCOVERY REPORT\n");
console.log(`Engineering candidates: ${candidates.length}`);
console.log(`Engineering runs: ${runs.filter((run) => run.providers?.includes("engineering-registry")).length}`);
console.log(`Official vendor candidates: ${officialVendor}`);
console.log(`Software/document version preserved: ${withVersion}`);
console.log(`With relationship metadata: ${withRelationships}`);
console.log("\nRequired material distribution:");
for (const [type, count] of Object.entries(distribution)) console.log(`  ${type.padEnd(20)} ${count}`);
console.log("\nAccess availability (separate from licence):");
for (const [value, count] of countLines(access)) console.log(`  ${value.padEnd(24)} ${count}`);
console.log("\nAuthority:");
for (const [value, count] of countLines(authorities)) console.log(`  ${value.padEnd(24)} ${count}`);
console.log("\nOrigin provider:");
for (const [value, count] of countLines(origins)) console.log(`  ${value.padEnd(24)} ${count}`);
if (candidates.length === 0) console.log("\nRun a controlled engineering discovery with an explicit --topic or --topics.");
