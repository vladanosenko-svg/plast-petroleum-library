import { readFile } from "node:fs/promises";
import { candidatesPath, readJsonArray } from "./discovery-support.mjs";
import { verificationResultsPath } from "./verification-support.mjs";

const labels = JSON.parse(await readFile("tests/fixtures/verification/manual-smoke-labels.json", "utf8"));
const candidates = await readJsonArray(candidatesPath);
const results = await readJsonArray(verificationResultsPath);
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const resultById = new Map(results.map((result) => [result.candidateId, result]));
const actualClass = (status) => status === "VERIFIED" ? "SHOULD_VERIFY" : status === "REVIEW_REQUIRED" || status === "PENDING" ? "SHOULD_REVIEW" : "SHOULD_REJECT";

const rows = labels.map((label) => {
  const candidate = candidateById.get(label.candidateId);
  const result = resultById.get(label.candidateId);
  if (!candidate || !result) throw new Error(`Smoke candidate/result is missing: ${label.candidateId}`);
  return { label, candidate, result, actual: actualClass(result.status) };
});

const count = (predicate) => rows.filter(predicate).length;
console.log("PLAST 3D.4 CONTROLLED MANUAL SMOKE\n");
console.log(`Reviewed candidates: ${rows.length}`);
for (const direction of ["INTERNATIONAL", "RUSSIAN", "ENGINEERING"]) console.log(`${direction}: ${count((row) => row.label.direction === direction)}`);
console.log(`Exact manual-label agreement: ${count((row) => row.label.expected === row.actual)}/${rows.length}`);
console.log(`Correct auto verification: ${count((row) => row.result.status === "VERIFIED" && row.label.expected === "SHOULD_VERIFY")}`);
console.log(`Incorrect auto verification: ${count((row) => row.result.status === "VERIFIED" && row.label.expected !== "SHOULD_VERIFY")}`);
console.log(`Correct rejection: ${count((row) => row.result.status === "REJECTED" && row.label.expected === "SHOULD_REJECT")}`);
console.log(`Incorrect rejection: ${count((row) => row.result.status === "REJECTED" && row.label.expected !== "SHOULD_REJECT")}`);
console.log(`Possible duplicate flags: ${count((row) => row.result.duplicate.state === "POSSIBLE_DUPLICATE")}`);
console.log(`Confirmed possible duplicates: ${count((row) => row.result.duplicate.state === "POSSIBLE_DUPLICATE" && row.label.duplicateExpectation === "POSSIBLE")}`);
console.log(`False duplicate flags: ${count((row) => row.result.duplicate.state === "POSSIBLE_DUPLICATE" && row.label.duplicateExpectation === "NONE")}`);
console.log("\nBy smoke topic:");
for (const topic of [...new Set(rows.map((row) => row.label.smokeTopic))]) {
  const topicRows = rows.filter((row) => row.label.smokeTopic === topic);
  console.log(`  ${topic.padEnd(24)} candidates=${topicRows.length} verified=${topicRows.filter((row) => row.result.status === "VERIFIED").length} review=${topicRows.filter((row) => row.result.status === "REVIEW_REQUIRED").length} rejected=${topicRows.filter((row) => row.result.status === "REJECTED").length} exact=${topicRows.filter((row) => row.result.duplicate.state === "EXACT_DUPLICATE").length} possible=${topicRows.filter((row) => row.result.duplicate.state === "POSSIBLE_DUPLICATE").length}`);
}
console.log("\nCandidate score breakdown:");
for (const { label, candidate, result, actual } of rows) {
  const score = result.scores;
  console.log([
    label.direction,
    label.smokeTopic,
    candidate.sourceType ?? "UNKNOWN",
    candidate.provenance[0]?.provider ?? "UNKNOWN",
    result.primaryTopic ?? "UNKNOWN",
    score.relevance.value,
    score.authority.value,
    score.metadataCompleteness.value,
    score.versionRelevance.value,
    score.corpusValue.value,
    score.accessUtility.value,
    score.overall,
    result.status,
    result.flags.join(",") || "-",
    label.expected,
    actual,
    candidate.title,
  ].join(" | "));
}
console.log("\nThis 30-record controlled smoke is a diagnostic sample, not a statistically significant benchmark.");
