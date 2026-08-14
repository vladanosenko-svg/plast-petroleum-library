export type Material = {
  slug: string;
  title: string;
  author: string;
  year: string;
  type: string;
  language: string;
  description?: string;
  tone?: string;
  topics?: string[];
  aliases?: string[];
};

export type Book = Material & {
  description: string;
  tone: string;
  topics: string[];
};

export type KnowledgeTopic = {
  title: string;
  slug: string;
  aliases?: string[];
};

export type KnowledgeArea = {
  id: string;
  number: string;
  title: string;
  slug: string;
  description?: string;
  topics: KnowledgeTopic[];
};

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

export const knowledgeAreas: KnowledgeArea[] = [
  {
    id: "reservoir-characterization",
    number: "01",
    title: "Геология и характеристика пласта",
    slug: "reservoir-characterization",
    description: "Строение залежи, свойства коллектора и методы исследования недр.",
    topics: [
      { title: "Геология нефти и газа", slug: "geology" },
      { title: "Геофизика", slug: "geophysics" },
      { title: "Геофизические исследования скважин (ГИС)", slug: "well-logging", aliases: ["ГИС"] },
      { title: "Интерпретация ГИС", slug: "well-log-interpretation", aliases: ["ГИС"] },
      { title: "Петрофизика", slug: "petrophysics" },
      { title: "Геологическое моделирование", slug: "geomodeling" },
      { title: "Сейсморазведка", slug: "seismic-exploration" },
      { title: "Геомеханика", slug: "geomechanics" },
      { title: "Подсчёт запасов", slug: "reserves-estimation" },
    ],
  },
  {
    id: "reservoir-fluids",
    number: "02",
    title: "Флюиды и физика пласта",
    slug: "reservoir-fluids",
    description: "Свойства пластовых флюидов и процессы многофазной фильтрации.",
    topics: [
      { title: "PVT", slug: "pvt" },
      { title: "Физика нефтяного и газового пласта", slug: "reservoir-physics" },
      { title: "Подземная гидромеханика", slug: "subsurface-hydromechanics" },
      { title: "Фильтрация в пористых средах", slug: "porous-media-flow" },
      { title: "Фазовые равновесия", slug: "phase-equilibria" },
      { title: "Относительные фазовые проницаемости", slug: "relative-permeability" },
      { title: "Капиллярное давление", slug: "capillary-pressure" },
      { title: "SCAL", slug: "scal" },
      { title: "Свойства пластовых вод", slug: "formation-water-properties" },
      { title: "Газоконденсатные системы", slug: "gas-condensate-systems" },
    ],
  },
  {
    id: "field-development",
    number: "03",
    title: "Разработка месторождений",
    slug: "field-development",
    description: "Проектирование, моделирование, анализ и управление разработкой.",
    topics: [
      { title: "Основы разработки месторождений", slug: "development" },
      { title: "Разработка нефтяных месторождений", slug: "oil-field-development" },
      { title: "Разработка газовых месторождений", slug: "gas-field-development" },
      { title: "Разработка газоконденсатных месторождений", slug: "gas-condensate-field-development" },
      { title: "Гидродинамическое моделирование", slug: "modeling", aliases: ["ГДМ"] },
      { title: "Гидродинамические исследования скважин (ГДИС)", slug: "well-testing", aliases: ["ГДИС"] },
      { title: "Анализ разработки", slug: "development-analysis" },
      { title: "ППД", slug: "reservoir-pressure-maintenance" },
      { title: "Методы увеличения нефтеотдачи (МУН)", slug: "enhanced-oil-recovery", aliases: ["МУН"] },
      { title: "Управление разработкой", slug: "development-management" },
      { title: "Прогнозирование разработки", slug: "development-forecasting" },
      { title: "Неопределённости и риски", slug: "uncertainty-and-risk" },
    ],
  },
  {
    id: "wells",
    number: "04",
    title: "Скважины",
    slug: "wells",
    description: "Жизненный цикл скважины: от бурения до ремонта и эксплуатации.",
    topics: [
      { title: "Бурение", slug: "drilling" },
      { title: "Конструкция скважин", slug: "well-construction" },
      { title: "Заканчивание скважин", slug: "well-completion" },
      { title: "Освоение скважин", slug: "well-startup" },
      { title: "Эксплуатация скважин", slug: "production" },
      { title: "Механизированная добыча", slug: "artificial-lift" },
      { title: "Газлифт", slug: "gas-lift" },
      { title: "ГРП", slug: "hydraulic-fracturing" },
      { title: "Ремонтно-изоляционные работы (РИР)", slug: "remedial-cementing", aliases: ["РИР"] },
      { title: "Капитальный ремонт скважин (КРС)", slug: "well-workover", aliases: ["КРС"] },
      { title: "Интенсификация добычи", slug: "production-stimulation" },
      { title: "Скважинное оборудование", slug: "downhole-equipment" },
    ],
  },
  {
    id: "gathering-processing-transport",
    number: "05",
    title: "Сбор, подготовка и транспорт",
    slug: "gathering-processing-transport",
    description: "Промысловые системы от устья скважины до товарной продукции.",
    topics: [
      { title: "Сбор продукции скважин", slug: "wellstream-gathering" },
      { title: "Промысловая подготовка нефти", slug: "oil-processing" },
      { title: "Подготовка газа", slug: "gas-processing" },
      { title: "Подготовка газового конденсата", slug: "gas-condensate-processing" },
      { title: "Подготовка пластовой воды", slug: "formation-water-treatment" },
      { title: "Сепарация", slug: "separation" },
      { title: "Компримирование газа", slug: "gas-compression" },
      { title: "Трубопроводный транспорт", slug: "pipeline-transport" },
      { title: "Наземная инфраструктура", slug: "surface-facilities" },
      { title: "Интегрированное моделирование", slug: "integrated-modeling" },
    ],
  },
  {
    id: "engineering-adjacent",
    number: "06",
    title: "Инженерные и смежные направления",
    slug: "engineering-adjacent",
    description: "Инструменты, экономика, нормативы и управление отраслевыми системами.",
    topics: [
      { title: "Нефтегазовое программное обеспечение", slug: "petroleum-software" },
      { title: "tNavigator", slug: "tnavigator" },
      { title: "Petrel", slug: "petrel" },
      { title: "Eclipse", slug: "eclipse" },
      { title: "CMG", slug: "cmg" },
      { title: "Экономика разработки", slug: "development-economics" },
      { title: "Проектирование разработки", slug: "development-design" },
      { title: "Нормативная документация", slug: "regulatory-documentation" },
      { title: "Промышленная безопасность", slug: "industrial-safety" },
      { title: "Экология", slug: "environment" },
      { title: "Управление данными", slug: "data-management" },
      { title: "Автоматизация и цифровизация", slug: "automation-and-digitalization" },
    ],
  },
];

