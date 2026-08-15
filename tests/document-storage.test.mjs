import assert from "node:assert/strict";
import test from "node:test";
import {
  computeSha256,
  DocumentValidationError,
  generateStorageKey,
  inspectDocument,
} from "../app/storage/document-validation.ts";
import {
  attachStoredDocument,
  R2DocumentStorage,
  storeInspectedDocument,
} from "../app/storage/document-storage.ts";
import { serveSourceDocument } from "../app/storage/document-serving.ts";
import { sources } from "../app/data.ts";

const encoder = new TextEncoder();
const pdfBytes = encoder.encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");

function zipCandidate(...markers) {
  const payload = encoder.encode(markers.join("\n"));
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...payload]);
}

function inspect(bytes, filename, declaredMimeType, maximumSizeBytes) {
  return inspectDocument({ bytes, filename, declaredMimeType, maximumSizeBytes });
}

test("detects and validates the five supported document formats", async () => {
  assert.equal((await inspect(pdfBytes, "fixture.pdf", "application/pdf")).format, "pdf");
  assert.equal(
    (await inspect(
      zipCandidate("[Content_Types].xml", "word/document.xml"),
      "fixture.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )).format,
    "docx",
  );
  assert.equal(
    (await inspect(
      zipCandidate("mimetype", "application/epub+zip", "META-INF/container.xml"),
      "fixture.epub",
      "application/epub+zip",
    )).format,
    "epub",
  );
  assert.equal((await inspect(encoder.encode("<!doctype html><html></html>"), "fixture.html", "text/html")).format, "html");
  assert.equal((await inspect(encoder.encode("synthetic text"), "fixture.txt", "text/plain")).format, "txt");
});

test("rejects empty, oversized, unsupported, mismatched and unsafe inputs", async () => {
  const rejected = [
    inspect(new Uint8Array(), "empty.pdf", "application/pdf"),
    inspect(pdfBytes, "large.pdf", "application/pdf", 4),
    inspect(pdfBytes, "program.exe", "application/x-msdownload"),
    inspect(encoder.encode("not a pdf"), "fake.pdf", "application/pdf"),
    inspect(pdfBytes, "fixture.pdf", "application/x-msdownload"),
    inspect(pdfBytes, "../fixture.pdf", "application/pdf"),
  ];
  for (const promise of rejected) await assert.rejects(promise, DocumentValidationError);
});

test("computes stable SHA-256 and deterministic storage keys", async () => {
  const first = await computeSha256(pdfBytes);
  const second = await computeSha256(pdfBytes);
  const different = await computeSha256(encoder.encode("different"));
  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(generateStorageKey("source-1", first, "pdf"), generateStorageKey("source-1", first, "pdf"));
  assert.equal(generateStorageKey("source-1", first, "pdf"), `documents/originals/source-1/${first}.pdf`);
});

class MemoryBucket {
  objects = new Map();

  async put(key, value, options) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value.buffer ?? value);
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

  async head(key) {
    return this.objects.get(key) ?? null;
  }

  async get(key, options) {
    const object = this.objects.get(key);
    if (!object) return null;
    const range = options?.range;
    const bytes = range ? object.bytes.slice(range.offset, range.offset + range.length) : object.bytes;
    return { ...object, body: new Blob([bytes]).stream(), range };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

test("R2 adapter supports PUT, HEAD, GET and DELETE without a real bucket", async () => {
  const bucket = new MemoryBucket();
  const storage = new R2DocumentStorage(bucket);
  const result = await storeInspectedDocument(storage, "source-1", {
    bytes: pdfBytes,
    filename: "fixture.pdf",
    declaredMimeType: "application/pdf",
  });
  assert.equal(result.duplicateBinary, false);
  assert.equal((await storage.head(result.document.storageKey))?.checksumSha256, result.document.checksumSha256);
  assert.equal(await new Response((await storage.get(result.document.storageKey))?.body).text(), new TextDecoder().decode(pdfBytes));
  const duplicate = await storeInspectedDocument(storage, "source-1", {
    bytes: pdfBytes,
    filename: "fixture.pdf",
    declaredMimeType: "application/pdf",
  });
  assert.equal(duplicate.duplicateBinary, true);
  await storage.delete(result.document.storageKey);
  assert.equal(await storage.head(result.document.storageKey), null);
});

test("attaches complete metadata only after an explicit local-fulltext decision", async () => {
  const metadataOnly = structuredClone(sources[0]);
  const storedDocument = {
    format: "pdf",
    storageKey: `documents/originals/source-1/${"a".repeat(64)}.pdf`,
    originalFilename: "fixture.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 42,
    checksumSha256: "a".repeat(64),
    extension: "pdf",
  };
  assert.throws(() => attachStoredDocument(metadataOnly, storedDocument), /local-fulltext/);
  const approved = { ...metadataOnly, access: { ...metadataOnly.access, status: "local-fulltext" } };
  const attached = attachStoredDocument(approved, storedDocument);
  assert.equal(attached.document.checksumSha256, "a".repeat(64));
  assert.equal(attached.recordStatus, approved.recordStatus);
  assert.equal(attached.access.ragPermission, approved.access.ragPermission);
  assert.equal(metadataOnly.document, undefined);
});

test("serves stored PDF through access checks with range and safe headers", async () => {
  const bucket = new MemoryBucket();
  const storage = new R2DocumentStorage(bucket);
  const stored = await storeInspectedDocument(storage, "source-1", {
    bytes: pdfBytes,
    filename: "тестовый.pdf",
    declaredMimeType: "application/pdf",
  });
  const source = attachStoredDocument(
    { ...structuredClone(sources[0]), access: { ...sources[0].access, status: "local-fulltext" } },
    stored.document,
  );
  const response = await serveSourceDocument(
    new Request("https://plast.example/library/test/document", { headers: { Range: "bytes=0-4" } }),
    source,
    storage,
  );
  assert.equal(response.status, 206);
  assert.equal(await response.text(), "%PDF-");
  assert.equal(response.headers.get("Content-Range"), `bytes 0-4/${pdfBytes.byteLength}`);
  assert.match(response.headers.get("Content-Disposition"), /^inline;/);
  assert.equal(response.headers.get("ETag"), `"${stored.document.checksumSha256}"`);
});
