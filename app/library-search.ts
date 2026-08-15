import {
  allTopics,
  getTopicById,
  materialLanguages,
  materialTypes,
  type KnowledgeTopic,
  type Material,
  type MaterialLanguage,
  type MaterialType,
} from "./data";

export interface LibraryFilters {
  query: string;
  type?: MaterialType;
  language?: MaterialLanguage;
  year?: number;
  topic?: string;
}

export function cleanSearchQuery(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeSearchQuery(value: string | undefined) {
  return cleanSearchQuery(value).toLocaleLowerCase("ru-RU");
}

function topicTerms(topic: KnowledgeTopic) {
  const titleWithoutParenthetical = topic.title.replace(/\s*\([^)]*\)\s*/g, " ");
  return [topic.id, topic.slug, topic.title, titleWithoutParenthetical, ...topic.aliases].map(normalizeSearchQuery);
}

export function findKnowledgeTopic(query: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return undefined;
  return allTopics.find((topic) => topicTerms(topic).includes(normalizedQuery));
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseLibraryFilters(params: Record<string, string | string[] | undefined>): LibraryFilters {
  const query = cleanSearchQuery(firstValue(params.q));
  const typeValue = firstValue(params.type);
  const languageValue = firstValue(params.language);
  const yearValue = Number(firstValue(params.year));
  const topicValue = firstValue(params.topic);

  return {
    query,
    type: materialTypes.find((type) => type === typeValue),
    language: materialLanguages.find((language) => language === languageValue),
    year: Number.isInteger(yearValue) && yearValue >= 1900 && yearValue <= 2100 ? yearValue : undefined,
    topic: getTopicById(topicValue)?.id,
  };
}

export function filterMaterials(source: readonly Material[], filters: LibraryFilters) {
  const normalizedQuery = normalizeSearchQuery(filters.query);

  return source.filter((material) => {
    if (filters.type && material.type !== filters.type) return false;
    if (filters.language && material.language !== filters.language) return false;
    if (filters.year && material.year !== filters.year) return false;
    if (filters.topic && !material.topics.includes(filters.topic)) return false;
    if (!normalizedQuery) return true;

    const linkedTopicTerms = material.topics
      .map(getTopicById)
      .filter((topic): topic is KnowledgeTopic => Boolean(topic))
      .flatMap(topicTerms);
    const searchableText = normalizeSearchQuery([
      material.title,
      ...material.authors,
      material.description,
      ...material.aliases,
      ...linkedTopicTerms,
    ].join(" "));

    return searchableText.includes(normalizedQuery);
  });
}

export function pluralizeMaterials(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} материалов`;
  if (lastDigit === 1) return `${count} материал`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} материала`;
  return `${count} материалов`;
}
