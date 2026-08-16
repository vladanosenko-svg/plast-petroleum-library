# Literature Discovery Core

## Purpose

3D.1 создаёт отдельный слой библиографических кандидатов. Он не изменяет публичный Source Registry, не подтверждает качество публикации, не назначает authority tier и не скачивает документы.

```text
TopicCorpusProfile
      ↓
Query Planner
      ↓
OpenAlex / Crossref adapters
      ↓
Provider normalization
      ↓
Exact identifier merge
      ↓
data/discovery staging
```

## Official API assumptions

Проверено по актуальной официальной документации 16 августа 2026 года.

### OpenAlex

- Base URL: `https://api.openalex.org`.
- Используется официальный `GET /works?search=...`; deprecated search filters не используются.
- Для нормальной работы нужен бесплатный `OPENALEX_API_KEY`, передаваемый как `api_key`.
- Бесплатный key получает ежедневный usage allowance; search имеет отдельную credit/cost model. Без key OpenAlex оставляет только небольшой demo allowance, поэтому PLAST разрешает без key лишь tiny smoke: не более двух topics, двух RU/EN queries, 10 результатов и одной страницы.
- `per_page` ограничен 100; pagination скрыта внутри adapter и использует `cursor=*`/`next_cursor` с `maxPages` и защитой от повторного cursor.
- Сохраняются только metadata. Поля content/PDF никогда не запрашиваются и не скачиваются.

Официальные источники: [OpenAlex API overview](https://developers.openalex.org/api-reference/introduction), [List works](https://developers.openalex.org/api-reference/works/list-works), [Authentication & pricing](https://developers.openalex.org/api-reference/authentication), [Work types](https://developers.openalex.org/api-reference/work-types).

### Crossref

- Base URL: `https://api.crossref.org`; используется официальный `GET /works?query.bibliographic=...`.
- Публичный доступ не требует регистрации. `DISCOVERY_CONTACT_EMAIL` включает рекомендуемый polite pool через `mailto` и идентифицирующий User-Agent.
- Фактические rate/concurrency limits публикуются в response headers. PLAST использует безопасный default concurrency `1`, задержку между запросами и обрабатывает `429`.
- Pagination использует `cursor=*`/`next-cursor`; adapter ограничивает число страниц и обнаруживает повторный cursor.
- Crossref сообщает, что cursor живёт около пяти минут; один provider search проходит его последовательно.

Официальные источники: [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [Access and authentication](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/), [REST API reference](https://api.crossref.org/).

## Query planner

Planner использует только существующие `TopicCorpusProfile.ruSearchTerms` и `enSearchTerms`. По умолчанию выбираются первые две стабильные RU и EN формулировки для каждого provider: всего 8 queries на topic. Неоднозначные одиночные термины получают системный petroleum context, например `PVT petroleum reservoir`.

Основные лимиты находятся в одном config:

- 2 queries на topic/language/provider;
- 25 результатов на query;
- 2 страницы;
- 500 raw records на run;
- concurrency 1;
- timeout 15 секунд;
- до 3 попыток с exponential backoff.

`429`, `5xx` и network/timeout errors повторяются; `400`, `401`, `403` и другие постоянные ошибки — нет. `Retry-After` учитывается. Provider failures сохраняются в `DiscoveryRun`; успех второго provider не теряется.

## Candidate model

Candidate хранит title, authors, publication year, conservative SourceType mapping, provider language, DOI/ISBN/ISSN/OpenAlex/Crossref IDs, publication metadata, безопасные landing/DOI/OA URLs, раздельные citation signals, OA metadata, topics и полную query provenance.

Год Crossref выбирается в порядке: `published-print` → `published-online` → `issued` → `created`. OpenAlex использует только `publication_year`. Язык не угадывается по title. Неизвестные provider types остаются без `sourceType`.

## Exact merge

Merge разрешён только по canonical DOI, OpenAlex ID, Crossref ID или ISBN. Он объединяет provider, query-language и multi-topic provenance. Поле при конфликте не перезаписывается молча: сохраняется первое стабильное значение, а варианты записываются в `fieldConflicts`.

Title similarity, fuzzy/semantic deduplication и ranking отсутствуют. Похожие записи без общего strong identifier остаются отдельными кандидатами.

## Staging

Runtime staging:

```text
data/discovery/discovery-candidates.json
data/discovery/discovery-runs.json
```

Файлы создаются CLI через `write → fsync → atomic rename`, сортируются и игнорируются Git. Повторный run не дублирует candidates или одинаковую provenance; история runs сохраняется. Маленькие provider fixtures находятся отдельно в tests и коммитятся.

## CLI

```bash
npm run discovery:plan
npm run discovery:plan -- --topic pvt
npm run discovery:run -- --topic pvt
npm run discovery:run -- --topics pvt,modeling
npm run discovery:run -- --topic pvt --provider crossref --limit 10 --max-pages 1
npm run discovery:report
```

Network run без `--topic`, `--topics` или явного `--all` запрещён. `npm test`, build, report и plan не обращаются к provider APIs.

## Environment

```text
OPENALEX_API_KEY=
DISCOVERY_CONTACT_EMAIL=
```

Значения задаются локально в ignored `.env`; `.env.example` содержит только имена. Secrets, email и provider payload dumps не коммитятся.

## Reports

`discovery:plan` показывает topic, provider, query language, строку и configured limit без сети. `discovery:report` читает staging и показывает provider overlap, RU/EN yield, topics, types, DOI и OA metadata. Candidate counts не увеличивают verified corpus coverage.

## Limitations and next stages

Provider metadata может не иметь языка, DOI, авторов или abstract; broad queries дают noise. 3D.1 не выполняет fuzzy deduplication, ranking, verification, Russian repository discovery, crawling, PDF acquisition, R2 ingestion, OCR, chunks или AI. Следующий этап — 3D.2 Russian Discovery.
