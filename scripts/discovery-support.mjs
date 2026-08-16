import { open, readFile, rename, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { topicCorpusProfiles } from "../app/corpus-planning.ts";
import { DEFAULT_DISCOVERY_LIMITS } from "../app/discovery/config.ts";
import { discoveryProviders } from "../app/discovery/types.ts";

export const discoveryDirectory = resolve("data", "discovery");
export const candidatesPath = resolve(discoveryDirectory, "discovery-candidates.json");
export const runsPath = resolve(discoveryDirectory, "discovery-runs.json");

export function parseCliArguments(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === "--all") {
      options.all = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Неизвестный аргумент: ${argument}`);
    const key = argument.slice(2);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Для --${key} требуется значение`);
    options[key] = value;
    index += 1;
  }
  return options;
}

export function resolveTopicIds(options, { requireExplicit = false } = {}) {
  const selections = [Boolean(options.topic), Boolean(options.topics), Boolean(options.all)].filter(Boolean).length;
  if (selections > 1) throw new Error("Используйте только один из --topic, --topics или --all");
  if (requireExplicit && selections === 0) {
    throw new Error("Discovery run требует --topic <id>, --topics <id,id> или явный --all");
  }
  const requested = options.topic
    ? [options.topic]
    : options.topics
      ? options.topics.split(",").map((value) => value.trim()).filter(Boolean)
      : topicCorpusProfiles.map((profile) => profile.topicId);
  const known = new Set(topicCorpusProfiles.map((profile) => profile.topicId));
  for (const topicId of requested) {
    if (!known.has(topicId)) throw new Error(`Неизвестная тема discovery: ${topicId}`);
  }
  return [...new Set(requested)].sort();
}

export function resolveProviders(options) {
  if (!options.provider) return [...discoveryProviders];
  const providers = options.provider.split(",").map((value) => value.trim()).filter(Boolean);
  for (const provider of providers) {
    if (!discoveryProviders.includes(provider)) throw new Error(`Неизвестный provider: ${provider}`);
  }
  return [...new Set(providers)];
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} должен быть положительным целым числом`);
  return parsed;
}

export function resolveLimits(options) {
  return {
    ...DEFAULT_DISCOVERY_LIMITS,
    maxQueriesPerTopicPerLanguage: options["max-queries"]
      ? positiveInteger(options["max-queries"], "--max-queries")
      : DEFAULT_DISCOVERY_LIMITS.maxQueriesPerTopicPerLanguage,
    maxResultsPerQuery: options.limit
      ? positiveInteger(options.limit, "--limit")
      : DEFAULT_DISCOVERY_LIMITS.maxResultsPerQuery,
    maxPagesPerQuery: options["max-pages"]
      ? positiveInteger(options["max-pages"], "--max-pages")
      : DEFAULT_DISCOVERY_LIMITS.maxPagesPerQuery,
    maxTotalResultsPerRun: options["max-total"]
      ? positiveInteger(options["max-total"], "--max-total")
      : DEFAULT_DISCOVERY_LIMITS.maxTotalResultsPerRun,
    concurrency: options.concurrency
      ? positiveInteger(options.concurrency, "--concurrency")
      : DEFAULT_DISCOVERY_LIMITS.concurrency,
    requestDelayMs: options["delay-ms"] !== undefined
      ? Number(options["delay-ms"])
      : DEFAULT_DISCOVERY_LIMITS.requestDelayMs,
  };
}

export async function readJsonArray(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (!Array.isArray(value)) throw new Error(`${path} должен содержать JSON array`);
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  const handle = await open(temporaryPath, "w");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, path);
}
