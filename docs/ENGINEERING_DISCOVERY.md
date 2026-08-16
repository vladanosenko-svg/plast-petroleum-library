# 3D.3 — Engineering & Practical Discovery

## Назначение

3D.3 расширяет общий Discovery Staging инженерными и практическими материалами. Этап не меняет завершённые 3D.1/3D.2 и не публикует candidates в Source Registry.

```text
TopicCorpusProfile
      ↓
Engineering Query Planner
      ├ THEORY
      ├ METHODOLOGY
      ├ SOFTWARE_TRAINING
      ├ PRACTICE
      └ EXAMPLES_DATASETS
      ↓
Curated Engineering Registry Adapter
      ↓
shared normalization + exact identifier/provider-ID merge
      ↓
data/discovery staging
```

Remote crawling, поиск по произвольным `.edu`, скачивание PDF/archive, R2 ingestion и обход авторизации отсутствуют.

## Data model

Общий `DiscoveryCandidate` теперь поддерживает:

- отдельные `SourceType`: `manual`, `tutorial`, `training-material`, `lecture-note`, `presentation`, `webinar`, `workflow`, `case-study`, `technical-report`, `recommended-practice`, `dataset`, `example-model`, `benchmark`, `release-notes`;
- пять knowledge layers: `THEORY`, `METHODOLOGY`, `SOFTWARE_TRAINING`, `PRACTICE`, `EXAMPLES_DATASETS`;
- authority: `OFFICIAL_VENDOR`, `UNIVERSITY`, `PROFESSIONAL_SOCIETY`, `GOVERNMENT`, `STANDARDS_BODY`, `DOMAIN_LIBRARY`, `RESEARCH_ORGANIZATION`, `UNKNOWN`;
- availability: `OPEN`, `AUTH_REQUIRED`, `MEMBER_ONLY`, `PAID`, `UNKNOWN`;
- независимые `license` и `rightsNote`: открытая landing page не считается лицензией на копирование;
- software metadata: vendor, products, suite, software version, document version, release date;
- official-first provenance: origin provider, authority и `officialSource` сохраняются для будущего выбора preferred copy;
- relationships: `USES_DATASET`, `TRAINING_FOR`, `DOCUMENTS_PRODUCT`, `EXAMPLE_FOR`, `BENCHMARK_FOR`, `COMPANION_TO`.

Версия не удаляется при normalization. Например, отдельно сохраняются `IPM 13`, `ECLIPSE 2023.1`, `Ecrin 4.30`, `IMEX 2026.11` и `Nexus R5000.0.2`.

## Query planner

Для каждой из 65 существующих тем формируется десять запросов: пять material families на русском и английском. Практический слой включает запросы вида `field application case study presentation webinar` и `практический пример опыт применения кейс презентация вебинар`. Dataset layer включает example models, training datasets и benchmarks.

University plan строится только по `AcademicDomainRegistry`. Каждый запрос начинается с точного `site:<whitelisted-domain>`; unrestricted crawler всего `.edu`/`.ac` не создаётся.

## Safe registry adapter

`EngineeringRegistryDiscoveryProvider` ищет только в typed registry из вручную проверенных metadata records. Он:

- не вызывает сеть;
- возвращает metadata и landing URL;
- не открывает evidence PDF;
- не сохраняет file URL как `openAccess`;
- не скачивает архивы, models или datasets;
- использует тот же exact merge и staging, что 3D.1/3D.2.

Remote provider policy и наличие curated record — разные признаки. Например, GeoКнига имеет policy `REQUIRES_PERMISSION`, но одна вручную проверенная карточка может быть безопасно представлена в staging как metadata-only candidate.

## Exact merge и official-first

Fuzzy/semantic merge отсутствует. Exact merge разрешён только по DOI, OpenAlex ID, Crossref ID, ISBN или точному provider record ID. При точном совпадении candidate с `officialSource=true` имеет приоритет заполнения полей, но все provenance records и конфликты сохраняются.

## CLI

```bash
npm run engineering:providers
npm run engineering:plan -- --topic modeling
npm run engineering:run -- --topics modeling,well-testing,petroleum-software --max-total 1000
npm run engineering:report
```

`engineering:run` требует явный topic/topics/all. Runtime JSON остаётся в ignored `data/discovery`; public Source Registry не меняется.

## Не входит в 3D.3

- candidate verification и ranking;
- authority score;
- fuzzy deduplication;
- автоматическая проверка доступности;
- массовая загрузка PDF/models/datasets;
- Cloudflare R2 ingestion;
- parsing, OCR, chunking, embeddings, vector search, AI и RAG.

Следующий этап: **3D.4 Candidate Verification, Deduplication & Ranking**.
