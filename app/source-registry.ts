export const sourceTypes = [
  "book",
  "textbook",
  "study-guide",
  "monograph",
  "journal-article",
  "review-article",
  "conference-paper",
  "spe-paper",
  "dissertation",
  "thesis-abstract",
  "manual",
  "software-documentation",
  "standard",
  "technical-report",
  "practical-guide",
  "case-study",
  "methodical-material",
  "course-material",
] as const;
export type SourceType = (typeof sourceTypes)[number];

export const sourceLanguages = ["ru", "en", "other"] as const;
export type SourceLanguage = (typeof sourceLanguages)[number];

export const sourceProviders = [
  "manual",
  "rsl",
  "gubkin",
  "cyberleninka",
  "openalex",
  "crossref",
  "openlibrary",
  "core",
  "openaire",
  "semantic-scholar",
  "usgs",
  "onepetro",
  "other",
] as const;
export type SourceProvider = (typeof sourceProviders)[number];

export const sourceAccessStatuses = ["local-fulltext", "external-fulltext", "metadata-only"] as const;
export type SourceAccessStatus = (typeof sourceAccessStatuses)[number];

export const ragPermissions = ["allowed", "metadata-only", "requires-review", "prohibited"] as const;
export type RagPermission = (typeof ragPermissions)[number];

export const sourceDocumentFormats = ["pdf", "docx", "epub", "html", "txt", "other"] as const;
export type SourceDocumentFormat = (typeof sourceDocumentFormats)[number];

export const sourceProcessingStatuses = ["not-started", "queued", "processing", "processed", "failed"] as const;
export type SourceProcessingStatus = (typeof sourceProcessingStatuses)[number];

export const authorityTiers = ["core", "scientific", "practical", "supplementary"] as const;
export type AuthorityTier = (typeof authorityTiers)[number];

export const sourceRecordStatuses = ["demo", "candidate", "verified"] as const;
export type SourceRecordStatus = (typeof sourceRecordStatuses)[number];

export interface SourceAuthor {
  id?: string;
  givenName?: string;
  familyName?: string;
  fullName: string;
  orcid?: string;
}

export interface SourceIdentifiers {
  doi?: string;
  isbn10?: string;
  isbn13?: string;
  issn?: string;
  eissn?: string;
  openAlexId?: string;
  crossrefId?: string;
  semanticScholarId?: string;
}

export interface PublicationMetadata {
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  edition?: string;
  city?: string;
  conference?: string;
  institution?: string;
}

export interface SourceProvenance {
  provider: SourceProvider;
  providerRecordId?: string;
  url: string;
  discoveredAt?: string;
  metadataRetrievedAt?: string;
}

export interface SourceAccess {
  status: SourceAccessStatus;
  openAccess?: boolean;
  license?: string;
  copyrightNote?: string;
  ragPermission: RagPermission;
  externalUrl?: string;
}

export interface SourceDocument {
  format: SourceDocumentFormat;
  storageKey?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  checksumSha256?: string;
  pageCount?: number;
  processingStatus?: SourceProcessingStatus;
}

export interface SourceQuality {
  authorityTier: AuthorityTier;
  relevanceScore?: number;
  qualityScore?: number;
  citationCount?: number;
  peerReviewed?: boolean;
}

