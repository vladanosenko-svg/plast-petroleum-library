import assert from "node:assert/strict";
import test from "node:test";
import { topicCorpusProfiles } from "../app/corpus-planning.ts";
import { sources } from "../app/data.ts";
import { DEFAULT_DISCOVERY_LIMITS } from "../app/discovery/config.ts";
import {
  buildEngineeringDiscoveryPlan,
  buildEngineeringDiscoveryQueries,
  buildUniversityDiscoveryPlan,
} from "../app/discovery/engineering-query-planner.ts";
import {
  academicDomainRegistry,
  engineeringProviderCapabilities,
  engineeringRegistryRecords,
  engineeringVendors,
  validateEngineeringRegistries,
} from "../app/discovery/engineering-registry.ts";
import { normalizeEngineeringRegistryRecord } from "../app/discovery/normalize.ts";
import { EngineeringRegistryDiscoveryProvider } from "../app/discovery/providers/engineering-registry.ts";
import { runDiscovery } from "../app/discovery/runner.ts";
import { engineeringDiscoveryProviders } from "../app/discovery/types.ts";
import { sourceTypes } from "../app/source-registry.ts";

const profileById = new Map(topicCorpusProfiles.map((profile) => [profile.topicId, profile]));

test("validates the required 3D.3 provider, vendor and product registries", () => {
  assert.equal(validateEngineeringRegistries(), true);
  assert.deepEqual(engineeringVendors.map((vendor) => vendor.id), ["rfd", "slb", "cmg", "kappa", "petex", "halliburton"]);
  const productNames = new Set(engineeringVendors.flatMap((vendor) => vendor.products.map((product) => product.name)));
  for (const required of ["tNavigator", "Petrel", "ECLIPSE", "INTERSECT", "Techlog", "IMEX", "GEM", "STARS", "WinProp", "CMOST", "Saphir", "Topaze", "Emeraude", "PROSPER", "MBAL", "GAP", "PVTP", "REVEAL", "Nexus"]) {
    assert.ok(productNames.has(required), `missing product ${required}`);
  }
  const kappaProducts = engineeringVendors.find((vendor) => vendor.id === "kappa").products;
  assert.equal(kappaProducts.find((product) => product.name === "Diamant").current, false);
  for (const current of ["Citrine", "Orchid", "KAPPA-Automate", "KAPPA-Server"]) {
    assert.equal(kappaProducts.find((product) => product.name === current).current, true, `outdated KAPPA registry entry: ${current}`);
  }
  const geokniga = engineeringProviderCapabilities.find((provider) => provider.id === "geokniga");
  assert.equal(geokniga.status, "REQUIRES_PERMISSION");
  assert.match(geokniga.machineInterface, /sitemap/iu);
  assert.ok(!engineeringDiscoveryProviders.includes("geokniga"));
});

test("keeps engineering material types distinct in the shared source taxonomy", () => {
  for (const type of ["manual", "tutorial", "presentation", "case-study", "technical-report", "dataset", "example-model", "benchmark", "webinar", "workflow"]) {
    assert.ok(sourceTypes.includes(type), `missing SourceType ${type}`);
  }
  assert.notEqual(sourceTypes.indexOf("book"), sourceTypes.indexOf("manual"));
  assert.notEqual(sourceTypes.indexOf("manual"), sourceTypes.indexOf("tutorial"));
});

test("builds five-layer RU/EN engineering queries and bounded university whitelist plans", () => {
  const profile = profileById.get("modeling");
  const queries = buildEngineeringDiscoveryQueries(profile);
  assert.equal(queries.length, 10);
  assert.deepEqual(new Set(queries.map((query) => query.engineeringLayer)), new Set(["THEORY", "METHODOLOGY", "SOFTWARE_TRAINING", "PRACTICE", "EXAMPLES_DATASETS"]));
  assert.ok(queries.some((query) => query.language === "ru" && /практический пример/iu.test(query.query)));
  assert.ok(queries.some((query) => query.language === "en" && /field application case study/iu.test(query.query)));

  const universityPlan = buildUniversityDiscoveryPlan(["well-testing"]);
  assert.equal(universityPlan.length, academicDomainRegistry.length * 2);
  const allowedDomains = new Set(academicDomainRegistry.map((entry) => entry.officialDomain));
  assert.ok(universityPlan.every((query) => allowedDomains.has(query.domain) && query.query.startsWith(`site:${query.domain} `)));
  assert.ok(universityPlan.every((query) => !/site:\*\.edu/iu.test(query.query)));
});

