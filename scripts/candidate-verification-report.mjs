import { verificationPolicy } from "../app/verification/policy.ts";
import { readJsonArray, verificationResultsPath, verificationRunsPath } from "./verification-support.mjs";

const results = await readJsonArray(verificationResultsPath);
const runs = await readJsonArray(verificationRunsPath);
if (results.length === 0) throw new Error("Сначала выполните controlled verification run");

const countBy = (selector) => Object.entries(results.reduce((counts, result) => {
  const key = selector(result) ?? "UNKNOWN";
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {})).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"));

console.log("PLAST 3D.4 CANDIDATE VERIFICATION REPORT\n");
console.log(`Candidates: ${results.length}`);
console.log(`Verification runs: ${runs.length}`);
console.log(`Scoring model: ${results[0].scoringModelVersion}`);
console.log(`Overall formula weights: ${JSON.stringify(verificationPolicy.weights)}`);
console.log(`Thresholds: ${JSON.stringify(verificationPolicy.thresholds)}`);
console.log("\nStatus:");
for (const [value, count] of countBy((result) => result.status)) console.log(`  ${value.padEnd(24)} ${count}`);
console.log("\nPrimary topic:");
for (const [value, count] of countBy((result) => result.primaryTopic).slice(0, 15)) console.log(`  ${value.padEnd(36)} ${count}`);
console.log("\nSource type:");
for (const [value, count] of countBy((result) => result.sourceType)) console.log(`  ${value.padEnd(28)} ${count}`);
console.log("\nFlags:");
const flags = results.flatMap((result) => result.flags).reduce((counts, flag) => ({ ...counts, [flag]: (counts[flag] ?? 0) + 1 }), {});
for (const [value, count] of Object.entries(flags).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"))) console.log(`  ${value.padEnd(28)} ${count}`);
console.log("\nTop verified:");
for (const result of results.filter((item) => item.status === "VERIFIED").sort((a, b) => b.scores.overall - a.scores.overall).slice(0, 10)) {
  console.log(`  ${String(result.scores.overall).padStart(5)}  ${result.sourceType ?? "UNKNOWN"}  ${result.title}`);
}
