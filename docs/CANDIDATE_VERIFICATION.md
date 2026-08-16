# 3D.4 — Candidate Verification, Deduplication & Ranking

## Architecture

```text
Discovery Staging
        ↓
Deterministic verification
        ├ exact duplicate analysis
        ├ blocked possible-duplicate detection
        ├ metadata conflict detection
        └ six explainable score components
        ↓
Coverage-aware ranking
        ↓
VERIFIED / REVIEW_REQUIRED / REJECTED / DUPLICATE
        ↓ explicit action only
Source Registry promotion manifest
```

3D.4 переиспользует `DiscoveryCandidate`, `TopicCorpusProfile`, общий Discovery Staging и Source Registry. Второго каталога кандидатов нет. Verification results, review queue и decisions являются производными audit records; ошибка проверки оставляет исходный candidate в staging и не влияет на пользовательский сайт.

## Status transitions

| From | Condition/action | To |
|---|---|---|
| `PENDING` | rule-based verification succeeded with strong signals | `VERIFIED` |
| `PENDING` | borderline score, conflict, ambiguity or fuzzy duplicate | `REVIEW_REQUIRED` |
| `PENDING` | unsafe/broken/retracted/clearly irrelevant | `REJECTED` |
| `PENDING` | strong identifier matches an existing candidate/source | `DUPLICATE` |
| `REVIEW_REQUIRED` | `VERIFY` | `VERIFIED` + `MANUAL_REVIEW` |
| `REVIEW_REQUIRED` | `REJECT` | `REJECTED` |
| `REVIEW_REQUIRED` | `MARK_DUPLICATE` | `DUPLICATE` |
| `REVIEW_REQUIRED` | `KEEP_SEPARATE` | duplicate flag cleared; дальнейшее решение остаётся явным |

`VERIFIED` подтверждает качество metadata/provenance и пригодность карточки для Source Registry. Он не подтверждает право скачивать, хранить или перерабатывать full text.

## Verification policy

- scoring model: `candidate-ranking-v1`;
- диапазон всех компонентов: `0–100`;
- компоненты сохраняют `value`, deterministic `reasons` и field-level `evidence`;
- authority и relevance независимы;
- русский язык и отсутствие DOI сами по себе не уменьшают score;
- старые книги не получают freshness penalty;
- legacy manual остаётся кандидатом и не становится `SUPERSEDED` без явного replacement evidence;
- `PAID` и `MEMBER_ONLY` не означают низкое качество;
- relationship повышает только relevance/corpus value, но не authority.

## Duplicate policy

### Exact

Автоматический exact duplicate использует DOI, ISBN, provider ID, OpenAlex/Crossref ID, документно-специфичный canonical URL и official vendor document key. Общая landing page каталога не является достаточным exact key. При совпадении сохраняется `duplicateOf`, target kind и strong keys.

Discovery exact merge продолжает хранить несколько provenance records в одной карточке. Verification дополнительно сравнивает staging с Source Registry.

### Possible

Fuzzy detection использует blocking keys по material family, title tokens, year, author и software product. Внутри блока считаются title-token similarity, author overlap, year, publisher/product и version signals.

```text
confidence >= 82
        ↓
POSSIBLE_DUPLICATE
        ↓
REVIEW_REQUIRED
```

Fuzzy auto merge и fuzzy auto rejection отключены. Большие общие blocks не сравниваются попарно; более точные year/author/product blocks предотвращают O(N²) по всему корпусу.

## Conflicts

Поддерживаются `YEAR_CONFLICT`, `AUTHOR_CONFLICT`, `TITLE_CONFLICT`, `IDENTIFIER_CONFLICT`, `VERSION_CONFLICT` и `PUBLISHER_CONFLICT`. Сильный metadata conflict всегда блокирует auto verification. Preferred-provider metadata может использоваться при нормализации, но конфликт не скрывается.

## Manual review

Review queue содержит candidate snapshot, полный score breakdown, flags, reasons/concerns, provenance, topic matches, possible duplicates и conflicts. Доступны действия:

```text
VERIFY
REJECT
MARK_DUPLICATE
KEEP_SEPARATE
```

Decision сохраняет reviewer, reason, timestamp, previous/resulting status и scoring model version. Команда не загружает документы и не изменяет R2.

## Promotion

Promotion является отдельной явной операцией. Разрешён только `VERIFIED` candidate с `verifiedAt`, `verificationMethod` и безопасным публичным landing URL.

В Source Registry сохраняются:

- `sourceCandidateId`;
- score snapshot и `scoringModelVersion`;
- verification method/reasons/time;
- original provenance и origin provider;
- software/document version;
- access отдельно от licence/rights;
- provider metadata, включая УДК/ББК;
- engineering relationships.

Повторная promotion того же candidate idempotent. Создаётся только metadata-only/external-fulltext карточка; `document`, storage key и R2 ingestion не создаются.

## CLI

```text
npm run verification:run -- --all
npm run verification:report
npm run verification:smoke
npm run verification:review -- --candidate <id> --action <action> --reviewer <name> --reason <text>
npm run verification:promote -- --candidate <id> --dry-run true
```

Без явной promotion-команды `app/data/verified-sources.json` не меняется.

## Production safety and limitations

- verification не выполняет network fetching или redirects;
- `javascript:`, `file:`, localhost и private-network URLs отклоняются;
- browser scraping, authentication bypass, document acquisition и AI verification отсутствуют;
- transliterated author identity остаётся только manual clue;
- generic catalog pages и conflicting DOI variants требуют review;
- type classification, sparse abstracts и current-version evidence остаются главными источниками неопределённости.
