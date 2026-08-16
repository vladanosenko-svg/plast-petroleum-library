import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { topicCorpusProfiles } from "../app/corpus-planning.ts";
import { DEFAULT_DISCOVERY_LIMITS } from "../app/discovery/config.ts";
import { mergeDiscoveryCandidates, mergeDiscoveryStaging } from "../app/discovery/merge.ts";
import { normalizeCrossrefRecord, normalizeOpenAlexRecord } from "../app/discovery/normalize.ts";
import { CrossrefDiscoveryProvider } from "../app/discovery/providers/crossref.ts";
import { OpenAlexDiscoveryProvider } from "../app/discovery/providers/openalex.ts";
import { buildDiscoveryPlan, buildDiscoveryQueries } from "../app/discovery/query-planner.ts";
import { runDiscovery } from "../app/discovery/runner.ts";
import { atomicWriteJson, resolveTopicIds } from "../scripts/discovery-support.mjs";

const openAlexFixture = JSON.parse(await readFile(new URL("./fixtures/discovery/openalex-search.json", import.meta.url), "utf8"));
const crossrefFixture = JSON.parse(await readFile(new URL("./fixtures/discovery/crossref-search.json", import.meta.url), "utf8"));
const pvtProfile = topicCorpusProfiles.find((profile) => profile.topicId === "pvt");
const modelingProfile = topicCorpusProfiles.find((profile) => profile.topicId === "modeling");
const openAlexQuery = buildDiscoveryQueries(pvtProfile, { providers: ["openalex"] })[0];
const crossrefQuery = buildDiscoveryQueries(pvtProfile, { providers: ["crossref"] })[0];

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("builds bounded deterministic RU and EN plans for all 65 corpus profiles", () => {
  const topicIds = topicCorpusProfiles.map((profile) => profile.topicId);
  const first = buildDiscoveryPlan(topicIds);
  const second = buildDiscoveryPlan(topicIds);
  assert.deepEqual(first, second);
  assert.equal(topicIds.length, 65);
  assert.equal(first.length, 65 * 2 * 2 * 2);
  assert.ok(first.every((query) => query.query.trim() && query.resultLimit === 25));
  for (const topicId of topicIds) {
    const topicQueries = first.filter((query) => query.topicId === topicId);
    assert.ok(topicQueries.some((query) => query.language === "ru"));
    assert.ok(topicQueries.some((query) => query.language === "en"));
  }
  assert.match(buildDiscoveryQueries(pvtProfile).find((query) => query.language === "en" && query.query.startsWith("PVT ")).query, /petroleum reservoir/);
  assert.equal(buildDiscoveryQueries(modelingProfile)[0].query, "гидродинамическое моделирование нефтегазовых месторождений");
});

test("rejects unknown CLI and planner topics", () => {
  assert.throws(() => resolveTopicIds({ topic: "potato" }, { requireExplicit: true }), /Неизвестная тема/);
  assert.throws(() => buildDiscoveryPlan(["potato"]), /Неизвестная тема/);
  assert.throws(() => resolveTopicIds({}, { requireExplicit: true }), /требует --topic/);
});

