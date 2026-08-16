# Статус этапов

```text
3D.1 International Literature Discovery              DONE
     ├ OpenAlex
     └ Crossref
3D.2 Russian Literature Discovery                   DONE
     ├ КиберЛенинка OAI-PMH
     ├ КФУ OAI-PMH
     ├ РГБ / НЭБ — MANUAL_ONLY
     ├ ЭНБ Губкина / ТИУ / Горный — REQUIRES_PERMISSION
     └ ТПУ — DEFER
3D.3 Domain, Engineering & Practical Discovery       DONE
3D.4 Candidate Verification, Deduplication & Ranking DONE
3D.5 Open Access / Document Acquisition              NEXT
```

## 3D.4 — Candidate Verification, Deduplication & Ranking

Статус: завершён 16 августа 2026 года.

Выполнено:

- поверх общего Discovery Staging реализован deterministic verification pipeline без второго candidate catalogue;
- добавлены explainable scores `relevance`, `authority`, `metadataCompleteness`, `versionRelevance`, `corpusValue`, `accessUtility` и versioned overall policy `candidate-ranking-v1`;
- primary/secondary topic matching работает для RU/EN, подавляет общие слова и не штрафует русские источники за отсутствие DOI;
- type-aware metadata/version rules различают books, articles, manuals, tutorials, standards, datasets и example models; legacy не означает rejection;
- exact duplicates проверяются внутри staging и против Source Registry; fuzzy detection использует blocking keys и всегда ведёт в `REVIEW_REQUIRED`, fuzzy auto merge отключён;
- metadata conflicts, structured rejection reasons и controlled review queue поддерживают `VERIFY/REJECT/MARK_DUPLICATE/KEEP_SEPARATE`;
- explicit idempotent promotion разрешён только для `VERIFIED` candidate, сохраняет provenance/version/relationships и не запускает document acquisition/R2;
- full smoke: 358 candidates, 10 verified, 230 review, 118 rejected, 30 possible duplicates, 15 conflicts, 0 pipeline errors;
- вручную проверены 30 records (10 international, 10 Russian, 10 engineering): 0 incorrect auto verifications и 0 incorrect rejections;
- production build, 75 unit/regression tests, 12 E2E tests, lint и TypeScript пройдены.

Следующий этап: **3D.5 — Open Access / Document Acquisition**. Этап не начат.

## 3D.3 — Engineering & Practical Discovery

Статус: завершён 16 августа 2026 года.

Выполнено:

- GeoКнига исследована по robots, sitemap, catalog/card metadata и copyright statement; policy `REQUIRES_PERMISSION`, remote adapter не создан, файлы не скачивались;
- создан Engineering Vendor Registry для Rock Flow Dynamics/tNavigator, SLB, CMG, KAPPA, Petroleum Experts и Halliburton Landmark с актуальными official domains/products;
- добавлены Academic/University whitelist и provider matrix для SPE/OnePetro, SEG, AAPG, EAGE, OPM/SINTEF;
- введены отдельные material types для manuals, tutorials, training, presentations, webinars, workflows, case studies, reports, recommended practices, datasets, example models, benchmarks и release notes;
- access `OPEN/AUTH_REQUIRED/MEMBER_ONLY/PAID/UNKNOWN` отделён от licence/rights; software/document versions, official provenance и relationships сохраняются при normalization/exact merge;
- реализованы five-layer Engineering Query Planner и безопасный local curated registry adapter без remote crawling/downloads;
- university queries ограничены точным domain whitelist; unrestricted `.edu` crawler отсутствует;
- controlled smoke по 65 темам дал 24 unique engineering candidates во всех обязательных material buckets; public Source Registry не изменился;
- unit/regression, typecheck, lint и production build пройдены.

Следующий этап: **3D.4 — Candidate Verification, Deduplication & Ranking**.

## 3D.2 — Russian Literature Discovery

Статус: завершён 16 августа 2026 года.

Выполнено:

- исследованы РГБ, НЭБ, КиберЛенинка, ЭНБ Губкина, ТИУ, ТПУ и Горный университет; capability matrix фиксирует только подтверждённые интерфейсы и ограничения;
- реализованы два публичных российских OAI-PMH provider: КиберЛенинка и профильная коллекция Института геологии и нефтегазовых технологий КФУ;
- общий provider interface, `TopicCorpusProfile`, normalization, exact DOI/ISBN/provider-ID merge и staging 3D.1 переиспользованы без отдельного русского каталога;
- добавлены нефтегазовый RU query context, Cyrillic/title/author normalization, conservative Russian type mapping, access hints, supplemental УДК/ББК metadata и безопасный XML parsing;
- fuzzy merge, ranking, verification, PDF acquisition, R2 ingestion, OCR и AI не добавлялись;
- controlled PVT/Modeling/Well Testing smoke дал 10 unique Russian-only candidates, включая книги и статью по ГДИС; public Source Registry не изменился;
- unit/regression, build и E2E пройдены; provider reconnaissance и smoke metrics документированы.

Завершённый следующий этап: **3D.3 — Engineering & Practical Discovery**.

## 3D.1 — Literature Discovery Core

Статус: завершён 2026-08-16.

Выполнено:

- добавлены официальные OpenAlex и Crossref adapters с timeout, polite rate limiting, retry/backoff и partial failure isolation;
- 65 `TopicCorpusProfile` подключены к детерминированному RU/EN query planner без дублирующей taxonomy;
- реализованы отдельные DiscoveryCandidate/DiscoveryRun models, provider normalization, query provenance и conservative type mapping;
- exact merge работает только по DOI, provider IDs и ISBN; fuzzy merge, ranking и verification отсутствуют;
- staging сохраняется атомарно, повторные runs idempotent, реальные generated candidates не коммитятся и не попадают в публичный каталог;
- добавлены plan/run/report CLI, mocked provider fixtures, unit/regression tests и controlled PVT/Modeling network smoke.

Завершённый следующий этап: **3D.2 — Russian Literature Discovery**.

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
