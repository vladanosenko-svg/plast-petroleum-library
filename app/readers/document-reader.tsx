"use client";

import { useEffect, useState } from "react";
import type { SourceDocumentFormat } from "../source-registry";

type ReaderState =
  | { status: "checking" }
  | { status: "ready"; html?: string; text?: string }
  | { status: "error"; message: string };

export interface DocumentReaderProps {
  documentUrl: string;
  filename: string;
  format: SourceDocumentFormat;
  initialPage: number;
}

const blockedElements = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form", "input", "button", "svg", "math", "video", "audio"]);
const allowedElements = new Set(["article", "section", "div", "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", "u", "s", "blockquote", "pre", "code", "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "a", "sup", "sub", "span"]);
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_ARCHIVE_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 100 * 1024 * 1024;

function safeLink(value: string) {
  const normalized = value.trim();
  return normalized.startsWith("#") || /^(?:https?:|mailto:)/i.test(normalized) ? normalized : undefined;
}

export function sanitizeReaderHtml(markup: string) {
  const parsed = new DOMParser().parseFromString(markup, "text/html");
  for (const element of [...parsed.body.querySelectorAll("*")]) {
    const tag = element.tagName.toLocaleLowerCase("en-US");
    if (blockedElements.has(tag)) {
      element.remove();
      continue;
    }
    if (!allowedElements.has(tag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const href = tag === "a" ? safeLink(element.getAttribute("href") ?? "") : undefined;
    const colspan = ["td", "th"].includes(tag) ? element.getAttribute("colspan") : null;
    const rowspan = ["td", "th"].includes(tag) ? element.getAttribute("rowspan") : null;
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (href) {
      element.setAttribute("href", href);
      if (!href.startsWith("#")) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (colspan && /^\d{1,2}$/.test(colspan)) element.setAttribute("colspan", colspan);
    if (rowspan && /^\d{1,2}$/.test(rowspan)) element.setAttribute("rowspan", rowspan);
  }
  return parsed.body.innerHTML;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= Math.max(0, bytes.byteLength - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("ZIP directory not found");
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("Browser does not support ZIP decompression");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = view.getUint16(eocd + 10, true);
  if (entryCount > MAX_ARCHIVE_ENTRIES) throw new Error("Archive contains too many entries");
  let offset = view.getUint32(eocd + 16, true);
  let totalUncompressedBytes = 0;
  const entries = new Map<string, Uint8Array>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Invalid ZIP directory");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const filenameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const filename = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + filenameLength));
    if (filename.startsWith("/") || filename.includes("\\") || filename.split("/").includes("..")) throw new Error("Unsafe ZIP entry path");
    if (uncompressedSize > MAX_ARCHIVE_ENTRY_BYTES) throw new Error("Archive entry is too large");
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_ARCHIVE_TOTAL_BYTES) throw new Error("Archive expands beyond the reader limit");
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Invalid ZIP entry");
    const localFilenameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localFilenameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    if (!filename.endsWith("/")) {
      if (method === 0) entries.set(filename, compressed);
      else if (method === 8) entries.set(filename, await inflateRaw(compressed));
      else throw new Error("Unsupported ZIP compression");
    }
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return entries;
}

function escapeHtml(value: string) {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => replacements[character]);
}

function xmlText(element: Element) {
  return [...element.getElementsByTagNameNS("*", "t")].map((node) => node.textContent ?? "").join("");
}

function renderDocxTable(table: Element) {
  const rows = [...table.children].filter((element) => element.localName === "tr");
  return `<table><tbody>${rows.map((row) => `<tr>${[...row.children].filter((element) => element.localName === "tc").map((cell) => `<td>${escapeHtml(xmlText(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

async function renderDocx(buffer: ArrayBuffer) {
  const entries = await readZipEntries(buffer);
  const documentBytes = entries.get("word/document.xml");
  if (!documentBytes) throw new Error("DOCX content is missing");
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(documentBytes), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("DOCX XML is invalid");
  const body = [...xml.getElementsByTagNameNS("*", "body")][0];
  if (!body) throw new Error("DOCX body is missing");
  const output: string[] = [];
  let listOpen = false;
  for (const child of [...body.children]) {
    if (child.localName === "tbl") {
      if (listOpen) { output.push("</ul>"); listOpen = false; }
      output.push(renderDocxTable(child));
      continue;
    }
    if (child.localName !== "p") continue;
    const text = escapeHtml(xmlText(child));
    if (!text) continue;
    const isList = child.getElementsByTagNameNS("*", "numPr").length > 0;
    const styleElement = child.getElementsByTagNameNS("*", "pStyle")[0];
    const style = styleElement?.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val") ?? styleElement?.getAttribute("w:val") ?? "";
    if (isList) {
      if (!listOpen) { output.push("<ul>"); listOpen = true; }
      output.push(`<li>${text}</li>`);
    } else {
      if (listOpen) { output.push("</ul>"); listOpen = false; }
      const heading = /^Heading([1-6])$/i.exec(style)?.[1];
      output.push(heading ? `<h${heading}>${text}</h${heading}>` : `<p>${text}</p>`);
    }
  }
  if (listOpen) output.push("</ul>");
  return sanitizeReaderHtml(output.join(""));
}

function normalizeArchivePath(base: string, relative: string) {
  const parts = `${base}/${relative}`.split("/");
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalized.length === 0) throw new Error("Unsafe EPUB path");
      normalized.pop();
    } else normalized.push(part);
  }
  return normalized.join("/");
}

async function renderEpub(buffer: ArrayBuffer) {
  const entries = await readZipEntries(buffer);
  const container = entries.get("META-INF/container.xml");
  if (!container) throw new Error("EPUB container is missing");
  const containerXml = new DOMParser().parseFromString(new TextDecoder().decode(container), "application/xml");
  const packagePath = containerXml.getElementsByTagNameNS("*", "rootfile")[0]?.getAttribute("full-path");
  if (!packagePath) throw new Error("EPUB package is missing");
  const packageBytes = entries.get(packagePath);
  if (!packageBytes) throw new Error("EPUB package file is missing");
  const packageXml = new DOMParser().parseFromString(new TextDecoder().decode(packageBytes), "application/xml");
  const base = packagePath.includes("/") ? packagePath.slice(0, packagePath.lastIndexOf("/")) : "";
  const manifest = new Map([...packageXml.getElementsByTagNameNS("*", "item")].map((item) => [item.getAttribute("id") ?? "", item.getAttribute("href") ?? ""]));
  const sections: string[] = [];
  for (const itemref of [...packageXml.getElementsByTagNameNS("*", "itemref")]) {
    const href = manifest.get(itemref.getAttribute("idref") ?? "");
    if (!href) continue;
    const sectionBytes = entries.get(normalizeArchivePath(base, decodeURIComponent(href.split("#", 1)[0])));
    if (!sectionBytes) continue;
    sections.push(`<section>${sanitizeReaderHtml(new TextDecoder().decode(sectionBytes))}</section>`);
  }
  if (sections.length === 0) throw new Error("EPUB has no readable spine sections");
  return sections.join("");
}

function ReaderError({ documentUrl, message }: { documentUrl: string; message: string }) {
  return <div className="reader-message reader-error" role="alert"><p>{message}</p><a href={documentUrl} target="_blank" rel="noopener noreferrer">Открыть оригинал в новой вкладке</a></div>;
}

function NonPdfReader({ documentUrl, format }: Omit<DocumentReaderProps, "initialPage">) {
  const [state, setState] = useState<ReaderState>({ status: "checking" });
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(documentUrl, { signal: controller.signal, credentials: "same-origin" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (format === "txt") setState({ status: "ready", text: await response.text() });
        else if (format === "html") setState({ status: "ready", html: sanitizeReaderHtml(await response.text()) });
        else if (format === "docx") setState({ status: "ready", html: await renderDocx(await response.arrayBuffer()) });
        else if (format === "epub") setState({ status: "ready", html: await renderEpub(await response.arrayBuffer()) });
        else setState({ status: "error", message: "Формат пока не поддерживается reader." });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error", message: "Файл источника временно недоступен." });
      }
    })();
    return () => controller.abort();
  }, [documentUrl, format]);
  if (state.status === "checking") return <div className="reader-message" role="status">Загрузка документа…</div>;
  if (state.status === "error") return <ReaderError documentUrl={documentUrl} message={state.message} />;
  if (state.text !== undefined) return <pre className="text-document">{state.text}</pre>;
  return <article className="rich-document" dangerouslySetInnerHTML={{ __html: state.html ?? "" }} />;
}

function PdfReader({ documentUrl, filename, initialPage }: DocumentReaderProps) {
  const [state, setState] = useState<ReaderState>({ status: "checking" });
  const viewerUrl = `${documentUrl}#page=${initialPage}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(documentUrl, { method: "HEAD", signal: controller.signal, credentials: "same-origin" })
      .then((response) => setState(response.ok ? { status: "ready" } : { status: "error", message: "Файл источника временно недоступен." }))
      .catch(() => { if (!controller.signal.aborted) setState({ status: "error", message: "Файл источника временно недоступен." }); });
    return () => controller.abort();
  }, [documentUrl]);
  if (state.status === "checking") return <div className="reader-message" role="status">Проверка документа…</div>;
  if (state.status === "error") return <ReaderError documentUrl={documentUrl} message={state.message} />;
  return <div className="pdf-reader"><iframe src={viewerUrl} title={`PDF: ${filename}`} /><p className="reader-fallback">Если PDF не отображается в вашем браузере, <a href={viewerUrl} target="_blank" rel="noopener noreferrer">откройте документ в отдельной вкладке</a>.</p></div>;
}

export function DocumentReader(props: DocumentReaderProps) {
  if (props.format === "pdf") return <PdfReader {...props} />;
  if (["docx", "epub", "html", "txt"].includes(props.format)) return <NonPdfReader documentUrl={props.documentUrl} filename={props.filename} format={props.format} />;
  return <ReaderError documentUrl={props.documentUrl} message="Формат документа пока не поддерживается." />;
}
