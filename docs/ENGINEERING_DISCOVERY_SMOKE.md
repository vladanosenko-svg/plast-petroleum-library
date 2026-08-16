# 3D.3 — Controlled Engineering Discovery Smoke

Дата: 16 августа 2026 года.

Команда:

```bash
npm run engineering:run -- --all --max-total 5000 --limit 50
npm run engineering:report
```

Smoke полностью локальный: registry adapter не выполняет HTTP-запросы и не скачивает PDF, archives, example models или datasets.

## Результат

```text
Status: completed
Topics: 65
Raw registry matches: 130
Exact merged: 106
Unique engineering candidates: 24

BOOK                 2
MANUAL               4
TUTORIAL             5
PRESENTATION         5
CASE_STUDY           2
TECHNICAL_REPORT     1
DATASET              4
EXAMPLE_MODEL        1
OTHER                0
```

Дополнительные признаки:

```text
Official vendor candidates                 13
Software/document version preserved         5
Candidates with relationship metadata      18

OPEN                                       10
AUTH_REQUIRED                              11
MEMBER_ONLY                                 1
PAID                                        1
UNKNOWN                                     1
```

В общий ignored staging добавлены только candidates и run metadata. Public `app/data/source-documents.json` не изменён.

## Реальные material examples

- manual: ECLIPSE Installation Guide `2023.1`, IPM Getting Started Guide `13`, Nexus User Guide `R5000.0.2`;
- tutorial: tNavigator tutorials, KAPPA Ecrin `4.30`, CMG training;
- presentation: CMG `What's New in IMEX v2026.11`, SEG lectures;
- case study: SLB Petrel/ONGC и SPE/JPT multi-basin artificial-lift case;
- dataset/model: tNavigator demo-data collection metadata, OPM open datasets, Norne example model, MRST catalogue;
- relationships: tNavigator tutorial `USES_DATASET` demo data; manuals `DOCUMENTS_PRODUCT`; datasets/models `BENCHMARK_FOR`/`EXAMPLE_FOR`.
