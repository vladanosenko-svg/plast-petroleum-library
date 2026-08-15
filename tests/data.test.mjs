import assert from "node:assert/strict";
import test from "node:test";
import { allTopics, sources } from "../app/data.ts";
import { validateSourceRegistry } from "../app/source-registry.ts";

test("source registry and topic data remains internally consistent", () => {
  assert.equal(sources.length, 7);
  assert.equal(allTopics.length, 65);

  const sourceIds = new Set(sources.map((source) => source.id));
  const sourceSlugs = new Set(sources.map((source) => source.slug));
  const topicIds = new Set(allTopics.map((topic) => topic.id));

  assert.equal(sourceIds.size, sources.length, "source IDs must be unique");
  assert.equal(sourceSlugs.size, sources.length, "source slugs must be unique");
  assert.equal(topicIds.size, allTopics.length, "topic IDs must be unique");
  assert.deepEqual(validateSourceRegistry(sources, [...topicIds]), []);

  for (const source of sources) {
    assert.ok(source.authors.every((author) => author.fullName));
    assert.ok(source.topics.length > 0);
    assert.ok(source.access.status);
    assert.ok(source.access.ragPermission);
    assert.ok(source.quality.authorityTier);
    assert.equal(source.recordStatus, "demo");
    assert.doesNotThrow(() => JSON.stringify(source));
  }
});
