# 3D.3 — Engineering Discovery Provider Matrix

Проверено 16 августа 2026 года. Policy относится к remote metadata discovery. `Curated` означает только наличие вручную проверенных landing pages в локальном PLAST registry.

| Provider | Группа | Подтверждённый механизм | Доступ | Policy | Curated |
|---|---|---|---|---|---|
| PLAST Engineering Registry | local | typed local records, без сети | metadata + landing URL | `IMPLEMENT` | да |
| GeoКнига | domain library | `/books`, карточки, sitemap; robots `Crawl-delay: 10` | публичные карточки; права/файлы отдельно | `REQUIRES_PERMISSION` | 1 карточка |
| Rock Flow Dynamics | vendor | official software/Adviser pages | manuals/tutorials/demo data в продуктовой среде | `MANUAL_ONLY` | да |
| SLB | vendor | product/support/training pages | public + registration/support | `MANUAL_ONLY` | да |
| Computer Modelling Group | vendor | product/training/resource pages | public + account/course access | `MANUAL_ONLY` | да |
| KAPPA Engineering | vendor | product/training/public tutorial pages | public + training access | `MANUAL_ONLY` | да |
| Petroleum Experts | vendor | IPM product, guide и training pages | public guide + course/client access | `MANUAL_ONLY` | да |
| Halliburton Landmark | vendor | software/support/webinar pages | public + support/registration | `MANUAL_ONLY` | да |
| SPE / OnePetro | society | public metadata cards/DOI pages; Crossref metadata | `OPEN` / `MEMBER_ONLY` / `PAID` | `MANUAL_ONLY` | да |
| SEG | society | education/lecture pages | public + member recordings | `MANUAL_ONLY` | да |
| AAPG | society | training/workshop/webinar pages | public + registration/member access | `MANUAL_ONLY` | да |
| EAGE | society | community/webinar pages | public metadata + registration | `MANUAL_ONLY` | да |
| OPM / SINTEF MRST | research | official dataset catalogues | public metadata; OPM explicitly ODbL | `IMPLEMENT` через curated registry | да |

## GeoКнига

### Что проверено

- `robots.txt`: `/books` не запрещён, `/search/` запрещён, установлен `Crawl-delay: 10`;
- sitemap: опубликован sitemap index из нескольких страниц;
- каталог `/books`: публичные HTML-фильтры и пагинация;
- карточка `/books/{id}`: title, authors, edition, publisher/city/year/pages, УДК, ISBN при наличии, language, annotation, topics/tags и постоянный landing URL;
- Terms/проект: материалы доступны для ознакомления, права принадлежат законным правообладателям, для обмена следует использовать landing page;
- API, OAI-PMH, RSS/Atom и документированный rate-limit кроме robots не подтверждены;
- JSON-LD/schema.org в проверенной карточке не обнаружены; metadata представлены Drupal HTML fields;
- внутренний `/search/` не используется.

