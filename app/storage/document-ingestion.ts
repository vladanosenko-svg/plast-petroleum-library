import type { Source } from "../source-registry.ts";
import type { DocumentManifestEntry } from "../document-manifest.ts";
import type { DocumentInspectionInput } from "./document-validation.ts";
import { attachStoredDocument, storeInspectedDocument, type DocumentStorage } from "./document-storage.ts";

export type IngestionRefusalCode =
  | "source-not-found"
  | "local-storage-approval-required"
  | "document-exists"
  | "verification-failed";

export class IngestionRefusedError extends Error {
  readonly code: IngestionRefusalCode;

  constructor(message: string, code: IngestionRefusalCode) {
    super(message);
    this.name = "IngestionRefusedError";
    this.code = code;
  }
}

export interface ControlledIngestionInput {
  source: Source;
  storage: DocumentStorage;
  document: DocumentInspectionInput;
  approveLocalStorage?: boolean;
  replace?: boolean;
}

export interface ControlledIngestionResult {
  source: Source;
  manifestEntry: DocumentManifestEntry;
  duplicateBinary: boolean;
  replacedStorageKey?: string;
}

export async function ingestControlledDocument(input: ControlledIngestionInput): Promise<ControlledIngestionResult> {
  if (input.source.access.status !== "local-fulltext" && !input.approveLocalStorage) {
    throw new IngestionRefusedError(
      "Source не разрешён для локального хранения; нужен явный --approve-local-storage",
      "local-storage-approval-required",
    );
  }
  if (input.source.document?.storageKey && !input.replace) {
    throw new IngestionRefusedError("Source уже имеет document; для замены нужен --replace", "document-exists");
  }

  const approvedSource: Source = input.source.access.status === "local-fulltext"
    ? input.source
    : { ...input.source, access: { ...input.source.access, status: "local-fulltext" } };
  const stored = await storeInspectedDocument(input.storage, approvedSource.id, input.document);
  const verified = await input.storage.head(stored.document.storageKey);
  if (
    !verified
    || verified.checksumSha256 !== stored.document.checksumSha256
    || verified.fileSizeBytes !== stored.document.fileSizeBytes
    || verified.mimeType !== stored.document.mimeType
  ) {
    throw new IngestionRefusedError("R2 HEAD verification не подтвердил загруженный документ", "verification-failed");
  }

  const source = attachStoredDocument(approvedSource, verified);
  return {
    source,
    manifestEntry: {
      approvedLocalStorage: true,
      document: {
        ...source.document!,
        storageKey: source.document!.storageKey!,
        originalFilename: source.document!.originalFilename!,
        mimeType: source.document!.mimeType!,
        fileSizeBytes: source.document!.fileSizeBytes!,
        checksumSha256: source.document!.checksumSha256!,
      },
    },
    duplicateBinary: stored.duplicateBinary,
    replacedStorageKey: input.source.document?.storageKey,
  };
}
