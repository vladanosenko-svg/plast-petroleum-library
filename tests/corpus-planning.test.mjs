import assert from "node:assert/strict";
import test from "node:test";
import { allTopics, sources } from "../app/data.ts";
import {
  corpusPlan,
  getCorpusCoverageStatuses,
  getCorpusDiscoveryQueue,
  getTopicCoverageStatus,
  selectCoverageSources,
  topicCorpusProfiles,
  validateCorpusPlan,
} from "../app/corpus-planning.ts";

test("defines exactly one valid corpus profile for every topic", () => {
  assert.equal(allTopics.length, 65);
  assert.equal(topicCorpusProfiles.length, 65);
  assert.equal(new Set(topicCorpusProfiles.map((profile) => profile.topicId)).size, 65);
  assert.deepEqual(
    new Set(topicCorpusProfiles.map((profile) => profile.topicId)),
    new Set(allTopics.map((topic) => topic.id)),
  );
  assert.deepEqual(validateCorpusPlan(), []);
  assert.deepEqual(corpusPlan.uniqueSourceTarget, { minimum: 1000, ideal: 1200, maximum: 1500 });
});

test("keeps discovery vocabulary, aliases, relations and targets consistent", () => {
  const topicsById = new Map(allTopics.map((topic) => [topic.id, topic]));
  for (const profile of topicCorpusProfiles) {
    assert.ok(profile.ruSearchTerms.length > 0);
    assert.ok(profile.enSearchTerms.length > 0);
    assert.deepEqual(profile.aliases, topicsById.get(profile.topicId).aliases);
    assert.ok(profile.relatedTopicIds.every((topicId) => topicsById.has(topicId)));
    assert.ok(!profile.relatedTopicIds.includes(profile.topicId));
    assert.ok(profile.target.minimum <= profile.target.ideal);
    for (const requirement of [profile.target.minimumCore, profile.target.minimumScientific, profile.target.minimumPractical]) {
      assert.ok(requirement === undefined || (requirement >= 0 && requirement <= profile.target.ideal));
    }
  }
});

test("calculates deterministic weighted coverage, status and gaps", () => {
  const profile = topicCorpusProfiles.find((candidate) => candidate.topicId === "modeling");
  const current = { total: 40, core: 7, scientific: 9, practical: 8, supplementary: 16 };
  const first = getTopicCoverageStatus(profile, current);
  const second = getTopicCoverageStatus(profile, current);

  assert.deepEqual(first, second);
  assert.equal(first.coverageScore, 84);
  assert.equal(first.status, "good");
  assert.deepEqual(first.gaps, []);

  const incomplete = getTopicCoverageStatus(profile, { total: 25, core: 4, scientific: 5, practical: 2, supplementary: 14 });
  assert.equal(incomplete.status, "partial");
  assert.deepEqual(incomplete.gaps, [
    { dimension: "total", current: 25, required: 30, missing: 5 },
    { dimension: "core", current: 4, required: 7, missing: 3 },
    { dimension: "scientific", current: 5, required: 9, missing: 4 },
    { dimension: "practical", current: 2, required: 8, missing: 6 },
  ]);
});

test("excludes demo sources from production coverage by default", () => {
  assert.equal(selectCoverageSources(sources).length, 0);
  assert.equal(selectCoverageSources(sources, { includeDemo: true }).length, 7);
  assert.ok(getCorpusCoverageStatuses().every((coverage) => coverage.current.total === 0));

  const planning = getCorpusCoverageStatuses(sources, { recordStatuses: ["candidate", "verified"] });
  assert.ok(planning.every((coverage) => coverage.current.total === 0));
  const demo = getCorpusCoverageStatuses(sources, { includeDemo: true });
  assert.equal(demo.find((coverage) => coverage.topicId === "pvt").current.total, 2);
});

test("builds a stable discovery queue with high-priority empty topics first", () => {
  const first = getCorpusDiscoveryQueue();
  const second = getCorpusDiscoveryQueue();

  assert.deepEqual(first, second);
  assert.equal(first.length, 65);
  assert.deepEqual(first.slice(0, 5).map((item) => item.topicId), [
    "modeling",
    "development",
    "production",
    "pvt",
    "drilling",
  ]);
  assert.ok(first[0].discoveryPriorityScore >= first[1].discoveryPriorityScore);
  assert.ok(first[0].reasons.some((reason) => reason.startsWith("missing ")));
});
