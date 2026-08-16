import { SCORING_MODEL_VERSION, verificationPolicy } from "./policy.ts";
import type {
  CandidateVerification,
  ManualReviewAction,
  ManualReviewDecision,
  RejectionReasonCode,
} from "./types.ts";
import { manualReviewActions } from "./types.ts";

function decisionId(candidateId: string, decidedAt: string, action: ManualReviewAction) {
  return `review:${candidateId}:${action}:${decidedAt}`;
}

export interface ManualDecisionInput {
  action: ManualReviewAction;
  reviewer: string;
  reason: string;
  decidedAt: string;
  duplicateOf?: string;
}

export function applyManualReviewDecision(
  verification: CandidateVerification,
  input: ManualDecisionInput,
): { verification: CandidateVerification; decision: ManualReviewDecision } {
  if (!manualReviewActions.includes(input.action)) throw new Error(`Unknown manual review action: ${input.action}`);
  if (!input.reviewer.trim()) throw new Error("Manual review requires a reviewer");
  if (!input.reason.trim()) throw new Error("Manual review requires a reason");
  if (input.action === "MARK_DUPLICATE" && !input.duplicateOf?.trim()) throw new Error("MARK_DUPLICATE requires duplicateOf");
  const next = structuredClone(verification);
  const previousStatus = next.status;
  if (input.action === "VERIFY") {
    next.status = "VERIFIED";
    next.verifiedAt = input.decidedAt;
    next.verificationMethod = "MANUAL_REVIEW";
    next.rejectionReasons = [];
    next.reasons = [...new Set([...next.reasons, `manual review: ${input.reason}`])];
  } else if (input.action === "REJECT") {
    next.status = "REJECTED";
    next.verifiedAt = undefined;
    next.verificationMethod = "MANUAL_REVIEW";
    next.rejectionReasons = [...new Set<RejectionReasonCode>([...next.rejectionReasons, "INSUFFICIENT_EVIDENCE"] )];
    next.concerns = [...new Set([...next.concerns, `manual rejection: ${input.reason}`])];
  } else if (input.action === "MARK_DUPLICATE") {
    next.status = "DUPLICATE";
    next.verifiedAt = undefined;
    next.verificationMethod = "MANUAL_REVIEW";
    next.duplicate.state = "EXACT_DUPLICATE";
    next.duplicate.duplicateOf = input.duplicateOf;
    next.rejectionReasons = [...new Set<RejectionReasonCode>([...next.rejectionReasons, "DUPLICATE"] )];
  } else {
    next.duplicate.state = "UNIQUE";
    next.duplicate.duplicateOf = undefined;
    next.duplicate.duplicateTargetKind = undefined;
    next.duplicate.possibleDuplicates = [];
    next.flags = next.flags.filter((flag) => flag !== "POSSIBLE_DUPLICATE" && flag !== "REGISTRY_DUPLICATE");
    next.status = next.scores.overall >= verificationPolicy.thresholds.autoVerifyMin ? "REVIEW_REQUIRED" : next.status;
    next.concerns = [...new Set([...next.concerns.filter((reason) => !reason.includes("POSSIBLE_DUPLICATE")), `kept separate by manual review: ${input.reason}`])];
  }
  const decision: ManualReviewDecision = {
    id: decisionId(next.candidateId, input.decidedAt, input.action),
    candidateId: next.candidateId,
    action: input.action,
    reviewer: input.reviewer.trim(),
    reason: input.reason.trim(),
    decidedAt: input.decidedAt,
    duplicateOf: input.duplicateOf,
    previousStatus,
    resultingStatus: next.status,
    scoringModelVersion: next.scoringModelVersion || SCORING_MODEL_VERSION,
  };
  return { verification: next, decision };
}

export function upsertManualDecision(
  decisions: readonly ManualReviewDecision[],
  decision: ManualReviewDecision,
) {
  const byId = new Map(decisions.map((item) => [item.id, structuredClone(item)]));
  byId.set(decision.id, structuredClone(decision));
  return [...byId.values()].sort((left, right) => left.decidedAt.localeCompare(right.decidedAt, "en") || left.id.localeCompare(right.id, "en"));
}
