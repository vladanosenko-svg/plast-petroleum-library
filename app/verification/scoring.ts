import { topicCorpusProfiles, type TopicCorpusProfile } from "../corpus-planning.ts";
import type { DiscoveryCandidate } from "../discovery/types.ts";
import {
  normalizeAuthorName,
  normalizeTitle,
  type Source,
  type SourceType,
} from "../source-registry.ts";
import {
  accessUtilityScores,
  authorityBaseScores,
  diversityPriorityTypes,
  genericPetroleumWords,
  SCORING_MODEL_VERSION,
  verificationPolicy,
  versionSensitiveTypes,
} from "./policy.ts";
import type {
  CandidateScores,
  CandidateTopicMatch,
  ScoreComponent,
  ScoreEvidence,
  VersionRelevanceClass,
} from "./types.ts";

const priorityScore = { critical: 25, high: 20, medium: 15, supporting: 10 } as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function component(value: number, reasons: string[], evidence: ScoreEvidence[]): ScoreComponent {
  return { value: clamp(value), reasons: [...new Set(reasons)], evidence };
}

function normalizedValues(values: readonly (string | undefined)[]) {
  return values.map(normalizeTitle).filter(Boolean);
}

function significantTokens(value: string) {
  return normalizeTitle(value)
    .split(" ")
    .filter((token) => token.length >= 4 || ["pvt", "eos", "scal", "гдм", "гдис", "грп"].includes(token))
    .filter((token) => !genericPetroleumWords.has(token));
}

function tokenEquivalent(left: string, right: string) {
  if (left === right) return true;
  if (!/[а-я]/u.test(left) || !/[а-я]/u.test(right)) return false;
  const prefixLength = Math.min(left.length, right.length, 8);
  return prefixLength >= 6 && left.slice(0, prefixLength) === right.slice(0, prefixLength);
}

function containsPhrase(haystack: string, phrase: string) {
  return Boolean(haystack && phrase && ` ${haystack} `.includes(` ${phrase} `));
}

