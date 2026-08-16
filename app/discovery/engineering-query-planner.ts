import { topicCorpusProfiles, type TopicCorpusProfile } from "../corpus-planning.ts";
import type { SourceType } from "../source-registry.ts";
import { academicDomainRegistry } from "./engineering-registry.ts";
import { normalizeDiscoveryQuery } from "./query-planner.ts";
import type {
  DiscoveryQuery,
  DiscoveryQueryLanguage,
  EngineeringKnowledgeLayer,
} from "./types.ts";

interface EngineeringQueryFamily {
  layer: EngineeringKnowledgeLayer;
  ruSuffix: string;
  enSuffix: string;
  sourceTypes: SourceType[];
}

export const engineeringQueryFamilies: readonly EngineeringQueryFamily[] = [
  {
    layer: "THEORY",
    ruSuffix: "учебник книга справочник",
    enSuffix: "textbook reference book",
    sourceTypes: ["book", "textbook", "study-guide", "monograph", "lecture-note"],
  },
  {
    layer: "METHODOLOGY",
    ruSuffix: "методика технический отчет рекомендуемая практика",
    enSuffix: "methodology technical report recommended practice",
    sourceTypes: ["technical-report", "recommended-practice", "standard", "spe-paper", "conference-paper", "book-chapter"],
  },
  {
    layer: "SOFTWARE_TRAINING",
    ruSuffix: "руководство ПО tutorial обучение workflow",
    enSuffix: "software manual tutorial training workflow",
    sourceTypes: ["manual", "software-documentation", "tutorial", "training-material", "workflow", "release-notes", "presentation", "webinar"],
  },
  {
    layer: "PRACTICE",
    ruSuffix: "практический пример опыт применения кейс презентация вебинар",
    enSuffix: "field application case study presentation webinar",
    sourceTypes: ["case-study", "presentation", "webinar", "practical-guide", "workflow"],
  },
  {
    layer: "EXAMPLES_DATASETS",
    ruSuffix: "пример модели набор данных benchmark",
    enSuffix: "example model training dataset benchmark",
    sourceTypes: ["dataset", "example-model", "benchmark"],
  },
] as const;

function topicTerm(profile: TopicCorpusProfile, language: DiscoveryQueryLanguage) {
  const values = language === "ru" ? profile.ruSearchTerms : profile.enSearchTerms;
  return normalizeDiscoveryQuery(values[0] ?? profile.topicId);
}

export function buildEngineeringDiscoveryQueries(profile: TopicCorpusProfile): DiscoveryQuery[] {
  return (["ru", "en"] as const).flatMap((language) =>
    engineeringQueryFamilies.map((family) => ({
      id: `${profile.topicId}:engineering-registry:${language}:${family.layer.toLocaleLowerCase("en-US")}`,
      topicId: profile.topicId,
      language,
      query: normalizeDiscoveryQuery(`${topicTerm(profile, language)} ${language === "ru" ? family.ruSuffix : family.enSuffix}`),
      provider: "engineering-registry" as const,
      resultLimit: 50,
      engineeringLayer: family.layer,
      requestedSourceTypes: [...family.sourceTypes],
    } satisfies DiscoveryQuery)),
  );
}

export function buildEngineeringDiscoveryPlan(topicIds: readonly string[]) {
  const profilesById = new Map(topicCorpusProfiles.map((profile) => [profile.topicId, profile]));
  return topicIds.flatMap((topicId) => {
    const profile = profilesById.get(topicId);
    if (!profile) throw new Error(`Неизвестная тема engineering discovery: ${topicId}`);
    return buildEngineeringDiscoveryQueries(profile);
  });
}

export interface UniversityDiscoveryQuery {
  id: string;
  universityId: string;
  topicId: string;
  language: DiscoveryQueryLanguage;
  query: string;
  domain: string;
}

const universityMaterialPhrases = {
  ru: ["лекция конспект презентация", "практическая работа задание набор данных"],
  en: ["lecture notes slides", "exercise assignment course dataset"],
} as const;

// This produces auditable, domain-bounded search plans. It intentionally does
// not execute a crawler or query arbitrary .edu/.ac domains.
export function buildUniversityDiscoveryPlan(topicIds: readonly string[]): UniversityDiscoveryQuery[] {
  const profilesById = new Map(topicCorpusProfiles.map((profile) => [profile.topicId, profile]));
  return topicIds.flatMap((topicId) => {
    const profile = profilesById.get(topicId);
    if (!profile) throw new Error(`Неизвестная тема university discovery: ${topicId}`);
    return academicDomainRegistry.flatMap((university) => {
      const language: DiscoveryQueryLanguage = university.country === "RU" ? "ru" : "en";
      return universityMaterialPhrases[language].map((phrase, index) => ({
        id: `${topicId}:${university.id}:${language}:${index + 1}`,
        universityId: university.id,
        topicId,
        language,
        domain: university.officialDomain,
        query: normalizeDiscoveryQuery(`site:${university.officialDomain} ${topicTerm(profile, language)} ${phrase}`),
      }));
    });
  });
}
