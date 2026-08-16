import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDuplicates } from "../app/verification/duplicates.ts";
import { verificationPolicy, SCORING_MODEL_VERSION } from "../app/verification/policy.ts";
import { verifyCandidates, rankCandidatesForTopic } from "../app/verification/pipeline.ts";
import { buildPromotedSource, promoteCandidate } from "../app/verification/promotion.ts";
import { applyManualReviewDecision } from "../app/verification/review.ts";
import {
  calculateOverall,
  scoreAccessUtility,
  scoreAuthority,
  scoreCandidate,
  scoreCorpusValue,
  scoreMetadataCompleteness,
  scoreRelevance,
  scoreVersionRelevance,
} from "../app/verification/scoring.ts";
import { validateSourceRegistry } from "../app/source-registry.ts";

const NOW = new Date("2026-08-16T00:00:00.000Z");

function candidate(overrides = {}) {
  const base = {
    id: "engineering-registry:test-manual",
    title: "tNavigator Reservoir Simulation Manual 2026",
    normalizedTitle: "tnavigator reservoir simulation manual 2026",
    description: "Official tNavigator reservoir simulation workflow and reference manual.",
    keywords: ["tNavigator", "reservoir simulation", "history matching"],
    authors: [],
    publicationYear: 2026,
    sourceType: "manual",
    language: "en",
    identifiers: {},
    publication: { institution: "Rock Flow Dynamics" },
    urls: { landingPage: "https://rfdyn.com/document/test-manual-2026" },
    engineering: {
      knowledgeLayers: ["SOFTWARE_TRAINING"],
      authority: "OFFICIAL_VENDOR",
      access: { availability: "OPEN", rightsNote: "Metadata verification only." },
      software: {
        vendorId: "rfd",
        productIds: ["tnavigator"],
        productNames: ["tNavigator"],
        softwareVersion: "26.1",
        documentVersion: "2026.1",
        releaseDate: "2026-03-01",
      },
      relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: "product:rfd:tnavigator" }],
    },
    accessHint: "external-fulltext",
    topicIds: ["tnavigator", "modeling"],
    provenance: [{
      provider: "engineering-registry",
      providerRecordId: "test-manual",
      originProviderId: "rfd",
      queryId: "tnavigator:test",
      topicId: "tnavigator",
      queryLanguage: "en",
      discoveredAt: NOW.toISOString(),
      landingPage: "https://rfdyn.com/document/test-manual-2026",
      authority: "OFFICIAL_VENDOR",
      officialSource: true,
    }],
    recordStatus: "candidate",
  };
  return structuredClone({ ...base, ...overrides });
}

function source(id, type = "book") {
  return {
    id,
    slug: id,
    title: `Verified ${id}`,
    authors: [{ fullName: "A. Author" }],
    year: 2024,
    language: "en",
    type,
    description: "Existing verified source",
    topics: ["modeling"],
    provenance: [{ provider: "manual", providerRecordId: id, url: `https://example.org/${id}` }],
    access: { status: "metadata-only", ragPermission: "metadata-only" },
    quality: { authorityTier: "scientific" },
    recordStatus: "verified",
    verification: {
      sourceCandidateId: `candidate-${id}`,
      verifiedAt: NOW.toISOString(),
      verificationMethod: "MANUAL_REVIEW",
      scoringModelVersion: SCORING_MODEL_VERSION,
      verificationReasons: ["fixture"],
      scores: { relevance: 80, authority: 80, metadataCompleteness: 80, versionRelevance: 100, corpusValue: 80, accessUtility: 50, overall: 80 },
    },
  };
}

test("uses a versioned explainable six-component policy and deterministic overall formula", () => {
  assert.equal(SCORING_MODEL_VERSION, "candidate-ranking-v1");
  assert.equal(Object.values(verificationPolicy.weights).reduce((sum, value) => sum + value, 0), 1);
  const item = { value: 80, reasons: ["evidence"], evidence: [{ field: "x", value: "y" }] };
  assert.equal(calculateOverall({ relevance: item, authority: item, metadataCompleteness: item, versionRelevance: item, corpusValue: item, accessUtility: item }), 80);
});

test("scores strong EN topic evidence and suppresses generic common-word noise", () => {
  const strong = scoreRelevance(candidate());
  const noise = scoreRelevance(candidate({
    id: "noise",
    title: "Gas Flow Simulation Model Analysis",
    normalizedTitle: "gas flow simulation model analysis",
    description: "Traffic simulation for an urban pipeline model.",
    keywords: ["flow", "gas", "model", "analysis"],
    topicIds: ["pvt"],
    engineering: undefined,
    provenance: [{ ...candidate().provenance[0], provider: "openalex", providerRecordId: "noise", officialSource: false }],
  }));
  assert.ok(strong.score.value >= 65);
  assert.ok(noise.score.value < verificationPolicy.thresholds.rejectBelowRelevance);
});

