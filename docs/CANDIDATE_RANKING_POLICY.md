# 3D.4 — Candidate Ranking Policy

Policy version: `candidate-ranking-v1`. Диапазон: `0–100`.

## Components

| Score | Meaning | Основные inputs | Weight |
|---|---|---|---:|
| `relevance` | Насколько содержание относится к основной нефтегазовой теме | RU/EN terms, aliases, title, keywords, description, topic assignment, software/product, relationships, preferred material type | 30% |
| `authority` | Надёжность происхождения metadata | official vendor, society, journal/DOI, university/repository, government, publisher, multiple provenance, retraction | 20% |
| `metadataCompleteness` | Полнота применимых именно к SourceType полей | bibliographic fields, landing URL, organization, identifiers, software/version, access, rights, relationships | 15% |
| `versionRelevance` | Актуальность version-sensitive material | document/software version, release year, current/recent/legacy/unknown | 10% |
| `corpusValue` | Польза для текущих gaps PLAST | TopicCorpusProfile priority/targets, current verified coverage, missing material type, practical diversity, relationships | 15% |
| `accessUtility` | Удобство доступа без смешивания с quality/licence | OPEN, registration/auth, member, paid, metadata-only, unknown | 10% |

## Overall formula

```text
overall =
  relevance            × 0.30 +
  authority            × 0.20 +
  metadataCompleteness × 0.15 +
  versionRelevance     × 0.10 +
  corpusValue          × 0.15 +
  accessUtility        × 0.10
```

Результат округляется до одного десятичного знака. Все weights и thresholds централизованы в policy, а не размазаны по коду.

## Thresholds

| Threshold | Value | Meaning |
|---|---:|---|
| auto verify | `overall ≥ 82` | Только при relevance ≥ 65, authority ≥ 70, completeness ≥ 60, strong provenance и отсутствии blocking flags |
| manual review | `overall ≥ 45` | Borderline/ambiguous candidates; возможен review и выше 82 при блокирующем флаге |
| reject | `overall < 45` или relevance `< 24` | Только если нет fuzzy duplicate, который всегда требует review |
| possible duplicate | confidence `≥ 82` | Manual review; merge запрещён |

Пороги выбраны консервативно: false positive verification опаснее дополнительной review item. Controlled smoke подтвердил отсутствие incorrect auto verification и incorrect rejection в 30 вручную размеченных карточках.

## Relevance

Exact multiword terms и aliases имеют больший вес, чем отдельные tokens. Общие слова `model`, `flow`, `oil`, `gas`, `analysis`, `simulation` и русские аналоги подавляются. Для русской морфологии используется детерминированное prefix comparison длинных кириллических tokens; транслитерация не объявляется identity.

`primaryTopic` — тема с самым сильным content evidence. Остальные совпадения сохраняются как secondary; query-assigned topic является слабым сигналом. Curated official engineering и bounded Russian institutional assignments дают дополнительный, но недостаточный для auto verification сигнал.

## Authority

Ориентиры baseline:

```text
OFFICIAL_VENDOR           95
STANDARDS_BODY            92
GOVERNMENT                90
PROFESSIONAL_SOCIETY      88
PEER_REVIEWED             86
RESEARCH_ORGANIZATION     84
UNIVERSITY                78
PUBLISHER                 76
INSTITUTIONAL_REPOSITORY  74
THIRD_PARTY_LIBRARY       55
UNKNOWN                   30
```

Official source не получает relevance автоматически. DOI повышает scholarly evidence только вместе с journal/publication context. Российская университетская книга без DOI может иметь medium/high authority через institution, authors, publisher и catalogue identifiers.

## Type-aware metadata

- article: authors, year, journal/publisher/conference, DOI/ISSN, URL, language;
- book: authors, year, publisher, ISBN или catalogue ID; DOI не требуется;
- manual/tutorial: vendor/organization, product, document/software version, release/year, access; DOI/ISBN не требуется;
- dataset/example model: organization, purpose, access/licence, compatibility/relationships;
- standard: issuing body, year/version и status; superseded status не угадывается.

## Version relevance

```text
CURRENT          100
RECENT            82
LEGACY            55
UNKNOWN        45–65
NOT_APPLICABLE   100
```

`NOT_APPLICABLE` предотвращает штраф классическим книгам и историческим публикациям. Version-sensitive material без явной версии получает `UNKNOWN` и review flag. `LEGACY` не означает rejection.

## Corpus value and diversity

Компонент использует только уже `verified` Source Registry records. Demo entries не закрывают coverage gaps. Пустой material-type gap, preferred SourceType, практический тип и подтверждённая learning-chain relationship повышают corpus value. Жёстких квот и recommendation engine нет.

## Access utility

```text
OPEN                    100
external full text       90
REGISTRATION_REQUIRED    72
AUTH_REQUIRED            65
MEMBER_ONLY              55
metadata-only            55
PAID                     50
UNKNOWN                  40
```

Access весит только 10%, поэтому paid SPE paper может ранжироваться выше слабого открытого материала.
