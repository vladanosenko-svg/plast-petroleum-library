import { normalizeAuthorName } from "../source-registry.ts";
import type {
  DiscoveryCandidate,
  DiscoveryFieldConflict,
  DiscoveryProvenance,
} from "./types.ts";

function identityKeys(candidate: DiscoveryCandidate) {
  const keys: string[] = [];
  if (candidate.identifiers.doi) keys.push(`doi:${candidate.identifiers.doi}`);
  if (candidate.identifiers.openAlexId) keys.push(`openalex:${candidate.identifiers.openAlexId}`);
  if (candidate.identifiers.crossrefId) keys.push(`crossref:${candidate.identifiers.crossrefId}`);
  for (const isbn of candidate.identifiers.isbn ?? []) keys.push(`isbn:${isbn}`);
  if (keys.length === 0) {
    for (const item of candidate.provenance) keys.push(`${item.provider}:${item.providerRecordId}`);
  }
  return [...new Set(keys)].sort();
}

function canonicalCandidateId(candidate: DiscoveryCandidate) {
  const keys = identityKeys(candidate);
  return keys.find((key) => key.startsWith("doi:"))
    ?? keys.find((key) => key.startsWith("openalex:"))
    ?? keys.find((key) => key.startsWith("crossref:"))
    ?? keys.find((key) => key.startsWith("isbn:"))
    ?? keys[0]
    ?? candidate.id;
}

function intersects(left: DiscoveryCandidate, right: DiscoveryCandidate) {
  const leftKeys = new Set(identityKeys(left));
  return identityKeys(right).some((key) => leftKeys.has(key));
}

function uniqueSorted(values: readonly (string | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

function provenanceKey(value: DiscoveryProvenance) {
  return `${value.provider}|${value.providerRecordId}|${value.queryId}|${value.topicId}|${value.queryLanguage}`;
}

function mergeProvenance(left: DiscoveryProvenance[], right: DiscoveryProvenance[]) {
  const merged = new Map<string, DiscoveryProvenance>();
  for (const value of [...left, ...right]) {
    const key = provenanceKey(value);
    const current = merged.get(key);
    if (!current || value.discoveredAt < current.discoveredAt) merged.set(key, value);
  }
  return [...merged.values()].sort((first, second) => provenanceKey(first).localeCompare(provenanceKey(second), "en"));
}

function addConflict(
  conflicts: DiscoveryFieldConflict[],
  field: string,
  left: unknown,
  right: unknown,
) {
  if (left === undefined || right === undefined || JSON.stringify(left) === JSON.stringify(right)) return;
  const values = uniqueSorted([String(left), String(right)]);
  const existing = conflicts.find((conflict) => conflict.field === field);
  if (existing) existing.values = uniqueSorted([...existing.values, ...values]);
  else conflicts.push({ field, values });
}

function mergeDefinedObjects<T extends object>(preferred: T | undefined, fallback: T | undefined) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fallback ?? {})) if (value !== undefined) result[key] = value;
  for (const [key, value] of Object.entries(preferred ?? {})) if (value !== undefined) result[key] = value;
  return Object.keys(result).length > 0 ? result as T : undefined;
}

function mergeCandidate(left: DiscoveryCandidate, right: DiscoveryCandidate): DiscoveryCandidate {
  const conflicts = structuredClone(left.fieldConflicts ?? []);
  for (const conflict of right.fieldConflicts ?? []) {
    const existing = conflicts.find((item) => item.field === conflict.field);
    if (existing) existing.values = uniqueSorted([...existing.values, ...conflict.values]);
    else conflicts.push(structuredClone(conflict));
  }
  addConflict(conflicts, "title", left.title, right.title);
  addConflict(conflicts, "publicationYear", left.publicationYear, right.publicationYear);
  addConflict(conflicts, "sourceType", left.sourceType, right.sourceType);
  addConflict(conflicts, "language", left.language, right.language);
  const leftAuthors = uniqueSorted(left.authors.map((author) => normalizeAuthorName(author.fullName))).join("|") || undefined;
  const rightAuthors = uniqueSorted(right.authors.map((author) => normalizeAuthorName(author.fullName))).join("|") || undefined;
  addConflict(conflicts, "authors", leftAuthors, rightAuthors);

  const publicationFields = ["publisher", "journal", "volume", "issue", "pages", "edition", "city", "conference", "institution"] as const;
  for (const field of publicationFields) {
    addConflict(conflicts, `publication.${field}`, left.publication?.[field], right.publication?.[field]);
  }

  const authors = new Map<string, DiscoveryCandidate["authors"][number]>();
  for (const author of [...left.authors, ...right.authors]) {
    const key = `${normalizeAuthorName(author.fullName)}|${author.orcid ?? ""}`;
    if (!authors.has(key)) authors.set(key, author);
  }

  const merged: DiscoveryCandidate = {
    ...left,
    authors: [...authors.values()],
    identifiers: {
      doi: left.identifiers.doi ?? right.identifiers.doi,
      openAlexId: left.identifiers.openAlexId ?? right.identifiers.openAlexId,
      crossrefId: left.identifiers.crossrefId ?? right.identifiers.crossrefId,
      isbn: uniqueSorted([...(left.identifiers.isbn ?? []), ...(right.identifiers.isbn ?? [])]),
      issn: uniqueSorted([...(left.identifiers.issn ?? []), ...(right.identifiers.issn ?? [])]),
    },
    publication: mergeDefinedObjects(left.publication, right.publication),
    urls: mergeDefinedObjects(left.urls, right.urls),
    openAccess: mergeDefinedObjects(left.openAccess, right.openAccess),
    qualitySignals: mergeDefinedObjects(left.qualitySignals, right.qualitySignals),
    topicIds: uniqueSorted([...left.topicIds, ...right.topicIds]),
    provenance: mergeProvenance(left.provenance, right.provenance),
    fieldConflicts: conflicts.length > 0
      ? conflicts.sort((first, second) => first.field.localeCompare(second.field, "en"))
      : undefined,
  };
  merged.id = canonicalCandidateId(merged);
  return merged;
}

function providerRank(candidate: DiscoveryCandidate) {
  return candidate.provenance.some((item) => item.provider === "crossref") ? 0 : 1;
}

export interface CandidateMergeResult {
  candidates: DiscoveryCandidate[];
  exactMerged: number;
}

export function mergeDiscoveryCandidates(input: readonly DiscoveryCandidate[]): CandidateMergeResult {
  const ordered = [...structuredClone(input)].sort((left, right) =>
    providerRank(left) - providerRank(right) || left.id.localeCompare(right.id, "en"),
  );
  const merged: DiscoveryCandidate[] = [];

  for (const candidate of ordered) {
    const matchingIndexes = merged
      .map((current, index) => (intersects(current, candidate) ? index : -1))
      .filter((index) => index >= 0);
    if (matchingIndexes.length === 0) {
      merged.push(candidate);
      continue;
    }
    let combined = matchingIndexes.map((index) => merged[index]).reduce(mergeCandidate);
    combined = mergeCandidate(combined, candidate);
    for (const index of matchingIndexes.sort((left, right) => right - left)) merged.splice(index, 1);
    merged.push(combined);
  }

  merged.sort((left, right) => left.id.localeCompare(right.id, "en"));
  return { candidates: merged, exactMerged: input.length - merged.length };
}

export function mergeDiscoveryStaging(
  existing: readonly DiscoveryCandidate[],
  discovered: readonly DiscoveryCandidate[],
) {
  return mergeDiscoveryCandidates([...existing, ...discovered]).candidates;
}
