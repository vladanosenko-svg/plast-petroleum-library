import assert from "node:assert/strict";
import test from "node:test";
import { allTopics, sources } from "../app/data.ts";
import {
  getSourceIdentityKeys,
  getMaximumSourceYear,
  getTopicSourceCounts,
  isValidDoi,
  isValidIsbn,
  normalizeAuthorName,
  normalizeDoi,
  normalizeIsbn,
  normalizeTitle,
  normalizeUrl,
  validateSourceRegistry,
} from "../app/source-registry.ts";

test("keeps the publication-year limit valid during Worker startup", () => {
  assert.equal(getMaximumSourceYear(new Date(0)), 2027);
  assert.equal(getMaximumSourceYear(new Date("2030-01-01T00:00:00Z")), 2031);
});

test("normalizes and validates source identifiers", () => {
  assert.equal(normalizeDoi(" DOI: https://doi.org/10.2118/12345-MS "), "10.2118/12345-ms");
  assert.equal(normalizeIsbn("ISBN-13: 978-0-13-468599-1"), "9780134685991");
  assert.equal(normalizeIsbn("ISBN 0-13-468599-7"), "0134685997");
  assert.equal(isValidDoi("10.2118/12345-ms"), true);
  assert.equal(isValidDoi("not-a-doi"), false);
  assert.equal(isValidIsbn("9780134685991"), true);
  assert.equal(isValidIsbn("9780134685992"), false);
});

test("normalizes title, author and URL deterministically", () => {
  assert.equal(normalizeTitle("  PVT-свойства: Ёмкостная   модель! "), "pvt свойства емкостная модель");
  assert.equal(normalizeAuthorName("  А.  М. Коновалов "), "а м коновалов");
  assert.equal(normalizeUrl("HTTPS://Example.COM/source#page-2"), "https://example.com/source");
  assert.equal(normalizeUrl("file:///source.pdf"), undefined);
});

test("builds deterministic source identity keys", () => {
  const sourceIdentity = {
    title: "PVT-свойства пластовых флюидов",
    authors: [{ fullName: "М. В. Каримов" }],
    year: 2022,
    identifiers: { doi: "10.2118/12345-ms", isbn13: "9780134685991" },
  };
  const expected = [
    "doi:10.2118/12345-ms",
    "isbn:9780134685991",
    "title-author-year:pvt свойства пластовых флюидов|м в каримов|2022",
  ];

  assert.deepEqual(getSourceIdentityKeys(sourceIdentity), expected);
  assert.deepEqual(getSourceIdentityKeys(sourceIdentity), expected);
});

test("counts source coverage per topic and authority tier", () => {
  const coverage = getTopicSourceCounts(sources, allTopics.map((topic) => topic.id));

  assert.equal(Object.keys(coverage).length, 65);
  assert.deepEqual(coverage.pvt, { total: 2, core: 0, scientific: 0, practical: 2, supplementary: 0 });
  assert.deepEqual(coverage.modeling, { total: 2, core: 1, scientific: 0, practical: 0, supplementary: 1 });
  assert.deepEqual(coverage.geophysics, { total: 0, core: 0, scientific: 0, practical: 0, supplementary: 0 });
});

test("reports duplicate identities and malformed registry fields", () => {
  const invalid = {
    ...sources[0],
    title: " ",
    provenance: [{ provider: "manual", url: "file:///local.pdf" }],
  };
  const issues = validateSourceRegistry([sources[0], invalid], allTopics.map((topic) => topic.id));
  const codes = issues.map((issue) => issue.code);

  assert.ok(codes.includes("duplicate"));
  assert.ok(codes.includes("required"));
  assert.ok(codes.includes("invalid-url"));
});
