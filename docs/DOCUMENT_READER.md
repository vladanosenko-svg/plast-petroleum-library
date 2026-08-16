# Document Reader и controlled ingestion

## Пользовательский поток

Разрешённый файл проходит цепочку `local file → validation → SHA-256 → R2 PUT → HEAD verification → JSON manifest → Source → /library/{slug}/read`. Публичной upload-формы, remote downloader и отдельной базы нет.

## Controlled ingestion

Сначала файл можно проверить без обращения к production:

```bash
npm run document:inspect -- ./sample.pdf
```

Загрузка выполняется только локальным CLI через защищённый внутренний Worker endpoint:

```bash
npm run document:ingest -- \
  --source <source-id-or-slug> \
  --file ./sample.pdf \
  --endpoint https://<deployment-host> \
  --approve-local-storage
```

CLI читает `PLAST_DOCUMENT_INGESTION_TOKEN`; Worker получает соответствующий `DOCUMENT_INGESTION_TOKEN` как secret. Для закрытого Sites deployment CLI также принимает временный `PLAST_SITES_AUTH_TOKEN`. Значения не передаются аргументами, не записываются в Git и не должны попадать в логи. Ingestion token имеет минимальную длину 32 символа.

`--approve-local-storage` — обязательное осознанное разрешение для Source со статусом `metadata-only` или `external-fulltext`. Оно меняет только доступ к этому файлу; `ragPermission` остаётся прежним. При уже связанном документе операция останавливается, пока явно не указан `--replace`. Новый binary сначала загружается и проверяется, затем manifest атомарно заменяется. Старый object автоматически не удаляется.

Повторная загрузка того же binary определяется по детерминированному key. CLI проверяет metadata существующего object через HEAD и сообщает `duplicate`, не перезаписывая его.

Временный документ удаляется controlled-командой:

```bash
npm run document:ingest -- \
  --source <source-id-or-slug> \
  --endpoint https://<deployment-host> \
  --remove
```

## Manifest

Связь `sourceId → SourceDocument` хранится в `app/data/source-documents.json`. Binary в manifest отсутствует. При старте приложения manifest валидируется и безопасно объединяется с Source Registry. Проверяются существование sourceId, явное разрешение, формат, MIME, положительный размер, lowercase SHA-256 и key вида `documents/originals/{sourceId}/{sha256}.{extension}`. Некорректный manifest останавливает build, но runtime-ошибка отдельного R2 request не обрушает Worker.

## Reader route

Маршрут `/library/{slug}/read` показывает локальный документ, внешний источник или спокойное состояние недоступности. `/library/{slug}/document` остаётся единственным адресом binary; raw R2 URL не раскрывается. `?page=N` принимает только положительное целое и для PDF преобразуется в `#page=N`. Неверное значение даёт страницу 1.

На карточке Source:

- `local-fulltext` с реальным document — «Читать документ»;
- `external-fulltext` — «Открыть в источнике ↗», без проксирования;
- `metadata-only` — сообщение о недоступности полного текста.

## Форматы v1

- **PDF** — встроенный browser-native viewer в `iframe`, через PLAST route. Прокрутка, zoom и поиск зависят от браузера. Toolbar содержит открытие оригинала в новой вкладке; это также mobile fallback. Отдельной download-кнопки v1 нет.
- **DOCX** — client-side чтение безопасного `word/document.xml`; отображаются текст, headings, lists и простые tables. Relationships, macros, media и embedded objects не исполняются.
- **EPUB** — client-side чтение ZIP container, package manifest и spine; readable XHTML sections объединяются. DRM и сложная book navigation не поддерживаются.
- **HTML** — client-side allowlist sanitization. Scripts, styles, forms, embeds, event attributes, unsafe URLs и относительные resource URLs удаляются.
- **TXT** — текст выводится в `pre` с `pre-wrap` и редакционной типографикой.

DOCX/EPUB parser ограничивает число ZIP entries и распакованный объём, отклоняет traversal paths. Для всех non-PDF форматов original загружается только с same-origin PLAST route.

## Ошибки и безопасность

Отсутствующий Source даёт 404. Metadata-only возвращает 200 с понятным состоянием. Missing R2 object или R2 failure остаются request-scoped: reader показывает fallback, document route возвращает контролируемый 404/503 и пишет только `sourceId`, `storageKey`, operation и outcome.

Document response задаёт точный Content-Type, безопасный Content-Disposition, `nosniff`, same-origin resource policy и CSP; HTML дополнительно получает sandbox/default-src none. Поддерживаются только одиночные Range requests.

## Ограничения

- ingestion validation и SHA-256 буферизуют до 100 MiB целиком;
- multipart Range не поддерживается;
- mobile-возможности встроенного PDF viewer зависят от браузера;
- DOCX/EPUB rendering намеренно не воспроизводит сложную вёрстку;
- OCR, normalized text, chunks, embeddings, document search и AI/RAG отсутствуют.
