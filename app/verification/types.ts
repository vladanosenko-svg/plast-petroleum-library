import type { SourceType } from "../source-registry.ts";
import type { DiscoveryCandidate, DiscoveryFieldConflict } from "../discovery/types.ts";

export const verificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REVIEW_REQUIRED",
  "REJECTED",
  "DUPLICATE",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const verificationMethods = ["RULE_BASED", "MANUAL_REVIEW"] as const;
export type VerificationMethod = (typeof verificationMethods)[number];

export const verificationFlags = [
  "POSSIBLE_DUPLICATE",
  "REGISTRY_DUPLICATE",
  "YEAR_CONFLICT",
  "AUTHOR_CONFLICT",
  "TITLE_CONFLICT",
  "IDENTIFIER_CONFLICT",
  "VERSION_CONFLICT",
  "PUBLISHER_CONFLICT",
  "WEAK_PROVENANCE",
  "VERSION_AMBIGUITY",
  "RIGHTS_AMBIGUITY",
  "SUSPICIOUS_METADATA",
  "MISSING_SOURCE_TYPE",
  "UNSAFE_URL",
  "RETRACTED",
] as const;
export type VerificationFlag = (typeof verificationFlags)[number];

export const rejectionReasonCodes = [
  "OUT_OF_SCOPE",
  "LOW_RELEVANCE",
  "BROKEN_METADATA",
  "UNSAFE_URL",
  "DUPLICATE",
  "SPAM",
  "NON_PETROLEUM",
  "INSUFFICIENT_EVIDENCE",
  "INVALID_SOURCE",
  "SUPERSEDED",
] as const;
export type RejectionReasonCode = (typeof rejectionReasonCodes)[number];

export const versionRelevanceClasses = ["CURRENT", "RECENT", "LEGACY", "UNKNOWN", "NOT_APPLICABLE"] as const;
export type VersionRelevanceClass = (typeof versionRelevanceClasses)[number];

export interface ScoreEvidence {
  field: string;
  value: string;
}
export interface ScoreComponent {
  value: number;
  reasons: string[];
  evidence: ScoreEvidence[];
}

export interface CandidateScores {
  relevance: ScoreComponent;
  authority: ScoreComponent;
  metadataCompleteness: ScoreComponent;
  versionRelevance: ScoreComponent;
  corpusValue: ScoreComponent;
  accessUtility: ScoreComponent;
  overall: number;
}

export interface CandidateTopicMatch {
  topicId: string;
  score: number;
  strength: "PRIMARY" | "SECONDARY";
  reasons: string[];
}

export interface PossibleDuplicate {
  targetId: string;
  targetKind: "STAGING" | "SOURCE_REGISTRY";
  confidence: number;
  signals: string[];
}

export interface DuplicateAnalysis {
  state: "UNIQUE" | "EXACT_DUPLICATE" | "POSSIBLE_DUPLICATE";
  duplicateOf?: string;
  duplicateTargetKind?: "STAGING" | "SOURCE_REGISTRY";
  exactKeys: string[];
  possibleDuplicates: PossibleDuplicate[];
}

export interface CandidateVerification {
  candidateId: string;
  title: string;
  sourceType?: SourceType;
  primaryTopic?: string;
  matchedTopics: CandidateTopicMatch[];
  relatedTopics: string[];
  scores: CandidateScores;
  versionClass: VersionRelevanceClass;
  status: VerificationStatus;
  flags: VerificationFlag[];
  reasons: string[];
  concerns: string[];
  rejectionReasons: RejectionReasonCode[];
  duplicate: DuplicateAnalysis;
  conflicts: DiscoveryFieldConflict[];
  scoringModelVersion: string;
  verifiedAt?: string;
  verificationMethod?: VerificationMethod;
}

export interface VerificationReviewItem {
  candidate: Pick<DiscoveryCandidate, "id" | "title" | "sourceType" | "authors" | "publicationYear" | "provenance">;
  verification: CandidateVerification;
}

export const manualReviewActions = ["VERIFY", "REJECT", "MARK_DUPLICATE", "KEEP_SEPARATE"] as const;
export type ManualReviewAction = (typeof manualReviewActions)[number];

export interface ManualReviewDecision {
  id: string;
  candidateId: string;
  action: ManualReviewAction;
  reviewer: string;
  reason: string;
  decidedAt: string;
  duplicateOf?: string;
  previousStatus: VerificationStatus;
  resultingStatus: VerificationStatus;
  scoringModelVersion: string;
}

export interface VerificationRunSummary {
  candidates: number;
  verified: number;
  reviewRequired: number;
  rejected: number;
  duplicates: number;
  exactDuplicates: number;
  registryDuplicates: number;
  possibleDuplicates: number;
  conflicts: number;
  errors: number;
}

export interface VerificationRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  scoringModelVersion: string;
  status: "completed" | "partial" | "failed";
  summary: VerificationRunSummary;
  errors: Array<{ candidateId?: string; message: string }>;
}

export interface VerificationExecutionResult {
  run: VerificationRun;
  results: CandidateVerification[];
  reviewQueue: VerificationReviewItem[];
}