test("normalizes official vendor provenance, access, versions and relationships without file acquisition", () => {
  const raw = engineeringRegistryRecords.find((record) => record.id === "petex-ipm13-getting-started");
  const query = buildEngineeringDiscoveryPlan(["petroleum-software"]).find((item) => item.engineeringLayer === "SOFTWARE_TRAINING" && item.language === "en");
  const candidate = normalizeEngineeringRegistryRecord(raw, query, "2026-08-16T00:00:00.000Z");
  assert.equal(candidate.sourceType, "manual");
  assert.equal(candidate.engineering.authority, "OFFICIAL_VENDOR");
  assert.equal(candidate.engineering.access.availability, "OPEN");
  assert.equal(candidate.engineering.access.license, undefined);
  assert.equal(candidate.engineering.software.softwareVersion, "13");
  assert.equal(candidate.engineering.software.documentVersion, "13");
  assert.ok(candidate.engineering.relationships.some((relation) => relation.type === "DOCUMENTS_PRODUCT"));
  assert.equal(candidate.provenance[0].officialSource, true);
  assert.equal(candidate.provenance[0].originProviderId, "petex");
  assert.equal(candidate.urls.openAccess, undefined);
});

test("separates availability from licence and represents paid/member access", () => {
  const opm = engineeringRegistryRecords.find((record) => record.id === "opm-open-datasets");
  const paid = engineeringRegistryRecords.find((record) => record.id === "onepetro-drilling-data-acquisition-chapter");
  const member = engineeringRegistryRecords.find((record) => record.id === "seg-education-lectures");
  assert.equal(opm.access.availability, "OPEN");
  assert.equal(opm.access.license, "Open Database License (ODbL)");
  assert.equal(paid.access.availability, "PAID");
  assert.equal(member.access.availability, "MEMBER_ONLY");
});

test("runs deterministic registry discovery and reports every required engineering bucket", async () => {
  const topicIds = [...new Set(engineeringRegistryRecords.flatMap((record) => record.topicIds))].sort();
  const queries = buildEngineeringDiscoveryPlan(topicIds);
  const provider = new EngineeringRegistryDiscoveryProvider();
  const result = await runDiscovery({
    queries,
    providers: new Map([[provider.id, provider]]),
    limits: { ...DEFAULT_DISCOVERY_LIMITS, maxResultsPerQuery: 50, maxTotalResultsPerRun: 5000, maxPagesPerQuery: 1, concurrency: 3, requestDelayMs: 0 },
    now: () => new Date("2026-08-16T00:00:00.000Z"),
  });
  assert.equal(result.run.status, "completed");
  assert.equal(result.run.summary.engineeringCandidates, engineeringRegistryRecords.length);
  assert.equal(result.candidates.length, engineeringRegistryRecords.length);
  for (const bucket of ["BOOK", "MANUAL", "TUTORIAL", "PRESENTATION", "CASE_STUDY", "TECHNICAL_REPORT", "DATASET", "EXAMPLE_MODEL"]) {
    assert.ok(result.run.summary.materialTypeDistribution[bucket] > 0, `empty bucket ${bucket}`);
  }
  const tutorials = result.candidates.find((candidate) => candidate.id === "engineering-registry:rfd-tnavigator-tutorials");
  assert.ok(tutorials.engineering.relationships.some((relation) => relation.type === "USES_DATASET" && relation.targetId === "rfd-tnavigator-demo-data"));
});

test("does not promote engineering candidates into the public Source Registry", () => {
  assert.ok(sources.every((source) => source.recordStatus !== "candidate"));
  assert.ok(sources.every((source) => source.provenance.every((item) => item.provider !== "engineering-registry")));
});