function scoreTopic(candidate: DiscoveryCandidate, profile: TopicCorpusProfile) {
  const reasons: string[] = [];
  const evidence: ScoreEvidence[] = [];
  const title = normalizeTitle(candidate.title);
  const keywords = normalizeTitle((candidate.keywords ?? []).join(" "));
  const description = normalizeTitle(candidate.description);
  const providerText = normalizeTitle(Object.values(candidate.providerMetadata ?? {}).flat().join(" "));
  const products = normalizeTitle(candidate.engineering?.software?.productNames.join(" "));
  const terms = normalizedValues([...profile.ruSearchTerms, ...profile.enSearchTerms]);
  const aliases = normalizedValues(profile.aliases);

  const titleTerms = terms.filter((term) => term.length >= 3 && containsPhrase(title, term));
  const keywordTerms = terms.filter((term) => term.length >= 3 && containsPhrase(keywords, term));
  const descriptionTerms = terms.filter((term) => term.length >= 3 && containsPhrase(description, term));
  const aliasTerms = aliases.filter((term) => term.length >= 2 && containsPhrase(title, term));
  let value = 0;

  if (titleTerms.length > 0) {
    value += Math.min(48, 35 + (titleTerms.length - 1) * 7);
    reasons.push(`title matches topic term: ${titleTerms[0]}`);
    evidence.push({ field: "title", value: titleTerms.slice(0, 3).join("; ") });
  }
  if (aliasTerms.length > 0) {
    value += Math.min(25, 18 + (aliasTerms.length - 1) * 4);
    reasons.push(`title matches topic alias: ${aliasTerms[0]}`);
    evidence.push({ field: "aliases", value: aliasTerms.join("; ") });
  }
  if (keywordTerms.length > 0) {
    value += Math.min(24, 16 + (keywordTerms.length - 1) * 4);
    reasons.push(`keywords match topic: ${keywordTerms[0]}`);
    evidence.push({ field: "keywords", value: keywordTerms.slice(0, 3).join("; ") });
  }
  if (descriptionTerms.length > 0) {
    value += Math.min(18, 10 + (descriptionTerms.length - 1) * 3);
    reasons.push(`description matches topic: ${descriptionTerms[0]}`);
    evidence.push({ field: "description", value: descriptionTerms.slice(0, 3).join("; ") });
  }

  const termTokens = new Set(terms.flatMap(significantTokens));
  const contentTokens = new Set(significantTokens(`${candidate.title} ${candidate.keywords?.join(" ") ?? ""} ${candidate.description ?? ""}`));
  const tokenMatches = [...termTokens].filter((token) => [...contentTokens].some((contentToken) => tokenEquivalent(token, contentToken)));
  if (tokenMatches.length > 0) {
    value += Math.min(15, tokenMatches.length * 4);
    reasons.push(`specific topic tokens: ${tokenMatches.slice(0, 4).join(", ")}`);
    evidence.push({ field: "specificTokens", value: tokenMatches.slice(0, 6).join(", ") });
  }

  const productTerms = [...terms, ...aliases].filter((term) => term.length >= 3 && containsPhrase(products, term));
  if (productTerms.length > 0) {
    value += 24;
    reasons.push(`software product matches topic: ${productTerms[0]}`);
    evidence.push({ field: "engineering.software.productNames", value: productTerms.join("; ") });
  }
  if (candidate.engineering?.software && profile.topicId === "petroleum-software") {
    value += 30;
    reasons.push("registered petroleum software metadata matches the software topic");
    evidence.push({ field: "engineering.software.vendorId", value: candidate.engineering.software.vendorId });
  }
  if (candidate.engineering?.software && (
    candidate.engineering.software.productIds.includes(profile.topicId)
    || candidate.engineering.software.vendorId === profile.topicId
  )) {
    value += 35;
    reasons.push(`registered vendor/product exactly matches topic: ${profile.topicId}`);
    evidence.push({ field: "engineering.software.productIds", value: candidate.engineering.software.productIds.join(", ") });
  }
  const topicRelationships = candidate.engineering?.relationships?.filter((relation) => relation.targetId === profile.topicId) ?? [];
  if (topicRelationships.length > 0) {
    value += 25;
    reasons.push(`explicit engineering relationship targets topic: ${topicRelationships[0].type}`);
    evidence.push({ field: "engineering.relationships", value: topicRelationships.map((relation) => relation.type).join(", ") });
  }
  if (providerText && terms.some((term) => term.length >= 5 && containsPhrase(providerText, term))) {
    value += 6;
    reasons.push("provider subject metadata matches topic");
  }
  if (candidate.topicIds.includes(profile.topicId)) {
    value += 12;
    reasons.push("discovery query assigned this topic");
    evidence.push({ field: "topicIds", value: profile.topicId });
    if (candidate.engineering && candidate.provenance.some((item) => item.officialSource)) {
      value += 12;
      reasons.push("curated official engineering record confirms the topic assignment");
    }
    if (candidate.provenance.some((item) => item.provider === "kpfu" || item.provider === "cyberleninka")) {
      value += 10;
      reasons.push("bounded Russian institutional discovery confirms the topic assignment");
    }
  } else if (candidate.topicIds.some((topicId) => profile.relatedTopicIds.includes(topicId))) {
    value += 5;
    reasons.push("candidate is assigned only to a related topic");
  }
  if (candidate.sourceType && profile.preferredSourceTypes.includes(candidate.sourceType)) {
    value += 4;
    reasons.push(`preferred material type for topic: ${candidate.sourceType}`);
  }
  return { value: clamp(value), reasons, evidence };
}

export function scoreRelevance(
  candidate: DiscoveryCandidate,
  profiles: readonly TopicCorpusProfile[] = topicCorpusProfiles,
) {
  const scores = profiles
    .map((profile) => ({ profile, ...scoreTopic(candidate, profile) }))
    .sort((left, right) => right.value - left.value || left.profile.topicId.localeCompare(right.profile.topicId, "en"));
  const best = scores[0];
  const matchedTopics: CandidateTopicMatch[] = scores
    .filter((item, index) => item.value >= (index === 0 ? 20 : 25))
    .slice(0, 8)
    .map((item, index) => ({
      topicId: item.profile.topicId,
      score: item.value,
      strength: index === 0 ? "PRIMARY" : "SECONDARY",
      reasons: item.reasons,
    }));
  const primaryTopic = matchedTopics[0]?.topicId ?? candidate.topicIds[0];
  const primaryProfile = profiles.find((profile) => profile.topicId === primaryTopic);
  const relatedTopics = [...new Set([
    ...(primaryProfile?.relatedTopicIds ?? []),
    ...matchedTopics.slice(1).map((match) => match.topicId),
  ])].filter((topicId) => topicId !== primaryTopic);
  return {
    score: component(best?.value ?? 0, best?.reasons ?? ["no petroleum topic signal"], best?.evidence ?? []),
    primaryTopic,
    matchedTopics,
    relatedTopics,
  };
}

