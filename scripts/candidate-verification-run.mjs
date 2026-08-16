import { sources } from "../app/data.ts";
import { verifyCandidates } from "../app/verification/pipeline.ts";
import { candidatesPath, parseCliArguments, readJsonArray, resolveTopicIds } from "./discovery-support.mjs";
import {
  atomicWriteJson,
  reviewQueuePath,
  verificationResultsPath,
  verificationRunsPath,
} from "./verification-support.mjs";

const options = parseCliArguments(process.argv.slice(2));
const topicIds = resolveTopicIds(options, { requireExplicit: true });
const selectedTopics = new Set(topicIds);
const staged = await readJsonArray(candidatesPath);
const candidates = options.all ? staged : staged.filter((candidate) => candidate.topicIds?.some((topicId) => selectedTopics.has(topicId)));
if (candidates.length === 0) throw new Error("В Discovery Staging нет кандидатов для выбранных тем");

const execution = verifyCandidates(candidates, sources);
const previousRuns = await readJsonArray(verificationRunsPath);
await atomicWriteJson(verificationResultsPath, execution.results);
await atomicWriteJson(reviewQueuePath, execution.reviewQueue);
await atomicWriteJson(verificationRunsPath, [...previousRuns, execution.run]);

const summary = execution.run.summary;
console.log("CANDIDATE VERIFICATION SUMMARY\n");
console.log(`Status: ${execution.run.status}`);
console.log(`Scoring model: ${execution.run.scoringModelVersion}`);
console.log(`Candidates: ${summary.candidates}`);
console.log(`Verified: ${summary.verified}`);
console.log(`Review required: ${summary.reviewRequired}`);
console.log(`Rejected: ${summary.rejected}`);
console.log(`Duplicates: ${summary.duplicates}`);
console.log(`Possible duplicates: ${summary.possibleDuplicates}`);
console.log(`Metadata conflicts: ${summary.conflicts}`);
console.log(`Errors: ${summary.errors}`);
console.log("No files were downloaded and Source Registry was not changed.");
