import { XMLParser, XMLValidator } from "fast-xml-parser";
import { normalizeTitle } from "../../source-registry.ts";
import { requestText, type HttpRequestPolicy } from "../http-client.ts";
import type { OaiPmhProviderConfig } from "../provider-capabilities.ts";
import type {
  DiscoveryProvider,
  DiscoveryQuery,
  DiscoverySearchOptions,
  LiteratureDiscoveryProvider,
  ProviderSearchResult,
} from "../types.ts";

type UnknownRecord = Record<string, unknown>;

export interface OaiPmhRecord {
  providerRecordId: string;
  datestamp?: string;
  setSpecs: string[];
  titles: string[];
  creators: string[];
  subjects: string[];
  descriptions: string[];
  publishers: string[];
  contributors: string[];
  dates: string[];
  types: string[];
  formats: string[];
  identifiers: string[];
  sources: string[];
  languages: string[];
  relations: string[];
  coverage: string[];
  rights: string[];
  institution: string;
  accessHint: OaiPmhProviderConfig["accessHint"];
}

export interface ParsedOaiRecords {
  records: OaiPmhRecord[];
  resumptionToken?: string;
}

export interface OaiIdentify {
  repositoryName: string;
  baseUrl: string;
  protocolVersion: string;
  adminEmails: string[];
  earliestDatestamp?: string;
  deletedRecord?: string;
  granularity?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asArray(value: unknown) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function stripMarkup(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/gu, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/giu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return stripMarkup(String(value)) || undefined;
  }
  if (isRecord(value)) return toText(value["#text"]);
  return undefined;
}

function textArray(value: unknown) {
  return [...new Set(asArray(value).map(toText).filter((item): item is string => Boolean(item)))];
}

function parseXmlEnvelope(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) {
    throw new Error("OAI-PMH XML contains a prohibited DTD/entity declaration");
  }
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error("OAI-PMH returned malformed XML");
  const parsed = parser.parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed["OAI-PMH"])) {
    throw new Error("OAI-PMH response envelope is missing");
  }
  const envelope = parsed["OAI-PMH"];
  const error = asArray(envelope.error).map(toText).find(Boolean);
  if (error) throw new Error(`OAI-PMH provider error: ${error}`);
  return envelope;
}

function metadataObject(value: unknown) {
  if (!isRecord(value) || !isRecord(value.metadata)) return undefined;
  const metadata = value.metadata;
  const dc = metadata.dc;
  return isRecord(dc) ? dc : undefined;
}

export function parseOaiRecordsResponse(
  xml: string,
  config: Pick<OaiPmhProviderConfig, "institution" | "accessHint">,
): ParsedOaiRecords {
  const envelope = parseXmlEnvelope(xml);
  if (!("ListRecords" in envelope)) throw new Error("OAI-PMH ListRecords payload is missing");
  const listRecords = isRecord(envelope.ListRecords) ? envelope.ListRecords : {};
  const records = asArray(listRecords.record).flatMap((value) => {
    if (!isRecord(value) || !isRecord(value.header) || value.header["@_status"] === "deleted") return [];
    const providerRecordId = toText(value.header.identifier);
    const dc = metadataObject(value);
    if (!providerRecordId || !dc) return [];
    return [{
      providerRecordId,
      datestamp: toText(value.header.datestamp),
      setSpecs: textArray(value.header.setSpec),
      titles: textArray(dc.title),
      creators: textArray(dc.creator),
      subjects: textArray(dc.subject),
      descriptions: textArray(dc.description),
      publishers: textArray(dc.publisher),
      contributors: textArray(dc.contributor),
      dates: textArray(dc.date),
      types: textArray(dc.type),
      formats: textArray(dc.format),
      identifiers: textArray(dc.identifier),
      sources: textArray(dc.source),
      languages: textArray(dc.language),
      relations: textArray(dc.relation),
      coverage: textArray(dc.coverage),
      rights: textArray(dc.rights),
      institution: config.institution,
      accessHint: config.accessHint,
    } satisfies OaiPmhRecord];
  });
  return {
    records,
    resumptionToken: toText(listRecords.resumptionToken),
  };
}

export function parseOaiIdentifyResponse(xml: string): OaiIdentify {
  const envelope = parseXmlEnvelope(xml);
  if (!isRecord(envelope.Identify)) throw new Error("OAI-PMH Identify payload is missing");
  const identify = envelope.Identify;
  const repositoryName = toText(identify.repositoryName);
  const baseUrl = toText(identify.baseURL);
  const protocolVersion = toText(identify.protocolVersion);
  if (!repositoryName || !baseUrl || !protocolVersion) throw new Error("OAI-PMH Identify payload is incomplete");
  return {
    repositoryName,
    baseUrl,
    protocolVersion,
    adminEmails: textArray(identify.adminEmail),
    earliestDatestamp: toText(identify.earliestDatestamp),
    deletedRecord: toText(identify.deletedRecord),
    granularity: toText(identify.granularity),
  };
}

export function parseOaiMetadataFormatsResponse(xml: string) {
  const envelope = parseXmlEnvelope(xml);
  if (!isRecord(envelope.ListMetadataFormats)) {
    throw new Error("OAI-PMH ListMetadataFormats payload is missing");
  }
  return asArray(envelope.ListMetadataFormats.metadataFormat).flatMap((value) => {
    if (!isRecord(value)) return [];
    const prefix = toText(value.metadataPrefix);
    return prefix ? [prefix] : [];
  });
}

