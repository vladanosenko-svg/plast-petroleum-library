# Russian Discovery controlled smoke

Дата: 16 августа 2026 года. Network run ограничен темами `pvt`, `modeling`, `well-testing`; массовый harvest 65 topics не выполнялся. Для каждого query сохранялись только metadata; PDF не запрашивались.

## PVT

Russian queries:

- `PVT свойства пластовых флюидов`;
- `исследование пластовых флюидов`;
- для проверки coverage дополнительно `PVT анализ пластовых флюидов` и `свойства пластовой нефти`.

| Provider | Raw | Accepted | Merged | Russian-only | DOI | ISBN | Without cross-provider ID |
|---|---:|---:|---:|---:|---:|---:|---:|
| CyberLeninka | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| KFU | 400 | 1 | 1 | 1 | 0 | 0 | 1 |

Title: «Особенности связи реологических свойств образцов высоковязкой нефти и природных битумов с данными самодиффузии, полученными методом ядерно-магнитного резонанса» (KFU, 2015). Manual relevance: `borderline` для классического PVT, но релевантен свойствам тяжёлой нефти.

## Modeling

Russian queries:

- `гидродинамическое моделирование нефтегазовых месторождений`;
- `моделирование разработки месторождений`.

| Provider | Raw | Accepted | Merged | Russian-only | DOI | ISBN | Without cross-provider ID |
|---|---:|---:|---:|---:|---:|---:|---:|
| CyberLeninka | 20 | 3 | 2 | 2 | 0 | 0 | 2 |
| KFU | 200 | 6 | 6 | 6 | 0 | 0 | 6 |

Representative titles:

- «Гидродинамическое моделирование. Подготовка гидродинамической модели в Petrel 2015 и инициализация в tNavigator»;
- «Моделирование нефтяных и газовых месторождений»;
- «Геостатистика: методические указания … “Моделирование месторождений углеводородов…”»;
- «Совместное геомеханическое и гидродинамическое моделирование участка ачимовских отложений…».

Manual relevance: `relevant 4`, `borderline 4`, `noise 0`. Borderline — общие материалы по разработке/бурению и отдельная геомеханическая модель, где modeling context есть в metadata, но title шире целевого reservoir simulation.

## Well testing / ГДИС

Russian queries:

- `гидродинамические исследования скважин`;
- `ГДИС нефтяных скважин`.

| Provider | Raw | Accepted | Merged | Russian-only | DOI | ISBN | Without cross-provider ID |
|---|---:|---:|---:|---:|---:|---:|---:|
| CyberLeninka | 20 | 1 | 1 | 1 | 0 | 0 | 1 |
| KFU | 200 | 2 | 2 | 2 | 0 | 0 | 2 |

Specific title: «Вычислительные эксперименты для анализа гидродинамических исследований скважин».

Manual relevance: `relevant 1`, `borderline 2`, `noise 0`. Два KFU books посвящены бурению и разработке нефтегазовых месторождений; ГДИС совпал в rich metadata, поэтому они сохранены как borderline, не verified.

## Comparison with 3D.1

| Topic | OpenAlex/Crossref unique in controlled run | Russian unique | Exact international/Russian overlap | Russian-only |
|---|---:|---:|---:|---:|
| PVT | 60 | 1 | 0 | 1 |
| Modeling | 72 | 8 | 0 | 8 |
| Well testing | 60 | 3 | 0 | 3 |

В общем staging после exact merge: 232 candidates, из них 222 international и 10 unique Russian-provider candidates. Две Russian records относятся одновременно к `modeling` и `well-testing`, поэтому сумма по topic выше 10. Все 10 Russian candidates — Russian-only в этом smoke; совпадений DOI/ISBN с international providers не было.

Примеры расширения относительно international discovery:

- русские университетские учебно-методические книги по гидродинамическому моделированию;
- русскоязычная статья по вычислительному анализу ГДИС;
- российские материалы по совместному геомеханическому и гидродинамическому моделированию.

## Literature types and identifiers

Russian unique candidates:

| Metric | Count |
|---|---:|
| books / educational books | 6 |
| journal articles | 4 |
| explicitly classified textbooks | 0 |
| explicitly classified study guides | 0 |
| dissertations | 0 |
| thesis abstracts | 0 |
| methodical materials | 0 |
| with DOI | 0 |
| with ISBN | 0 |
| without DOI/ISBN/international ID | 10 |

Live OAI `dc:type` в этом sample оказался coarse (`book`/`text`). Поэтому adapter не угадывает более узкий type. Fixture tests отдельно подтверждают conservative mapping учебника, пособия, диссертации, автореферата и методических указаний.

## Historical smoke

Отдельный один-page OAI smoke по CyberLeninka set журнала «Нефтяное хозяйство»:

```text
query: нефтяные месторождения
raw: 10
accepted: 1
```

Найдено: К. П. Калицкий, «Нефтяные месторождения Казанской, Уфимской и Самарской губерний». OAI record не отдаёт год, но [официальный архив журнала](https://oil-industry.net/Journal/archive_detail.php?ID=3085) относит материал к выпуску 1920 года. Это подтверждает способность OAI layer находить литературу XX века; год не выдумывается и остаётся пустым в candidate metadata.

## Interpretation

Количество не считается quality score. Russian gate дал небольшой, но профильный пул и сохранил no-DOI/no-ISBN records. Ни одна запись не стала verified Source и не появилась в `/library` автоматически.