export interface Source {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authors: SourceAuthor[];
  year?: number;
  language: SourceLanguage;
  type: SourceType;
  description: string;
  topics: string[];
  keywords?: string[];
  identifiers?: SourceIdentifiers;
  publication?: PublicationMetadata;
  provenance: SourceProvenance[];
  access: SourceAccess;
  document?: SourceDocument;
  quality: SourceQuality;
  recordStatus: SourceRecordStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const sourceTypeLabels: Record<SourceType, string> = {
  book: "Книга",
  textbook: "Учебник",
  "study-guide": "Учебное пособие",
  monograph: "Монография",
  "journal-article": "Научная статья",
  "review-article": "Обзорная статья",
  "conference-paper": "Материалы конференции",
  "spe-paper": "SPE paper",
  dissertation: "Диссертация",
  "thesis-abstract": "Автореферат",
  manual: "Руководство",
  "software-documentation": "Документация ПО",
  standard: "Стандарт",
  "technical-report": "Технический отчёт",
  "practical-guide": "Практическое руководство",
  "case-study": "Практический кейс",
  "methodical-material": "Методический материал",
  "course-material": "Материал курса",
};

export const sourceLanguageLabels: Record<SourceLanguage, string> = {
  ru: "Русский",
  en: "English",
  other: "Другой",
};

export const sourceProviderLabels: Record<SourceProvider, string> = {
  manual: "Добавлено вручную",
  rsl: "Российская государственная библиотека",
  gubkin: "РГУ нефти и газа имени И. М. Губкина",
  cyberleninka: "КиберЛенинка",
  openalex: "OpenAlex",
  crossref: "Crossref",
  openlibrary: "Open Library",
  core: "CORE",
  openaire: "OpenAIRE",
  "semantic-scholar": "Semantic Scholar",
  usgs: "USGS",
  onepetro: "OnePetro",
  other: "Другой источник",
};

export const sourceRecordStatusLabels: Record<SourceRecordStatus, string> = {
  demo: "Демонстрационный материал",
  candidate: "Ожидает проверки",
  verified: "Проверенный источник",
};

export const sourceAccessStatusLabels: Record<SourceAccessStatus, string> = {
  "local-fulltext": "Полный текст в PLAST",
  "external-fulltext": "Полный текст у внешнего источника",
  "metadata-only": "Только библиографические данные",
};

// Stable public filter values preserve existing query-string compatibility while
// the domain taxonomy remains more precise.
export const materialTypes = ["book", "article", "guide", "manual", "standard"] as const;
export type MaterialType = (typeof materialTypes)[number];

export const materialTypeLabels: Record<MaterialType, string> = {
  book: "Книги",
  article: "Статьи",
  guide: "Руководства",
  manual: "Техническая документация",
  standard: "Научные работы и стандарты",
};

export const materialTypeSources: Record<MaterialType, readonly SourceType[]> = {
  book: ["book", "textbook", "monograph"],
  article: ["journal-article", "review-article", "conference-paper", "spe-paper", "case-study"],
  guide: ["study-guide", "practical-guide", "methodical-material", "course-material"],
  manual: ["manual", "software-documentation", "technical-report"],
  standard: ["standard", "dissertation", "thesis-abstract"],
};

export const materialLanguages = sourceLanguages;
export type MaterialLanguage = SourceLanguage;
export const materialLanguageLabels = sourceLanguageLabels;
export type Material = Source;

export function normalizeDoi(value: string | undefined) {
  const normalized = value
    ?.normalize("NFKC")
    .trim()
    .replace(/^doi\s*:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("en-US");
  return normalized || undefined;
}

export function normalizeIsbn(value: string | undefined) {
  const normalized = value
    ?.normalize("NFKC")
    .replace(/^isbn(?:-1[03])?\s*:?\s*/i, "")
    .replace(/[^0-9xX]/g, "")
    .toUpperCase();
  return normalized || undefined;
}

export function normalizeTitle(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAuthorName(value: string | undefined) {
  return normalizeTitle(value);
}

export function normalizeUrl(value: string | undefined) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function isValidDoi(value: string | undefined) {
  const doi = normalizeDoi(value);
  return Boolean(doi && /^10\.\d{4,9}\/\S+$/i.test(doi));
}

export function isValidIsbn(value: string | undefined) {
  const isbn = normalizeIsbn(value);
  if (!isbn || !/^(?:\d{9}[\dX]|\d{13})$/.test(isbn)) return false;

  if (isbn.length === 10) {
    const sum = [...isbn].reduce((total, character, index) => {
      const digit = character === "X" ? 10 : Number(character);
      return total + digit * (10 - index);
    }, 0);
    return sum % 11 === 0;
  }

  const sum = [...isbn.slice(0, 12)].reduce(
    (total, character, index) => total + Number(character) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

export function getSourceIdentityKeys(source: Pick<Source, "title" | "authors" | "year" | "identifiers">) {
  const keys: string[] = [];
  const doi = normalizeDoi(source.identifiers?.doi);
  const isbn13 = normalizeIsbn(source.identifiers?.isbn13);
  const isbn10 = normalizeIsbn(source.identifiers?.isbn10);
  if (doi) keys.push(`doi:${doi}`);
  if (isbn13) keys.push(`isbn:${isbn13}`);
  if (isbn10) keys.push(`isbn:${isbn10}`);

  const title = normalizeTitle(source.title);
  const firstAuthor = normalizeAuthorName(source.authors[0]?.fullName);
  if (title && firstAuthor && source.year) {
    keys.push(`title-author-year:${title}|${firstAuthor}|${source.year}`);
  }
  return [...new Set(keys)];
}

export interface TopicSourceCount {
  total: number;
  core: number;
  scientific: number;
  practical: number;
  supplementary: number;
}

export function getTopicSourceCounts(sources: readonly Source[], topicIds: readonly string[]) {
  const counts: Record<string, TopicSourceCount> = Object.fromEntries(
    topicIds.map((topicId) => [topicId, { total: 0, core: 0, scientific: 0, practical: 0, supplementary: 0 }]),
  );

  for (const source of sources) {
    for (const topicId of new Set(source.topics)) {
      const count = counts[topicId];
      if (!count) continue;
      count.total += 1;
      count[source.quality.authorityTier] += 1;
    }
  }
  return counts;
}

export interface SourceValidationIssue {
  sourceId?: string;
  path: string;
  code: string;
  message: string;
}

// Cloudflare Workers expose epoch time during module initialization, before a
// request provides a real clock. Keep the registry check deterministic there
// while allowing the limit to advance normally in environments with real time.
export const sourceRegistryReleaseYear = 2026;

export function getMaximumSourceYear(date = new Date()) {
  return Math.max(date.getUTCFullYear(), sourceRegistryReleaseYear) + 1;
}

function isHttpUrl(value: string | undefined) {
  return Boolean(normalizeUrl(value));
}

function isPlaceholderStorageKey(value: string) {
  return /(?:^|[/_.-])(fake|placeholder|example|todo)(?:$|[/_.-])/i.test(value);
}

export function validateSourceRegistry(
  sources: readonly Source[],
  validTopicIds: readonly string[],
  maximumYear = getMaximumSourceYear(),
) {
  const issues: SourceValidationIssue[] = [];
  const topicIds = new Set(validTopicIds);
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const add = (source: Source, path: string, code: string, message: string) => {
    issues.push({ sourceId: source.id || undefined, path, code, message });
  };

  for (const source of sources) {
    if (!source.id.trim()) add(source, "id", "required", "ID источника обязателен");
    if (seenIds.has(source.id)) add(source, "id", "duplicate", "ID источника должен быть уникальным");
    seenIds.add(source.id);
    if (!source.slug.trim()) add(source, "slug", "required", "Slug источника обязателен");
    if (seenSlugs.has(source.slug)) add(source, "slug", "duplicate", "Slug источника должен быть уникальным");
    seenSlugs.add(source.slug);
    if (!source.title.trim()) add(source, "title", "required", "Название источника обязательно");
    if (source.authors.length === 0) add(source, "authors", "required", "Нужен хотя бы один автор");
    source.authors.forEach((author, index) => {
      if (!author.fullName.trim()) add(source, `authors.${index}.fullName`, "required", "Имя автора обязательно");
    });
    if (!sourceTypes.includes(source.type)) add(source, "type", "invalid-enum", "Неизвестный тип источника");
    if (!sourceLanguages.includes(source.language)) add(source, "language", "invalid-enum", "Неизвестный язык источника");
    if (!sourceAccessStatuses.includes(source.access.status)) add(source, "access.status", "invalid-enum", "Неизвестный статус доступа");
    if (!ragPermissions.includes(source.access.ragPermission)) add(source, "access.ragPermission", "invalid-enum", "Неизвестное RAG-разрешение");
    if (!authorityTiers.includes(source.quality.authorityTier)) add(source, "quality.authorityTier", "invalid-enum", "Неизвестный уровень качества");
    if (!sourceRecordStatuses.includes(source.recordStatus)) add(source, "recordStatus", "invalid-enum", "Неизвестный статус записи");
    if (source.year !== undefined && (!Number.isInteger(source.year) || source.year < 1800 || source.year > maximumYear)) {
      add(source, "year", "invalid-year", `Год должен быть целым числом от 1800 до ${maximumYear}`);
    }
    for (const topicId of source.topics) {
      if (!topicIds.has(topicId)) add(source, "topics", "unknown-topic", `Неизвестная тема: ${topicId}`);
    }
    source.provenance.forEach((provenance, index) => {
      if (!sourceProviders.includes(provenance.provider)) add(source, `provenance.${index}.provider`, "invalid-enum", "Неизвестный provider");
      if (!isHttpUrl(provenance.url)) add(source, `provenance.${index}.url`, "invalid-url", "Нужен HTTP/HTTPS URL");
    });
    if (source.access.externalUrl && !isHttpUrl(source.access.externalUrl)) {
      add(source, "access.externalUrl", "invalid-url", "Нужен HTTP/HTTPS URL");
    }
    if (source.identifiers?.doi) {
      if (normalizeDoi(source.identifiers.doi) !== source.identifiers.doi || !isValidDoi(source.identifiers.doi)) {
        add(source, "identifiers.doi", "invalid-doi", "DOI должен быть валидным и нормализованным");
      }
    }
    for (const field of ["isbn10", "isbn13"] as const) {
      const isbn = source.identifiers?.[field];
      if (isbn && (normalizeIsbn(isbn) !== isbn || !isValidIsbn(isbn))) {
        add(source, `identifiers.${field}`, "invalid-isbn", "ISBN должен быть валидным и нормализованным");
      }
    }
    if (source.document) {
      if (!sourceDocumentFormats.includes(source.document.format)) add(source, "document.format", "invalid-enum", "Неизвестный формат документа");
      if (source.document.processingStatus && !sourceProcessingStatuses.includes(source.document.processingStatus)) {
        add(source, "document.processingStatus", "invalid-enum", "Неизвестный статус обработки");
      }
      if (source.document.storageKey && isPlaceholderStorageKey(source.document.storageKey)) {
        add(source, "document.storageKey", "placeholder-storage-key", "Фиктивный storageKey запрещён");
      }
    }
    if (source.access.status === "local-fulltext" && !source.document?.storageKey?.trim()) {
      add(source, "document.storageKey", "required", "Локальному документу нужен реальный storageKey");
    }
    for (const field of ["relevanceScore", "qualityScore"] as const) {
      const score = source.quality[field];
      if (score !== undefined && (!Number.isFinite(score) || score < 0 || score > 100)) {
        add(source, `quality.${field}`, "invalid-score", "Оценка должна быть от 0 до 100");
      }
    }
    if (source.quality.citationCount !== undefined && (!Number.isInteger(source.quality.citationCount) || source.quality.citationCount < 0)) {
      add(source, "quality.citationCount", "invalid-count", "Число цитирований не может быть отрицательным");
    }
  }
  return issues;
}

export function assertSourceRegistry(sources: readonly Source[], validTopicIds: readonly string[]) {
  const issues = validateSourceRegistry(sources, validTopicIds);
  if (issues.length > 0) {
    throw new Error(`Source Registry validation failed:\n${issues.map((issue) => `${issue.sourceId ?? "registry"}.${issue.path}: ${issue.message}`).join("\n")}`);
  }
}
