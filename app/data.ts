export const materialTypes = ["book", "article", "guide", "manual", "standard"] as const;
export type MaterialType = (typeof materialTypes)[number];

export const materialLanguages = ["ru", "en"] as const;
export type MaterialLanguage = (typeof materialLanguages)[number];

export interface Material {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  year?: number;
  type: MaterialType;
  language: MaterialLanguage;
  topics: string[];
  aliases: string[];
  description: string;
  coverColor?: string;
  coverImage?: string;
  externalUrl?: string;
  source?: { name: string; url?: string };
  verified: boolean;
}

export interface KnowledgeTopic {
  id: string;
  slug: string;
  title: string;
  group: string;
  aliases: string[];
}

export interface KnowledgeArea {
  id: string;
  number: string;
  title: string;
  slug: string;
  description: string;
  topics: KnowledgeTopic[];
}

type TopicDefinition = Omit<KnowledgeTopic, "id" | "group" | "aliases"> & { aliases?: string[] };
type AreaDefinition = Omit<KnowledgeArea, "topics"> & { topics: TopicDefinition[] };

function defineArea(definition: AreaDefinition): KnowledgeArea {
  return {
    ...definition,
    topics: definition.topics.map((topic) => ({
      ...topic,
      id: topic.slug,
      group: definition.id,
      aliases: topic.aliases ?? [],
    })),
  };
}

export const knowledgeAreas: KnowledgeArea[] = [
  defineArea({
    id: "reservoir-characterization", number: "01", title: "Геология и характеристика пласта", slug: "reservoir-characterization",
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
  }),
  defineArea({
    id: "reservoir-fluids", number: "02", title: "Флюиды и физика пласта", slug: "reservoir-fluids",
    description: "Свойства пластовых флюидов и процессы многофазной фильтрации.",
    topics: [
      { title: "PVT-свойства", slug: "pvt", aliases: ["PVT"] },
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
  }),
  defineArea({
    id: "field-development", number: "03", title: "Разработка месторождений", slug: "field-development",
    description: "Проектирование, моделирование, анализ и управление разработкой.",
    topics: [
      { title: "Основы разработки месторождений", slug: "development" },
      { title: "Разработка нефтяных месторождений", slug: "oil-field-development" },
      { title: "Разработка газовых месторождений", slug: "gas-field-development" },
      { title: "Разработка газоконденсатных месторождений", slug: "gas-condensate-field-development" },
      { title: "Гидродинамическое моделирование", slug: "modeling", aliases: ["ГДМ"] },
      { title: "Гидродинамические исследования скважин", slug: "well-testing", aliases: ["ГДИС"] },
      { title: "Анализ разработки", slug: "development-analysis" },
      { title: "ППД", slug: "reservoir-pressure-maintenance" },
      { title: "Методы увеличения нефтеотдачи", slug: "enhanced-oil-recovery", aliases: ["МУН"] },
      { title: "Управление разработкой", slug: "development-management" },
      { title: "Прогнозирование разработки", slug: "development-forecasting" },
      { title: "Неопределённости и риски", slug: "uncertainty-and-risk" },
    ],
  }),
  defineArea({
    id: "wells", number: "04", title: "Скважины", slug: "wells",
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
      { title: "Ремонтно-изоляционные работы", slug: "remedial-cementing", aliases: ["РИР"] },
      { title: "Капитальный ремонт скважин", slug: "well-workover", aliases: ["КРС"] },
      { title: "Интенсификация добычи", slug: "production-stimulation" },
      { title: "Скважинное оборудование", slug: "downhole-equipment" },
    ],
  }),
  defineArea({
    id: "gathering-processing-transport", number: "05", title: "Сбор, подготовка и транспорт", slug: "gathering-processing-transport",
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
  }),
  defineArea({
    id: "engineering-adjacent", number: "06", title: "Инженерные и смежные направления", slug: "engineering-adjacent",
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
  }),
];

export const allTopics = knowledgeAreas.flatMap((area) => area.topics);

export function getTopicById(id: string | undefined) {
  return allTopics.find((topic) => topic.id === id);
}

