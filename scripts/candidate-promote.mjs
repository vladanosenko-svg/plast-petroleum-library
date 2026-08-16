import { sources } from "../app/data.ts";
import { promoteCandidate } from "../app/verification/promotion.ts";
import { candidatesPath, parseCliArguments, readJsonArray } from "./discovery-support.mjs";
import { atomicWriteJson, requiredOption, verificationResultsPath } from "./verification-support.mjs";

const options = parseCliArguments(process.argv.slice(2));
const candidateId = requiredOption(options, "candidate");
const candidates = await readJsonArray(candidatesPath);
const results = await readJsonArray(verificationResultsPath);
const candidate = candidates.find((item) => item.id === candidateId);
const verification = results.find((item) => item.candidateId === candidateId);
if (!candidate) throw new Error(`Candidate не найден: ${candidateId}`);
if (!verification) throw new Error(`Verification result не найден: ${candidateId}`);

const promotion = promoteCandidate(sources, candidate, verification);
if (options["dry-run"] === "true") {
  console.log(JSON.stringify(promotion.source, null, 2));
} else {
  const verifiedSources = promotion.sources.filter((source) => source.recordStatus === "verified");
  await atomicWriteJson("app/data/verified-sources.json", verifiedSources);
  console.log(promotion.created ? `Promoted ${candidateId}` : `Already promoted ${candidateId}`);
}
console.log("No document was downloaded and R2 ingestion was not started.");
