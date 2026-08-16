import {
  isValidIsbn,
  isValidDoi,
  normalizeAuthorName,
  normalizeDoi,
  normalizeIsbn,
  normalizeTitle,
  normalizeUrl,
  type PublicationMetadata,
  type SourceAuthor,
  type SourceLanguage,
  type SourceType,
} from "../source-registry.ts";
import type {
  DiscoveryCandidate,
  DiscoveryProvenance,
  DiscoveryProvider,
  DiscoveryQuery,
} from "./types.ts";
import type { OaiPmhRecord } from "./providers/oai-pmh.ts";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function text(value: unknown) {
  return typeof value === "string" ? value.normalize("NFKC").replace(/\s+/g, " ").trim() || undefined : undefined;
}

function firstText(value: unknown) {
  if (Array.isArray(value)) return value.map(text).find(Boolean);
  return text(value);
}

function nonNegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined;
}

function publicationYear(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 1000 && Number(value) <= 9999 ? Number(value) : undefined;
}

function compactObject<T extends object>(value: T): T | undefined {
  return Object.values(value).some((item) => item !== undefined) ? value : undefined;
}

function normalizeLanguage(value: unknown): SourceLanguage | undefined {
  const language = text(value)?.toLocaleLowerCase("en-US");
  if (!language) return undefined;
  if (language === "ru" || language === "rus") return "ru";
  if (language === "en" || language === "eng") return "en";
  return "other";
}

function normalizeOrcid(value: unknown) {
  const normalized = text(value)?.replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, "");
  return normalized && /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(normalized) ? normalized.toUpperCase() : undefined;
}

function normalizeIssnValues(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values
    .map(text)
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/[^0-9X]/gi, "").toUpperCase())
    .filter((item) => /^\d{7}[\dX]$/.test(item));
  return [...new Set(normalized)].sort();
}

function normalizeIsbnValues(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values
    .map((item) => normalizeIsbn(text(item)))
    .filter((item): item is string => Boolean(item && isValidIsbn(item)));
  return [...new Set(normalized)].sort();
}

function authorFromDisplayName(fullNameValue: unknown, orcidValue?: unknown): SourceAuthor | undefined {
  const fullName = text(fullNameValue);
  if (!fullName || !normalizeAuthorName(fullName)) return undefined;
  return { fullName, orcid: normalizeOrcid(orcidValue) };
}

function candidateId(candidate: Omit<DiscoveryCandidate, "id">) {
  if (candidate.identifiers.doi) return `doi:${candidate.identifiers.doi}`;
  if (candidate.identifiers.openAlexId) return `openalex:${candidate.identifiers.openAlexId}`;
  if (candidate.identifiers.crossrefId) return `crossref:${candidate.identifiers.crossrefId}`;
  if (candidate.identifiers.isbn?.[0]) return `isbn:${candidate.identifiers.isbn[0]}`;
  const provenance = candidate.provenance[0];
  return `${provenance.provider}:${provenance.providerRecordId}`;
}

function createCandidate(candidate: Omit<DiscoveryCandidate, "id">): DiscoveryCandidate | undefined {
  if (!normalizeTitle(candidate.title)) return undefined;
  return { ...candidate, id: candidateId(candidate) };
}

function createProvenance(
  provider: DiscoveryProvider,
  providerRecordId: string,
  query: DiscoveryQuery,
  discoveredAt: string,
  landingPage?: string,
): DiscoveryProvenance {
  return {
    provider,
    providerRecordId,
    queryId: query.id,
    topicId: query.topicId,
    queryLanguage: query.language,
    discoveredAt,
    landingPage,
  };
}

const openAlexTypeMap: Partial<Record<string, SourceType>> = {
  article: "journal-article",
  book: "book",
  dissertation: "dissertation",
  report: "technical-report",
  review: "review-article",
  standard: "standard",
};

const crossrefTypeMap: Partial<Record<string, SourceType>> = {
  book: "book",
  dissertation: "dissertation",
  "journal-article": "journal-article",
  monograph: "monograph",
  "proceedings-article": "conference-paper",
  proceedings: "conference-paper",
  report: "technical-report",
  standard: "standard",
};

