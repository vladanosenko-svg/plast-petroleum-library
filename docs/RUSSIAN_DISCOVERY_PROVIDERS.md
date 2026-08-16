# Russian Literature Discovery Providers

Проверено 16 августа 2026 года. Reconnaissance проверяет только официальный интерфейс и фактический ответ endpoint. PLAST не использует CAPTCHA/login bypass, browser emulation, внутренние API или HTML scraping.

## Capability matrix

| Provider | Search interface | Protocol | Public | Metadata | Pagination | Rate limits | Terms | Implement |
|---|---|---|---|---|---|---|---|---|
| РГБ | официальный Search/ALEPH-каталог | публичный discovery API/SRU/OAI не подтверждён | ручной поиск | библиографические web records | web UI | не опубликованы | API ОЭК предназначен для приёма обязательного экземпляра, не для поиска | `MANUAL_ONLY` |
| НЭБ | официальный web-каталог | публичный discovery API/OAI не подтверждён | ручной metadata access; часть текстов после входа | подробные библиографические/MARC-поля | web UI | не опубликованы | соглашение запрещает массовое автоматизированное скачивание объектов; harvesting metadata не документирован | `MANUAL_ONLY` |
| КиберЛенинка | официальный `/oai`, профильный journal set | OAI-PMH 2.0, `oai_dc` | да, без ключа | Dublin Core | `resumptionToken`, 10 records/page в smoke | не опубликованы; concurrency 1 + delay | Open Access; PLAST получает только metadata | `IMPLEMENT` |
| ЭНБ Губкина | официальный каталог/приложение | публичный документированный API/OAI не подтверждён | вход для читателей/партнёров | каталожные записи в UI | не документирована | не опубликованы | личный кабинет не обходится | `REQUIRES_PERMISSION` |
| ТИУ | ИРБИС64+ каталог/электронная библиотека | публичный OAI/SRU не подтверждён | ориентирован на авторизованных читателей | каталог, ВКР, внутривузовские издания | не документирована | не опубликованы | automation без разрешения не выполняется | `REQUIRES_PERMISSION` |
| ТПУ | публичный DSpace web archive | OAI routes дали 404, REST — 403 | HTML records публичны | rich DSpace metadata | только web UI в подтверждённом доступе | не опубликованы | основание для scraping не подтверждено | `DEFER` |
| Горный университет | электронные ресурсы и каталог | публичный OAI/SRU не подтверждён | официально для зарегистрированных пользователей | книги, диссертации, отчёты, статьи | не документирована | не опубликованы | вход/внутренняя сеть не обходятся | `REQUIRES_PERMISSION` |
| КФУ, ИГиНГТ | профильная DSpace community/set | OAI-PMH 2.0, `oai_dc` | да, без ключа | Dublin Core | `resumptionToken`, до 100 records/page в smoke | не опубликованы; concurrency 1 + delay | только metadata; права на fulltext определяются записью | `IMPLEMENT` |

Typed capability records и OAI configs находятся в `app/discovery/provider-capabilities.ts`; `npm run discovery:providers` выводит их без сети.

## Provider reconnaissance

### РГБ

