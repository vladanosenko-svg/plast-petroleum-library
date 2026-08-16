import type { DiscoveryCandidate } from "../discovery/types.ts";
import {
  getSourceIdentityKeys,
  normalizeAuthorName,
  normalizeDoi,
  normalizeIsbn,
  normalizeTitle,
  normalizeUrl,
  type Source,
  type SourceType,
} from "../source-registry.ts";
import { genericPetroleumWords, verificationPolicy } from "./policy.ts";
import type { DuplicateAnalysis, PossibleDuplicate } from "./types.ts";

interface DuplicateNode {
  id: string;
  kind: "STAGING" | "SOURCE_REGISTRY";
  title: string;
  authors: string[];
  year?: number;
  sourceType?: SourceType;
  publisher?: string;
  urls: string[];
  strongKeys: string[];
  productIds: string[];
  version?: string;
  official: boolean;
}

function unique(values: readonly (string | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function isDocumentSpecificUrl(value: string, title: string) {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === "doi.org") return true;
    const path = normalizeTitle(decodeURIComponent(url.pathname));
    const pathTokens = new Set(titleTokens(path));
    const overlap = titleTokens(title).filter((token) => pathTokens.has(token));
    if (overlap.length >= 2) return true;
    return /\/(?:article|paper|document|books?|publication|record)\/[a-z0-9._-]{4,}\/?$/iu.test(url.pathname);
  } catch {
    return false;
  }
}

function candidateStrongKeys(candidate: DiscoveryCandidate) {
  const keys: string[] = [];
  const doi = normalizeDoi(candidate.identifiers.doi);
  if (doi) keys.push(`doi:${doi}`);
  for (const isbn of candidate.identifiers.isbn ?? []) {
    const normalized = normalizeIsbn(isbn);
    if (normalized) keys.push(`isbn:${normalized}`);
  }
  if (candidate.identifiers.openAlexId) keys.push(`openalex:${candidate.identifiers.openAlexId.toLowerCase()}`);
  if (candidate.identifiers.crossrefId) keys.push(`crossref:${candidate.identifiers.crossrefId.toLowerCase()}`);
  for (const url of [candidate.urls?.landingPage, candidate.urls?.doi, ...candidate.provenance.map((item) => item.landingPage)]) {
    const normalized = normalizeUrl(url);
    if (normalized && isDocumentSpecificUrl(normalized, candidate.title)) keys.push(`url:${typeFamily(candidate.sourceType)}:${normalized.toLowerCase()}`);
  }
  for (const provenance of candidate.provenance) {
    if (provenance.providerRecordId) keys.push(`provider:${provenance.provider}:${provenance.providerRecordId.toLowerCase()}`);
  }
  const title = normalizeTitle(candidate.title);
  const software = candidate.engineering?.software;
  const documentVersion = software?.documentVersion ?? software?.softwareVersion;
  if (software?.vendorId && software.productIds.length > 0 && documentVersion && title) {
    keys.push(`vendor-document:${software.vendorId}|${[...software.productIds].sort().join(",")}|${documentVersion.toLowerCase()}|${title}`);
  }
  return unique(keys);
}

function sourceStrongKeys(source: Source) {
  const keys = getSourceIdentityKeys(source).filter((key) => !key.startsWith("title-author-year:"));
  for (const provenance of source.provenance) {
    const normalized = normalizeUrl(provenance.url);
    if (normalized && isDocumentSpecificUrl(normalized, source.title)) keys.push(`url:${typeFamily(source.type)}:${normalized.toLowerCase()}`);
    if (provenance.providerRecordId) keys.push(`provider:${provenance.provider}:${provenance.providerRecordId.toLowerCase()}`);
  }
  if (source.access.externalUrl) {
    const normalized = normalizeUrl(source.access.externalUrl);
    if (normalized && isDocumentSpecificUrl(normalized, source.title)) keys.push(`url:${typeFamily(source.type)}:${normalized.toLowerCase()}`);
  }
  return unique(keys);
}

