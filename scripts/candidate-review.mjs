import { createReviewQueue } from "../app/verification/pipeline.ts";
import { applyManualReviewDecision, upsertManualDecision } from "../app/verification/review.ts";
import { candidatesPath, parseCliArguments, readJsonArray } from "./discovery-support.mjs";
import {
  atomicWriteJson,
  requiredOption,
  reviewDecisionsPath,
  reviewQueuePath,
  verificationResultsPath,
} from "./verification-support.mjs";

const options = parseCliArguments(process.argv.slice(2));
const candidateId = requiredOption(options, "candidate");
const action = requiredOption(options, "action").toUpperCase();
const reviewer = requiredOption(options, "reviewer");
const reason = requiredOption(options, "reason");
const results = await readJsonArray(verificationResultsPath);
const candidates = await readJsonArray(candidatesPath);
const current = results.find((result) => result.candidateId === candidateId);
if (!current) throw new Error(`Verification result не найден: ${candidateId}`);

const applied = applyManualReviewDecision(current, {
  action,
  reviewer,
  reason,
  duplicateOf: options["duplicate-of"],
  decidedAt: new Date().toISOString(),
});
const updatedResults = results.map((result) => result.candidateId === candidateId ? applied.verification : result);
const decisions = await readJsonArray(reviewDecisionsPath);
await atomicWriteJson(verificationResultsPath, updatedResults);
await atomicWriteJson(reviewDecisionsPath, upsertManualDecision(decisions, applied.decision));
await atomicWriteJson(reviewQueuePath, createReviewQueue(candidates, updatedResults));
console.log(`${candidateId}: ${current.status} -> ${applied.verification.status}`);
