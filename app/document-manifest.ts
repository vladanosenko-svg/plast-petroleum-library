import {
  sourceDocumentFormats,
  sourceProcessingStatuses,
  type Source,
  type SourceDocument,
  type SourceDocumentFormat,
} from "./source-registry.ts";
import { detectDocumentFormat, generateStorageKey } from "./storage/document-validation.ts";

export interface DocumentManifestEntry {
  approvedLocalStorage: true;
  document: SourceDocument & {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    checksumSha256: string;
  };
}

export type DocumentManifest = Record<string, DocumentManifestEntry>;

export interface DocumentManifestIssue {
  sourceId: string;
  path: string;
  code: string;
  message: string;
}

const formatMimeTypes: Partial<Record<SourceDocumentFormat, readonly string[]>> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  epub: ["application/epub+zip"],
  html: ["text/html", "application/xhtml+xml"],
  txt: ["text/plain"],
};

function storageKeyExtension(storageKey: string) {
  const match = /\.([a-z0-9]+)$/i.exec(storageKey);
  return match?.[1]?.toLocaleLowerCase("en-US");
}

export function validateDocumentManifest(
  manifest: Readonly<Record<string, unknown>>,
  sourceList: readonly Source[],
) {
  const issues: DocumentManifestIssue[] = [];
  const sourcesById = new Map(sourceList.map((source) => [source.id, source]));
  const add = (sourceId: string, path: string, code: string, message: string) => {
    issues.push({ sourceId, path, code, message });
  };

  for (const [sourceId, value] of Object.entries(manifest)) {
    const source = sourcesById.get(sourceId);
    if (!source) add(sourceId, "sourceId", "unknown-source", "Source отсутствует в registry");
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      add(sourceId, "entry", "invalid-entry", "Manifest entry должен быть объектом");
      continue;
    }
    const entry = value as Partial<DocumentManifestEntry>;
    if (entry.approvedLocalStorage !== true) {
      add(sourceId, "approvedLocalStorage", "approval-required", "Нужно явное разрешение локального хранения");
    }
    const document = entry.document;
    if (!document || typeof document !== "object") {
      add(sourceId, "document", "required", "SourceDocument обязателен");
      continue;
    }
    if (!sourceDocumentFormats.includes(document.format as SourceDocumentFormat) || document.format === "other") {
      add(sourceId, "document.format", "invalid-format", "Формат документа не поддерживается reader v1");
    }
    if (!document.storageKey?.trim()) add(sourceId, "document.storageKey", "required", "storageKey обязателен");
    if (!document.originalFilename?.trim()) add(sourceId, "document.originalFilename", "required", "originalFilename обязателен");
    if (!document.mimeType?.trim()) add(sourceId, "document.mimeType", "required", "MIME обязателен");
    if (!Number.isSafeInteger(document.fileSizeBytes) || (document.fileSizeBytes ?? 0) <= 0) {
      add(sourceId, "document.fileSizeBytes", "invalid-size", "Размер должен быть положительным целым числом");
    }
    if (!/^[a-f0-9]{64}$/.test(document.checksumSha256 ?? "")) {
      add(sourceId, "document.checksumSha256", "invalid-checksum", "Нужна lowercase SHA-256 сумма");
    }
    if (document.processingStatus && !sourceProcessingStatuses.includes(document.processingStatus)) {
      add(sourceId, "document.processingStatus", "invalid-status", "Неизвестный processingStatus");
    }

    const allowedMimeTypes = formatMimeTypes[document.format as SourceDocumentFormat];
    if (document.mimeType && allowedMimeTypes && !allowedMimeTypes.includes(document.mimeType)) {
      add(sourceId, "document.mimeType", "mime-mismatch", "MIME не соответствует формату");
    }
    const extension = document.storageKey ? storageKeyExtension(document.storageKey) : undefined;
    if (extension && detectDocumentFormat(`document.${extension}`) !== document.format) {
      add(sourceId, "document.storageKey", "format-mismatch", "Расширение storageKey не соответствует формату");
    }
    if (extension && document.checksumSha256 && document.storageKey) {
      try {
        const expected = generateStorageKey(sourceId, document.checksumSha256, extension);
        if (document.storageKey !== expected) {
          add(sourceId, "document.storageKey", "non-deterministic-key", "storageKey не соответствует sourceId и SHA-256");
        }
      } catch {
        add(sourceId, "document.storageKey", "invalid-key", "storageKey некорректен");
      }
    }
  }
  return issues;
}

export function applyDocumentManifest(sourceList: readonly Source[], manifest: Readonly<Record<string, unknown>>) {
  const issues = validateDocumentManifest(manifest, sourceList);
  if (issues.length > 0) {
    throw new Error(`Document manifest validation failed:\n${issues.map((issue) => `${issue.sourceId}.${issue.path}: ${issue.message}`).join("\n")}`);
  }
  const typedManifest = manifest as DocumentManifest;
  return sourceList.map((source) => {
    const entry = typedManifest[source.id];
    if (!entry) return source;
    return {
      ...source,
      access: { ...source.access, status: "local-fulltext" as const },
      document: { ...entry.document },
    };
  });
}