function candidateNode(candidate: DiscoveryCandidate): DuplicateNode {
  return {
    id: candidate.id,
    kind: "STAGING",
    title: candidate.title,
    authors: candidate.authors.map((author) => author.fullName),
    year: candidate.publicationYear,
    sourceType: candidate.sourceType,
    publisher: candidate.publication?.publisher ?? candidate.publication?.institution,
    urls: unique([candidate.urls?.landingPage, candidate.urls?.doi, ...candidate.provenance.map((item) => item.landingPage)]),
    strongKeys: candidateStrongKeys(candidate),
    productIds: candidate.engineering?.software?.productIds ?? [],
    version: candidate.engineering?.software?.documentVersion ?? candidate.engineering?.software?.softwareVersion,
    official: candidate.provenance.some((item) => item.officialSource),
  };
}

function sourceNode(source: Source): DuplicateNode {
  return {
    id: source.id,
    kind: "SOURCE_REGISTRY",
    title: source.title,
    authors: source.authors.map((author) => author.fullName),
    year: source.year,
    sourceType: source.type,
    publisher: source.publication?.publisher ?? source.publication?.institution,
    urls: unique([source.access.externalUrl, ...source.provenance.map((item) => item.url)]),
    strongKeys: sourceStrongKeys(source),
    productIds: [],
    official: source.provenance.some((item) => item.provider !== "other"),
  };
}

function typeFamily(type: SourceType | undefined) {
  if (["book", "book-chapter", "textbook", "study-guide", "monograph"].includes(type ?? "")) return "book";
  if (["journal-article", "review-article", "conference-paper", "spe-paper"].includes(type ?? "")) return "article";
  if (["manual", "software-documentation", "release-notes"].includes(type ?? "")) return "manual";
  if (["tutorial", "training-material", "course-material", "methodical-material", "lecture-note"].includes(type ?? "")) return "training";
  if (["dataset", "example-model", "benchmark"].includes(type ?? "")) return "data";
  return type ?? "unknown";
}

function titleTokens(title: string) {
  return normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length >= 3 && !genericPetroleumWords.has(token));
}

function authorTokens(authors: readonly string[]) {
  return authors.flatMap((author) => normalizeAuthorName(author).split(" ")).filter((token) => token.length >= 2);
}

function blockingKeys(node: DuplicateNode) {
  const tokens = titleTokens(node.title);
  const authors = authorTokens(node.authors);
  const family = typeFamily(node.sourceType);
  const year = node.year ?? "unknown";
  const keys = [
    tokens.length > 0 ? `title:${family}:${tokens.slice(0, 2).join("-")}:${year}` : undefined,
    tokens.length > 1 ? `tokens:${family}:${[...tokens].sort().slice(0, 2).join("-")}:${year}` : undefined,
    authors.length > 0 && tokens.length > 0 ? `author:${family}:${authors[0]}:${tokens[0]}:${year}` : undefined,
    normalizeTitle(node.title).length >= 24 ? `prefix:${family}:${normalizeTitle(node.title).slice(0, 24)}` : undefined,
    ...node.productIds.map((product) => `product:${family}:${product}:${year}`),
  ];
  return unique(keys);
}

function jaccard(leftValues: readonly string[], rightValues: readonly string[]) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  return [...left].filter((value) => right.has(value)).length / union.size;
}

function similarity(left: DuplicateNode, right: DuplicateNode) {
  const signals: string[] = [];
  const leftTitle = normalizeTitle(left.title);
  const rightTitle = normalizeTitle(right.title);
  let titleScore = jaccard(titleTokens(left.title), titleTokens(right.title));
  if (leftTitle === rightTitle && leftTitle) titleScore = 1;
  if (titleScore >= 0.75) signals.push(`title similarity ${Math.round(titleScore * 100)}%`);

  const authorScore = jaccard(authorTokens(left.authors), authorTokens(right.authors));
  if (authorScore >= 0.5) signals.push(`author overlap ${Math.round(authorScore * 100)}%`);
  const yearScore = left.year && right.year ? (left.year === right.year ? 1 : Math.abs(left.year - right.year) === 1 ? 0.5 : 0) : 0;
  if (yearScore === 1) signals.push(`same year ${left.year}`);
  const publisherScore = normalizeTitle(left.publisher) && normalizeTitle(left.publisher) === normalizeTitle(right.publisher) ? 1 : 0;
  if (publisherScore) signals.push("same publisher or institution");
  const productScore = left.productIds.some((product) => right.productIds.includes(product)) ? 1 : 0;
  if (productScore) signals.push("same software product");
  const versionScore = left.version && right.version && normalizeTitle(left.version) === normalizeTitle(right.version) ? 1 : 0;
  if (versionScore) signals.push("same document/software version");
  const supporting = Math.max(publisherScore, productScore, versionScore);
  const confidence = Math.round((titleScore * 0.68 + authorScore * 0.14 + yearScore * 0.10 + supporting * 0.08) * 1000) / 10;
  return { confidence, signals };
}

