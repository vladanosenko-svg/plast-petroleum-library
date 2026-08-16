# Хранение документов

## Архитектура

Документ проходит цепочку `Source → SourceDocument → DocumentStorage → Cloudflare R2`. Бинарные файлы не хранятся в Git, TypeScript-данных или базе. Связь с Source хранится в валидируемом `app/data/source-documents.json` и объединяется с registry при загрузке приложения.

## Provider и binding

Production provider — Cloudflare R2. Логическое binding в `.openai/hosting.json` называется `DOCUMENTS`; локальное и production-окружения создаются и подключаются через Sites. Отсутствие binding не нарушает запуск Worker и обычные страницы: только document route вернёт `503`.

## Ключи объектов

Оригиналы хранятся по детерминированной схеме:

```text
documents/originals/{sourceId}/{sha256}.{extension}
```

Она не использует исходное имя файла и оставляет отдельные пространства `normalized`, `thumbnails`, `previews` и будущие `chunks`.

## Форматы и validation

Поддерживаются PDF, DOCX, EPUB, HTML и TXT. Проверяются расширение, заявленный MIME, размер и базовая сигнатура/структура. PDF должен начинаться с `%PDF-`; DOCX и EPUB должны быть ZIP-контейнерами с обязательными маркерами. HTML/TXT допускают только текстовые MIME и не могут содержать NUL-байты. HTML хранится как original binary и при выдаче не исполняется в интерфейсе.

Максимальный размер первой реализации — **100 MiB** (`MAX_DOCUMENT_SIZE_BYTES`). Инспекция и SHA-256 сейчас требуют буфер целиком; публичного upload route нет, поэтому это ограничение относится к контролируемому ingestion. Потоковый hash для больших файлов — будущая оптимизация.

## Метаданные и целостность

`SourceDocument` хранит `format`, `storageKey`, `originalFilename`, `mimeType`, `fileSizeBytes`, lowercase `checksumSha256` и `processingStatus`. `pageCount` не вычисляется. SHA-256 считается через Web Crypto. Одинаковые `sourceId + SHA-256 + extension` дают одинаковый ключ; существующий object принимается как duplicate binary только после сверки HEAD metadata. Source records автоматически не объединяются.

## Доступ и права

- `metadata-only` не имеет локального binary;
- `external-fulltext` не требует локального binary;
- `local-fulltext` требует полный комплект document metadata.

Прикрепление файла разрешено только после явного решения `local-fulltext`; оно не меняет `recordStatus` и не выводит права из `ragPermission`. Техническая возможность хранения не означает наличие авторского права. Автоматического скачивания по URL и публичной upload-формы нет. PUT/DELETE доступны только controlled CLI через internal endpoint с отдельным secret; без корректной авторизации endpoint отвечает 404.

## Выдача

Worker обслуживает `GET` и `HEAD /library/{slug}/document`: сначала находит Source и проверяет `local-fulltext`, затем обращается к R2. Ответ включает безопасный `Content-Disposition`, `Content-Type`, `Content-Length`, `Cache-Control`, checksum-based `ETag`, `X-Content-Type-Options`, CSP, same-origin resource policy и поддержку одиночных HTTP Range requests. PDF выдаётся inline; HTML — attachment с sandbox policy. R2 exceptions перехватываются на уровне request и не нарушают обычные страницы.

## Локальная проверка

```bash
npm run document:inspect -- path/to/file.pdf
```

Команда только проверяет локальный файл и выводит metadata; в production ничего не загружает.

Для закрытого Sites deployment `npm run smoke:live` принимает временный bypass token через `PLAST_SITES_AUTH_TOKEN`; token не хранится в репозитории.

## Следующие этапы

Reader и controlled ingestion описаны в `docs/DOCUMENT_READER.md`. Извлечение текста, OCR, chunks, embeddings и AI/RAG отсутствуют.
