# ПЛАСТ

Русскоязычная frontend-основа отраслевой библиотеки по геологии, исследованию и разработке нефтяных и газовых месторождений. Интерфейс выполнен в минималистичной editorial-стилистике, поддерживает светлую и тёмную темы и адаптирован для мобильных устройств.

## Текущий статус

Работают:

- главная страница и основные маршруты;
- каталог из 7 демонстрационных материалов;
- карта из 65 нефтегазовых направлений;
- текстовый поиск;
- фильтры по типу, языку, году и теме;
- совместная AND-фильтрация с состоянием в URL;
- индивидуальные страницы и metadata материалов;
- русская страница 404;
- сохранение выбранной темы оформления.

Discovery engine завершён до этапа 3D.3: international/Russian literature providers и отдельный Engineering & Practical staging для manuals, tutorials, presentations, case studies, example models и datasets. Candidates не публикуются в пользовательском каталоге автоматически.

Материалы пока являются демонстрационными и явно маркируются в интерфейсе. Непроверенные источники и вымышленные metadata не выдаются за реальные публикации. AI/RAG, backend, авторизация и автоматический сбор данных в текущий этап не входят.

## Требования и запуск

- Node.js 22.13 или новее;
- npm из установленного Node.js.

```bash
npm ci
npm run dev
```

Production-сборка и локальный запуск:

```bash
npm run build
npm start
```

## Проверки

```bash
npm run lint
npm test
npm run test:e2e
npm audit
```

`npm test` собирает приложение и запускает SSR/data regression-тесты. `npm run test:e2e` запускает Playwright и проверяет реальные переходы, поиск, фильтры, мобильное меню, сохранение темы, console, 404 и отсутствие горизонтального переполнения.

План и отчёт отдельного библиографического discovery staging:

```bash
npm run discovery:plan -- --topic pvt
npm run discovery:report
```

Описание архитектуры и безопасного network run: [docs/LITERATURE_DISCOVERY.md](docs/LITERATURE_DISCOVERY.md).

Engineering & Practical Discovery работает по проверенному локальному registry без crawling и скачивания файлов:

```bash
npm run engineering:providers
npm run engineering:plan -- --topic modeling
npm run engineering:run -- --topics modeling,well-testing,petroleum-software --max-total 1000
npm run engineering:report
```

Архитектура и provider policy: [docs/ENGINEERING_DISCOVERY.md](docs/ENGINEERING_DISCOVERY.md), [docs/ENGINEERING_DISCOVERY_PROVIDERS.md](docs/ENGINEERING_DISCOVERY_PROVIDERS.md).

Проверка и ранжирование candidates: [docs/CANDIDATE_VERIFICATION.md](docs/CANDIDATE_VERIFICATION.md), [docs/CANDIDATE_RANKING_POLICY.md](docs/CANDIDATE_RANKING_POLICY.md), [docs/CANDIDATE_VERIFICATION_SMOKE.md](docs/CANDIDATE_VERIFICATION_SMOKE.md).

Перед первым локальным запуском E2E при необходимости установите Chromium:

```bash
npx playwright install chromium
```

## Маршруты

- `/` — главная;
- `/library` — каталог, поиск и фильтры;
- `/library/[slug]` — материал;
- `/topics` — карта направлений;
- `/courses` — честно маркированный раздел в разработке;
- `/about` — о проекте.

Пример сохраняемого состояния каталога:

```text
/library?q=PVT&type=guide&language=ru&year=2024&topic=pvt
```

## Структура

- `app/` — страницы, компоненты, стили и данные;
- `app/data.ts` — единая схема материалов и реестр тем;
- `app/library-search.ts` — нормализация параметров и AND-фильтрация;
- `tests/` — SSR, data и browser-level тесты;
- `tools/sites-vite-plugin.ts` — отслеживаемый Git-код упаковки metadata для Sites;
- `worker/` — точка входа Cloudflare runtime;
- `.openai/hosting.json` — конфигурация размещения.

## Модель данных

Каждый материал имеет стабильные `id` и `slug`, массив авторов, тип, язык, topic ID, описание и признак проверки. Темы имеют стабильные ID и объединены в отраслевые группы. Тесты запрещают дубли slug/ID и ссылки материалов на несуществующие темы.

## Известный dependency debt

Production-зависимости проходят `npm audit --omit=dev` без уязвимостей. Оставшиеся предупреждения полного `npm audit` относятся к старой транзитивной цепочке `esbuild` внутри `drizzle-kit`; автоматическое исправление предлагает несовместимое понижение `drizzle-kit`, поэтому `npm audit fix --force` намеренно не используется.