function preferredNode(left: DuplicateNode, right: DuplicateNode) {
  if (left.kind !== right.kind) return left.kind === "SOURCE_REGISTRY" ? left : right;
  if (left.official !== right.official) return left.official ? left : right;
  return left.id.localeCompare(right.id, "en") <= 0 ? left : right;
}

export interface DuplicateAnalysisResult {
  byCandidateId: Map<string, DuplicateAnalysis>;
  comparisons: number;
  blockCount: number;
}

export function analyzeDuplicates(
  candidates: readonly DiscoveryCandidate[],
  sourceRegistry: readonly Source[],
): DuplicateAnalysisResult {
  const candidateNodes = candidates.map(candidateNode);
  const registryNodes = sourceRegistry.map(sourceNode);
  const allNodes = [...candidateNodes, ...registryNodes];
  const exactIndex = new Map<string, DuplicateNode[]>();
  for (const node of allNodes) {
    for (const key of node.strongKeys) {
      const list = exactIndex.get(key) ?? [];
      list.push(node);
      exactIndex.set(key, list);
    }
  }

  const analyses = new Map<string, DuplicateAnalysis>();
  for (const node of candidateNodes) {
    const exactMatches = unique(node.strongKeys.flatMap((key) => exactIndex.get(key)?.filter((target) => target.id !== node.id).map((target) => target.id) ?? []));
    const targets = exactMatches.map((id) => allNodes.find((nodeItem) => nodeItem.id === id)!).filter(Boolean);
    const preferred = targets.length > 0 ? [node, ...targets].reduce(preferredNode) : undefined;
    const duplicateTarget = preferred && preferred.id !== node.id ? preferred : undefined;
    analyses.set(node.id, {
      state: duplicateTarget ? "EXACT_DUPLICATE" : "UNIQUE",
      duplicateOf: duplicateTarget?.id,
      duplicateTargetKind: duplicateTarget?.kind,
      exactKeys: node.strongKeys.filter((key) => (exactIndex.get(key)?.length ?? 0) > 1),
      possibleDuplicates: [],
    });
  }

  const blocks = new Map<string, DuplicateNode[]>();
  for (const node of allNodes) {
    for (const key of blockingKeys(node)) {
      const list = blocks.get(key) ?? [];
      list.push(node);
      blocks.set(key, list);
    }
  }
  const seenPairs = new Set<string>();
  let comparisons = 0;
  for (const nodes of blocks.values()) {
    // Broad prefixes are only routing hints. Other year/author/product blocks
    // retain useful comparisons without degrading to all-pairs work.
    if (nodes.length > 100) continue;
    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const left = nodes[leftIndex];
        const right = nodes[rightIndex];
        if (left.kind === "SOURCE_REGISTRY" && right.kind === "SOURCE_REGISTRY") continue;
        const pairKey = [left.kind, left.id, right.kind, right.id].sort().join("|");
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        comparisons += 1;
        if (left.strongKeys.some((key) => right.strongKeys.includes(key))) continue;
        const match = similarity(left, right);
        if (match.confidence < verificationPolicy.thresholds.duplicateReviewThreshold) continue;
        for (const [candidate, target] of [[left, right], [right, left]] as const) {
          if (candidate.kind !== "STAGING") continue;
          const analysis = analyses.get(candidate.id)!;
          const possible: PossibleDuplicate = {
            targetId: target.id,
            targetKind: target.kind,
            confidence: match.confidence,
            signals: match.signals,
          };
          analysis.possibleDuplicates.push(possible);
          if (analysis.state === "UNIQUE") analysis.state = "POSSIBLE_DUPLICATE";
        }
      }
    }
  }
  for (const analysis of analyses.values()) {
    analysis.possibleDuplicates.sort((left, right) => right.confidence - left.confidence || left.targetId.localeCompare(right.targetId, "en"));
  }
  return { byCandidateId: analyses, comparisons, blockCount: blocks.size };
}

export function getCandidateStrongIdentityKeys(candidate: DiscoveryCandidate) {
  return candidateStrongKeys(candidate);
}
