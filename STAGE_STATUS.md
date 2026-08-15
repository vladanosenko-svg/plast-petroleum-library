# Статус этапов

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

Следующий этап: наполнение registry проверенными `candidate`/`verified` записями или подключение document storage — только отдельной задачей.