test("handles RU morphology, Cyrillic and institutional sources without a DOI penalty", () => {
  const russian = candidate({
    id: "kpfu:pta",
    title: "Анализ гидродинамических исследований скважин",
    normalizedTitle: "анализ гидродинамических исследований скважин",
    description: "Методические указания по интерпретации КВД и ГДИС.",
    keywords: ["ГДИС", "КВД"],
    authors: [{ fullName: "Иванов И. И." }],
    publicationYear: 2021,
    sourceType: "book",
    language: "ru",
    identifiers: { isbn: ["9785000000002"] },
    providerMetadata: { UDC: "622.276.1", BBK: "33.36" },
    publication: { publisher: "Издательство КФУ", institution: "КФУ" },
    engineering: undefined,
    topicIds: ["well-testing"],
    urls: { landingPage: "https://repository.kpfu.ru/record/pta" },
    provenance: [{ ...candidate().provenance[0], provider: "kpfu", providerRecordId: "pta", topicId: "well-testing", queryLanguage: "ru", landingPage: "https://repository.kpfu.ru/record/pta", officialSource: false }],
  });
  assert.equal(russian.identifiers.doi, undefined);
  assert.ok(scoreRelevance(russian).score.value >= 60);
  assert.ok(scoreAuthority(russian).value >= 70);
  assert.match(russian.title, /ГИДРОДИНАМИЧЕСКИХ/iu);
  assert.ok(scoreMetadataCompleteness(russian).reasons.some((reason) => /UDC/iu.test(reason)));
});

test("keeps authority independent from relevance", () => {
  const unrelatedOfficial = candidate({ title: "Official Seismic Processing Licence Notice", normalizedTitle: "official seismic processing licence notice", description: "Licence terms.", keywords: [], topicIds: ["pvt"] });
  assert.ok(scoreAuthority(unrelatedOfficial).value >= 90);
  assert.notEqual(scoreRelevance(unrelatedOfficial).primaryTopic, "pvt");
});

test("uses source-type-aware metadata requirements", () => {
  const manualScore = scoreMetadataCompleteness(candidate());
  const articleScore = scoreMetadataCompleteness(candidate({
    id: "article",
    title: "Pressure Transient Analysis in Fractured Reservoirs",
    normalizedTitle: "pressure transient analysis in fractured reservoirs",
    sourceType: "journal-article",
    authors: [{ fullName: "A. Researcher" }],
    identifiers: { doi: "10.2118/test" },
    publication: { journal: "SPE Journal" },
    engineering: undefined,
  }));
  assert.ok(manualScore.value >= 85, "manual must not require DOI");
  assert.ok(articleScore.value >= 80, "article must not require ISBN");
});

test("classifies current, recent, legacy and non-versioned historical materials correctly", () => {
  assert.equal(scoreVersionRelevance(candidate(), NOW).versionClass, "CURRENT");
  assert.equal(scoreVersionRelevance(candidate({ publicationYear: 2023, engineering: { ...candidate().engineering, software: { ...candidate().engineering.software, releaseDate: undefined, documentVersion: "2023.1" } } }), NOW).versionClass, "RECENT");
  assert.equal(scoreVersionRelevance(candidate({ publicationYear: 2018, engineering: { ...candidate().engineering, software: { ...candidate().engineering.software, releaseDate: undefined, documentVersion: "2018.1" } } }), NOW).versionClass, "LEGACY");
  const classic = candidate({ sourceType: "book", publicationYear: 1955, engineering: undefined });
  assert.equal(scoreVersionRelevance(classic, NOW).versionClass, "NOT_APPLICABLE");
  assert.equal(scoreVersionRelevance(classic, NOW).score.value, 100);
});

test("raises corpus value for a missing practical type without hard quotas", () => {
  const existing = Array.from({ length: 6 }, (_, index) => source(`book-${index}`));
  const manualValue = scoreCorpusValue(candidate({ topicIds: ["modeling"] }), "modeling", existing).value;
  const extraBookValue = scoreCorpusValue(candidate({ sourceType: "book", engineering: undefined, topicIds: ["modeling"] }), "modeling", existing).value;
  assert.ok(manualValue > extraBookValue);
});

test("keeps access utility subordinate to quality", () => {
  const paid = candidate({ engineering: { ...candidate().engineering, access: { availability: "PAID" } } });
  assert.equal(scoreAccessUtility(paid).value, 50);
  assert.ok(scoreCandidate(paid, [], { now: NOW }).scores.authority.value > scoreAccessUtility(paid).value);
});

