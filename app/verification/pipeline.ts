import type { DiscoveryCandidate, DiscoveryFieldConflict } from "../discovery/types.ts";
import type { Source } from "../source-registry.ts";
import { analyzeDuplicates } from "./duplicates.ts";
import { SCORING_MODEL_VERSION, verificationPolicy, versionSensitiveTypes } from "./policy.ts";
import { scoreCandidate } from "./scoring.ts";
import { isSafePublicHttpUrl } from "./security.ts";
import type {
  CandidateVerification,
  DuplicateAnalysis,
  RejectionReasonCode,
  VerificationExecutionResult,
  VerificationFlag,
  VerificationReviewItem,
  VerificationRunSummary,
} from "./types.ts";

const conflictFlagByField: Record<string, VerificationFlag> = {
  publicationYear: "YEAR_CONFLICT",
  year: "YEAR_CONFLICT",
  authors: "AUTHOR_CONFLICT",
  title: "TITLE_CONFLICT",
  doi: "IDENTIFIER_CONFLICT",
  isbn: "IDENTIFIER_CONFLICT",
  "identifiers.doi": "IDENTIFIER_CONFLICT",
  "identifiers.isbn": "IDENTIFIER_CONFLICT",
  "engineering.software.softwareVersion": "VERSION_CONFLICT",
  "engineering.software.documentVersion": "VERSION_CONFLICT",
  "publication.publisher": "PUBLISHER_CONFLICT",
};

const reviewBlockingFlags = new Set<VerificationFlag>([
  "POSSIBLE_DUPLICATE",
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
]);