- Official machine interface: публичного machine discovery не найдено.
- Protocol: официальный каталог использует Search/ALEPH; опубликованный JSON-RPC API ОЭК обслуживает передачу обязательных электронных экземпляров и не является bibliographic search API.
- Access: ручной поиск общедоступен; режим доступа к электронным объектам различается.
- Automation status: `MANUAL_ONLY`.
- Implemented: нет.
- Reason: документированный стабильный search/SRU/OAI endpoint не подтверждён.
- Evidence: [электронный каталог РГБ](https://www.rsl.ru/elektronnye-resursy/elektronnyy-katalog), [API ОЭК](https://oek.rsl.ru/page/api_p1).

### НЭБ

- Official machine interface: публичного API/OAI для discovery не найдено.
- Protocol: только web-каталог в подтверждённом доступе.
- Access: metadata records доступны вручную; доступ к объектам зависит от прав и авторизации.
- Automation status: `MANUAL_ONLY`.
- Implemented: нет.
- Reason: официальный machine contract отсутствует; пользовательское соглашение отдельно запрещает массовое автоматизированное скачивание объектов.
- Evidence: [каталог НЭБ](https://rusneb.ru/catalog/), [пользовательское соглашение](https://rusneb.ru/user-agreement/).

### КиберЛенинка

- Official machine interface: `https://cyberleninka.ru/oai`.
- Protocol: OAI-PMH 2.0; `Identify`, `ListMetadataFormats`, `ListSets`, `ListRecords`; metadataPrefix `oai_dc`.
- Access: public, no authentication/API key. `Identify` вернул `CyberLeninka OAI repository`, earliest datestamp `2014-05-20T00:00:00Z`.
- Automation status: `IMPLEMENT`.
- Implemented: generic OAI adapter с default нефтегазовым set `journal_9416` и проверенным topic routing (`journal_35058` для PVT/modeling, `journal_32093` для well testing, `journal_30227` для historical hydromechanics), local deterministic relevance gate и resumption token.
- Reason: официальный открытый machine-readable интерфейс; КиберЛенинка публикует Open Access metadata и тексты. PLAST не скачивает тексты.
- Evidence: [OAI Identify](https://cyberleninka.ru/oai?verb=Identify), [metadata formats](https://cyberleninka.ru/oai?verb=ListMetadataFormats), [условия](https://cyberleninka.ru/terms.html).

### Электронная нефтегазовая библиотека Губкина

- Official machine interface: не подтверждён.
- Protocol: web application; путь `/oai/request` возвращает HTML shell, а не OAI XML.
- Access: официальный экран предлагает вход студентам, сотрудникам и партнёрам.
- Automation status: `REQUIRES_PERMISSION`.
- Implemented: нет.
- Reason: высокая профильность не оправдывает использование внутренних endpoints или обход login.
- Evidence: [Электронная нефтегазовая библиотека](https://elib.gubkin.ru/).

### ТИУ

- Official machine interface: не подтверждён.
- Protocol: официальный материал называет ИРБИС64+; OAI/SRU endpoint не найден.
- Access: каталог/электронная библиотека связаны с учётной записью читателя/Educon.
- Automation status: `REQUIRES_PERMISSION`.
- Implemented: нет.
- Reason: публичный machine interface и разрешение на harvesting отсутствуют.
- Evidence: [Библиотечно-издательский комплекс](https://www.tyuiu.ru/infrastruktura/bibliotecno-izdatelskii-kompleks), [описание ИРБИС64+](https://news.tyuiu.ru/biblioteka-u-vas-doma).

### ТПУ

- Official machine interface: текущий публичный DSpace web archive.
- Protocol check: `/oai/request`, `/jspui/oai/request` и `/server/oai/request` вернули 404; `/rest/items` и `/rest/search` — 403.
- Access: HTML metadata records и ручной поиск публичны.
- Automation status: `DEFER`.
- Implemented: нет.
- Reason: существование DSpace не считается доказательством доступного OAI; scraping не добавлен.
- Evidence: [электронный архив ТПУ](https://earchive.tpu.ru/), [структура коллекций](https://earchive.tpu.ru/community-list?locale=ru).

### Санкт-Петербургский горный университет

- Official machine interface: не подтверждён.
- Protocol: web-каталог/Mark-SQL; публичный OAI/SRU не найден.
- Access: официальная страница ограничивает электронные ресурсы зарегистрированными пользователями; каталог описывается как доступный во внутренней сети.
- Automation status: `REQUIRES_PERMISSION`.
- Implemented: нет.
- Reason: не обходить регистрацию и внутреннюю сеть.
- Evidence: [электронные ресурсы](https://spmi.ru/elektronnye-resursy), [описание каталога](https://spmi.ru/index.php/poleznaa-informacia).

### КФУ — Институт геологии и нефтегазовых технологий

- Official machine interface: `https://dspace.kpfu.ru/oai/request`.
- Protocol: OAI-PMH 2.0; `Identify`, `ListMetadataFormats`, `ListSets`, `ListRecords`; `oai_dc` и resumption tokens.
- Access: public, no authentication/API key. Профильный set `com_net_6046` соответствует Институту геологии и нефтегазовых технологий.
- Automation status: `IMPLEMENT`.
- Implemented: тот же generic OAI adapter; bounded local filtering внутри профильного community `com_net_6046` и его collections `col_net_6048`/`col_net_6049` для scientific/educational metadata.
- Reason: официальный профильный repository с устойчивым machine interface и книгами, учебно-методическими материалами и научными публикациями.
- Evidence: [OAI Identify](https://dspace.kpfu.ru/oai/request?verb=Identify), [профильная community](https://dspace.kpfu.ru/xmlui/handle/net/6046), [официальная страница института](https://geo.kpfu.ru/home2/).

## Реализованные ограничения

- OAI используется как bounded metadata harvesting, а не как полный export: CyberLeninka — максимум 30 raw records/query и 3 страницы; KFU — 200 records/query и 2 страницы; CLI limits могут уменьшить эти значения.
- Между resumption pages — пауза 1 секунда; глобальная concurrency по умолчанию `1`.
- Повторный token, `429`, `5xx`, timeout, malformed XML и слишком большой response обрабатываются явно.
- `DOCTYPE`/`ENTITY` запрещены до парсинга; external entities не разрешаются.
- HTML fragments очищаются; `javascript:`, `data:` и `file:` URL отбрасываются общей URL normalization.
- Сохраняется только metadata и access hint. PDF не загружается.

## Что отложено

Нет scraper для РГБ, НЭБ, Губкина, ТИУ, ТПУ или Горного университета. Следующий пересмотр возможен только при появлении официального API/OAI/SRU или явного разрешения владельца ресурса.