test("detects exact DOI duplicates and duplicates against Source Registry", () => {
  const first = candidate({ id: "first", identifiers: { doi: "10.2118/123-ms" } });
  const second = candidate({ id: "second", identifiers: { doi: "10.2118/123-ms" }, title: "Alternate provider title" });
  const staged = analyzeDuplicates([first, second], []);
  assert.equal([...staged.byCandidateId.values()].filter((item) => item.state === "EXACT_DUPLICATE").length, 1);
  const registrySource = { ...source("registry-match"), identifiers: { doi: "10.2118/123-ms" } };
  const registry = analyzeDuplicates([first], [registrySource]).byCandidateId.get(first.id);
  assert.equal(registry.duplicateTargetKind, "SOURCE_REGISTRY");
});

test("detects fuzzy candidates with conflicting strong IDs but never auto-merges them", () => {
  const first = candidate({ id: "doi:one", sourceType: "journal-article", engineering: undefined, identifiers: { doi: "10.2118/one" }, authors: [{ fullName: "Иванов И. И." }], urls: { landingPage: "https://example.org/paper/one" }, provenance: [{ ...candidate().provenance[0], provider: "crossref", providerRecordId: "one", landingPage: "https://example.org/paper/one", officialSource: false }] });
  const second = candidate({ id: "doi:two", sourceType: "journal-article", engineering: undefined, identifiers: { doi: "10.2118/two" }, authors: [{ fullName: "Иванов И. И." }], urls: { landingPage: "https://example.org/paper/two" }, provenance: [{ ...candidate().provenance[0], provider: "crossref", providerRecordId: "two", landingPage: "https://example.org/paper/two", officialSource: false }] });
  const result = verifyCandidates([first, second], [], { now: NOW });
  assert.equal(result.results.length, 2);
  assert.ok(result.results.every((item) => item.duplicate.state === "POSSIBLE_DUPLICATE"));
  assert.ok(result.results.every((item) => item.status === "REVIEW_REQUIRED"));
});

test("uses blocking keys instead of all-pairs fuzzy comparison", () => {
  const many = Array.from({ length: 1000 }, (_, index) => candidate({ id: `candidate-${index}`, title: `Unique thermodynamic document ${index}`, normalizedTitle: `unique thermodynamic document ${index}`, publicationYear: 1900 + index, identifiers: { doi: `10.2118/${index}` } }));
  const result = analyzeDuplicates(many, []);
  assert.ok(result.comparisons < many.length * 20);
});

test("maps metadata conflicts to review flags", () => {
  const conflicted = candidate({ fieldConflicts: [{ field: "publicationYear", values: ["2023", "2024"] }, { field: "authors", values: ["A", "B"] }, { field: "title", values: ["A", "B"] }, { field: "identifiers.doi", values: ["10.1/a", "10.1/b"] }, { field: "engineering.software.documentVersion", values: ["25", "26"] }, { field: "publication.publisher", values: ["A", "B"] }] });
  const result = verifyCandidates([conflicted], [], { now: NOW }).results[0];
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.flags.includes("YEAR_CONFLICT"));
  assert.ok(result.flags.includes("AUTHOR_CONFLICT"));
  assert.ok(result.flags.includes("VERSION_CONFLICT"));
  assert.ok(result.flags.includes("TITLE_CONFLICT"));
  assert.ok(result.flags.includes("IDENTIFIER_CONFLICT"));
  assert.ok(result.flags.includes("PUBLISHER_CONFLICT"));
});

test("rejects obvious noise and unsafe URLs with structured reasons", () => {
  const noise = candidate({ id: "noise", title: "Gas Flow Simulation Model Analysis", normalizedTitle: "gas flow simulation model analysis", description: "Urban traffic study", keywords: [], topicIds: ["pvt"], engineering: undefined, urls: { landingPage: "https://example.org/noise" }, provenance: [{ ...candidate().provenance[0], provider: "openalex", providerRecordId: "noise", landingPage: "https://example.org/noise", officialSource: false }] });
  const unsafe = candidate({ id: "unsafe", urls: { landingPage: "http://127.0.0.1/private" }, provenance: [{ ...candidate().provenance[0], providerRecordId: "unsafe", landingPage: "http://127.0.0.1/private" }] });
  const result = verifyCandidates([noise, unsafe], [], { now: NOW }).results;
  assert.ok(result.find((item) => item.candidateId === "noise").rejectionReasons.includes("LOW_RELEVANCE"));
  assert.ok(result.find((item) => item.candidateId === "unsafe").rejectionReasons.includes("UNSAFE_URL"));
});