function inferredAuthority(candidate: DiscoveryCandidate) {
  const engineering = candidate.engineering?.authority;
  if (engineering) {
    if (engineering === "DOMAIN_LIBRARY") return "THIRD_PARTY_LIBRARY" as const;
    return engineering;
  }
  const providers = new Set(candidate.provenance.map((item) => item.provider));
  const article = ["journal-article", "review-article", "conference-paper", "spe-paper"].includes(candidate.sourceType ?? "");
  if ((providers.has("crossref") || providers.has("openalex")) && article && candidate.identifiers.doi && candidate.publication?.journal) {
    return "PEER_REVIEWED" as const;
  }
  if (providers.has("crossref") && candidate.identifiers.doi) return "PUBLISHER" as const;
  if (providers.has("kpfu")) return "UNIVERSITY" as const;
  if (providers.has("cyberleninka")) return "INSTITUTIONAL_REPOSITORY" as const;
  if (providers.has("openalex")) return "PUBLISHER" as const;
  return "UNKNOWN" as const;
}

export function scoreAuthority(candidate: DiscoveryCandidate) {
  if (candidate.qualitySignals?.isRetracted) {
    return component(0, ["provider metadata marks the record as retracted"], [{ field: "qualitySignals.isRetracted", value: "true" }]);
  }
  const category = inferredAuthority(candidate);
  let value = authorityBaseScores[category];
  const reasons = [`authority category: ${category}`];
  const evidence: ScoreEvidence[] = [{ field: "authority", value: category }];
  if (candidate.provenance.some((item) => item.officialSource)) {
    value += 3;
    reasons.push("official-source provenance is explicit");
  }
  if (candidate.provenance.length > 1) {
    value += Math.min(4, candidate.provenance.length - 1);
    reasons.push("metadata confirmed by multiple discovery records");
  }
  if (candidate.identifiers.doi && category === "PEER_REVIEWED") {
    reasons.push("DOI and journal metadata support scholarly provenance");
    evidence.push({ field: "identifiers.doi", value: candidate.identifiers.doi });
  }
  return component(value, reasons, evidence);
}

interface CompletenessField {
  name: string;
  weight: number;
  present: boolean;
  value?: string;
}

function hasOrganization(candidate: DiscoveryCandidate) {
  return Boolean(
    candidate.publication?.institution
    || candidate.publication?.publisher
    || candidate.engineering?.software?.vendorId,
  );
}

