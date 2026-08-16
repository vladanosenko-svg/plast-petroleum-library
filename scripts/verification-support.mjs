import { resolve } from "node:path";
import { atomicWriteJson, readJsonArray } from "./discovery-support.mjs";

export const verificationDirectory = resolve("data", "verification");
export const verificationResultsPath = resolve(verificationDirectory, "verification-results.json");
export const verificationRunsPath = resolve(verificationDirectory, "verification-runs.json");
export const reviewQueuePath = resolve(verificationDirectory, "review-queue.json");
export const reviewDecisionsPath = resolve(verificationDirectory, "review-decisions.json");

export { atomicWriteJson, readJsonArray };

export function requiredOption(options, name) {
  const value = options[name];
  if (!value?.trim()) throw new Error(`Для --${name} требуется значение`);
  return value.trim();
}
