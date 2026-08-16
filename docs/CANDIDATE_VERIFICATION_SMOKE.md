# 3D.4 — Controlled Candidate Verification Smoke

Дата: 16 августа 2026 года. Это diagnostic sample, а не статистически значимый production benchmark.

## Full staging run

После targeted metadata discovery для газоконденсатных тем проверено 358 staging candidates:

```text
VERIFIED          10
REVIEW_REQUIRED  230
REJECTED         118
DUPLICATE          0

POSSIBLE_DUPLICATE 30
metadata conflicts 15
pipeline errors      0
```

Направления staging: 324 international, 10 Russian, 24 engineering. Exact duplicates отсутствуют после раннего exact merge 3D.1–3D.3; exact/registry duplicate paths дополнительно покрыты synthetic unit tests.

## Manual sample

Вручную оценены 30 фиксированных candidates: 10 international, 10 Russian, 10 engineering. Полная разметка с rationale хранится в `tests/fixtures/verification/manual-smoke-labels.json`.

```text
expected SHOULD_VERIFY  15
expected SHOULD_REVIEW  13
expected SHOULD_REJECT   2

exact status agreement 21/30
correct auto verify      7
incorrect auto verify    0
correct rejection        1
incorrect rejection      0
conservative reviews     9

possible duplicate flags 2
confirmed possible        1
false duplicate flag      1
```

Восемь `SHOULD_VERIFY` остались в review из-за консервативных thresholds/metadata gaps. Один non-petroleum inorganic phase-equilibrium record остался в review из-за ложного fuzzy duplicate flag. Опасных автоматических решений в sample не найдено.

## Five smoke topics

| Topic | Candidates | Verified | Review | Rejected | Exact | Possible |
|---|---:|---:|---:|---:|---:|---:|
| PVT | 4 | 2 | 2 | 0 | 0 | 1 |
| PTA / ГДИС | 3 | 0 | 3 | 0 | 0 | 0 |
| Reservoir Simulation / ГДМ | 15 | 3 | 11 | 1 | 0 | 1 |
| History Matching | 5 | 2 | 3 | 0 | 0 | 0 |
| Gas Condensate / Compositional | 3 | 0 | 3 | 0 | 0 | 0 |

## International manual review

Score columns: `R` relevance, `A` authority, `M` metadata, `V` version, `C` corpus, `X` access, `O` overall.

| Material | Type | R/A/M/V/C/X/O | Pipeline | Manual |
|---|---|---|---|---|
| Расчёт PVT-свойств по длине подъёмника | article | 77/86/92/100/100/100/89.1 | VERIFIED | SHOULD_VERIFY |
| PVT calculations on petroleum reservoir fluids | article | 77/86/92/100/100/40/83.1 | VERIFIED | SHOULD_VERIFY |
| Use of Pressure Derivative in Well-Test Interpretation | article | 66/86/92/100/100/40/79.8 | REVIEW | SHOULD_VERIFY |
| Reservoir model for open federated cloud computing | article | 16/86/92/100/100/40/64.8 | REJECTED | SHOULD_REJECT |
| Альтернативная адаптация гидродинамических моделей | article | 24/86/87/100/100/100/72.4 | REVIEW | SHOULD_REVIEW |
| Gas-Condensate Recovery / Gas Cycling Efficiency | conference | 55/86/81/100/92/40/73.7 | REVIEW | SHOULD_VERIFY |
| Gas-condensate PVT with brine | article | 70/86/86/100/100/40/80.1 | REVIEW | SHOULD_VERIFY |
| Фазовое поведение газоконденсатных смесей | conference | 27/86/81/100/92/40/65.3 | REVIEW | SHOULD_REVIEW |
| Li–W–Mn–O phase equilibria | article | 24/86/86/100/100/40/66.3 | REVIEW | SHOULD_REJECT |
| Dunbar Reservoir Model | conference | 12/86/81/100/97/40/61.5 | REVIEW + POSSIBLE_DUPLICATE | SHOULD_REVIEW |

## Russian manual review