function completenessFields(candidate: DiscoveryCandidate): CompletenessField[] {
  const landing = candidate.urls?.landingPage ?? candidate.provenance.find((item) => item.landingPage)?.landingPage;
  const base: CompletenessField[] = [
    { name: "title", weight: 18, present: candidate.title.trim().length > 0, value: candidate.title },
    { name: "sourceType", weight: 7, present: Boolean(candidate.sourceType), value: candidate.sourceType },
    { name: "language", weight: 5, present: Boolean(candidate.language), value: candidate.language },
    { name: "landingPage", weight: 12, present: Boolean(landing), value: landing },
    { name: "description", weight: 8, present: Boolean(candidate.description?.trim()), value: candidate.description },
  ];
  const type = candidate.sourceType;
  if (["manual", "software-documentation", "tutorial", "training-material", "release-notes"].includes(type ?? "")) {
    base.push(
      { name: "organizationOrVendor", weight: 14, present: hasOrganization(candidate), value: candidate.engineering?.software?.vendorId ?? candidate.publication?.institution ?? candidate.publication?.publisher },
      { name: "softwareProduct", weight: 14, present: Boolean(candidate.engineering?.software?.productIds.length), value: candidate.engineering?.software?.productNames.join(", ") },
      { name: "softwareOrDocumentVersion", weight: 10, present: Boolean(candidate.engineering?.software?.softwareVersion || candidate.engineering?.software?.documentVersion), value: candidate.engineering?.software?.documentVersion ?? candidate.engineering?.software?.softwareVersion },
      { name: "accessStatus", weight: 7, present: Boolean(candidate.engineering?.access.availability || candidate.accessHint), value: candidate.engineering?.access.availability ?? candidate.accessHint },
      { name: "yearOrRelease", weight: 5, present: Boolean(candidate.publicationYear || candidate.engineering?.software?.releaseDate), value: String(candidate.publicationYear ?? candidate.engineering?.software?.releaseDate ?? "") },
    );
  } else if (["journal-article", "review-article", "conference-paper", "spe-paper", "book-chapter"].includes(type ?? "")) {
    base.push(
      { name: "authors", weight: 14, present: candidate.authors.length > 0, value: candidate.authors.map((author) => author.fullName).join(", ") },
      { name: "publicationYear", weight: 10, present: Boolean(candidate.publicationYear), value: String(candidate.publicationYear ?? "") },
      { name: "journalPublisherConference", weight: 10, present: Boolean(candidate.publication?.journal || candidate.publication?.publisher || candidate.publication?.conference), value: candidate.publication?.journal ?? candidate.publication?.publisher ?? candidate.publication?.conference },
      { name: "scholarlyIdentifier", weight: 10, present: Boolean(candidate.identifiers.doi || candidate.identifiers.issn?.length), value: candidate.identifiers.doi ?? candidate.identifiers.issn?.join(", ") },
      { name: "accessStatus", weight: 6, present: Boolean(candidate.openAccess?.status || candidate.accessHint), value: candidate.openAccess?.status ?? candidate.accessHint },
    );
  } else if (["book", "textbook", "study-guide", "monograph"].includes(type ?? "")) {
    base.push(
      { name: "authors", weight: 14, present: candidate.authors.length > 0, value: candidate.authors.map((author) => author.fullName).join(", ") },
      { name: "publicationYear", weight: 10, present: Boolean(candidate.publicationYear), value: String(candidate.publicationYear ?? "") },
      { name: "publisher", weight: 10, present: Boolean(candidate.publication?.publisher), value: candidate.publication?.publisher },
      { name: "isbnOrCatalogueId", weight: 10, present: Boolean(candidate.identifiers.isbn?.length || candidate.provenance[0]?.providerRecordId), value: candidate.identifiers.isbn?.join(", ") ?? candidate.provenance[0]?.providerRecordId },
      { name: "accessStatus", weight: 6, present: Boolean(candidate.openAccess?.status || candidate.accessHint), value: candidate.openAccess?.status ?? candidate.accessHint },
    );
  } else if (["dataset", "example-model", "benchmark"].includes(type ?? "")) {
    base.push(
      { name: "organization", weight: 13, present: hasOrganization(candidate) || Boolean(candidate.provenance[0]?.originProviderId), value: candidate.publication?.institution ?? candidate.provenance[0]?.originProviderId },
      { name: "documentedPurpose", weight: 14, present: Boolean(candidate.description?.trim()), value: candidate.description },
      { name: "accessStatus", weight: 10, present: Boolean(candidate.engineering?.access.availability || candidate.accessHint), value: candidate.engineering?.access.availability ?? candidate.accessHint },
      { name: "licenceOrRights", weight: 8, present: Boolean(candidate.engineering?.access.license || candidate.engineering?.access.rightsNote), value: candidate.engineering?.access.license ?? candidate.engineering?.access.rightsNote },
      { name: "relationshipsOrCompatibility", weight: 8, present: Boolean(candidate.engineering?.relationships?.length || candidate.engineering?.software?.productIds.length), value: candidate.engineering?.relationships?.map((relation) => relation.type).join(", ") },
    );
  } else {
    base.push(
      { name: "authorsOrOrganization", weight: 16, present: candidate.authors.length > 0 || hasOrganization(candidate), value: candidate.authors[0]?.fullName ?? candidate.publication?.institution ?? candidate.publication?.publisher },
      { name: "publicationYear", weight: 10, present: Boolean(candidate.publicationYear), value: String(candidate.publicationYear ?? "") },
      { name: "providerRecordId", weight: 8, present: Boolean(candidate.provenance[0]?.providerRecordId), value: candidate.provenance[0]?.providerRecordId },
      { name: "accessStatus", weight: 6, present: Boolean(candidate.engineering?.access.availability || candidate.openAccess?.status || candidate.accessHint), value: candidate.engineering?.access.availability ?? candidate.openAccess?.status ?? candidate.accessHint },
    );
  }
  return base;
}

