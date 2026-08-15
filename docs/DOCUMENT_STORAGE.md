# Хранение документов

## Архитектура

Документ проходит цепочку `Source → SourceDocument → DocumentStorage → Cloudflare R2`. Бинарные файлы не хранятся в Git, TypeScript-данных или базе. Метаданные пока остаются в существующем Source Registry и готовы к будущему переносу в БД.

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

`SourceDocument` хранит `format`, `storageKey`, `originalFilename`, `mimeType`, `fileSizeBytes`, lowercase `checksumSha256` и `processingStatus`. `pageCount` не вычисляется. SHA-256 считается через Web Crypto. Одинаковые `sourceId + SHA-256 + extension` дают одинаковый ключ; существующий объект определяется через `HEAD` как duplicate binary. Source records автоматически не объединяются.

## Доступ и права

- `metadata-only` не имеет локального binary;
- `external-fulltext` не требует локального binary;
- `local-fulltext` требует полный комплект document metadata.

Прикрепление файла разрешено только после явного решения `local-fulltext`; оно не меняет `recordStatus` и не выводит права из `ragPermission`. Техническая возможность хранения не означает наличие авторского права. Автоматического скачивания по URL, реальных книг, публичного upload или публичного DELETE API нет.

## Выдача

Worker обслуживает `GET` и `HEAD /library/{slug}/document`: сначала находит Source и проверяет `local-fulltext`, затем обращается к R2. Ответ включает безопасный `Content-Disposition`, `Content-Type`, `Content-Length`, `Cache-Control`, checksum-based `ETag`, `X-Content-Type-Options` и поддержку одиночных HTTP Range requests. PDF выдаётся inline; HTML — attachment с sandbox policy.

## Локальная проверка

```bash
npm run document:inspect -- path/to/file.pdf
```

Команда только проверяет локальный файл и выводит metadata; в production ничего не загружает.

## Следующие этапы

3C.2 добавит reader. Извлечение текста, OCR, страницы, chunks, embeddings и AI/RAG в 3C.1 отсутствуют.
