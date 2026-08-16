import type { EngineeringAccessAvailability } from "../discovery/types.ts";
import type { SourceType } from "../source-registry.ts";

export const SCORING_MODEL_VERSION = "candidate-ranking-v1";

export const verificationPolicy = {
  scoreRange: { minimum: 0, maximum: 100 },
  weights: {
    relevance: 0.30,
    authority: 0.20,
    metadataCompleteness: 0.15,
    versionRelevance: 0.10,
    corpusValue: 0.15,
    accessUtility: 0.10,
  },
  thresholds: {
    autoVerifyMin: 82,
    reviewMin: 45,
    rejectBelowRelevance: 24,
    autoVerifyMinRelevance: 65,
    autoVerifyMinAuthority: 70,
    autoVerifyMinMetadata: 60,
    duplicateReviewThreshold: 82,
  },
} as const;

export const genericPetroleumWords = new Set([
  "analysis", "model", "modeling", "modelling", "simulation", "flow", "fluid", "gas", "oil",
  "system", "systems", "method", "methods", "study", "data", "process", "field", "reservoir",
  "анализ", "модель", "моделирование", "поток", "газ", "нефть", "система", "метод",
  "исследование", "данные", "процесс", "месторождение", "пласт",
]);

export const authorityBaseScores = {
  OFFICIAL_VENDOR: 95,
  PROFESSIONAL_SOCIETY: 88,
  PEER_REVIEWED: 86,
  GOVERNMENT: 90,
  STANDARDS_BODY: 92,
  UNIVERSITY: 78,
  INSTITUTIONAL_REPOSITORY: 74,
  PUBLISHER: 76,
  RESEARCH_ORGANIZATION: 84,
  THIRD_PARTY_LIBRARY: 55,
  UNKNOWN: 30,
} as const;

export const accessUtilityScores: Record<EngineeringAccessAvailability | "REGISTRATION_REQUIRED", number> = {
  OPEN: 100,
  REGISTRATION_REQUIRED: 72,
  AUTH_REQUIRED: 65,
  MEMBER_ONLY: 55,
  PAID: 50,
  UNKNOWN: 40,
};

export const versionSensitiveTypes = new Set<SourceType>([
  "manual",
  "software-documentation",
  "tutorial",
  "training-material",
  "release-notes",
  "standard",
  "recommended-practice",
]);

export const diversityPriorityTypes = new Set<SourceType>([
  "manual",
  "software-documentation",
  "tutorial",
  "training-material",
  "case-study",
  "dataset",
  "example-model",
  "benchmark",
  "standard",
  "recommended-practice",
]);

export function validateVerificationPolicy() {
  const total = Object.values(verificationPolicy.weights).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > Number.EPSILON * 10) throw new Error("Verification score weights must sum to 1");
  const { autoVerifyMin, reviewMin, rejectBelowRelevance, duplicateReviewThreshold } = verificationPolicy.thresholds;
  for (const value of [autoVerifyMin, reviewMin, rejectBelowRelevance, duplicateReviewThreshold]) {
    if (value < 0 || value > 100) throw new Error("Verification thresholds must be between 0 and 100");
  }
  if (reviewMin >= autoVerifyMin) throw new Error("Review threshold must be below auto-verify threshold");
  return true;
}

validateVerificationPolicy();
