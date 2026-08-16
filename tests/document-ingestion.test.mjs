import assert from "node:assert/strict";
import test from "node:test";
import { sources } from "../app/data.ts";
import { applyDocumentManifest, validateDocumentManifest } from "../app/document-manifest.ts";
import { ingestControlledDocument, IngestionRefusedError } from "../app/storage/document-ingestion.ts";
import { R2DocumentStorage } from "../app/storage/document-storage.ts";
import { DocumentValidationError } from "../app/storage/document-validation.ts";

const encoder = new TextEncoder();
const pdfBytes = encoder.encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");

class MemoryBucket {
  objects = new Map();

  async put(key, value, options) {
    const bytes = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const object = {
      key,
      bytes: bytes.slice(),
      size: bytes.byteLength,
      etag: "memory-etag",
      uploaded: new Date("2026-08-16T00:00:00.000Z"),
      customMetadata: options?.customMetadata,
    };
    this.objects.set(key, object);
    return object;
  }

  async head(key) { return this.objects.get(key) ?? null; }
  async get(key) {
    const object = this.objects.get(key);
    return object ? { ...object, body: new Blob([object.bytes]).stream() } : null;
  }
  async delete(key) { this.objects.delete(key); }
}

function input(source, storage, overrides = {}) {
  return {
    source,
    storage,
    document: { bytes: pdfBytes, filename: "synthetic.pdf", declaredMimeType: "application/pdf" },
    ...overrides,
  };
}

test("valid synthetic PDF is accepted only with explicit local-storage approval", async () => {
  const source = structuredClone(sources[0]);
  const storage = new R2DocumentStorage(new MemoryBucket());
  await assert.rejects(
    ingestControlledDocument(input(source, storage)),
    (error) => error instanceof IngestionRefusedError && error.code === "local-storage-approval-required",
  );

  const result = await ingestControlledDocument(input(source, storage, { approveLocalStorage: true }));
  assert.equal(result.source.access.status, "local-fulltext");
  assert.equal(result.source.access.ragPermission, source.access.ragPermission);
  assert.equal(result.manifestEntry.approvedLocalStorage, true);
  assert.match(result.manifestEntry.document.storageKey, new RegExp(`^documents/originals/${source.id}/[a-f0-9]{64}\\.pdf$`));
});

test("duplicate binary is detected and verified instead of overwritten", async () => {
  const source = structuredClone(sources[0]);
  const bucket = new MemoryBucket();
  const storage = new R2DocumentStorage(bucket);
  const first = await ingestControlledDocument(input(source, storage, { approveLocalStorage: true }));
  const second = await ingestControlledDocument(input(source, storage, { approveLocalStorage: true }));
  assert.equal(first.duplicateBinary, false);
  assert.equal(second.duplicateBinary, true);
  assert.equal(bucket.objects.size, 1);
});

test("existing source document requires replace and reports the old key", async () => {
  const storage = new R2DocumentStorage(new MemoryBucket());
  const first = await ingestControlledDocument(input(structuredClone(sources[0]), storage, { approveLocalStorage: true }));
  await assert.rejects(
    ingestControlledDocument(input(first.source, storage)),
    (error) => error instanceof IngestionRefusedError && error.code === "document-exists",
  );
  const replacement = await ingestControlledDocument(input(first.source, storage, { replace: true }));
  assert.equal(replacement.replacedStorageKey, first.manifestEntry.document.storageKey);
});

test("invalid input is refused before any R2 write", async () => {
  const bucket = new MemoryBucket();
  const storage = new R2DocumentStorage(bucket);
  await assert.rejects(
    ingestControlledDocument(input(structuredClone(sources[0]), storage, {
      approveLocalStorage: true,
      document: { bytes: encoder.encode("not a pdf"), filename: "fake.pdf", declaredMimeType: "application/pdf" },
    })),
    DocumentValidationError,
  );
  assert.equal(bucket.objects.size, 0);
});

test("manifest rejects missing sources and validates deterministic document links", async () => {
  const storage = new R2DocumentStorage(new MemoryBucket());
  const result = await ingestControlledDocument(input(structuredClone(sources[0]), storage, { approveLocalStorage: true }));
  const validManifest = { [sources[0].id]: result.manifestEntry };
  assert.deepEqual(validateDocumentManifest(validManifest, sources), []);
  const merged = applyDocumentManifest(sources, validManifest);
  assert.equal(merged[0].document.storageKey, result.manifestEntry.document.storageKey);

  const missingSourceManifest = { "missing-source": result.manifestEntry };
  assert.ok(validateDocumentManifest(missingSourceManifest, sources).some((issue) => issue.code === "unknown-source"));
  const invalidKeyManifest = structuredClone(validManifest);
  invalidKeyManifest[sources[0].id].document.storageKey = `documents/originals/wrong/${"a".repeat(64)}.pdf`;
  assert.ok(validateDocumentManifest(invalidKeyManifest, sources).some((issue) => issue.code === "non-deterministic-key"));
});