Evidence: [robots.txt](https://www.geokniga.org/robots.txt), [sitemap](https://www.geokniga.org/sitemap.xml), [каталог](https://www.geokniga.org/books), [о проекте и правах](https://www.geokniga.org/geowiki/%D0%B3%D0%B5%D0%BE%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0), [проверенная карточка](https://www.geokniga.org/books/24618).

### Решение

Policy: `REQUIRES_PERMISSION`.

Sitemap является технически машиночитаемым, но не даёт явного разрешения на production harvesting metadata. Сочетание отсутствия документированного API/feed, запрета `/search/`, высокой нагрузки каталога и неясных прав не позволяет обоснованно включить HTML scraping. Remote adapter не реализован.

В curated registry добавлена только одна вручную проверенная metadata-only карточка для проверки модели. Потенциально доступны title, authors, publisher, place/year/pages, edition, language, description, УДК, ISBN, topics, tags и landing URL. Файлы GeoКниги не скачивались и file links в candidate не сохранялись.

Для пересмотра policy нужно письменное разрешение на bounded metadata harvesting, согласованный endpoint/параметры и rate limit.

## Vendor Registry

### Rock Flow Dynamics

Products: `tNavigator`, `Adviser`. Adviser официально описывает manuals, tutorials, release notes и demo data; доступ к конкретным документам связан с продуктовой средой. Curated records моделируют цепочку `Tutorial USES_DATASET Demo Data` и `TRAINING_FOR tNavigator`.

Evidence: [tNavigator software](https://www.rfdyn.com/software/), [Adviser](https://rfdyn.com/module/adviser/).

### SLB

Products: `Petrel`, `ECLIPSE`, `INTERSECT`, `Techlog`. Зарегистрированы ECLIPSE Installation Guide `2023.1`, Petrel training entry point и официальный Petrel/ONGC case study. Support selector подтверждает актуальные product support areas.

Evidence: [support products](https://www.software.slb.com/support/product), [Petrel training/case studies](https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training).

### Computer Modelling Group

Products: `IMEX`, `GEM`, `STARS`, `WinProp`, `CMOST`, `Builder`, `Results`, `CoFlow`. Зарегистрированы `Training by IMEX` и release presentation `What's New in IMEX v2026.11`.

Evidence: [software](https://www.cmgl.ca/plus-mega-menu/software/), [training by IMEX](https://www.cmgl.ca/solutions/software/training-by-imex/), [IMEX 2026.11](https://www.cmgl.ca/sdm_downloads/second-quarter-release-whats-new-in-imex-v2026-11/).

### KAPPA Engineering

Current products: `Saphir`, `Topaze`, `Emeraude`, `Rubis`, `Amethyste`, `Azurite`, `Carbone`, `Grenat`, `Citrine`, `Orchid`, `KAPPA-Automate`, `KAPPA-Server`. `Diamant/Diamant Master` сохранён как legacy product и не помечен текущим. Зарегистрированы публичные `Ecrin 4.30 Tutorials`, включая Saphir/Topaze/Rubis workflows.

Evidence: [KAPPA-Workstation](https://www.kappaeng.com/software/kw), [current videos/modules](https://www.kappaeng.com/software/kw/videos), [downloads/products](https://www.kappaeng.com/downloads/), [Ecrin 4.30 tutorials](https://www.kappaeng.com/documents/flip/ecrin_430_tutorials/files/assets/basic-html/toc.html).

### Petroleum Experts

Products: `PROSPER`, `MBAL`, `GAP`, `PVTP`, `REVEAL`, `RESOLVE`, `OpenServer`, `IPM Suite`, `MOVE`. Зарегистрированы `IPM 13 Getting Started Guide` и официальный каталог practical training courses. Текущий product registry не переписывает версию найденного manual.

Evidence: [IPM Suite](https://petex.com/products/ipm-suite/), [training](https://www.petex.com/public_area/courses/courses_schedule_list.asp), [MOVE](https://www.petex.com/pe-geology/move-suite/).

### Halliburton Landmark

Текущая официальная структура включает `DecisionSpace 365`, `Reservoir Suite`, `Full-Scale Asset Simulation`, `Nexus`, `NETool`, `PowerGrid`, `ResX`. Устаревшие названия не объявлены текущими без official evidence. Зарегистрированы Nexus User Guide `R5000.0.2` и Landmark webinars.

Evidence: [Landmark software](https://www.halliburton.com/en/software), [reservoir management](https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production), [university grants/current components](https://www.halliburton.com/en/software/academic-engagement/university-grants-program), [webinars](https://www.halliburton.com/en/webinars).

## Какие providers автоматизированы

- `engineering-registry`: полностью автоматизированный локальный metadata adapter;
- OPM/SINTEF records: автоматически ищутся внутри этого registry, remote datasets не загружаются;
- `Crossref` из 3D.1 продолжает автоматически находить DOI metadata, включая часть SPE/OnePetro records;
- `КФУ OAI-PMH` из 3D.2 остаётся автоматизированным university source.

Remote adapters GeoКниги, vendor portals, OnePetro, SEG, AAPG и EAGE не создавались: документированный публичный API/feed и достаточное основание для crawling не подтверждены.

## University Discovery

`AcademicDomainRegistry` содержит whitelist:

- РГУ нефти и газа имени И. М. Губкина;
- ТИУ;
- КФУ — Институт геологии и нефтегазовых технологий;
- ТПУ;
- Санкт-Петербургский горный университет;
- Heriot-Watt Institute of GeoEnergy Engineering;
- UT Austin Hildebrand Department of Petroleum and Geosystems Engineering;
- Stanford Energy Science & Engineering.

Planner генерирует только domain-bounded пары запросов: lecture notes/slides и exercises/assignments/course datasets. `KPFU` переиспользует реализованный OAI provider; остальные policy не повышаются из-за наличия публичного сайта.

## Professional societies

- OnePetro metadata сохраняются даже при `PAID`; paywall не обходится.
- SPE/JPT case studies сохраняются как `CASE_STUDY`, а SPE Comparative Solution Project — как связанные `TECHNICAL_REPORT` и `BENCHMARK` records.
- SEG lectures сохраняются как `PRESENTATION` с `MEMBER_ONLY`, когда запись требует членства.
- AAPG workshops/webinars и EAGE webinar series сохраняются отдельными material types с фактическим access state.

Access availability и licence всегда независимы.
