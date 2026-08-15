import { readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { inspectDocument } from "../app/storage/document-validation.ts";

const mimeTypes = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".epub": "application/epub+zip",
  ".html": "text/html",
  ".htm": "text/html",
  ".txt": "text/plain",
};

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Использование: npm run document:inspect -- <путь-к-файлу>");
  process.exitCode = 1;
} else {
  const absolutePath = resolve(inputPath);
  const filename = basename(absolutePath);
  const declaredMimeType = mimeTypes[extname(filename).toLocaleLowerCase("en-US")] ?? "application/octet-stream";
  try {
    const bytes = await readFile(absolutePath);
    const metadata = await inspectDocument({ bytes, filename, declaredMimeType });
    console.log(JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