export function normalizeOpenAlexRecord(
  raw: unknown,
  query: DiscoveryQuery,
  discoveredAt: string,
): DiscoveryCandidate | undefined {
  if (!isRecord(raw)) return undefined;
  const title = text(raw.title) ?? text(raw.display_name);
  if (!title) return undefined;
  const id = text(raw.id)?.replace(/^https?:\/\/(?:api\.)?openalex\.org\//i, "");
  if (!id) return undefined;
  const doi = normalizeDoi(text(raw.doi) ?? (isRecord(raw.ids) ? text(raw.ids.doi) : undefined));
  const authors = Array.isArray(raw.authorships)
    ? raw.authorships.flatMap((authorship) => {
        if (!isRecord(authorship)) return [];
        const author = isRecord(authorship.author) ? authorship.author : undefined;
        const normalized = authorFromDisplayName(
          text(authorship.raw_author_name) ?? author?.display_name,
          author?.orcid,
        );
        return normalized ? [normalized] : [];
      })
    : [];
  const primaryLocation = isRecord(raw.primary_location) ? raw.primary_location : undefined;
  const bestOpenLocation = isRecord(raw.best_oa_location) ? raw.best_oa_location : undefined;
  const source = primaryLocation && isRecord(primaryLocation.source) ? primaryLocation.source : undefined;
  const biblio = isRecord(raw.biblio) ? raw.biblio : undefined;
  const firstPage = text(biblio?.first_page);
  const lastPage = text(biblio?.last_page);
  const openAccess = isRecord(raw.open_access) ? raw.open_access : undefined;
  const landingPage = normalizeUrl(text(primaryLocation?.landing_page_url));
  const oaLandingPage = normalizeUrl(text(openAccess?.oa_url) ?? text(bestOpenLocation?.landing_page_url));
  const sourceType = openAlexTypeMap[text(raw.type) ?? ""];
  const publication: PublicationMetadata = {
    journal: text(source?.display_name),
    publisher: text(source?.host_organization_name),
    volume: text(biblio?.volume),
    issue: text(biblio?.issue),
    pages: firstPage && lastPage ? `${firstPage}-${lastPage}` : firstPage ?? lastPage,
  };

  return createCandidate({
    title,
    normalizedTitle: normalizeTitle(title),
    authors,
    publicationYear: publicationYear(raw.publication_year),
    sourceType,
    language: normalizeLanguage(raw.language),
    identifiers: {
      doi,
      openAlexId: id,
      issn: normalizeIssnValues(source?.issn),
    },
    publication: compactObject(publication),
    urls: compactObject({
      landingPage,
      doi: doi ? `https://doi.org/${doi}` : undefined,
      openAccess: oaLandingPage,
    }),
    openAccess: compactObject({
      isOpenAccess: typeof openAccess?.is_oa === "boolean" ? openAccess.is_oa : undefined,
      status: text(openAccess?.oa_status),
      license: text(bestOpenLocation?.license) ?? text(primaryLocation?.license),
    }),
    qualitySignals: compactObject({
      openAlexCitedByCount: nonNegativeInteger(raw.cited_by_count),
      isRetracted: typeof raw.is_retracted === "boolean" ? raw.is_retracted : undefined,
    }),
    topicIds: [query.topicId],
    provenance: [createProvenance("openalex", id, query, discoveredAt, landingPage)],
    recordStatus: "candidate",
  });
}

function crossrefYear(raw: UnknownRecord) {
  for (const field of ["published-print", "published-online", "issued", "created"]) {
    const date = raw[field];
    if (!isRecord(date) || !Array.isArray(date["date-parts"])) continue;
    const firstParts = date["date-parts"][0];
    if (!Array.isArray(firstParts)) continue;
    const year = publicationYear(firstParts[0]);
    if (year) return year;
  }
  return undefined;
}

export function normalizeCrossrefRecord(
  raw: unknown,
  query: DiscoveryQuery,
  discoveredAt: string,
): DiscoveryCandidate | undefined {
  if (!isRecord(raw)) return undefined;
  const title = firstText(raw.title);
  if (!title) return undefined;
  const doi = normalizeDoi(text(raw.DOI));
  const providerRecordId = doi ?? text(raw.URL);
  if (!providerRecordId) return undefined;
  const authors = Array.isArray(raw.author)
    ? raw.author.flatMap((authorValue) => {
        if (!isRecord(authorValue)) return [];
        const givenName = text(authorValue.given);
        const familyName = text(authorValue.family);
        const fullName = text([givenName, familyName].filter(Boolean).join(" ")) ?? text(authorValue.name);
        if (!fullName || !normalizeAuthorName(fullName)) return [];
        return [{ fullName, givenName, familyName, orcid: normalizeOrcid(authorValue.ORCID) }];
      })
    : [];
  const type = text(raw.type);
  const license = Array.isArray(raw.license) && isRecord(raw.license[0])
    ? normalizeUrl(text(raw.license[0].URL))
    : undefined;
  const publication: PublicationMetadata = {
    journal: firstText(raw["container-title"]),
    publisher: text(raw.publisher),
    volume: text(raw.volume),
    issue: text(raw.issue),
    pages: text(raw.page),
  };

  return createCandidate({
    title,
    normalizedTitle: normalizeTitle(title),
    authors,
    publicationYear: crossrefYear(raw),
    sourceType: type ? crossrefTypeMap[type] : undefined,
    language: normalizeLanguage(raw.language),
    identifiers: {
      doi,
      crossrefId: doi ?? providerRecordId,
      isbn: normalizeIsbnValues(raw.ISBN),
      issn: normalizeIssnValues(raw.ISSN),
    },
    publication: compactObject(publication),
    urls: compactObject({
      landingPage: normalizeUrl(text(raw.URL)),
      doi: doi ? `https://doi.org/${doi}` : undefined,
    }),
    openAccess: compactObject({ license }),
    qualitySignals: compactObject({
      crossrefReferencedByCount: nonNegativeInteger(raw["is-referenced-by-count"]),
    }),
    topicIds: [query.topicId],
    provenance: [createProvenance("crossref", providerRecordId, query, discoveredAt, normalizeUrl(text(raw.URL)))],
    recordStatus: "candidate",
  });
}

const russianTypeRules: Array<{ pattern: RegExp; type: SourceType }> = [
  { pattern: /автореферат/iu, type: "thesis-abstract" },
  { pattern: /диссертац/iu, type: "dissertation" },
  { pattern: /учебно[-\s]?методическ(?:ое|ие)\s+(?:пособие|материал)/iu, type: "study-guide" },
  { pattern: /учебн(?:ое|ые)\s+пособие/iu, type: "study-guide" },
  { pattern: /учебник/iu, type: "textbook" },
  { pattern: /монограф/iu, type: "monograph" },
  { pattern: /(?:научн(?:ая|ые)\s+)?стать/iu, type: "journal-article" },
  { pattern: /article/iu, type: "journal-article" },
  { pattern: /материал(?:ы|ов)\s+конференц/iu, type: "conference-paper" },
  { pattern: /методическ(?:ие|ий|ая)\s+(?:указания|материалы|рекомендации)/iu, type: "methodical-material" },
  { pattern: /(?:техническ(?:ий|ого)\s+)?отч[её]т/iu, type: "technical-report" },
  { pattern: /(?:гост|стандарт)/iu, type: "standard" },
  { pattern: /справочник/iu, type: "book" },
  { pattern: /(?:book|книга|сборник)/iu, type: "book" },
  { pattern: /thesis/iu, type: "dissertation" },
];

export function normalizeRussianSourceType(values: readonly string[]) {
  const combined = values.join(" ").normalize("NFKC");
  return russianTypeRules.find((rule) => rule.pattern.test(combined))?.type;
}

function extractDoi(values: readonly string[]) {
  for (const value of values) {
    for (const match of value.matchAll(/10\.\d{4,9}\/[\p{L}\p{N}._;()/:+-]+/giu)) {
      const doi = normalizeDoi(match[0].replace(/[.,;:)\]]+$/u, ""));
      if (isValidDoi(doi)) return doi;
    }
  }
  return undefined;
}