test("normalizes OpenAlex authors, OA metadata, types and missing fields", () => {
  const candidate = normalizeOpenAlexRecord(openAlexFixture.results[0], openAlexQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(candidate.identifiers.doi, "10.1234/pvt.001");
  assert.equal(candidate.identifiers.openAlexId, "W1001");
  assert.equal(candidate.sourceType, "journal-article");
  assert.equal(candidate.authors.length, 2);
  assert.equal(candidate.authors[0].orcid, "0000-0001-0002-0003");
  assert.equal(candidate.openAccess.isOpenAccess, true);
  assert.equal(candidate.qualitySignals.openAlexCitedByCount, 17);
  const missing = normalizeOpenAlexRecord(openAlexFixture.results[1], openAlexQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(missing.identifiers.doi, undefined);
  assert.deepEqual(missing.authors, []);
  assert.equal(missing.language, undefined);
});

test("normalizes Crossref types, DOI forms and documented publication-year precedence", () => {
  const article = normalizeCrossrefRecord(crossrefFixture.message.items[0], crossrefQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(article.identifiers.doi, "10.1234/pvt.001");
  assert.equal(article.publicationYear, 2021);
  assert.equal(article.sourceType, "journal-article");
  assert.equal(article.authors[0].givenName, "Anna");
  const book = normalizeCrossrefRecord(crossrefFixture.message.items[1], crossrefQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(book.sourceType, "book");
  assert.deepEqual(book.identifiers.isbn, ["9780134685991"]);
  const conference = normalizeCrossrefRecord(crossrefFixture.message.items[2], crossrefQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(conference.sourceType, "conference-paper");
  assert.equal(normalizeCrossrefRecord({ DOI: "10.1/missing", title: [] }, crossrefQuery, "2026-08-16T00:00:00.000Z"), undefined);
});

test("exactly merges the same DOI across providers, queries and topics", () => {
  const openAlex = normalizeOpenAlexRecord(openAlexFixture.results[0], openAlexQuery, "2026-08-16T00:00:00.000Z");
  const crossref = normalizeCrossrefRecord(crossrefFixture.message.items[0], crossrefQuery, "2026-08-16T00:00:01.000Z");
  const modelingQuery = { ...openAlexQuery, id: "modeling:openalex:en:1", topicId: "modeling", language: "en" };
  const secondTopic = normalizeOpenAlexRecord(openAlexFixture.results[0], modelingQuery, "2026-08-16T00:00:02.000Z");
  const result = mergeDiscoveryCandidates([openAlex, crossref, secondTopic]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.exactMerged, 2);
  assert.deepEqual(result.candidates[0].topicIds, ["modeling", "pvt"]);
  assert.equal(result.candidates[0].provenance.length, 3);
  assert.deepEqual(new Set(result.candidates[0].provenance.map((item) => item.provider)), new Set(["openalex", "crossref"]));
});

test("does not fuzzy-merge similar titles without a shared strong identifier", () => {
  const firstRaw = { ...openAlexFixture.results[1], id: "https://openalex.org/W2001", title: "Reservoir Simulation" };
  const secondRaw = { ...openAlexFixture.results[1], id: "https://openalex.org/W2002", title: "Reservoir simulation principles" };
  const first = normalizeOpenAlexRecord(firstRaw, openAlexQuery, "2026-08-16T00:00:00.000Z");
  const second = normalizeOpenAlexRecord(secondRaw, openAlexQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(mergeDiscoveryCandidates([first, second]).candidates.length, 2);
});

test("idempotently merges reruns without duplicating provenance", () => {
  const candidate = normalizeOpenAlexRecord(openAlexFixture.results[0], openAlexQuery, "2026-08-16T00:00:00.000Z");
  const rerun = normalizeOpenAlexRecord(openAlexFixture.results[0], openAlexQuery, "2026-08-17T00:00:00.000Z");
  const staged = mergeDiscoveryStaging([candidate], [rerun]);
  assert.equal(staged.length, 1);
  assert.equal(staged[0].provenance.length, 1);
  assert.equal(staged[0].provenance[0].discoveredAt, "2026-08-16T00:00:00.000Z");
});

test("OpenAlex adapter paginates, retries 429 and rejects malformed responses", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse({ error: "rate limited" }, 429, { "retry-after": "0" });
    if (calls === 2) return jsonResponse(openAlexFixture);
    return jsonResponse({ meta: { next_cursor: null }, results: [] });
  };
  const provider = new OpenAlexDiscoveryProvider({ fetchImpl, sleep: async () => {} });
  const result = await provider.search(openAlexQuery, { maxResults: 3, maxPages: 2, timeoutMs: 1000, maxRetries: 3, retryBaseDelayMs: 1 });
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.records.length, 2);
  assert.equal(calls, 3);
  const invalid = new OpenAlexDiscoveryProvider({ fetchImpl: async () => jsonResponse({ nope: true }) });
  await assert.rejects(() => invalid.search(openAlexQuery, { maxResults: 1, maxPages: 1, timeoutMs: 1000, maxRetries: 1, retryBaseDelayMs: 1 }), /invalid response schema/);
});

test("Crossref adapter paginates and retries temporary 5xx", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse({ error: "temporary" }, 503);
    if (calls === 2) return jsonResponse({
      ...crossrefFixture,
      message: { ...crossrefFixture.message, items: crossrefFixture.message.items.slice(0, 2) },
    });
    return jsonResponse({ message: { "next-cursor": "done", items: [] } });
  };
  const provider = new CrossrefDiscoveryProvider({ contactEmail: "test@example.org", fetchImpl, sleep: async () => {} });
  const result = await provider.search(crossrefQuery, { maxResults: 3, maxPages: 2, pageSize: 2, timeoutMs: 1000, maxRetries: 2, retryBaseDelayMs: 1 });
  assert.equal(result.records.length, 2);
  assert.equal(result.pagesFetched, 2);
  assert.equal(calls, 3);
});

test("preserves successful provider data when another provider fails", async () => {
  const queries = [openAlexQuery, crossrefQuery];
  const providers = new Map([
    ["openalex", { id: "openalex", search: async (query) => ({ provider: "openalex", queryId: query.id, records: [openAlexFixture.results[0]], pagesFetched: 1 }) }],
    ["crossref", { id: "crossref", search: async () => { throw new Error("temporary outage"); } }],
  ]);
  const times = [
    "2026-08-16T00:00:00.000Z",
    "2026-08-16T00:00:01.000Z",
    "2026-08-16T00:00:02.000Z",
  ];
  const result = await runDiscovery({
    queries,
    providers,
    limits: { ...DEFAULT_DISCOVERY_LIMITS, requestDelayMs: 0 },
    now: () => new Date(times.shift() ?? "2026-08-16T00:00:03.000Z"),
  });
  assert.equal(result.run.status, "partial");
  assert.equal(result.run.queriesSucceeded, 1);
  assert.equal(result.run.queriesFailed, 1);
  assert.equal(result.candidates.length, 1);
});

test("writes staging JSON atomically", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plast-discovery-"));
  const path = join(directory, "candidates.json");
  try {
    await atomicWriteJson(path, [{ id: "doi:10.1234/test" }]);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), [{ id: "doi:10.1234/test" }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
