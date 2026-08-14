export type Book = { slug: string; title: string; author: string; year: string; type: string; language: string; description: string; tone: string; topics: string[] };

export const topics = [
  { slug: "geology", title: "Геология", description: "Строение недр, седиментология и нефтегазоносные системы." },
  { slug: "petrophysics", title: "Петрофизика", description: "Коллекторские свойства пород и интерпретация исследований." },
  { slug: "pvt", title: "PVT", description: "Фазовое поведение и свойства пластовых флюидов." },
  { slug: "geomodeling", title: "Геологическое моделирование", description: "Трёхмерное представление залежи и неопределённостей." },
  { slug: "development", title: "Разработка месторождений", description: "Системы разработки, заводнение и извлечение запасов." },
  { slug: "modeling", title: "Гидродинамическое моделирование", description: "Фильтрация, настройка модели и прогнозирование." },
  { slug: "well-testing", title: "ГДИС", description: "Исследование скважин и интерпретация давления." },
  { slug: "production", title: "Добыча", description: "Эксплуатация скважин, механизированная добыча и осложнения." },
];

export const books: Book[] = [
  { slug: "reservoir-engineering", title: "Физика нефтяного и газового пласта", author: "А. М. Коновалов", year: "2024", type: "Учебное пособие", language: "Русский", description: "Системное введение в свойства коллекторов, пластовых флюидов и процессы фильтрации. Материал связывает фундаментальные зависимости с инженерными расчётами.", tone: "ochre", topics: ["Петрофизика", "PVT", "Разработка"] },
  { slug: "well-test-analysis", title: "Гидродинамические исследования скважин", author: "И. Н. Миронов", year: "2023", type: "Книга", language: "Русский", description: "Практическое руководство по планированию, проведению и интерпретации ГДИС для различных режимов работы скважины.", tone: "blue", topics: ["ГДИС", "Скважины", "Давление"] },
  { slug: "reservoir-simulation", title: "Гидродинамическое моделирование", author: "К. С. Беляева", year: "2025", type: "Книга", language: "Русский", description: "От построения сетки и инициализации до адаптации исторических данных и оценки сценариев разработки.", tone: "rust", topics: ["ГДМ", "Адаптация", "Прогноз"] },
  { slug: "pvt-properties", title: "PVT-свойства пластовых флюидов", author: "М. В. Каримов", year: "2022", type: "Справочник", language: "Русский", description: "Методы лабораторных исследований, контроль качества данных и подготовка флюидальной модели.", tone: "green", topics: ["PVT", "Флюиды", "Лаборатория"] },
  { slug: "geological-modeling", title: "Основы геологического моделирования", author: "Е. А. Соколова", year: "2024", type: "Учебное пособие", language: "Русский", description: "Структурный каркас, фациальное моделирование и оценка неопределённостей геологической модели.", tone: "violet", topics: ["Геология", "Геомоделирование", "Неопределённость"] },
];

export const materials = [
  ...books,
  { slug: "eor-review", title: "Методы увеличения нефтеотдачи: обзор", author: "Редакция", year: "2025", type: "Статья", language: "Русский" },
  { slug: "eclipse-manual", title: "Руководство по подготовке модели ECLIPSE", author: "Учебный центр", year: "2024", type: "Manual", language: "Русский" },
];
