import assert from "node:assert/strict";
import test from "node:test";
import {
  allTopics,
  materialLanguages,
  materials,
  materialTypes,
} from "../app/data.ts";

test("material and topic data remains internally consistent", () => {
  assert.equal(materials.length, 7);
  assert.equal(allTopics.length, 65);

  const materialIds = new Set(materials.map((material) => material.id));
  const materialSlugs = new Set(materials.map((material) => material.slug));
  const topicIds = new Set(allTopics.map((topic) => topic.id));

  assert.equal(materialIds.size, materials.length, "material IDs must be unique");
  assert.equal(materialSlugs.size, materials.length, "material slugs must be unique");
  assert.equal(topicIds.size, allTopics.length, "topic IDs must be unique");

  for (const material of materials) {
    assert.ok(material.id);
    assert.ok(material.slug);
    assert.ok(material.title);
    assert.ok(material.authors.length > 0);
    assert.ok(material.description);
    assert.ok(material.topics.length > 0);
    assert.ok(materialTypes.includes(material.type));
    assert.ok(materialLanguages.includes(material.language));
    assert.equal(typeof material.verified, "boolean");

    for (const topicId of material.topics) {
      assert.ok(topicIds.has(topicId), `${material.slug} references unknown topic ${topicId}`);
    }

    for (const url of [material.externalUrl, material.source?.url].filter(Boolean)) {
      const parsed = new URL(url);
      assert.ok(["http:", "https:"].includes(parsed.protocol), `${material.slug} has an invalid source URL`);
    }
  }
});