export function scoreMetadataCompleteness(candidate: DiscoveryCandidate) {
  const fields = completenessFields(candidate);
  const total = fields.reduce((sum, field) => sum + field.weight, 0);
  const present = fields.filter((field) => field.present);
  let value = present.reduce((sum, field) => sum + field.weight, 0) / total * 100;
  const reasons = present.map((field) => `metadata present: ${field.name}`);
  const evidence = present.filter((field) => field.value).slice(0, 12).map((field) => ({ field: field.name, value: field.value! }));
  const catalogue = Object.keys(candidate.providerMetadata ?? {}).find((key) => /^(udc|bbk|удк|ббк)$/iu.test(key));
  if (catalogue) {
    value += 3;
    reasons.push(`Russian catalogue metadata preserved: ${catalogue}`);
    evidence.push({ field: catalogue, value: String(candidate.providerMetadata?.[catalogue]) });
  }
  const missing = fields.filter((field) => !field.present).map((field) => field.name);
  if (missing.length > 0) reasons.push(`missing applicable metadata: ${missing.join(", ")}`);
  return component(value, reasons, evidence);
}

export function scoreVersionRelevance(candidate: DiscoveryCandidate, now = new Date()) {
  if (!candidate.sourceType || !versionSensitiveTypes.has(candidate.sourceType)) {
    return {
      score: component(100, ["version freshness is not applicable to this material type"], [{ field: "sourceType", value: candidate.sourceType ?? "unknown" }]),
      versionClass: "NOT_APPLICABLE" as const,
    };
  }
  const version = candidate.engineering?.software?.documentVersion ?? candidate.engineering?.software?.softwareVersion;
  const versionYear = version?.match(/\b(?:19|20)\d{2}\b/u)?.[0];
  const releaseYear = candidate.engineering?.software?.releaseDate
    ? Number(candidate.engineering.software.releaseDate.slice(0, 4))
    : candidate.publicationYear ?? (versionYear ? Number(versionYear) : undefined);
  if (!version) {
    return { score: component(45, ["version-sensitive material has no explicit version"], releaseYear ? [{ field: "releaseYear", value: String(releaseYear) }] : []), versionClass: "UNKNOWN" as const };
  }
  if (!releaseYear) {
    return { score: component(65, ["version is preserved but current-release comparison is unavailable"], [{ field: "version", value: version! }]), versionClass: "UNKNOWN" as const };
  }
  const age = now.getUTCFullYear() - releaseYear;
  if (age <= 1) return { score: component(100, ["release is current or from the previous year"], [{ field: "releaseYear", value: String(releaseYear) }]), versionClass: "CURRENT" as const };
  if (age <= 4) return { score: component(82, ["release is recent; newer-version evidence was not inferred"], [{ field: "releaseYear", value: String(releaseYear) }]), versionClass: "RECENT" as const };
  return { score: component(55, ["legacy version retained for users of historical software releases"], [{ field: "releaseYear", value: String(releaseYear) }]), versionClass: "LEGACY" as const };
}

export function scoreAccessUtility(candidate: DiscoveryCandidate) {
  const availability = candidate.engineering?.access.availability;
  if (availability) {
    return component(accessUtilityScores[availability], [`access availability: ${availability}; quality is scored independently`], [{ field: "engineering.access.availability", value: availability }]);
  }
  if (candidate.openAccess?.isOpenAccess) return component(100, ["provider reports open access"], [{ field: "openAccess.isOpenAccess", value: "true" }]);
  if (candidate.accessHint === "external-fulltext") return component(90, ["external full text is linked"], [{ field: "accessHint", value: candidate.accessHint }]);
  if (candidate.accessHint === "metadata-only") return component(55, ["metadata is usable although full text is not available"], [{ field: "accessHint", value: candidate.accessHint }]);
  return component(40, ["access status is unknown"], []);
}