function unique<T extends string>(values: readonly T[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function candidateUrls(candidate: DiscoveryCandidate) {
  return [
    candidate.urls?.landingPage,
    candidate.urls?.doi,
    candidate.urls?.openAccess,
    ...candidate.provenance.map((item) => item.landingPage),
  ].filter((value): value is string => Boolean(value));
}

function hasStrongProvenance(candidate: DiscoveryCandidate) {
  if (candidate.provenance.some((item) => item.officialSource)) return true;
  if (candidate.identifiers.doi && candidate.provenance.some((item) => item.provider === "crossref" || item.provider === "openalex")) return true;
  if (candidate.provenance.some((item) => item.provider === "kpfu")) return true;
  if (
    candidate.provenance.some((item) => item.provider === "cyberleninka")
    && candidate.authors.length > 0
    && Boolean(candidate.publication?.institution || candidate.publication?.publisher)
  ) return true;
  return false;
}

function collectFlags(candidate: DiscoveryCandidate, duplicate: DuplicateAnalysis, versionClass: CandidateVerification["versionClass"]) {
  const flags: VerificationFlag[] = [];
  if (!candidate.sourceType) flags.push("MISSING_SOURCE_TYPE");
  if (candidate.qualitySignals?.isRetracted) flags.push("RETRACTED");
  const urls = candidateUrls(candidate);
  if (urls.some((url) => !isSafePublicHttpUrl(url))) flags.push("UNSAFE_URL");
  if (candidate.title.trim().length < 8 || candidate.provenance.length === 0 || urls.length === 0) flags.push("SUSPICIOUS_METADATA");
  if (!hasStrongProvenance(candidate)) flags.push("WEAK_PROVENANCE");
  if (candidate.sourceType && versionSensitiveTypes.has(candidate.sourceType) && versionClass === "UNKNOWN") flags.push("VERSION_AMBIGUITY");
  if (candidate.engineering?.access.availability === "UNKNOWN" && !candidate.engineering.access.rightsNote && !candidate.engineering.access.license) {
    flags.push("RIGHTS_AMBIGUITY");
  }
  if (duplicate.state === "POSSIBLE_DUPLICATE") flags.push("POSSIBLE_DUPLICATE");
  if (duplicate.state === "EXACT_DUPLICATE" && duplicate.duplicateTargetKind === "SOURCE_REGISTRY") flags.push("REGISTRY_DUPLICATE");
  for (const conflict of candidate.fieldConflicts ?? []) {
    const flag = conflictFlagByField[conflict.field];
    if (flag) flags.push(flag);
  }
  return unique(flags);
}

function classify(
  candidate: DiscoveryCandidate,
  scores: CandidateVerification["scores"],
  flags: readonly VerificationFlag[],
  duplicate: DuplicateAnalysis,
) {
  const rejectionReasons: RejectionReasonCode[] = [];
  if (duplicate.state === "EXACT_DUPLICATE" && duplicate.duplicateOf) {
    rejectionReasons.push("DUPLICATE");
    return { status: "DUPLICATE" as const, rejectionReasons };
  }
  if (flags.includes("UNSAFE_URL")) rejectionReasons.push("UNSAFE_URL", "INVALID_SOURCE");
  if (flags.includes("RETRACTED")) rejectionReasons.push("INVALID_SOURCE");
  if (!candidate.title.trim() || candidate.provenance.length === 0) rejectionReasons.push("BROKEN_METADATA");
  if (rejectionReasons.length > 0) return { status: "REJECTED" as const, rejectionReasons: unique(rejectionReasons) };
  // A fuzzy signal is never an automatic merge or rejection. Human review has
  // priority even when the query-derived relevance score is otherwise low.
  if (duplicate.state === "POSSIBLE_DUPLICATE") {
    return { status: "REVIEW_REQUIRED" as const, rejectionReasons: [] };
  }
  if (scores.relevance.value < verificationPolicy.thresholds.rejectBelowRelevance) {
    rejectionReasons.push("LOW_RELEVANCE");
    if (scores.relevance.value < 12) rejectionReasons.push("NON_PETROLEUM");
  }
  if (rejectionReasons.length > 0) return { status: "REJECTED" as const, rejectionReasons: unique(rejectionReasons) };
  if (scores.overall < verificationPolicy.thresholds.reviewMin) {
    return { status: "REJECTED" as const, rejectionReasons: ["INSUFFICIENT_EVIDENCE"] as RejectionReasonCode[] };
  }
  const blocking = flags.some((flag) => reviewBlockingFlags.has(flag));
  const autoVerify = scores.overall >= verificationPolicy.thresholds.autoVerifyMin
    && scores.relevance.value >= verificationPolicy.thresholds.autoVerifyMinRelevance
    && scores.authority.value >= verificationPolicy.thresholds.autoVerifyMinAuthority
    && scores.metadataCompleteness.value >= verificationPolicy.thresholds.autoVerifyMinMetadata
    && hasStrongProvenance(candidate)
    && !blocking;
  return autoVerify
    ? { status: "VERIFIED" as const, rejectionReasons: [] }
    : { status: "REVIEW_REQUIRED" as const, rejectionReasons: [] };
}

function verificationReasons(result: ReturnType<typeof scoreCandidate>) {
  const high = Object.entries(result.scores)
    .filter((entry): entry is [Exclude<keyof typeof result.scores, "overall">, typeof result.scores.relevance] => entry[0] !== "overall")
    .filter(([, score]) => score.value >= 75)
    .flatMap(([, score]) => score.reasons.slice(0, 1));
  return unique(high);
}

function verificationConcerns(result: ReturnType<typeof scoreCandidate>, flags: readonly VerificationFlag[]) {
  const concerns = Object.entries(result.scores)
    .filter((entry): entry is [Exclude<keyof typeof result.scores, "overall">, typeof result.scores.relevance] => entry[0] !== "overall")
    .filter(([, score]) => score.value < 60)
    .flatMap(([, score]) => score.reasons.slice(-1));
  return unique([...concerns, ...flags.map((flag) => `flag: ${flag}`)]);
}

export function verifyCandidate(
  candidate: DiscoveryCandidate,
  sourceRegistry: readonly Source[],
  duplicate: DuplicateAnalysis,
  now = new Date(),
): CandidateVerification {
  const scoring = scoreCandidate(candidate, sourceRegistry, { now });
  const flags = collectFlags(candidate, duplicate, scoring.versionClass);
  const decision = classify(candidate, scoring.scores, flags, duplicate);
  return {
    candidateId: candidate.id,
    title: candidate.title,
    sourceType: candidate.sourceType,
    primaryTopic: scoring.primaryTopic,
    matchedTopics: scoring.matchedTopics,
    relatedTopics: scoring.relatedTopics,
    scores: scoring.scores,
    versionClass: scoring.versionClass,
    status: decision.status,
    flags,
    reasons: verificationReasons(scoring),
    concerns: verificationConcerns(scoring, flags),
    rejectionReasons: decision.rejectionReasons,
    duplicate,
    conflicts: structuredClone(candidate.fieldConflicts ?? []),
    scoringModelVersion: scoring.scoringModelVersion,
    verifiedAt: decision.status === "VERIFIED" ? now.toISOString() : undefined,
    verificationMethod: decision.status === "VERIFIED" ? "RULE_BASED" : undefined,
  };
}

function buildSummary(results: readonly CandidateVerification[], errors: number): VerificationRunSummary {
  return {
    candidates: results.length,
    verified: results.filter((result) => result.status === "VERIFIED").length,
    reviewRequired: results.filter((result) => result.status === "REVIEW_REQUIRED" || result.status === "PENDING").length,
    rejected: results.filter((result) => result.status === "REJECTED").length,
    duplicates: results.filter((result) => result.status === "DUPLICATE").length,
    exactDuplicates: results.filter((result) => result.duplicate.state === "EXACT_DUPLICATE").length,
    registryDuplicates: results.filter((result) => result.duplicate.duplicateTargetKind === "SOURCE_REGISTRY").length,
    possibleDuplicates: results.filter((result) => result.duplicate.state === "POSSIBLE_DUPLICATE").length,
    conflicts: results.filter((result) => result.conflicts.length > 0).length,
    errors,
  };
}

export function createReviewQueue(
  candidates: readonly DiscoveryCandidate[],
  results: readonly CandidateVerification[],
): VerificationReviewItem[] {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return results
    .filter((result) => result.status === "REVIEW_REQUIRED" || result.status === "PENDING")
    .map((verification) => {
      const candidate = candidateById.get(verification.candidateId)!;
      return {
        candidate: {
          id: candidate.id,
          title: candidate.title,
          sourceType: candidate.sourceType,
          authors: candidate.authors,
          publicationYear: candidate.publicationYear,
          provenance: candidate.provenance,
        },
        verification,
      };
    })
    .sort((left, right) => right.verification.scores.overall - left.verification.scores.overall || left.candidate.id.localeCompare(right.candidate.id, "en"));
}

export function verifyCandidates(
  candidates: readonly DiscoveryCandidate[],
  sourceRegistry: readonly Source[],
  options: { now?: Date } = {},
): VerificationExecutionResult {
  const startedAt = options.now ?? new Date();
  const duplicateResult = analyzeDuplicates(candidates, sourceRegistry);
  const errors: Array<{ candidateId?: string; message: string }> = [];
  const results: CandidateVerification[] = [];
  for (const candidate of [...candidates].sort((left, right) => left.id.localeCompare(right.id, "en"))) {
    try {
      results.push(verifyCandidate(candidate, sourceRegistry, duplicateResult.byCandidateId.get(candidate.id)!, startedAt));
    } catch (error) {
      errors.push({ candidateId: candidate.id, message: error instanceof Error ? error.message : String(error) });
      results.push({
        candidateId: candidate.id,
        title: candidate.title,
        sourceType: candidate.sourceType,
        matchedTopics: [],
        relatedTopics: [],
        scores: {
          relevance: { value: 0, reasons: ["verification failed"], evidence: [] },
          authority: { value: 0, reasons: ["verification failed"], evidence: [] },
          metadataCompleteness: { value: 0, reasons: ["verification failed"], evidence: [] },
          versionRelevance: { value: 0, reasons: ["verification failed"], evidence: [] },
          corpusValue: { value: 0, reasons: ["verification failed"], evidence: [] },
          accessUtility: { value: 0, reasons: ["verification failed"], evidence: [] },
          overall: 0,
        },
        versionClass: "UNKNOWN",
        status: "PENDING",
        flags: ["SUSPICIOUS_METADATA"],
        reasons: [],
        concerns: ["verification error recorded; candidate remains staged"],
        rejectionReasons: [],
        duplicate: duplicateResult.byCandidateId.get(candidate.id) ?? { state: "UNIQUE", exactKeys: [], possibleDuplicates: [] },
        conflicts: structuredClone(candidate.fieldConflicts ?? []),
        scoringModelVersion: SCORING_MODEL_VERSION,
      });
    }
  }
  const finishedAt = options.now ?? new Date();
  const summary = buildSummary(results, errors.length);
  return {
    run: {
      id: `verification-${startedAt.toISOString().replace(/[:.]/g, "-")}`,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      scoringModelVersion: SCORING_MODEL_VERSION,
      status: errors.length === 0 ? "completed" : errors.length < candidates.length ? "partial" : "failed",
      summary,
      errors,
    },
    results,
    reviewQueue: createReviewQueue(candidates, results),
  };
}

const statusRank = { VERIFIED: 0, REVIEW_REQUIRED: 1, PENDING: 2, REJECTED: 3, DUPLICATE: 4 } as const;

export function rankCandidatesForTopic(results: readonly CandidateVerification[], topicId: string) {
  return results
    .filter((result) => result.primaryTopic === topicId || result.matchedTopics.some((match) => match.topicId === topicId))
    .sort((left, right) =>
      statusRank[left.status] - statusRank[right.status]
      || right.scores.overall - left.scores.overall
      || right.scores.relevance.value - left.scores.relevance.value
      || left.candidateId.localeCompare(right.candidateId, "en"),
    );
}

export function mapConflictsToFlags(conflicts: readonly DiscoveryFieldConflict[]) {
  return unique(conflicts.map((conflict) => conflictFlagByField[conflict.field]).filter((flag): flag is VerificationFlag => Boolean(flag)));
}
