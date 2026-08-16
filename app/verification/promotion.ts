import type { DiscoveryCandidate } from "../discovery/types.ts";
import {
  normalizeDoi,
  normalizeIsbn,
  normalizeTitle,
  type AuthorityTier,
  type Source,
  type SourceAvailability,
  type SourceProvider,
} from "../source-registry.ts";
import { isSafePublicHttpUrl } from "./security.ts";
import type { CandidateVerification } from "./types.ts";

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function slugify(value: string) {
  const slug = normalizeTitle(value)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "verified-source";
}

function authorityTier(candidate: DiscoveryCandidate): AuthorityTier {
  const authority = candidate.engineering?.authority;
  if (["OFFICIAL_VENDOR", "GOVERNMENT", "STANDARDS_BODY"].includes(authority ?? "")) return "core";
  if (["PROFESSIONAL_SOCIETY", "RESEARCH_ORGANIZATION", "UNIVERSITY"].includes(authority ?? "")) return "scientific";
  if (candidate.identifiers.doi || candidate.publication?.journal) return "scientific";
  if (candidate.sourceType && ["tutorial", "training-material", "case-study", "dataset", "example-model"].includes(candidate.sourceType)) return "practical";
  return "supplementary";
}

function availability(candidate: DiscoveryCandidate): SourceAvailability {
  return candidate.engineering?.access.availability ?? (candidate.openAccess?.isOpenAccess ? "OPEN" : "UNKNOWN");
}

function sourceUrl(candidate: DiscoveryCandidate) {
  return candidate.urls?.landingPage
    ?? candidate.urls?.doi
    ?? candidate.provenance.find((item) => item.landingPage)?.landingPage;
}

function values(scores: CandidateVerification["scores"]) {
  return {
    relevance: scores.relevance.value,
    authority: scores.authority.value,
    metadataCompleteness: scores.metadataCompleteness.value,
    versionRelevance: scores.versionRelevance.value,
    corpusValue: scores.corpusValue.value,
    accessUtility: scores.accessUtility.value,
    overall: scores.overall,
  };
}

export function buildPromotedSource(
  candidate: DiscoveryCandidate,
  verification: CandidateVerification,
): Source {
  if (verification.candidateId !== candidate.id) throw new Error("Candidate and verification IDs do not match");
  if (verification.status !== "VERIFIED" || !verification.verifiedAt || !verification.verificationMethod) {
    throw new Error("Only a VERIFIED candidate with verification provenance can be promoted");
  }
  if (!candidate.sourceType || !candidate.language) throw new Error("Promotion requires source type and language");
  const url = sourceUrl(candidate);
  if (!isSafePublicHttpUrl(url)) throw new Error("Promotion requires a safe public landing URL");
  const verifiedUrl = url!;
  const organization = candidate.publication?.institution
    ?? candidate.publication?.publisher
    ?? candidate.engineering?.software?.vendorId;
  if (candidate.authors.length === 0 && !organization) throw new Error("Promotion requires authors or organization");
  const isbn = (candidate.identifiers.isbn ?? []).map(normalizeIsbn).filter((item): item is string => Boolean(item));
  const accessStatus = candidate.accessHint === "external-fulltext" || candidate.openAccess?.isOpenAccess
    ? "external-fulltext"
    : "metadata-only";
  const id = `src-${hash(candidate.id)}`;
  const slug = `${slugify(candidate.title)}-${hash(candidate.id).slice(0, 7)}`;
  return {
    id,
    slug,
    title: candidate.title,
    authors: structuredClone(candidate.authors),
    organization,
    year: candidate.publicationYear,
    language: candidate.language,
    type: candidate.sourceType,
    description: candidate.description?.trim() || `Проверенная metadata-only запись: ${candidate.title}.`,
    topics: [...new Set([verification.primaryTopic, ...candidate.topicIds, ...verification.matchedTopics.map((match) => match.topicId)].filter((topic): topic is string => Boolean(topic)))],
    keywords: structuredClone(candidate.keywords),
    identifiers: {
      doi: normalizeDoi(candidate.identifiers.doi),
      isbn10: isbn.find((item) => item.length === 10),
      isbn13: isbn.find((item) => item.length === 13),
      issn: candidate.identifiers.issn?.[0],
      openAlexId: candidate.identifiers.openAlexId,
      crossrefId: candidate.identifiers.crossrefId,
    },
    publication: structuredClone(candidate.publication),
    providerMetadata: structuredClone(candidate.providerMetadata),
    software: structuredClone(candidate.engineering?.software),
    relationships: structuredClone(candidate.engineering?.relationships),
    provenance: candidate.provenance.map((item) => ({
      provider: item.provider as SourceProvider,
      providerRecordId: item.providerRecordId,
      originProviderId: item.originProviderId,
      officialSource: item.officialSource,
      url: item.landingPage ?? verifiedUrl,
      discoveredAt: item.discoveredAt,
      metadataRetrievedAt: verification.verifiedAt,
    })),
    access: {
      status: accessStatus,
      availability: availability(candidate),
      openAccess: candidate.openAccess?.isOpenAccess,
      license: candidate.engineering?.access.license ?? candidate.openAccess?.license,
      rightsNote: candidate.engineering?.access.rightsNote,
      copyrightNote: candidate.engineering?.access.rightsNote,
      ragPermission: "metadata-only",
      externalUrl: verifiedUrl,
    },
    quality: {
      authorityTier: authorityTier(candidate),
      relevanceScore: verification.scores.relevance.value,
      qualityScore: verification.scores.overall,
      citationCount: candidate.qualitySignals?.openAlexCitedByCount,
      peerReviewed: Boolean(candidate.identifiers.doi && candidate.publication?.journal),
    },
    verification: {
      sourceCandidateId: candidate.id,
      verifiedAt: verification.verifiedAt,
      verificationMethod: verification.verificationMethod,
      scoringModelVersion: verification.scoringModelVersion,
      verificationReasons: [...verification.reasons],
      scores: values(verification.scores),
    },
    recordStatus: "verified",
    createdAt: verification.verifiedAt,
    updatedAt: verification.verifiedAt,
  };
}

export function promoteCandidate(
  sourceRegistry: readonly Source[],
  candidate: DiscoveryCandidate,
  verification: CandidateVerification,
) {
  const existing = sourceRegistry.find((source) => source.verification?.sourceCandidateId === candidate.id);
  if (existing) return { sources: [...sourceRegistry], source: existing, created: false };
  const source = buildPromotedSource(candidate, verification);
  const idCollision = sourceRegistry.find((item) => item.id === source.id || item.slug === source.slug);
  if (idCollision) throw new Error(`Promotion identity collision with ${idCollision.id}`);
  return { sources: [...sourceRegistry, source], source, created: true };
}