const featuredTopicIds = ["geology", "petrophysics", "pvt", "geomodeling", "development", "modeling", "well-testing", "production"];
export const topics = featuredTopicIds.map(getTopicById).filter((topic): topic is KnowledgeTopic => Boolean(topic));

export const materialTypeLabels: Record<MaterialType, string> = {
  book: "Книга", article: "Статья", guide: "Руководство", manual: "Техническая документация", standard: "Стандарт",
};

export const materialLanguageLabels: Record<MaterialLanguage, string> = { ru: "Русский", en: "English" };

export const materials: Material[] = [
  {
    id: "mat-reservoir-engineering", slug: "reservoir-engineering", title: "Физика нефтяного и газового пласта",
    authors: ["А. М. Коновалов"], year: 2024, type: "guide", language: "ru",
    topics: ["petrophysics", "pvt", "reservoir-physics"], aliases: ["пластовые флюиды"],
    description: "Системное введение в свойства коллекторов, пластовых флюидов и процессы фильтрации. Материал связывает фундаментальные зависимости с инженерными расчётами.",
    coverColor: "#9c6538", verified: false,
  },
  {
    id: "mat-well-test-analysis", slug: "well-test-analysis", title: "Гидродинамические исследования скважин",
    authors: ["И. Н. Миронов"], year: 2023, type: "book", language: "ru",
    topics: ["well-testing", "development-analysis"], aliases: ["ГДИС", "давление"],
    description: "Практическое руководство по планированию, проведению и интерпретации ГДИС для различных режимов работы скважины.",
    coverColor: "#3b586b", verified: false,
  },
  {
    id: "mat-reservoir-simulation", slug: "reservoir-simulation", title: "Гидродинамическое моделирование",
    authors: ["К. С. Беляева"], year: 2025, type: "book", language: "ru",
    topics: ["modeling", "development-forecasting", "uncertainty-and-risk"], aliases: ["ГДМ", "адаптация модели"],
    description: "От построения сетки и инициализации до адаптации исторических данных и оценки сценариев разработки.",
    coverColor: "#8c4734", verified: false,
  },
  {
    id: "mat-pvt-properties", slug: "pvt-properties", title: "PVT-свойства пластовых флюидов",
    authors: ["М. В. Каримов"], year: 2022, type: "guide", language: "ru",
    topics: ["pvt", "phase-equilibria", "gas-condensate-systems"], aliases: ["PVT-анализ", "флюиды"],
    description: "Методы лабораторных исследований, контроль качества данных и подготовка флюидальной модели.",
    coverColor: "#3f5c50", verified: false,
  },
  {
    id: "mat-geological-modeling", slug: "geological-modeling", title: "Основы геологического моделирования",
    authors: ["Е. А. Соколова"], year: 2024, type: "guide", language: "ru",
    topics: ["geology", "geomodeling", "uncertainty-and-risk"], aliases: ["геомоделирование"],
    description: "Структурный каркас, фациальное моделирование и оценка неопределённостей геологической модели.",
    coverColor: "#5e536a", verified: false,
  },
  {
    id: "mat-eor-review", slug: "eor-review", title: "Методы увеличения нефтеотдачи: обзор",
    authors: ["Редакция ПЛАСТ"], year: 2025, type: "article", language: "ru",
    topics: ["enhanced-oil-recovery", "development"], aliases: ["МУН", "EOR"],
    description: "Краткий обзор основных групп методов увеличения нефтеотдачи и условий их инженерного применения.",
    coverColor: "#6c5539", verified: false,
  },
  {
    id: "mat-eclipse-manual", slug: "eclipse-manual", title: "Руководство по подготовке модели ECLIPSE",
    authors: ["Учебный центр"], year: 2024, type: "manual", language: "en",
    topics: ["eclipse", "modeling", "petroleum-software"], aliases: ["ECLIPSE", "симулятор"],
    description: "Демонстрационная карточка технического руководства по структуре исходных данных и подготовке расчётной модели.",
    coverColor: "#48515c", verified: false,
  },
];

export const books = materials.slice(0, 5);