function extractIsbn(values: readonly string[]) {
  const results: string[] = [];
  for (const value of values) {
    const candidates = /isbn/iu.test(value)
      ? value.split(/[;,]/u)
      : value.match(/97[89][\d\s-]{10,20}[\dXx]/gu) ?? [];
    for (const candidate of candidates) {
      const isbn = normalizeIsbn(candidate);
      if (isbn && isValidIsbn(isbn)) results.push(isbn);
    }
  }
  return [...new Set(results)].sort();
}

function extractIssn(values: readonly string[]) {
  const results = values.flatMap((value) =>
    [...value.matchAll(/(?:ISSN\s*:?[\s-]*)?(\d{4}[\s-]?\d{3}[\dX])/giu)].map((match) =>
      match[1].replace(/[^0-9X]/giu, "").toUpperCase(),
    ),
  ).filter((value) => /^\d{7}[\dX]$/u.test(value));
  return [...new Set(results)].sort();
}

function firstSafeUrl(values: readonly string[], predicate: (url: URL) => boolean = () => true) {
  for (const value of values) {
    const normalized = normalizeUrl(value);
    if (!normalized) continue;
    const url = new URL(normalized);
    if (predicate(url)) return normalized;
  }
  return undefined;
}

function extractClassification(values: readonly string[], label: "УДК" | "ББК") {
  const expression = label === "УДК"
    ? /(?:УДК|UDC)\s*:?[\s-]*([0-9][0-9A-Za-zА-Яа-яЁё()./:+-]*)/giu
    : /ББК\s*:?[\s-]*([0-9A-Za-zА-Яа-яЁё()./:+-]+)/giu;
  return [...new Set(values.flatMap((value) => [...value.matchAll(expression)].map((match) => match[1])))];
}

