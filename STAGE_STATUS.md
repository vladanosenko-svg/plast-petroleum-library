# Статус этапов

## 3C.2 — Document Reader & Controlled Ingestion

Статус: завершён 2026-08-16.

Выполнено:

- добавлены controlled ingestion CLI, явный rights guard, atomic JSON manifest и safe replace/duplicate behavior;
- реализован `/library/[slug]/read` и корректные CTA для local, external и metadata-only источников;
- добавлены browser-native PDF reader с Range/`?page=N`, безопасные DOCX, EPUB, HTML и TXT readers;
- R2 и reader failures изолированы на уровне request, добавлены security headers и structured document logs;
- проверены unit/regression, Cloudflare-like runtime, R2 lifecycle, mobile/desktop E2E и production live.

Следующий этап: **3D — Literature Discovery Engine**.

## 3C.1 — Document Storage Foundation

Статус: завершён 2026-08-16.

Выполнено:

- добавлены Cloudflare R2 binding `DOCUMENTS` и изолированный storage adapter;
- реализованы PUT/GET/HEAD/DELETE primitives, validation пяти форматов, SHA-256, deterministic keys и duplicate binary detection;
- усилена целостность `local-fulltext`, добавлено чистое прикрепление metadata без изменения Source status или RAG-прав;
- подготовлена безопасная выдача через PLAST с HTTP Range и корректными заголовками;
- добавлены локальный inspector, storage/document tests, документация и live smoke.

Следующий этап: **3C.2 — Document Reader**.

## 3B — Corpus Planning

Статус: завершён 2026-08-16.

Выполнено:

- зафиксирована глобальная цель 1 000–1 500 уникальных источников с ориентиром 1 200;
- созданы и валидируются 65/65 `TopicCorpusProfile` с RU/EN discovery vocabulary, aliases, связями, SourceType, приоритетами и неодинаковыми coverage targets;
- добавлен детерминированный coverage engine со score 0–100, composition-aware status и gaps;
- demo-записи исключены из production coverage по умолчанию, предусмотрены verified/candidate режимы;
- добавлены discovery priority и стабильная очередь следующего поиска;
- добавлены CLI-отчёт, документация и unit tests;
- внешние каталоги, API, файлы, storage, OCR и ingestion не подключались.

Следующий этап: **3C — Document Storage**, только отдельной задачей.

## 3A — Source Registry

Статус: завершён 2026-08-16.

Выполнено:

- введена доменная модель `Source` со структурированными авторами;
- добавлены taxonomy типов, языков, provider, доступа, RAG-разрешений, документов, quality tier и record status;
- семь demo-материалов мигрированы с прежними `id`, `slug`, темами и URL;
- добавлены normalization, validation, identity и topic coverage utilities;
- обновлены поиск, групповые фильтры, карточки и `/library/[slug]`;
- добавлены data/unit/regression/E2E-тесты;
- проверены светлая и тёмная темы, обязательные viewport и отсутствие horizontal overflow/console errors.

Проверки:

- `npm ci` — успешно (npm сообщил о 4 moderate dependency vulnerabilities);
- `npm run lint` — успешно;
- `npm test` — 10/10;
- `npm run build` — успешно;
- `npm run test:e2e` — 11/11.

Ограничения этапа:

- реальные источники, файлы и bibliographic identifiers не добавлялись;
- ingestion, object storage, reader, OCR, chunks, embeddings, vector search и AI/RAG не реализовывались;
- deployment в этот этап не входит.

Этап 3A остаётся завершённым; его Source Registry используется Corpus Planning.