export const books: Book[] = [
  { slug: "reservoir-engineering", title: "Физика нефтяного и газового пласта", author: "А. М. Коновалов", year: "2024", type: "Учебное пособие", language: "Русский", description: "Системное введение в свойства коллекторов, пластовых флюидов и процессы фильтрации. Материал связывает фундаментальные зависимости с инженерными расчётами.", tone: "ochre", topics: ["Петрофизика", "PVT", "Разработка"] },
  { slug: "well-test-analysis", title: "Гидродинамические исследования скважин", author: "И. Н. Миронов", year: "2023", type: "Книга", language: "Русский", description: "Практическое руководство по планированию, проведению и интерпретации ГДИС для различных режимов работы скважины.", tone: "blue", topics: ["ГДИС", "Скважины", "Давление"] },
  { slug: "reservoir-simulation", title: "Гидродинамическое моделирование", author: "К. С. Беляева", year: "2025", type: "Книга", language: "Русский", description: "От построения сетки и инициализации до адаптации исторических данных и оценки сценариев разработки.", tone: "rust", topics: ["ГДМ", "Адаптация", "Прогноз"] },
  { slug: "pvt-properties", title: "PVT-свойства пластовых флюидов", author: "М. В. Каримов", year: "2022", type: "Справочник", language: "Русский", description: "Методы лабораторных исследований, контроль качества данных и подготовка флюидальной модели.", tone: "green", topics: ["PVT", "Флюиды", "Лаборатория"] },
  { slug: "geological-modeling", title: "Основы геологического моделирования", author: "Е. А. Соколова", year: "2024", type: "Учебное пособие", language: "Русский", description: "Структурный каркас, фациальное моделирование и оценка неопределённостей геологической модели.", tone: "violet", topics: ["Геология", "Геомоделирование", "Неопределённость"] },
];

export const materials: Material[] = [
  ...books,
  { slug: "eor-review", title: "Методы увеличения нефтеотдачи: обзор", author: "Редакция", year: "2025", type: "Статья", language: "Русский" },
  { slug: "eclipse-manual", title: "Руководство по подготовке модели ECLIPSE", author: "Учебный центр", year: "2024", type: "Manual", language: "Русский" },
];