export function normalizeOaiPmhRecord(
  raw: OaiPmhRecord,
  query: DiscoveryQuery,
  discoveredAt: string,
): DiscoveryCandidate | undefined {
  const title = raw.titles[0];
  if (!title || !raw.providerRecordId) return undefined;
  const doi = extractDoi([...raw.identifiers, ...raw.relations]);
  const isbn = extractIsbn([...raw.identifiers, ...raw.sources]);
  const issn = extractIssn([...raw.identifiers, ...raw.sources]);
  const allUrls = [...raw.identifiers, ...raw.relations];
  const landingPage = firstSafeUrl(allUrls, (url) => !/\.pdf$/iu.test(url.pathname))
    ?? normalizeUrl(raw.providerRecordId);
  const fulltextUrl = firstSafeUrl(allUrls, (url) => /\.pdf$/iu.test(url.pathname));
  const year = raw.dates.flatMap((value) => value.match(/(?:18|19|20)\d{2}/u) ?? [])
    .map(Number)
    .find((value) => publicationYear(value));
  const language = raw.languages.map(normalizeLanguage).find(Boolean)
    ?? (/\p{Script=Cyrillic}/u.test(title) ? "ru" : undefined);
  const classificationValues = [...raw.subjects, ...raw.descriptions];
  const udc = extractClassification(classificationValues, "УДК");
  const bbk = extractClassification(classificationValues, "ББК");
  const providerMetadata: Record<string, string | string[]> = {
    institution: raw.institution,
  };
  if (raw.datestamp) providerMetadata.recordDatestamp = raw.datestamp;
  if (raw.setSpecs.length > 0) providerMetadata.setSpecs = raw.setSpecs;
  if (raw.subjects.length > 0) providerMetadata.subjects = raw.subjects;
  if (raw.descriptions.length > 0) providerMetadata.descriptions = raw.descriptions;
  if (raw.types.length > 0) providerMetadata.originalTypes = raw.types;
  if (raw.rights.length > 0) providerMetadata.rights = raw.rights;
  if (raw.contributors.length > 0) providerMetadata.contributors = raw.contributors;
  if (udc.length > 0) providerMetadata.udc = udc;
  if (bbk.length > 0) providerMetadata.bbk = bbk;

  return createCandidate({
    title,
    normalizedTitle: normalizeTitle(title),
    authors: raw.creators.flatMap((value) => {
      const author = authorFromDisplayName(value);
      return author ? [author] : [];
    }),
    publicationYear: year,
    sourceType: normalizeRussianSourceType(raw.types)
      ?? (query.provider === "cyberleninka" ? "journal-article" : undefined),
    language,
    identifiers: { doi, isbn, issn },
    publication: compactObject({
      publisher: raw.publishers[0],
      journal: raw.sources[0],
      institution: raw.institution,
    }),
    urls: compactObject({
      landingPage,
      doi: doi ? `https://doi.org/${doi}` : undefined,
      openAccess: fulltextUrl,
    }),
    openAccess: raw.accessHint === "external-fulltext"
      ? compactObject({ isOpenAccess: true, status: "external-fulltext", license: raw.rights[0] })
      : compactObject({ license: raw.rights[0] }),
    accessHint: raw.accessHint,
    providerMetadata,
    topicIds: [query.topicId],
    provenance: [createProvenance(query.provider, raw.providerRecordId, query, discoveredAt, landingPage)],
    recordStatus: "candidate",
  });
}

export function normalizeProviderRecord(
  provider: DiscoveryProvider,
  raw: unknown,
  query: DiscoveryQuery,
  discoveredAt: string,
) {
  if (provider === "openalex") return normalizeOpenAlexRecord(raw, query, discoveredAt);
  if (provider === "crossref") return normalizeCrossrefRecord(raw, query, discoveredAt);
  return isRecord(raw) ? normalizeOaiPmhRecord(raw as unknown as OaiPmhRecord, query, discoveredAt) : undefined;
}
