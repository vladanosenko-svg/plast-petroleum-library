import type { Source, SourceDocument } from "../source-registry.ts";
import {
  generateStorageKey,
  inspectDocument,
  type DocumentInspectionInput,
  type InspectedDocument,
} from "./document-validation.ts";

export interface StoredDocumentMetadata extends InspectedDocument {
  storageKey: string;
  etag?: string;
  storedAt?: string;
}

export interface StoredDocumentObject extends StoredDocumentMetadata {
  body: ReadableStream<Uint8Array>;
  range?: { offset: number; length: number };
}

export interface PutDocumentInput {
  metadata: StoredDocumentMetadata;
  body: ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>;
}

export interface DocumentStorage {
  put(input: PutDocumentInput): Promise<StoredDocumentMetadata>;
  get(storageKey: string, range?: { offset: number; length: number }): Promise<StoredDocumentObject | null>;
  head(storageKey: string): Promise<StoredDocumentMetadata | null>;
  delete(storageKey: string): Promise<void>;
}

interface R2ObjectLike {
  key: string;
  size: number;
  etag: string;
  uploaded?: Date;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream<Uint8Array>;
  range?: { offset?: number; length?: number };
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<R2ObjectLike | null>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}

function metadataFromR2(object: R2ObjectLike): StoredDocumentMetadata | null {
  const metadata = object.customMetadata;
  if (!metadata) return null;
  const fileSizeBytes = Number(metadata.fileSizeBytes ?? object.size);
  if (
    !metadata.format ||
    !metadata.mimeType ||
    !metadata.originalFilename ||
    !metadata.checksumSha256 ||
    !metadata.extension ||
    !Number.isSafeInteger(fileSizeBytes)
  ) {
    return null;
  }
  return {
    storageKey: object.key,
    format: metadata.format as InspectedDocument["format"],
    mimeType: metadata.mimeType,
    originalFilename: metadata.originalFilename,
    fileSizeBytes,
    checksumSha256: metadata.checksumSha256,
    extension: metadata.extension,
    etag: object.etag,
    storedAt: metadata.storedAt ?? object.uploaded?.toISOString(),
  };
}

export class R2DocumentStorage implements DocumentStorage {
  private readonly bucket: R2BucketLike;

  constructor(bucket: R2BucketLike) {
    this.bucket = bucket;
  }

  async put(input: PutDocumentInput) {
    const storedAt = input.metadata.storedAt ?? new Date().toISOString();
    const object = await this.bucket.put(input.metadata.storageKey, input.body, {
      httpMetadata: { contentType: input.metadata.mimeType },
      customMetadata: {
        format: input.metadata.format,
        mimeType: input.metadata.mimeType,
        originalFilename: input.metadata.originalFilename,
        fileSizeBytes: String(input.metadata.fileSizeBytes),
        checksumSha256: input.metadata.checksumSha256,
        extension: input.metadata.extension,
        storedAt,
      },
    });
    return { ...input.metadata, storedAt, etag: object?.etag ?? input.metadata.etag };
  }

  async get(storageKey: string, range?: { offset: number; length: number }) {
    const object = await this.bucket.get(storageKey, range ? { range } : undefined);
    if (!object) return null;
    const metadata = metadataFromR2(object);
    if (!metadata) return null;
    return { ...metadata, body: object.body, range: range ?? undefined };
  }

  async head(storageKey: string) {
    const object = await this.bucket.head(storageKey);
    return object ? metadataFromR2(object) : null;
  }

  async delete(storageKey: string) {
    await this.bucket.delete(storageKey);
  }
}

export interface StoreDocumentResult {
  document: StoredDocumentMetadata;
  duplicateBinary: boolean;
}

export async function storeInspectedDocument(
  storage: DocumentStorage,
  sourceId: string,
  input: DocumentInspectionInput,
): Promise<StoreDocumentResult> {
  const inspected = await inspectDocument(input);
  const storageKey = generateStorageKey(sourceId, inspected.checksumSha256, inspected.extension);
  const existing = await storage.head(storageKey);
  if (existing) {
    if (
      existing.checksumSha256 !== inspected.checksumSha256
      || existing.fileSizeBytes !== inspected.fileSizeBytes
      || existing.mimeType !== inspected.mimeType
      || existing.format !== inspected.format
    ) {
      throw new Error("Existing R2 object metadata does not match the inspected document");
    }
    return { document: existing, duplicateBinary: true };
  }
  const document = await storage.put({ metadata: { ...inspected, storageKey }, body: input.bytes });
  return { document, duplicateBinary: false };
}

function assertCompleteStoredDocument(document: StoredDocumentMetadata) {
  if (
    !document.storageKey.trim() ||
    !/^[a-f0-9]{64}$/.test(document.checksumSha256) ||
    !Number.isSafeInteger(document.fileSizeBytes) ||
    document.fileSizeBytes <= 0 ||
    !["pdf", "docx", "epub", "html", "txt"].includes(document.format)
  ) {
    throw new Error("Stored document metadata is incomplete");
  }
}

export function attachStoredDocument(source: Source, storedDocument: StoredDocumentMetadata): Source {
  if (source.access.status !== "local-fulltext") {
    throw new Error("Local storage requires an explicit local-fulltext access decision");
  }
  assertCompleteStoredDocument(storedDocument);
  const document: SourceDocument = {
    format: storedDocument.format,
    storageKey: storedDocument.storageKey,
    originalFilename: storedDocument.originalFilename,
    mimeType: storedDocument.mimeType,
    fileSizeBytes: storedDocument.fileSizeBytes,
    checksumSha256: storedDocument.checksumSha256,
    processingStatus: "not-started",
  };
  return { ...source, document };
}