function typeCount(sources: readonly Source[], topicId: string | undefined, type: SourceType | undefined) {
  if (!topicId || !type) return 0;
  return sources.filter((source) => source.recordStatus === "verified" && source.topics.includes(topicId) && source.type === type).length;
}

export function scoreCorpusValue(
  candidate: DiscoveryCandidate,
  primaryTopic: string | undefined,
  sourceRegistry: readonly Source[],
  profiles: readonly TopicCorpusProfile[] = topicCorpusProfiles,
) {
  const profile = profiles.find((item) => item.topicId === primaryTopic);
  if (!profile) return component(35, ["no corpus profile was matched"], []);
  const verifiedForTopic = sourceRegistry.filter((source) => source.recordStatus === "verified" && source.topics.includes(profile.topicId));
  const gapRatio = Math.max(0, 1 - verifiedForTopic.length / Math.max(1, profile.target.minimum));
  let value = 20 + gapRatio * 40 + priorityScore[profile.priority];
  const reasons = [
    `topic priority: ${profile.priority}`,
    `verified coverage: ${verifiedForTopic.length}/${profile.target.minimum} minimum`,
  ];
  const evidence: ScoreEvidence[] = [
    { field: "topic", value: profile.topicId },
    { field: "coverage", value: `${verifiedForTopic.length}/${profile.target.minimum}` },
  ];
  if (candidate.sourceType && profile.preferredSourceTypes.includes(candidate.sourceType)) {
    value += 8;
    reasons.push("material type is preferred by the topic corpus profile");
  }
  if (candidate.sourceType && typeCount(sourceRegistry, primaryTopic, candidate.sourceType) === 0) {
    value += 12;
    reasons.push(`fills an empty material-type gap: ${candidate.sourceType}`);
  }
  if (candidate.sourceType && diversityPriorityTypes.has(candidate.sourceType)) {
    value += 8;
    reasons.push("practical/diversity material type strengthens corpus balance");
  }
  if ((candidate.engineering?.relationships?.length ?? 0) > 0) {
    value += 4;
    reasons.push("documented relationships support an engineering learning chain");
  }
  return component(value, reasons, evidence);
}

export function calculateOverall(scores: Omit<CandidateScores, "overall">) {
  const weights = verificationPolicy.weights;
  return clamp(
    scores.relevance.value * weights.relevance
    + scores.authority.value * weights.authority
    + scores.metadataCompleteness.value * weights.metadataCompleteness
    + scores.versionRelevance.value * weights.versionRelevance
    + scores.corpusValue.value * weights.corpusValue
    + scores.accessUtility.value * weights.accessUtility,
  );
}

export interface CandidateScoringResult {
  scores: CandidateScores;
  primaryTopic?: string;
  matchedTopics: CandidateTopicMatch[];
  relatedTopics: string[];
  versionClass: VersionRelevanceClass;
  scoringModelVersion: string;
}

export function scoreCandidate(
  candidate: DiscoveryCandidate,
  sourceRegistry: readonly Source[],
  options: { profiles?: readonly TopicCorpusProfile[]; now?: Date } = {},
): CandidateScoringResult {
  const profiles = options.profiles ?? topicCorpusProfiles;
  const relevance = scoreRelevance(candidate, profiles);
  const version = scoreVersionRelevance(candidate, options.now);
  const partial = {
    relevance: relevance.score,
    authority: scoreAuthority(candidate),
    metadataCompleteness: scoreMetadataCompleteness(candidate),
    versionRelevance: version.score,
    corpusValue: scoreCorpusValue(candidate, relevance.primaryTopic, sourceRegistry, profiles),
    accessUtility: scoreAccessUtility(candidate),
  };
  return {
    scores: { ...partial, overall: calculateOverall(partial) },
    primaryTopic: relevance.primaryTopic,
    matchedTopics: relevance.matchedTopics,
    relatedTopics: relevance.relatedTopics,
    versionClass: version.versionClass,
    scoringModelVersion: SCORING_MODEL_VERSION,
  };
}

export function normalizedCandidateAuthorTokens(candidate: DiscoveryCandidate) {
  return candidate.authors.flatMap((author) => normalizeAuthorName(author.fullName).split(" ")).filter(Boolean);
}
