import {
  isValidIsbn,
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
): DiscoveryProvenance {
  return {
    provider,
    providerRecordId,
    queryId: query.id,
    topicId: query.topicId,
    queryLanguage: query.language,
    discoveredAt,
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
    provenance: [createProvenance("openalex", id, query, discoveredAt)],
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
    provenance: [createProvenance("crossref", providerRecordId, query, discoveredAt)],
    recordStatus: "candidate",
  });
}

export function normalizeProviderRecord(
  provider: DiscoveryProvider,
  raw: unknown,
  query: DiscoveryQuery,
  discoveredAt: string,
) {
  return provider === "openalex"
    ? normalizeOpenAlexRecord(raw, query, discoveredAt)
    : normalizeCrossrefRecord(raw, query, discoveredAt);
}
