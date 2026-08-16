import { topicCorpusProfiles, type TopicCorpusProfile } from "../corpus-planning.ts";
import { DEFAULT_DISCOVERY_LIMITS } from "./config.ts";
import {
  discoveryProviders,
  type DiscoveryLimits,
  type DiscoveryProvider,
  type DiscoveryQuery,
  type DiscoveryQueryLanguage,
} from "./types.ts";

const ambiguousEnglishTerms = new Set([
  "cmg",
  "development",
  "eclipse",
  "economics",
  "modeling",
  "modelling",
  "petrel",
  "production",
  "pvt",
  "scal",
  "separation",
  "tnavigator",
]);

const ambiguousRussianTerms = new Set([
  "автоматизация",
  "бурение",
  "гидродинамическое моделирование",
  "разработка",
  "сепарация",
  "экология",
]);

export function normalizeDiscoveryQuery(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function addPetroleumContext(value: string, language: DiscoveryQueryLanguage) {
  const normalized = normalizeDiscoveryQuery(value);
  const key = normalized.toLocaleLowerCase(language === "ru" ? "ru-RU" : "en-US");
  if (language === "en" && ambiguousEnglishTerms.has(key)) return `${normalized} petroleum reservoir`;
  if (language === "ru" && ambiguousRussianTerms.has(key)) return `${normalized} нефтегазовых месторождений`;
  return normalized;
}

export interface DiscoveryQueryPlanOptions {
  providers?: readonly DiscoveryProvider[];
  limits?: DiscoveryLimits;
}

export function buildDiscoveryQueries(
  profile: TopicCorpusProfile,
  options: DiscoveryQueryPlanOptions = {},
): DiscoveryQuery[] {
  const limits = options.limits ?? DEFAULT_DISCOVERY_LIMITS;
  const providers = options.providers ?? discoveryProviders;
  const terms: Array<{ language: DiscoveryQueryLanguage; values: string[] }> = [
    { language: "ru", values: profile.ruSearchTerms },
    { language: "en", values: profile.enSearchTerms },
  ];
  const queries: DiscoveryQuery[] = [];

  for (const provider of providers) {
    for (const { language, values } of terms) {
      const selected = [...new Set(values.map((value) => addPetroleumContext(value, language)).filter(Boolean))]
        .slice(0, limits.maxQueriesPerTopicPerLanguage);
      selected.forEach((query, index) => {
        queries.push({
          id: `${profile.topicId}:${provider}:${language}:${index + 1}`,
          topicId: profile.topicId,
          language,
          query,
          provider,
          resultLimit: limits.maxResultsPerQuery,
        });
      });
    }
  }
  return queries;
}

export function buildDiscoveryPlan(
  topicIds: readonly string[],
  options: DiscoveryQueryPlanOptions = {},
) {
  const profilesById = new Map(topicCorpusProfiles.map((profile) => [profile.topicId, profile]));
  return topicIds.flatMap((topicId) => {
    const profile = profilesById.get(topicId);
    if (!profile) throw new Error(`Неизвестная тема discovery: ${topicId}`);
    return buildDiscoveryQueries(profile, options);
  });
}