| Material | Type | R/A/M/V/C/X/O | Pipeline | Manual |
|---|---|---|---|---|
| 3D геомеханическая модель ачимовских отложений | article | 41/74/72/100/100/100/72.9 | REVIEW | SHOULD_REVIEW |
| Совместное геомеханическое и ГДМ моделирование | article | 76/75/72/100/100/100/83.6 | VERIFIED | SHOULD_VERIFY |
| Вычислительные эксперименты для анализа ГДИС | article | 38/74/72/100/100/100/72.0 | REVIEW | SHOULD_VERIFY |
| Геостатистика: методические указания КФУ | book | 34/78/82/100/100/40/67.1 | REVIEW | SHOULD_VERIFY |
| Разработка нефтяных и газовых месторождений | book | 59/78/82/100/100/40/74.6 | REVIEW | SHOULD_VERIFY |
| Моделирование нефтяных и газовых месторождений | book | 34/78/82/100/100/40/67.1 | REVIEW | SHOULD_VERIFY |
| Подготовка ГДМ в Petrel/tNavigator | book | 76/78/82/100/100/40/79.7 | REVIEW | SHOULD_VERIFY |
| Бурение и разработка месторождений | book | 59/79/82/100/100/40/74.8 | REVIEW | SHOULD_REVIEW |
| Программа учебной практики | book | 59/79/82/100/100/40/74.8 | REVIEW | SHOULD_REVIEW |
| Реология высоковязкой нефти и природных битумов | article | 34/78/72/100/100/40/65.6 | REVIEW | SHOULD_REVIEW |

Кириллица, ФИО, provider metadata и УДК/ББК сохраняются. DOI не является обязательным для university/repository authority.

## Engineering manual review

| Material | Type | R/A/M/V/C/X/O | Pipeline | Manual |
|---|---|---|---|---|
| ECLIPSE Installation Guide 2023.1 | manual | 71/100/95/82/100/100/88.8 | VERIFIED | SHOULD_VERIFY |
| tNavigator Manuals in Adviser | manual | 75/100/85/45/100/65/81.3 | REVIEW, version ambiguity | SHOULD_REVIEW |
| tNavigator Step-by-Step Tutorials | tutorial | 90/100/85/45/99/65/85.6 | REVIEW, version ambiguity | SHOULD_REVIEW |
| What's New in IMEX v2026.11 | presentation | 63/100/100/100/91/100/87.6 | REVIEW | SHOULD_REVIEW |
| Petrel/ONGC mature field | case study | 67/100/88.9/100/100/100/88.4 | VERIFIED | SHOULD_VERIFY |
| Norne Full-Field Black-Oil Model | example model | 77/90/100/100/100/100/91.1 | VERIFIED | SHOULD_VERIFY |
| OPM Open Datasets | dataset | 49/88/100/100/100/100/82.3 | REVIEW | SHOULD_REVIEW |
| SPE CSP11 | benchmark | 65/92/92.2/100/100/65/83.2 | VERIFIED | SHOULD_VERIFY |
| GeoКнига: Разработка нефтяных месторождений | book | 66/58/100/100/100/40/75.4 | REVIEW | SHOULD_REVIEW |
| KAPPA Ecrin 4.30 Tutorials | tutorial | 54/100/95/65/99/100/81.8 | REVIEW, version ambiguity | SHOULD_REVIEW |

## Observed errors and limitations

- current false duplicate: две не-нефтегазовые phase-equilibrium записи получили высокий fuzzy signal из-за близких titles/authors/publisher; auto merge отключён, поэтому ущерба нет;
- conservative false negatives: качественные SPE, KPFU и classic records остаются в review из-за access/type/metadata gaps;
- sparse Crossref book-chapter types снижают completeness;
- transliterated author matching и actual replacement status manuals/standards не автоматизированы;
- current software version требует explicit vendor evidence, а не догадки по номеру.

## Recommendation for 3D.5

В acquisition передавать только явно promoted `VERIFIED` sources. Access/licence/rights проверять повторно на уровне конкретного файла; verification карточки не является разрешением на скачивание.