const russianStopWords = new Set(["и", "в", "во", "для", "на", "по", "с", "со", "к", "из", "при"]);
const petroleumSignals = [
  "нефт",
  "газ",
  "скваж",
  "пласт",
  "месторожден",
  "коллектор",
  "фильтрац",
  "гидродинами",
  "углеводород",
  "pvt",
];
const modelingNoiseSignals = ["педагог", "одежд", "лингвист", "экономическ моделирован"];

function queryTokens(query: string) {
  return normalizeTitle(query).split(" ").filter((token) => token && !russianStopWords.has(token));
}

function tokenMatches(text: string, token: string) {
  if (token.length <= 4) return new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "u").test(text);
  const stemLength = token.length >= 10 ? token.length - 3 : token.length >= 7 ? token.length - 2 : token.length;
  return text.includes(token.slice(0, stemLength));
}

export function isRussianOaiRecordRelevant(record: OaiPmhRecord, query: string) {
  const title = normalizeTitle(record.titles.join(" "));
  const combined = normalizeTitle([
    ...record.titles,
    ...record.subjects,
    ...record.descriptions,
    ...record.sources,
    ...record.types,
  ].join(" "));
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery || !combined) return false;

  const hasPetroleumContext = petroleumSignals.some((signal) => combined.includes(signal));
  if (normalizedQuery.includes("моделирован")
      && modelingNoiseSignals.some((signal) => combined.includes(signal))
      && !hasPetroleumContext) return false;
  if (combined.includes(normalizedQuery)) return true;

  const tokens = queryTokens(query);
  if (tokens.length === 0) return false;
  const titleMatches = tokens.filter((token) => tokenMatches(title, token)).length;
  const combinedMatches = tokens.filter((token) => tokenMatches(combined, token)).length;
  const titleThreshold = tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.6));
  const combinedThreshold = tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.7));
  return titleMatches >= titleThreshold || (combinedMatches >= combinedThreshold && hasPetroleumContext);
}

interface OaiProviderOptions {
  contactEmail?: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export class OaiPmhDiscoveryProvider implements LiteratureDiscoveryProvider {
  readonly id: DiscoveryProvider;
  private readonly config: OaiPmhProviderConfig;
  private readonly contactEmail?: string;
  private readonly fetchImpl?: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(config: OaiPmhProviderConfig, options: OaiProviderOptions = {}) {
    this.id = config.id;
    this.config = config;
    this.contactEmail = options.contactEmail?.trim() || undefined;
    this.fetchImpl = options.fetchImpl;
    this.sleep = options.sleep ?? defaultSleep;
  }

  private policy(options: DiscoverySearchOptions): HttpRequestPolicy {
    return {
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      retryBaseDelayMs: options.retryBaseDelayMs,
      maxResponseBytes: 5_000_000,
      fetchImpl: this.fetchImpl,
      sleep: this.sleep,
    };
  }

  private headers() {
    const userAgent = this.contactEmail
      ? `PLAST-Literature-Discovery/0.1 (mailto:${this.contactEmail})`
      : "PLAST-Literature-Discovery/0.1";
    return { Accept: "application/xml, text/xml;q=0.9", "User-Agent": userAgent };
  }

  private async request(verb: string, options: DiscoverySearchOptions, extra: Record<string, string> = {}) {
    const url = new URL(this.config.baseUrl);
    url.searchParams.set("verb", verb);
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
    return requestText(url, { headers: this.headers() }, this.policy(options));
  }

  async identify(options: DiscoverySearchOptions) {
    return parseOaiIdentifyResponse(await this.request("Identify", options));
  }

  async listMetadataFormats(options: DiscoverySearchOptions) {
    return parseOaiMetadataFormatsResponse(await this.request("ListMetadataFormats", options));
  }

  async search(query: DiscoveryQuery, options: DiscoverySearchOptions): Promise<ProviderSearchResult> {
    const accepted: OaiPmhRecord[] = [];
    const seenTokens = new Set<string>();
    const maxPages = Math.min(options.maxPages, this.config.maxPagesPerQuery);
    let token: string | undefined;
    let pagesFetched = 0;
    let rawRecordsFetched = 0;
    const selectedSet = this.config.setsByTopic?.[query.topicId] ?? this.config.set;

    while (pagesFetched < maxPages
      && rawRecordsFetched < this.config.maxRawRecordsPerQuery
      && accepted.length < options.maxResults) {
      if (token && seenTokens.has(token)) throw new Error("OAI-PMH returned a repeated resumptionToken");
      if (token) seenTokens.add(token);
      const xml = token
        ? await this.request("ListRecords", options, { resumptionToken: token })
        : await this.request("ListRecords", options, {
            metadataPrefix: this.config.metadataPrefix,
            set: selectedSet,
          });
      const page = parseOaiRecordsResponse(xml, this.config);
      const remainingRaw = this.config.maxRawRecordsPerQuery - rawRecordsFetched;
      const boundedRecords = page.records.slice(0, remainingRaw);
      rawRecordsFetched += boundedRecords.length;
      accepted.push(...boundedRecords.filter((record) => isRussianOaiRecordRelevant(record, query.query)));
      pagesFetched += 1;
      token = page.resumptionToken;
      if (!token || page.records.length === 0) break;
      if (pagesFetched < maxPages && this.config.requestDelayMs > 0) {
        await this.sleep(this.config.requestDelayMs);
      }
    }

    return {
      provider: this.id,
      queryId: query.id,
      records: accepted.slice(0, options.maxResults),
      pagesFetched,
      rawRecordsFetched,
    };
  }
}
