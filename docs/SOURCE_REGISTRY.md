# Source Registry

Этап 3A вводит `Source` как основную доменную сущность каталога. Модель остаётся JSON-сериализуемой и хранится в TypeScript до появления отдельной задачи на БД.

## Границы модели

```text
Source
├─ библиография: title, authors, year, type, language, publication, identifiers
├─ классификация: topics, keywords
├─ происхождение metadata: provenance[]
├─ права и доступ: access
├─ сведения о будущем файле: document?
├─ качество: quality
└─ состояние записи: recordStatus
```

`SourceDocument` содержит только metadata будущего файла. Бинарный документ, нормализованный текст, chunks и embeddings в Source Registry не входят.

## Статусы

- `demo` — тестовая запись интерфейса;
- `candidate` — найденный, но ещё не проверенный источник;
- `verified` — проверенная запись каталога.

Статус записи не заменяет access/rights. Полнотекстовый доступ и RAG-разрешение задаются независимо.

## Совместимость

Публичные URL остаются `/library` и `/library/[slug]`. Детальная taxonomy `SourceType` объединяется в пять стабильных групп фильтра, поэтому прежние query-параметры `book`, `article`, `guide`, `manual`, `standard` продолжают работать.

## Проверка и идентичность

`validateSourceRegistry()` централизованно проверяет уникальность, темы, enums, URL, год, identifiers, права и сведения о документе. `getSourceIdentityKeys()` создаёт детерминированные ключи DOI, ISBN и title-author-year, но ничего автоматически не объединяет.

`getTopicSourceCounts()` считает покрытие каждой из 65 тем по уровням `core`, `scientific`, `practical`, `supplementary`.

## Следующие этапы

Модель готова к добавлению Literature Discovery, Document Storage, Reader, ingestion pipeline и AI Engineer без смешивания их данных с библиографической записью.
