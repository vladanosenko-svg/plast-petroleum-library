import type { SourceDocumentFormat } from "../source-registry.ts";

export const MAX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024;

type SupportedDocumentFormat = "pdf" | "docx" | "epub" | "html" | "txt";

const formatMimeTypes: Record<SupportedDocumentFormat, readonly string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  epub: ["application/epub+zip"],
  html: ["text/html", "application/xhtml+xml"],
  txt: ["text/plain"],
};

const extensionFormats: Record<string, SupportedDocumentFormat> = {
  pdf: "pdf",
  docx: "docx",
  epub: "epub",
  html: "html",
  htm: "html",
  txt: "txt",
};

export interface DocumentInspectionInput {
  bytes: ArrayBuffer | ArrayBufferView;
  filename: string;
  declaredMimeType: string;
  maximumSizeBytes?: number;
}

export interface InspectedDocument {
  format: SupportedDocumentFormat;
  mimeType: string;
  originalFilename: string;
  fileSizeBytes: number;
  checksumSha256: string;
  extension: string;
}

export class DocumentValidationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "DocumentValidationError";
    this.code = code;
  }
}

function asBytes(value: ArrayBuffer | ArrayBufferView) {
  return value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function getExtension(filename: string) {
  const normalized = filename.normalize("NFKC").trim();
  const separator = normalized.lastIndexOf(".");
  return separator > -1 ? normalized.slice(separator + 1).toLocaleLowerCase("en-US") : "";
}

function hasUnsafeFilename(filename: string) {
  const hasControlCharacter = [...filename].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  return (
    !filename.trim() ||
    filename.length > 255 ||
    hasControlCharacter ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename === "." ||
    filename === ".."
  );
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, marker: string) {
  const needle = new TextEncoder().encode(marker);
  outer: for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (bytes[index + offset] !== needle[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function isZip(bytes: Uint8Array) {
  return (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  );
}

function validateSignature(format: SupportedDocumentFormat, bytes: Uint8Array) {
  if (format === "pdf" && !startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    throw new DocumentValidationError("Сигнатура файла не соответствует PDF", "signature-mismatch");
  }
  if (format === "docx") {
    if (!isZip(bytes) || !containsAscii(bytes, "[Content_Types].xml") || !containsAscii(bytes, "word/document.xml")) {
      throw new DocumentValidationError("Файл не содержит минимальную структуру DOCX", "signature-mismatch");
    }
  }
  if (format === "epub") {
    if (
      !isZip(bytes) ||
      !containsAscii(bytes, "mimetype") ||
      !containsAscii(bytes, "application/epub+zip") ||
      !containsAscii(bytes, "META-INF/container.xml")
    ) {
      throw new DocumentValidationError("Файл не содержит обязательные маркеры EPUB", "signature-mismatch");
    }
  }
  if ((format === "html" || format === "txt") && bytes.includes(0)) {
    throw new DocumentValidationError("Текстовый документ содержит бинарные данные", "binary-text");
  }
  if (format === "html") {
    const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
    if (!/(?:<!doctype\s+html|<html|<head|<body)[\s>]/i.test(sample)) {
      throw new DocumentValidationError("Содержимое не похоже на HTML-документ", "signature-mismatch");
    }
  }
}

export function detectDocumentFormat(filename: string): SourceDocumentFormat | undefined {
  return extensionFormats[getExtension(filename)];
}

export async function computeSha256(bytes: ArrayBuffer | ArrayBufferView) {
  const input = new Uint8Array(asBytes(bytes));
  const digest = await crypto.subtle.digest("SHA-256", input.buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function generateStorageKey(sourceId: string, checksumSha256: string, extension: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/i.test(sourceId)) {
    throw new DocumentValidationError("Некорректный sourceId", "invalid-source-id");
  }
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
    throw new DocumentValidationError("Некорректная SHA-256 сумма", "invalid-checksum");
  }
  const format = extensionFormats[extension.toLocaleLowerCase("en-US")];
  if (!format) throw new DocumentValidationError("Неподдерживаемое расширение", "unsupported-extension");
  return `documents/originals/${sourceId}/${checksumSha256}.${extension.toLocaleLowerCase("en-US")}`;
}

export async function inspectDocument(input: DocumentInspectionInput): Promise<InspectedDocument> {
  const bytes = asBytes(input.bytes);
  const maximumSizeBytes = input.maximumSizeBytes ?? MAX_DOCUMENT_SIZE_BYTES;
  if (hasUnsafeFilename(input.filename)) {
    throw new DocumentValidationError("Имя файла небезопасно", "unsafe-filename");
  }
  if (bytes.byteLength === 0) throw new DocumentValidationError("Пустой файл не поддерживается", "empty-file");
  if (bytes.byteLength > maximumSizeBytes) {
    throw new DocumentValidationError(`Файл превышает лимит ${maximumSizeBytes} байт`, "file-too-large");
  }

  const extension = getExtension(input.filename);
  const format = extensionFormats[extension];
  if (!format) throw new DocumentValidationError("Формат документа не поддерживается", "unsupported-format");
  const mimeType = input.declaredMimeType.split(";", 1)[0].trim().toLocaleLowerCase("en-US");
  if (!formatMimeTypes[format].includes(mimeType)) {
    throw new DocumentValidationError("MIME-тип не соответствует расширению", "mime-mismatch");
  }

  validateSignature(format, bytes);
  return {
    format,
    mimeType,
    originalFilename: input.filename.normalize("NFKC"),
    fileSizeBytes: bytes.byteLength,
    checksumSha256: await computeSha256(bytes),
    extension,
  };
}
