import type { KnowledgeTopic, Material } from "./data";
import { knowledgeAreas } from "./data";

export function cleanSearchQuery(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeSearchQuery(value: string | undefined) {
  return cleanSearchQuery(value).toLocaleLowerCase("ru-RU");
}

function getKnowledgeTopicTerms(topic: KnowledgeTopic) {
  const titleWithoutParenthetical = topic.title.replace(/\s*\([^)]*\)\s*/g, " ");

  return [topic.title, titleWithoutParenthetical, topic.slug, ...(topic.aliases ?? [])]
    .map(normalizeSearchQuery);
}

export function findKnowledgeTopic(query: string): KnowledgeTopic | undefined {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) return undefined;

  return knowledgeAreas
    .flatMap((area) => area.topics)
    .find((topic) => getKnowledgeTopicTerms(topic).includes(normalizedQuery));
}

export function filterMaterials(source: readonly Material[], query: string) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) return [...source];

  const knowledgeTopic = findKnowledgeTopic(query);
  const searchTerms = [
    normalizedQuery,
    ...(knowledgeTopic ? getKnowledgeTopicTerms(knowledgeTopic) : []),
  ];

  return source.filter((material) => {
    const searchableText = normalizeSearchQuery([
      material.title,
      material.author,
      material.type,
      material.language,
      material.description,
      ...(material.topics ?? []),
      ...(material.aliases ?? []),
    ].filter(Boolean).join(" "));

    return searchTerms.some((term) => searchableText.includes(term));
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
