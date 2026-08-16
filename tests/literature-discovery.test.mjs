import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { topicCorpusProfiles } from "../app/corpus-planning.ts";
import { DEFAULT_DISCOVERY_LIMITS } from "../app/discovery/config.ts";
import {
  russianOaiProviderConfigs,
  russianProviderCapabilities,
  validateRussianProviderCapabilities,
} from "../app/discovery/provider-capabilities.ts";
import { mergeDiscoveryCandidates, mergeDiscoveryStaging } from "../app/discovery/merge.ts";
import {
  normalizeCrossrefRecord,
  normalizeOaiPmhRecord,
  normalizeOpenAlexRecord,
  normalizeRussianSourceType,
} from "../app/discovery/normalize.ts";
import { CrossrefDiscoveryProvider } from "../app/discovery/providers/crossref.ts";
import {
  isRussianOaiRecordRelevant,
  OaiPmhDiscoveryProvider,
  parseOaiIdentifyResponse,
  parseOaiMetadataFormatsResponse,
  parseOaiRecordsResponse,
} from "../app/discovery/providers/oai-pmh.ts";
import { OpenAlexDiscoveryProvider } from "../app/discovery/providers/openalex.ts";
import { buildDiscoveryPlan, buildDiscoveryQueries } from "../app/discovery/query-planner.ts";
import { runDiscovery } from "../app/discovery/runner.ts";
import { atomicWriteJson, resolveTopicIds } from "../scripts/discovery-support.mjs";

const openAlexFixture = JSON.parse(await readFile(new URL("./fixtures/discovery/openalex-search.json", import.meta.url), "utf8"));
const crossrefFixture = JSON.parse(await readFile(new URL("./fixtures/discovery/crossref-search.json", import.meta.url), "utf8"));
const cyberleninkaFixture = await readFile(new URL("./fixtures/discovery/cyberleninka-oai.xml", import.meta.url), "utf8");
const kpfuFixture = await readFile(new URL("./fixtures/discovery/kpfu-oai.xml", import.meta.url), "utf8");
const pvtProfile = topicCorpusProfiles.find((profile) => profile.topicId === "pvt");
const modelingProfile = topicCorpusProfiles.find((profile) => profile.topicId === "modeling");
const openAlexQuery = buildDiscoveryQueries(pvtProfile, { providers: ["openalex"] })[0];
const crossrefQuery = buildDiscoveryQueries(pvtProfile, { providers: ["crossref"] })[0];
const cyberleninkaQuery = buildDiscoveryQueries(pvtProfile, { providers: ["cyberleninka"] })[0];
const kpfuQuery = buildDiscoveryQueries(pvtProfile, { providers: ["kpfu"] })[0];
const cyberleninkaConfig = russianOaiProviderConfigs.find((config) => config.id === "cyberleninka");
const kpfuConfig = russianOaiProviderConfigs.find((config) => config.id === "kpfu");

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function xmlResponse(value, status = 200, headers = {}) {
  return new Response(value, {
    status,
    headers: { "content-type": "application/xml; charset=UTF-8", ...headers },
  });
}