test("conservatively auto-verifies a complete official current manual", () => {
  const result = verifyCandidates([candidate()], [], { now: NOW });
  assert.equal(result.results[0].status, "VERIFIED");
  assert.equal(result.results[0].verificationMethod, "RULE_BASED");
  assert.equal(result.reviewQueue.length, 0);
});

test("creates a complete human-readable review queue", () => {
  const ambiguous = candidate({ engineering: { ...candidate().engineering, software: { ...candidate().engineering.software, releaseDate: undefined, documentVersion: undefined, softwareVersion: undefined } } });
  const result = verifyCandidates([ambiguous], [], { now: NOW });
  assert.equal(result.reviewQueue.length, 1);
  assert.equal(result.reviewQueue[0].candidate.id, ambiguous.id);
  assert.ok(result.reviewQueue[0].verification.flags.includes("VERSION_AMBIGUITY"));
  assert.ok(result.reviewQueue[0].verification.scores.overall > 0);
});

test("supports auditable VERIFY, REJECT, MARK_DUPLICATE and KEEP_SEPARATE actions", () => {
  const current = verifyCandidates([candidate({ engineering: { ...candidate().engineering, software: undefined } })], [], { now: NOW }).results[0];
  for (const action of ["VERIFY", "REJECT", "MARK_DUPLICATE", "KEEP_SEPARATE"]) {
    const applied = applyManualReviewDecision(current, { action, reviewer: "QA", reason: "controlled fixture", decidedAt: NOW.toISOString(), duplicateOf: action === "MARK_DUPLICATE" ? "source-1" : undefined });
    assert.equal(applied.decision.action, action);
    assert.equal(applied.decision.candidateId, current.candidateId);
  }
  assert.throws(() => applyManualReviewDecision(current, { action: "UNKNOWN", reviewer: "QA", reason: "invalid", decidedAt: NOW.toISOString() }), /Unknown manual review action/u);
});

test("promotes only VERIFIED candidates, preserves provenance/version/relationships and is idempotent", () => {
  const item = candidate();
  const verification = verifyCandidates([item], [], { now: NOW }).results[0];
  const built = buildPromotedSource(item, verification);
  assert.equal(built.recordStatus, "verified");
  assert.equal(built.verification.sourceCandidateId, item.id);
  assert.equal(built.software.documentVersion, "2026.1");
  assert.equal(built.relationships[0].type, "DOCUMENTS_PRODUCT");
  assert.equal(built.document, undefined);
  assert.equal(built.access.ragPermission, "metadata-only");
  assert.deepEqual(validateSourceRegistry([built], ["tnavigator", "modeling", "petroleum-software"]), []);
  const first = promoteCandidate([], item, verification);
  const second = promoteCandidate(first.sources, item, verification);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.sources.length, 1);
});

test("refuses promotion of review and rejected candidates", () => {
  const item = candidate({ title: "Gas Flow Simulation Model Analysis", normalizedTitle: "gas flow simulation model analysis", description: "Urban traffic", keywords: [], topicIds: ["pvt"], engineering: undefined, provenance: [{ ...candidate().provenance[0], provider: "openalex", officialSource: false }] });
  const verification = verifyCandidates([item], [], { now: NOW }).results[0];
  assert.notEqual(verification.status, "VERIFIED");
  assert.throws(() => buildPromotedSource(item, verification), /Only a VERIFIED candidate/u);
});

test("preserves datasets and engineering relationships in scoring and promotion", () => {
  const dataset = candidate({
    id: "dataset",
    title: "tNavigator Reservoir Simulation Training Dataset",
    normalizedTitle: "tnavigator reservoir simulation training dataset",
    sourceType: "dataset",
    engineering: { ...candidate().engineering, relationships: [{ type: "USES_DATASET", targetId: "dataset-companion" }, { type: "TRAINING_FOR", targetId: "product:rfd:tnavigator" }] },
  });
  const scoring = scoreCandidate(dataset, [], { now: NOW });
  assert.ok(scoring.scores.corpusValue.reasons.some((reason) => /learning chain/iu.test(reason)));
});

test("ranks by status, overall and relevance while exposing components", () => {
  const strong = candidate();
  const weak = candidate({ id: "weak", title: "Reservoir Simulation Notes", normalizedTitle: "reservoir simulation notes", engineering: undefined, provenance: [{ ...candidate().provenance[0], provider: "openalex", providerRecordId: "weak", officialSource: false }] });
  const results = verifyCandidates([strong, weak], [], { now: NOW }).results;
  const ranked = rankCandidatesForTopic(results, "tnavigator");
  assert.equal(ranked[0].candidateId, strong.id);
  assert.equal(typeof ranked[0].scores.metadataCompleteness.value, "number");
});