test("builds bounded deterministic RU and EN plans for all 65 corpus profiles", () => {
  const topicIds = topicCorpusProfiles.map((profile) => profile.topicId);
  const first = buildDiscoveryPlan(topicIds);
  const second = buildDiscoveryPlan(topicIds);
  assert.deepEqual(first, second);
  assert.equal(topicIds.length, 65);
  assert.equal(first.length, 65 * 12);
  assert.ok(first.every((query) => query.query.trim() && query.resultLimit === 25));
  for (const topicId of topicIds) {
    const topicQueries = first.filter((query) => query.topicId === topicId);
    assert.ok(topicQueries.some((query) => query.language === "ru"));
    assert.ok(topicQueries.some((query) => query.language === "en"));
  }
  assert.match(buildDiscoveryQueries(pvtProfile).find((query) => query.language === "en" && query.query.startsWith("PVT ")).query, /petroleum reservoir/);
  assert.equal(buildDiscoveryQueries(modelingProfile)[0].query, "гидродинамическое моделирование нефтегазовых месторождений");
  assert.deepEqual(new Set(buildDiscoveryQueries(pvtProfile, { providers: ["cyberleninka", "kpfu"] }).map((query) => query.language)), new Set(["ru"]));
  assert.equal(cyberleninkaQuery.query, "PVT свойства пластовых флюидов");
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

test("validates the Russian provider capability matrix and typed OAI configs", () => {
  assert.equal(validateRussianProviderCapabilities(), true);
  for (const id of ["rsl", "neb", "cyberleninka", "gubkin", "tiu", "tpu", "mining-university", "kpfu"]) {
    assert.ok(russianProviderCapabilities.some((provider) => provider.id === id));
  }
  assert.deepEqual(russianProviderCapabilities.filter((provider) => provider.status === "IMPLEMENT")
    .map((provider) => provider.id), ["cyberleninka", "kpfu"]);
});

test("safely parses OAI-PMH records, Cyrillic and resumption tokens", () => {
  const cyber = parseOaiRecordsResponse(cyberleninkaFixture, cyberleninkaConfig);
  const kpfu = parseOaiRecordsResponse(kpfuFixture, kpfuConfig);
  assert.equal(cyber.records.length, 3);
  assert.equal(cyber.resumptionToken, "cyber-token-2");
  assert.equal(cyber.records[0].descriptions[0], "Исследование пластовых флюидов и фазового поведения нефти & газа.");
  assert.ok(!cyber.records[1].descriptions[0].includes("script"));
  assert.equal(kpfu.records.length, 5);
  assert.equal(kpfu.records[0].creators[0], "Сафин Ринат Маратович");
});

test("normalizes Russian OAI metadata, authors, types, identifiers and access hints", () => {
  const cyber = parseOaiRecordsResponse(cyberleninkaFixture, cyberleninkaConfig).records;
  const kpfu = parseOaiRecordsResponse(kpfuFixture, kpfuConfig).records;
  const article = normalizeOaiPmhRecord(cyber[0], cyberleninkaQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(article.title, "PVT-свойства пластовых нефтей — обзор");
  assert.equal(article.normalizedTitle, "pvt свойства пластовых нефтей обзор");
  assert.equal(article.authors[1].fullName, "Шабаров Анатолий Борисович");
  assert.equal(article.sourceType, "journal-article");
  assert.equal(article.identifiers.doi, "10.1234/pvt.001");
  assert.deepEqual(article.identifiers.issn, ["04450108"]);
  assert.deepEqual(article.providerMetadata.udc, ["622.276.031"]);
  assert.equal(article.accessHint, "external-fulltext");
  assert.equal(article.openAccess.isOpenAccess, true);
  assert.equal(article.provenance[0].landingPage, article.urls.landingPage);

  const guide = normalizeOaiPmhRecord(kpfu[0], kpfuQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(guide.sourceType, "study-guide");
  assert.deepEqual(guide.identifiers.isbn, ["9785000199459"]);
  assert.equal(guide.urls.landingPage, "https://dspace.kpfu.ru/xmlui/handle/net/1001");
  assert.ok(!JSON.stringify(guide.urls).includes("javascript:"));
  assert.equal(normalizeOaiPmhRecord(kpfu[1], kpfuQuery, "2026-08-16T00:00:00.000Z").sourceType, "dissertation");
  assert.equal(normalizeOaiPmhRecord(kpfu[2], kpfuQuery, "2026-08-16T00:00:00.000Z").sourceType, "thesis-abstract");
  assert.equal(normalizeOaiPmhRecord(kpfu[3], kpfuQuery, "2026-08-16T00:00:00.000Z").sourceType, "textbook");
  assert.equal(normalizeOaiPmhRecord(kpfu[4], kpfuQuery, "2026-08-16T00:00:00.000Z").sourceType, "methodical-material");
  assert.equal(normalizeRussianSourceType(["неясный ресурс"]), undefined);
});

test("applies a conservative deterministic Russian relevance gate", () => {
  const cyber = parseOaiRecordsResponse(cyberleninkaFixture, cyberleninkaConfig).records;
  assert.equal(isRussianOaiRecordRelevant(cyber[0], "PVT свойства пластовых флюидов"), true);
  assert.equal(isRussianOaiRecordRelevant(cyber[1], "гидродинамическое моделирование нефтегазовых месторождений"), false);
  assert.equal(isRussianOaiRecordRelevant(cyber[2], "гидродинамические исследования скважин"), true);
  const kpfu = parseOaiRecordsResponse(kpfuFixture, kpfuConfig).records;
  assert.equal(isRussianOaiRecordRelevant(kpfu[0], "подземная гидравлика"), true);
});

test("parses OAI Identify and metadata formats and rejects unsafe XML", () => {
  const identifyXml = `<?xml version="1.0"?><OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><Identify><repositoryName>Test Repository</repositoryName><baseURL>https://example.org/oai</baseURL><protocolVersion>2.0</protocolVersion><adminEmail>admin@example.org</adminEmail><earliestDatestamp>2000-01-01</earliestDatestamp><deletedRecord>no</deletedRecord><granularity>YYYY-MM-DD</granularity></Identify></OAI-PMH>`;
  const formatsXml = `<?xml version="1.0"?><OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat><metadataFormat><metadataPrefix>marc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>`;
  assert.equal(parseOaiIdentifyResponse(identifyXml).protocolVersion, "2.0");
  assert.deepEqual(parseOaiMetadataFormatsResponse(formatsXml), ["oai_dc", "marc"]);
  assert.throws(() => parseOaiRecordsResponse("<not-closed>", cyberleninkaConfig), /malformed XML/);
  assert.throws(() => parseOaiRecordsResponse("<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><foo>&xxe;</foo>", cyberleninkaConfig), /prohibited/);
});

test("OAI adapter paginates with resumptionToken and retries temporary failures", async () => {
  const emptyPage = `<?xml version="1.0"?><OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><ListRecords></ListRecords></OAI-PMH>`;
  let calls = 0;
  const requested = [];
  const fetchImpl = async (url) => {
    calls += 1;
    requested.push(String(url));
    if (calls === 1) return xmlResponse("temporary", 503);
    if (calls === 2) return xmlResponse(cyberleninkaFixture);
    return xmlResponse(emptyPage);
  };
  const provider = new OaiPmhDiscoveryProvider(cyberleninkaConfig, { fetchImpl, sleep: async () => {} });
  const result = await provider.search(cyberleninkaQuery, { maxResults: 10, maxPages: 2, timeoutMs: 1000, maxRetries: 2, retryBaseDelayMs: 1 });
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.rawRecordsFetched, 3);
  assert.equal(result.records.length, 1);
  assert.equal(calls, 3);
  assert.match(requested[2], /resumptionToken=cyber-token-2/);
});

test("OAI adapter rejects repeated tokens, malformed XML and timeouts", async () => {
  const repeated = new OaiPmhDiscoveryProvider(cyberleninkaConfig, {
    fetchImpl: async () => xmlResponse(cyberleninkaFixture),
    sleep: async () => {},
  });
  await assert.rejects(() => repeated.search(cyberleninkaQuery, { maxResults: 10, maxPages: 3, timeoutMs: 1000, maxRetries: 1, retryBaseDelayMs: 1 }), /repeated resumptionToken/);

  const malformed = new OaiPmhDiscoveryProvider(cyberleninkaConfig, {
    fetchImpl: async () => xmlResponse("<broken>"),
  });
  await assert.rejects(() => malformed.search(cyberleninkaQuery, { maxResults: 1, maxPages: 1, timeoutMs: 1000, maxRetries: 1, retryBaseDelayMs: 1 }), /malformed XML/);

  const timeout = new OaiPmhDiscoveryProvider(cyberleninkaConfig, {
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  await assert.rejects(() => timeout.search(cyberleninkaQuery, { maxResults: 1, maxPages: 1, timeoutMs: 1, maxRetries: 1, retryBaseDelayMs: 1 }), /after 1 attempts/);
});

test("exactly merges Russian records by DOI, ISBN and provider ID across topics", () => {
  const cyber = normalizeOaiPmhRecord(
    parseOaiRecordsResponse(cyberleninkaFixture, cyberleninkaConfig).records[0],
    cyberleninkaQuery,
    "2026-08-16T00:00:00.000Z",
  );
  const crossref = normalizeCrossrefRecord(crossrefFixture.message.items[0], crossrefQuery, "2026-08-16T00:00:01.000Z");
  const doiMerge = mergeDiscoveryCandidates([cyber, crossref]);
  assert.equal(doiMerge.candidates.length, 1);
  assert.deepEqual(new Set(doiMerge.candidates[0].provenance.map((item) => item.provider)), new Set(["cyberleninka", "crossref"]));

  const kpfuRecords = parseOaiRecordsResponse(kpfuFixture, kpfuConfig).records;
  const guide = normalizeOaiPmhRecord(kpfuRecords[0], kpfuQuery, "2026-08-16T00:00:00.000Z");
  const sameIsbn = structuredClone(guide);
  sameIsbn.id = "cyberleninka:different-record";
  sameIsbn.provenance = [{ ...sameIsbn.provenance[0], provider: "cyberleninka", providerRecordId: "different-record" }];
  assert.equal(mergeDiscoveryCandidates([guide, sameIsbn]).candidates.length, 1);

  const firstTopic = normalizeOaiPmhRecord(kpfuRecords[1], kpfuQuery, "2026-08-16T00:00:00.000Z");
  const secondTopic = normalizeOaiPmhRecord(kpfuRecords[1], { ...kpfuQuery, id: "modeling:kpfu:ru:1", topicId: "modeling" }, "2026-08-16T00:00:01.000Z");
  const topicMerge = mergeDiscoveryCandidates([firstTopic, secondTopic]);
  assert.equal(topicMerge.candidates.length, 1);
  assert.deepEqual(topicMerge.candidates[0].topicIds, ["modeling", "pvt"]);
});

test("does not fuzzy-merge similar Russian titles without a shared identifier", () => {
  const base = parseOaiRecordsResponse(kpfuFixture, kpfuConfig).records[1];
  const first = normalizeOaiPmhRecord({ ...base, providerRecordId: "oai:test:1", titles: ["Физика пласта"] }, kpfuQuery, "2026-08-16T00:00:00.000Z");
  const second = normalizeOaiPmhRecord({ ...base, providerRecordId: "oai:test:2", titles: ["Физика нефтяного и газового пласта"] }, kpfuQuery, "2026-08-16T00:00:00.000Z");
  assert.equal(mergeDiscoveryCandidates([first, second]).candidates.length, 2);
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
