import { allTopics, sources } from "./data.ts";
import {
  getTopicSourceCounts,
  normalizeTitle,
  sourceRecordStatuses,
  sourceTypes,
  type Source,
  type SourceRecordStatus,
  type SourceType,
  type TopicSourceCount,
} from "./source-registry.ts";

export const corpusPriorities = ["critical", "high", "medium", "supporting"] as const;
export type CorpusPriority = (typeof corpusPriorities)[number];

export interface TopicCoverageTarget {
  minimum: number;
  ideal: number;
  minimumCore?: number;
  minimumScientific?: number;
  minimumPractical?: number;
}

export interface TopicCorpusProfile {
  topicId: string;
  ruSearchTerms: string[];
  enSearchTerms: string[];
  aliases: string[];
  relatedTopicIds: string[];
  preferredSourceTypes: SourceType[];
  priority: CorpusPriority;
  target: TopicCoverageTarget;
}

export const corpusPlan = {
  uniqueSourceTarget: { minimum: 1000, ideal: 1200, maximum: 1500 },
  languagePreference: { primary: "ru", secondary: "en" },
} as const;

const defaultTargets: Record<CorpusPriority, TopicCoverageTarget> = {
  critical: { minimum: 30, ideal: 60, minimumCore: 6, minimumScientific: 8, minimumPractical: 6 },
  high: { minimum: 20, ideal: 40, minimumCore: 4, minimumScientific: 6, minimumPractical: 4 },
  medium: { minimum: 12, ideal: 25, minimumCore: 2, minimumScientific: 4, minimumPractical: 3 },
  supporting: { minimum: 6, ideal: 15, minimumCore: 1, minimumScientific: 2, minimumPractical: 2 },
};

type ProfileDefinition = Omit<TopicCorpusProfile, "aliases" | "target"> & {
  target?: Partial<TopicCoverageTarget>;
};

const types = (...values: SourceType[]) => values;

const profileDefinitions: ProfileDefinition[] = [
  {
    topicId: "geology", priority: "critical",
    ruSearchTerms: ["геология нефти и газа", "нефтегазовая геология", "геология месторождений углеводородов", "нефтегазоносные бассейны", "условия залегания нефти и газа", "нефтегазовые системы"],
    enSearchTerms: ["petroleum geology", "oil and gas geology", "hydrocarbon geology", "petroleum systems", "petroleum basin analysis", "hydrocarbon accumulation"],
    relatedTopicIds: ["geophysics", "seismic-exploration", "geomodeling", "petrophysics", "reserves-estimation"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "review-article"),
    target: { ideal: 65 },
  },
  {
    topicId: "geophysics", priority: "high",
    ruSearchTerms: ["нефтегазовая геофизика", "промысловая геофизика", "геофизические методы разведки", "интерпретация геофизических данных", "геофизика месторождений"],
    enSearchTerms: ["exploration geophysics", "petroleum geophysics", "applied geophysics", "geophysical interpretation", "reservoir geophysics"],
    relatedTopicIds: ["geology", "seismic-exploration", "well-logging", "geomodeling"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "case-study"),
  },
  {
    topicId: "well-logging", priority: "critical",
    ruSearchTerms: ["геофизические исследования скважин", "ГИС", "каротаж скважин", "методы ГИС", "промыслово-геофизические исследования", "комплекс ГИС"],
    enSearchTerms: ["well logging", "wireline logging", "borehole geophysics", "formation evaluation", "open hole logging", "cased hole logging"],
    relatedTopicIds: ["geophysics", "well-log-interpretation", "petrophysics", "reserves-estimation", "drilling"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "journal-article", "technical-report"),
  },
  {
    topicId: "well-log-interpretation", priority: "high",
    ruSearchTerms: ["интерпретация ГИС", "комплексная интерпретация каротажа", "оценка коллекторов по ГИС", "петрофизическая интерпретация", "определение насыщения по ГИС"],
    enSearchTerms: ["well log interpretation", "petrophysical interpretation", "formation evaluation workflow", "log analysis", "shaly sand evaluation", "saturation from well logs"],
    relatedTopicIds: ["well-logging", "petrophysics", "geomodeling", "reserves-estimation"],
    preferredSourceTypes: types("book", "textbook", "practical-guide", "case-study", "software-documentation"),
  },
  {
    topicId: "petrophysics", priority: "critical",
    ruSearchTerms: ["петрофизика", "физика горных пород", "коллекторские свойства пород", "пористость проницаемость насыщенность", "петрофизическая модель", "лабораторные исследования керна"],
    enSearchTerms: ["petrophysics", "rock properties", "reservoir rock properties", "porosity permeability saturation", "petrophysical model", "routine core analysis"],
    relatedTopicIds: ["geology", "well-logging", "well-log-interpretation", "scal", "reservoir-physics", "geomodeling"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "technical-report", "practical-guide"),
    target: { ideal: 65 },
  },
  {
    topicId: "geomodeling", priority: "high",
    ruSearchTerms: ["геологическое моделирование", "трёхмерная геологическая модель", "структурное моделирование", "фациальное моделирование", "моделирование свойств пласта", "апскейлинг геологической модели"],
    enSearchTerms: ["geological modeling", "geological modelling", "static reservoir model", "facies modeling", "property modeling", "geostatistical reservoir modeling", "upscaling"],
    relatedTopicIds: ["geology", "seismic-exploration", "petrophysics", "reserves-estimation", "modeling", "uncertainty-and-risk", "petrel"],
    preferredSourceTypes: types("book", "textbook", "practical-guide", "journal-article", "case-study", "software-documentation"),
    target: { ideal: 45 },
  },
  {
    topicId: "seismic-exploration", priority: "high",
    ruSearchTerms: ["сейсморазведка", "сейсмическая интерпретация", "3D сейсморазведка", "сейсмическая инверсия", "сейсмогеологическое моделирование", "глубинное преобразование"],
    enSearchTerms: ["seismic exploration", "seismic interpretation", "3D seismic", "seismic inversion", "seismic reservoir characterization", "depth conversion", "well tie"],
    relatedTopicIds: ["geology", "geophysics", "geomodeling", "reserves-estimation"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "case-study"),
  },
  {
    topicId: "geomechanics", priority: "high",
    ruSearchTerms: ["геомеханика месторождений", "нефтегазовая геомеханика", "напряжённое состояние пород", "устойчивость ствола скважины", "геомеханическая модель", "пескопроявление"],
    enSearchTerms: ["reservoir geomechanics", "petroleum geomechanics", "rock mechanics", "wellbore stability", "geomechanical model", "sand production"],
    relatedTopicIds: ["geology", "petrophysics", "drilling", "well-construction", "hydraulic-fracturing", "production"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "spe-paper", "case-study"),
  },
  {
    topicId: "reserves-estimation", priority: "high",
    ruSearchTerms: ["подсчёт запасов нефти и газа", "оценка запасов углеводородов", "объёмный метод подсчёта запасов", "категории запасов", "геологические запасы", "извлекаемые запасы"],
    enSearchTerms: ["petroleum reserves estimation", "oil and gas reserves", "volumetric reserves calculation", "resources classification", "hydrocarbon volumes", "recoverable reserves"],
    relatedTopicIds: ["geology", "well-log-interpretation", "petrophysics", "geomodeling", "development-economics", "regulatory-documentation"],
    preferredSourceTypes: types("textbook", "book", "standard", "methodical-material", "technical-report", "practical-guide"),
  },
  {
    topicId: "pvt", priority: "critical",
    ruSearchTerms: ["PVT свойства", "исследование пластовых флюидов", "PVT анализ", "свойства пластовой нефти", "свойства пластового газа", "флюидальная модель", "уравнение состояния"],
    enSearchTerms: ["PVT", "reservoir fluid properties", "fluid characterization", "black oil PVT", "compositional PVT", "PVT analysis", "equation of state", "EOS tuning"],
    relatedTopicIds: ["phase-equilibria", "gas-condensate-systems", "reservoir-physics", "formation-water-properties", "modeling"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "review-article", "technical-report", "practical-guide"),
    target: { ideal: 70, minimumScientific: 10 },
  },
  {
    topicId: "reservoir-physics", priority: "critical",
    ruSearchTerms: ["физика нефтяного пласта", "физика газового пласта", "физика пласта", "свойства коллекторов и флюидов", "пластовые процессы", "нефтегазовая пластовая система"],
    enSearchTerms: ["reservoir physics", "oil reservoir physics", "gas reservoir physics", "reservoir rock and fluid properties", "reservoir processes", "reservoir system"],
    relatedTopicIds: ["petrophysics", "pvt", "subsurface-hydromechanics", "porous-media-flow", "well-testing", "development"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "review-article"),
    target: { ideal: 65 },
  },
  {
    topicId: "subsurface-hydromechanics", priority: "high",
    ruSearchTerms: ["подземная гидромеханика", "гидромеханика нефтяного пласта", "движение жидкостей в пласте", "уравнение пьезопроводности", "теория фильтрации", "неустановившаяся фильтрация"],
    enSearchTerms: ["subsurface hydrodynamics", "reservoir hydrodynamics", "fluid flow in reservoirs", "pressure diffusivity equation", "filtration theory", "transient porous media flow"],
    relatedTopicIds: ["reservoir-physics", "porous-media-flow", "well-testing", "modeling", "development"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "course-material"),
    target: { ideal: 45 },
  },
  {
    topicId: "porous-media-flow", priority: "critical",
    ruSearchTerms: ["фильтрация в пористых средах", "многофазная фильтрация", "закон Дарси", "течение в пористой среде", "фильтрация нефти газа и воды", "уравнения фильтрации"],
    enSearchTerms: ["porous media flow", "multiphase flow in porous media", "Darcy flow", "fluid flow through porous media", "oil gas water flow", "reservoir flow equations"],
    relatedTopicIds: ["reservoir-physics", "subsurface-hydromechanics", "relative-permeability", "capillary-pressure", "modeling", "well-testing"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "review-article"),
    target: { ideal: 65, minimumScientific: 10 },
  },
  {
    topicId: "phase-equilibria", priority: "high",
    ruSearchTerms: ["фазовые равновесия углеводородов", "фазовое поведение пластовых флюидов", "термодинамика пластовых флюидов", "фазовая диаграмма", "flash расчёт", "уравнения состояния углеводородов"],
    enSearchTerms: ["hydrocarbon phase equilibria", "reservoir fluid phase behavior", "phase envelope", "flash calculation", "phase stability", "cubic equation of state", "fugacity"],
    relatedTopicIds: ["pvt", "gas-condensate-systems", "reservoir-physics", "modeling", "gas-condensate-field-development"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "review-article"),
    target: { ideal: 45, minimumCore: 5, minimumScientific: 8, minimumPractical: 2 },
  },
  {
    topicId: "relative-permeability", priority: "high",
    ruSearchTerms: ["относительные фазовые проницаемости", "ОФП", "кривые относительной проницаемости", "двухфазная фильтрация", "трёхфазная проницаемость", "гистерезис ОФП"],
    enSearchTerms: ["relative permeability", "relative permeability curves", "two phase relative permeability", "three phase relative permeability", "relative permeability hysteresis", "SCAL relative permeability"],
    relatedTopicIds: ["petrophysics", "porous-media-flow", "capillary-pressure", "scal", "modeling", "enhanced-oil-recovery"],
    preferredSourceTypes: types("monograph", "journal-article", "review-article", "technical-report", "practical-guide", "spe-paper"),
    target: { ideal: 45, minimumScientific: 8 },
  },
  {
    topicId: "capillary-pressure", priority: "medium",
    ruSearchTerms: ["капиллярное давление", "кривые капиллярного давления", "капиллярные свойства пород", "функция Леверетта", "дренирование и пропитка", "переходная зона насыщения"],
    enSearchTerms: ["capillary pressure", "capillary pressure curves", "Leverett J-function", "drainage and imbibition", "saturation height function", "transition zone"],
    relatedTopicIds: ["petrophysics", "porous-media-flow", "relative-permeability", "scal", "geomodeling"],
    preferredSourceTypes: types("textbook", "monograph", "journal-article", "technical-report", "practical-guide"),
    target: { ideal: 30, minimumScientific: 5 },
  },
  {
    topicId: "scal", priority: "high",
    ruSearchTerms: ["специальные исследования керна", "SCAL", "ОФП и капиллярное давление", "смачиваемость породы", "лабораторное моделирование вытеснения", "масштабирование SCAL"],
    enSearchTerms: ["special core analysis", "SCAL", "wettability measurement", "relative permeability experiment", "capillary pressure measurement", "SCAL quality control", "SCAL upscaling"],
    relatedTopicIds: ["petrophysics", "relative-permeability", "capillary-pressure", "porous-media-flow", "modeling", "enhanced-oil-recovery"],
    preferredSourceTypes: types("monograph", "journal-article", "review-article", "technical-report", "practical-guide", "spe-paper"),
    target: { ideal: 45, minimumScientific: 8, minimumPractical: 5 },
  },
  {
    topicId: "formation-water-properties", priority: "medium",
    ruSearchTerms: ["свойства пластовых вод", "состав пластовой воды", "минерализация пластовых вод", "PVT пластовой воды", "совместимость вод", "солеотложение"],
    enSearchTerms: ["formation water properties", "reservoir brine composition", "brine salinity", "water PVT", "water compatibility", "scale precipitation"],
    relatedTopicIds: ["pvt", "reservoir-physics", "formation-water-treatment", "reservoir-pressure-maintenance", "environment"],
    preferredSourceTypes: types("book", "journal-article", "technical-report", "practical-guide", "standard"),
  },
  {
    topicId: "gas-condensate-systems", priority: "high",
    ruSearchTerms: ["газоконденсатные системы", "свойства газоконденсатных смесей", "ретроградная конденсация", "газоконденсатная характеристика", "фазовое поведение газоконденсатных флюидов", "конденсатный фактор"],
    enSearchTerms: ["gas condensate systems", "gas condensate fluid properties", "retrograde condensation", "gas condensate PVT", "condensate banking", "dew point pressure"],
    relatedTopicIds: ["pvt", "phase-equilibria", "reservoir-physics", "gas-condensate-field-development", "gas-condensate-processing", "modeling"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "spe-paper", "case-study"),
    target: { ideal: 50, minimumScientific: 8 },
  },
  {
    topicId: "development", priority: "critical",
    ruSearchTerms: ["разработка нефтяных и газовых месторождений", "основы разработки месторождений", "системы разработки", "режимы работы залежей", "показатели разработки", "коэффициент извлечения"],
    enSearchTerms: ["oil and gas field development", "reservoir engineering fundamentals", "reservoir development systems", "reservoir drive mechanisms", "development performance", "hydrocarbon recovery factor"],
    relatedTopicIds: ["reservoir-physics", "oil-field-development", "gas-field-development", "modeling", "development-analysis", "development-design"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "practical-guide", "case-study"),
    target: { ideal: 70 },
  },
  {
    topicId: "oil-field-development", priority: "high",
    ruSearchTerms: ["разработка нефтяных месторождений", "системы разработки нефтяных залежей", "заводнение нефтяных пластов", "нефтеотдача пластов", "проектирование разработки нефти", "регулирование разработки"],
    enSearchTerms: ["oil field development", "oil reservoir development", "waterflooding", "oil recovery", "oil development planning", "reservoir management"],
    relatedTopicIds: ["development", "reservoir-pressure-maintenance", "enhanced-oil-recovery", "modeling", "development-analysis", "production"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "spe-paper", "case-study"),
  },
  {
    topicId: "gas-field-development", priority: "high",
    ruSearchTerms: ["разработка газовых месторождений", "газовая динамика пласта", "режимы газовых залежей", "материальный баланс газа", "продуктивность газовых скважин", "проектирование разработки газа"],
    enSearchTerms: ["gas field development", "gas reservoir engineering", "gas reservoir drive", "gas material balance", "gas well deliverability", "gas development planning"],
    relatedTopicIds: ["development", "gas-condensate-field-development", "well-testing", "production", "gas-processing", "gas-compression"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "spe-paper", "case-study"),
    target: { ideal: 45 },
  },
  {
    topicId: "gas-condensate-field-development", priority: "high",
    ruSearchTerms: ["разработка газоконденсатных месторождений", "сайклинг процесс", "выпадение конденсата в пласте", "разработка газоконденсатной залежи", "поддержание пластового давления газом", "композиционное моделирование ГКМ"],
    enSearchTerms: ["gas condensate field development", "gas cycling", "condensate banking", "gas condensate reservoir engineering", "pressure maintenance by gas injection", "compositional gas condensate simulation"],
    relatedTopicIds: ["gas-condensate-systems", "phase-equilibria", "gas-field-development", "modeling", "well-testing", "gas-condensate-processing"],
    preferredSourceTypes: types("book", "monograph", "journal-article", "spe-paper", "technical-report", "case-study"),
    target: { ideal: 50, minimumScientific: 7 },
  },
  {
    topicId: "modeling", priority: "critical",
    ruSearchTerms: ["гидродинамическое моделирование", "моделирование разработки месторождений", "гидродинамическая модель пласта", "адаптация гидродинамической модели", "адаптация истории разработки", "динамическая модель месторождения", "моделирование фильтрации"],
    enSearchTerms: ["reservoir simulation", "reservoir modelling", "reservoir modeling", "dynamic reservoir model", "history matching", "black oil simulation", "compositional simulation", "reservoir flow simulation"],
    relatedTopicIds: ["development", "porous-media-flow", "pvt", "scal", "geomodeling", "development-forecasting", "uncertainty-and-risk", "petroleum-software"],
    preferredSourceTypes: types("textbook", "book", "monograph", "journal-article", "practical-guide", "case-study", "software-documentation"),
    target: { ideal: 75, minimumCore: 7, minimumScientific: 9, minimumPractical: 8 },
  },
  {
    topicId: "well-testing", priority: "critical",
    ruSearchTerms: ["гидродинамические исследования скважин", "ГДИС", "интерпретация кривых давления", "исследование на восстановление давления", "КВД", "исследование на падение давления", "анализ переходных процессов"],
    enSearchTerms: ["well testing", "pressure transient analysis", "PTA", "pressure buildup test", "drawdown test", "well test interpretation", "rate transient analysis", "RTA"],
    relatedTopicIds: ["development-analysis", "production", "reservoir-physics", "porous-media-flow", "gas-field-development", "hydraulic-fracturing"],
    preferredSourceTypes: types("book", "textbook", "practical-guide", "journal-article", "spe-paper", "case-study"),
    target: { ideal: 65, minimumPractical: 8 },
  },
  {
    topicId: "development-analysis", priority: "high",
    ruSearchTerms: ["анализ разработки месторождения", "анализ показателей разработки", "динамика добычи", "анализ обводнённости", "материальный баланс", "диагностика разработки"],
    enSearchTerms: ["reservoir performance analysis", "field development analysis", "production performance", "water cut analysis", "material balance analysis", "reservoir surveillance"],
    relatedTopicIds: ["development", "modeling", "well-testing", "production", "development-management", "development-forecasting"],
    preferredSourceTypes: types("book", "journal-article", "practical-guide", "technical-report", "case-study", "spe-paper"),
  },
  {
    topicId: "reservoir-pressure-maintenance", priority: "high",
    ruSearchTerms: ["поддержание пластового давления", "ППД", "заводнение пласта", "система нагнетательных скважин", "приёмистость нагнетательных скважин", "баланс закачки и отбора"],
    enSearchTerms: ["reservoir pressure maintenance", "water injection", "waterflood management", "injection well performance", "voidage replacement", "pattern flooding"],
    relatedTopicIds: ["oil-field-development", "formation-water-properties", "formation-water-treatment", "development-analysis", "enhanced-oil-recovery", "surface-facilities"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "journal-article", "spe-paper", "case-study"),
  },
  {
    topicId: "enhanced-oil-recovery", priority: "high",
    ruSearchTerms: ["методы увеличения нефтеотдачи", "МУН", "третичные методы добычи", "тепловые методы повышения нефтеотдачи", "газовые методы МУН", "химические методы МУН"],
    enSearchTerms: ["enhanced oil recovery", "EOR", "improved oil recovery", "thermal recovery", "gas injection EOR", "chemical flooding", "polymer flooding"],
    relatedTopicIds: ["oil-field-development", "reservoir-pressure-maintenance", "relative-permeability", "scal", "production-stimulation", "modeling"],
    preferredSourceTypes: types("book", "monograph", "journal-article", "review-article", "spe-paper", "case-study"),
    target: { ideal: 50, minimumScientific: 8 },
  },
  {
    topicId: "development-management", priority: "medium",
    ruSearchTerms: ["управление разработкой месторождения", "регулирование разработки", "управление фондом скважин", "мониторинг разработки", "управление пластом", "оптимизация разработки"],
    enSearchTerms: ["reservoir management", "field development management", "well portfolio management", "reservoir surveillance", "closed loop reservoir management", "development optimization"],
    relatedTopicIds: ["development", "development-analysis", "development-forecasting", "uncertainty-and-risk", "integrated-modeling", "development-economics"],
    preferredSourceTypes: types("book", "practical-guide", "technical-report", "case-study", "spe-paper"),
  },
  {
    topicId: "development-forecasting", priority: "high",
    ruSearchTerms: ["прогнозирование разработки", "прогноз добычи нефти и газа", "технологические показатели разработки", "прогноз обводнённости", "анализ кривых падения добычи", "сценарии разработки"],
    enSearchTerms: ["reservoir performance forecasting", "production forecasting", "development forecast", "water cut forecast", "decline curve analysis", "field development scenarios"],
    relatedTopicIds: ["development", "modeling", "development-analysis", "uncertainty-and-risk", "development-economics", "integrated-modeling"],
    preferredSourceTypes: types("book", "journal-article", "practical-guide", "technical-report", "case-study", "spe-paper"),
  },
  {
    topicId: "uncertainty-and-risk", priority: "medium",
    ruSearchTerms: ["неопределённости в разработке месторождений", "оценка геологических рисков", "вероятностная оценка запасов", "анализ чувствительности", "Монте-Карло в нефтегазовой отрасли", "управление рисками разработки"],
    enSearchTerms: ["reservoir uncertainty", "geological risk assessment", "probabilistic reserves", "sensitivity analysis", "Monte Carlo petroleum", "development risk management"],
    relatedTopicIds: ["geomodeling", "modeling", "development-forecasting", "development-management", "development-economics", "development-design"],
    preferredSourceTypes: types("book", "journal-article", "review-article", "practical-guide", "case-study"),
  },
  {
    topicId: "drilling", priority: "critical",
    ruSearchTerms: ["бурение нефтяных и газовых скважин", "технология бурения", "режим бурения", "буровые растворы", "осложнения при бурении", "управление скважиной"],
    enSearchTerms: ["oil and gas well drilling", "drilling engineering", "drilling practices", "drilling fluids", "drilling problems", "well control"],
    relatedTopicIds: ["geomechanics", "well-construction", "well-completion", "downhole-equipment", "industrial-safety"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { ideal: 65, minimumPractical: 8 },
  },
  {
    topicId: "well-construction", priority: "high",
    ruSearchTerms: ["конструкция нефтяных и газовых скважин", "проектирование конструкции скважины", "обсадные колонны", "цементирование скважин", "крепление скважин", "барьеры скважины"],
    enSearchTerms: ["well construction", "well design", "casing design", "well cementing", "well integrity barriers", "casing and cement"],
    relatedTopicIds: ["drilling", "geomechanics", "well-completion", "remedial-cementing", "industrial-safety"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
  },
  {
    topicId: "well-completion", priority: "high",
    ruSearchTerms: ["заканчивание нефтяных и газовых скважин", "перфорация скважин", "компоновка заканчивания", "контроль пескопроявления", "горизонтальное заканчивание", "интеллектуальное заканчивание"],
    enSearchTerms: ["well completion", "well perforation", "completion design", "sand control", "horizontal well completion", "intelligent completion"],
    relatedTopicIds: ["well-construction", "well-startup", "production", "hydraulic-fracturing", "downhole-equipment", "geomechanics"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "spe-paper", "case-study"),
    target: { ideal: 45, minimumPractical: 6 },
  },
  {
    topicId: "well-startup", priority: "medium",
    ruSearchTerms: ["освоение скважин", "вызов притока", "очистка забоя скважины", "пуск скважины", "снижение противодавления", "освоение после бурения"],
    enSearchTerms: ["well startup", "well clean-up", "well unloading", "bringing a well on production", "flowback operations", "post drilling cleanup"],
    relatedTopicIds: ["well-completion", "production", "production-stimulation", "well-testing", "industrial-safety"],
    preferredSourceTypes: types("practical-guide", "technical-report", "standard", "case-study", "course-material"),
    target: { minimumPractical: 5, minimumScientific: 2 },
  },
  {
    topicId: "production", priority: "critical",
    ruSearchTerms: ["эксплуатация нефтяных и газовых скважин", "добыча нефти и газа", "технология эксплуатации скважин", "приток к скважине", "узловой анализ", "оптимизация добычи"],
    enSearchTerms: ["oil and gas well production", "production engineering", "well performance", "inflow performance relationship", "nodal analysis", "production optimization"],
    relatedTopicIds: ["well-testing", "well-completion", "artificial-lift", "gas-lift", "production-stimulation", "wellstream-gathering"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "journal-article", "spe-paper", "case-study"),
    target: { ideal: 70, minimumPractical: 9 },
  },
  {
    topicId: "artificial-lift", priority: "high",
    ruSearchTerms: ["механизированная добыча нефти", "механизированная эксплуатация скважин", "электроцентробежные насосы", "штанговые насосы", "подбор насосного оборудования", "оптимизация механизированного фонда"],
    enSearchTerms: ["artificial lift", "electric submersible pump", "ESP", "sucker rod pump", "artificial lift selection", "artificial lift optimization"],
    relatedTopicIds: ["production", "gas-lift", "downhole-equipment", "well-workover", "integrated-modeling"],
    preferredSourceTypes: types("book", "textbook", "practical-guide", "technical-report", "spe-paper", "case-study"),
    target: { ideal: 45, minimumPractical: 7 },
  },
  {
    topicId: "gas-lift", priority: "medium",
    ruSearchTerms: ["газлифт", "газлифтная эксплуатация скважин", "непрерывный газлифт", "периодический газлифт", "газлифтные клапаны", "оптимизация газлифта"],
    enSearchTerms: ["gas lift", "gas lift design", "continuous gas lift", "intermittent gas lift", "gas lift valves", "gas lift optimization"],
    relatedTopicIds: ["production", "artificial-lift", "downhole-equipment", "gas-compression", "integrated-modeling"],
    preferredSourceTypes: types("book", "practical-guide", "technical-report", "spe-paper", "case-study", "manual"),
    target: { ideal: 30, minimumPractical: 5 },
  },
  {
    topicId: "hydraulic-fracturing", priority: "high",
    ruSearchTerms: ["гидравлический разрыв пласта", "ГРП", "дизайн ГРП", "моделирование трещины ГРП", "проппантный ГРП", "диагностика ГРП"],
    enSearchTerms: ["hydraulic fracturing", "hydraulic fracture design", "fracture modeling", "propped fracture", "fracture diagnostics", "frac treatment"],
    relatedTopicIds: ["production-stimulation", "geomechanics", "well-completion", "production", "well-testing", "petrophysics"],
    preferredSourceTypes: types("book", "monograph", "journal-article", "practical-guide", "spe-paper", "case-study"),
    target: { ideal: 50, minimumScientific: 7, minimumPractical: 7 },
  },
  {
    topicId: "remedial-cementing", priority: "medium",
    ruSearchTerms: ["ремонтно-изоляционные работы", "РИР", "изоляция водопритока", "ликвидация межколонных перетоков", "ремонт цементного кольца", "селективная изоляция"],
    enSearchTerms: ["remedial cementing", "water shutoff", "zonal isolation", "cement sheath repair", "squeeze cementing", "selective water isolation"],
    relatedTopicIds: ["well-construction", "well-workover", "production", "formation-water-treatment", "industrial-safety"],
    preferredSourceTypes: types("practical-guide", "technical-report", "standard", "spe-paper", "case-study"),
    target: { minimumPractical: 5, minimumScientific: 2 },
  },
  {
    topicId: "well-workover", priority: "high",
    ruSearchTerms: ["капитальный ремонт скважин", "КРС", "подземный ремонт скважин", "ловильные работы", "глушение скважин", "восстановление работоспособности скважин"],
    enSearchTerms: ["well workover", "well intervention", "workover operations", "fishing operations", "well killing", "well restoration"],
    relatedTopicIds: ["production", "remedial-cementing", "downhole-equipment", "well-completion", "industrial-safety"],
    preferredSourceTypes: types("book", "practical-guide", "technical-report", "standard", "case-study", "course-material"),
    target: { minimumPractical: 6, minimumScientific: 3 },
  },
  {
    topicId: "production-stimulation", priority: "high",
    ruSearchTerms: ["интенсификация добычи нефти и газа", "методы воздействия на призабойную зону", "кислотная обработка", "обработка призабойной зоны", "повышение продуктивности скважин", "стимуляция скважин"],
    enSearchTerms: ["well stimulation", "production stimulation", "matrix acidizing", "near wellbore treatment", "productivity enhancement", "stimulation treatment"],
    relatedTopicIds: ["production", "hydraulic-fracturing", "well-startup", "well-workover", "enhanced-oil-recovery"],
    preferredSourceTypes: types("book", "practical-guide", "journal-article", "technical-report", "spe-paper", "case-study"),
    target: { ideal: 45, minimumPractical: 7 },
  },
  {
    topicId: "downhole-equipment", priority: "medium",
    ruSearchTerms: ["скважинное оборудование", "подземное оборудование скважин", "насосно-компрессорные трубы", "пакерное оборудование", "внутрискважинное оборудование", "компоновка НКТ"],
    enSearchTerms: ["downhole equipment", "subsurface well equipment", "production tubing", "packer systems", "downhole tools", "tubing completion string"],
    relatedTopicIds: ["well-completion", "production", "artificial-lift", "gas-lift", "well-workover"],
    preferredSourceTypes: types("manual", "practical-guide", "technical-report", "standard", "software-documentation", "case-study"),
    target: { minimumPractical: 5, minimumScientific: 2 },
  },
  {
    topicId: "wellstream-gathering", priority: "high",
    ruSearchTerms: ["сбор продукции скважин", "система нефтегазосбора", "промысловый сбор нефти и газа", "многофазный транспорт продукции", "замер продукции скважин", "промысловые трубопроводы"],
    enSearchTerms: ["wellstream gathering", "production gathering system", "oil and gas gathering", "multiphase gathering", "well production metering", "field flowlines"],
    relatedTopicIds: ["production", "separation", "oil-processing", "gas-processing", "pipeline-transport", "surface-facilities"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { ideal: 45, minimumPractical: 6 },
  },
  {
    topicId: "oil-processing", priority: "high",
    ruSearchTerms: ["промысловая подготовка нефти", "обезвоживание нефти", "обессоливание нефти", "деэмульсация нефти", "стабилизация нефти", "установки подготовки нефти"],
    enSearchTerms: ["field oil processing", "oil dehydration", "oil desalting", "crude oil demulsification", "crude stabilization", "oil treatment facilities"],
    relatedTopicIds: ["wellstream-gathering", "separation", "formation-water-treatment", "surface-facilities", "pipeline-transport"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { minimumPractical: 6 },
  },
  {
    topicId: "gas-processing", priority: "high",
    ruSearchTerms: ["промысловая подготовка газа", "осушка природного газа", "очистка газа от кислых компонентов", "низкотемпературная сепарация", "подготовка природного газа", "газопереработка"],
    enSearchTerms: ["field gas processing", "natural gas dehydration", "acid gas removal", "low temperature separation", "natural gas treatment", "gas processing"],
    relatedTopicIds: ["gas-field-development", "wellstream-gathering", "gas-condensate-processing", "separation", "gas-compression", "surface-facilities"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { ideal: 45, minimumPractical: 6 },
  },
  {
    topicId: "gas-condensate-processing", priority: "medium",
    ruSearchTerms: ["подготовка газового конденсата", "стабилизация газового конденсата", "деэтанизация конденсата", "переработка нестабильного конденсата", "конденсатопровод", "промысловая обработка конденсата"],
    enSearchTerms: ["gas condensate processing", "condensate stabilization", "condensate deethanization", "unstable condensate treatment", "condensate handling", "field condensate processing"],
    relatedTopicIds: ["gas-condensate-systems", "gas-condensate-field-development", "gas-processing", "separation", "surface-facilities"],
    preferredSourceTypes: types("book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { ideal: 30, minimumPractical: 5 },
  },
  {
    topicId: "formation-water-treatment", priority: "medium",
    ruSearchTerms: ["подготовка пластовой воды", "очистка попутно добываемой воды", "водоподготовка для ППД", "утилизация пластовой воды", "обезмасливание воды", "качество закачиваемой воды"],
    enSearchTerms: ["produced water treatment", "formation water treatment", "injection water treatment", "produced water disposal", "deoiling produced water", "injection water quality"],
    relatedTopicIds: ["formation-water-properties", "reservoir-pressure-maintenance", "oil-processing", "environment", "surface-facilities"],
    preferredSourceTypes: types("practical-guide", "technical-report", "standard", "journal-article", "case-study"),
    target: { minimumPractical: 5 },
  },
  {
    topicId: "separation", priority: "high",
    ruSearchTerms: ["сепарация нефти и газа", "нефтегазовые сепараторы", "многоступенчатая сепарация", "трёхфазная сепарация", "расчёт сепараторов", "промысловая сепарация"],
    enSearchTerms: ["oil and gas separation", "production separators", "multistage separation", "three phase separator", "separator sizing", "field separation"],
    relatedTopicIds: ["wellstream-gathering", "oil-processing", "gas-processing", "gas-condensate-processing", "surface-facilities"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { minimumPractical: 6 },
  },
  {
    topicId: "gas-compression", priority: "medium",
    ruSearchTerms: ["компримирование природного газа", "дожимная компрессорная станция", "газовые компрессоры", "расчёт компрессора", "компрессорные станции", "оптимизация компримирования"],
    enSearchTerms: ["natural gas compression", "booster compressor station", "gas compressors", "compressor sizing", "compressor station", "compression optimization"],
    relatedTopicIds: ["gas-field-development", "gas-processing", "gas-lift", "pipeline-transport", "surface-facilities", "integrated-modeling"],
    preferredSourceTypes: types("textbook", "book", "manual", "practical-guide", "technical-report", "standard"),
    target: { ideal: 30, minimumPractical: 5 },
  },
  {
    topicId: "pipeline-transport", priority: "high",
    ruSearchTerms: ["трубопроводный транспорт нефти и газа", "промысловые трубопроводы", "гидравлический расчёт трубопроводов", "многофазное течение в трубах", "режимы течения газожидкостной смеси", "надёжность трубопроводов"],
    enSearchTerms: ["oil and gas pipeline transport", "flowline hydraulics", "pipeline hydraulic calculation", "multiphase pipe flow", "gas liquid flow regimes", "pipeline integrity"],
    relatedTopicIds: ["wellstream-gathering", "oil-processing", "gas-processing", "gas-compression", "surface-facilities", "integrated-modeling"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "journal-article"),
    target: { ideal: 45, minimumPractical: 6 },
  },
  {
    topicId: "surface-facilities", priority: "high",
    ruSearchTerms: ["обустройство нефтегазовых месторождений", "наземная инфраструктура месторождения", "промысловые сооружения", "технологическая схема подготовки", "проектирование объектов добычи", "нефтегазопромысловые объекты"],
    enSearchTerms: ["oil and gas surface facilities", "field development facilities", "production facilities", "process facilities design", "upstream facilities", "surface production system"],
    relatedTopicIds: ["wellstream-gathering", "oil-processing", "gas-processing", "separation", "pipeline-transport", "development-design"],
    preferredSourceTypes: types("textbook", "book", "practical-guide", "technical-report", "standard", "case-study"),
    target: { ideal: 45, minimumPractical: 6 },
  },
  {
    topicId: "integrated-modeling", priority: "high",
    ruSearchTerms: ["интегрированное моделирование месторождения", "интегрированная модель добычи", "модель пласт скважина сеть", "узловой анализ системы добычи", "оптимизация интегрированной модели", "связанные модели месторождения"],
    enSearchTerms: ["integrated asset modeling", "integrated production modeling", "reservoir well network model", "production system nodal analysis", "integrated model optimization", "coupled reservoir network simulation"],
    relatedTopicIds: ["modeling", "production", "wellstream-gathering", "pipeline-transport", "development-forecasting", "petroleum-software"],
    preferredSourceTypes: types("practical-guide", "journal-article", "spe-paper", "case-study", "software-documentation", "manual"),
    target: { ideal: 40, minimumPractical: 7 },
  },
  {
    topicId: "petroleum-software", priority: "medium",
    ruSearchTerms: ["нефтегазовое программное обеспечение", "программные комплексы для моделирования", "цифровые инструменты нефтегазовой отрасли", "ПО для разработки месторождений", "симуляторы пласта", "инженерное нефтегазовое ПО"],
    enSearchTerms: ["petroleum engineering software", "reservoir engineering software", "oil and gas modeling tools", "field development software", "reservoir simulators", "upstream engineering software"],
    relatedTopicIds: ["modeling", "integrated-modeling", "tnavigator", "petrel", "eclipse", "cmg", "data-management"],
    preferredSourceTypes: types("manual", "software-documentation", "practical-guide", "case-study", "course-material"),
    target: { minimumCore: 1, minimumScientific: 2, minimumPractical: 6 },
  },
  {
    topicId: "tnavigator", priority: "medium",
    ruSearchTerms: ["tNavigator руководство", "tNavigator гидродинамическое моделирование", "tNavigator модель пласта", "tNavigator адаптация модели", "tNavigator обучение", "tNavigator workflow"],
    enSearchTerms: ["tNavigator manual", "tNavigator reservoir simulation", "tNavigator reservoir model", "tNavigator history matching", "tNavigator tutorial", "tNavigator workflow"],
    relatedTopicIds: ["petroleum-software", "modeling", "geomodeling", "integrated-modeling", "pvt", "scal"],
    preferredSourceTypes: types("manual", "software-documentation", "practical-guide", "case-study", "course-material"),
    target: { minimum: 10, ideal: 22, minimumCore: 1, minimumScientific: 1, minimumPractical: 7 },
  },
  {
    topicId: "petrel", priority: "medium",
    ruSearchTerms: ["Petrel руководство", "Petrel геологическое моделирование", "Petrel интерпретация сейсмики", "Petrel построение сетки", "Petrel обучение", "Petrel workflow"],
    enSearchTerms: ["Petrel manual", "Petrel geological modeling", "Petrel seismic interpretation", "Petrel gridding", "Petrel tutorial", "Petrel workflow"],
    relatedTopicIds: ["petroleum-software", "geomodeling", "seismic-exploration", "well-log-interpretation", "modeling"],
    preferredSourceTypes: types("manual", "software-documentation", "practical-guide", "case-study", "course-material"),
    target: { minimum: 10, ideal: 22, minimumCore: 1, minimumScientific: 1, minimumPractical: 7 },
  },
  {
    topicId: "eclipse", priority: "medium",
    ruSearchTerms: ["ECLIPSE руководство", "ECLIPSE гидродинамическое моделирование", "ECLIPSE black oil", "ECLIPSE compositional", "ECLIPSE адаптация модели", "ECLIPSE обучение"],
    enSearchTerms: ["ECLIPSE reservoir simulation manual", "ECLIPSE black oil", "ECLIPSE compositional", "ECLIPSE history matching", "ECLIPSE tutorial", "ECLIPSE workflow"],
    relatedTopicIds: ["petroleum-software", "modeling", "pvt", "scal", "development-forecasting"],
    preferredSourceTypes: types("manual", "software-documentation", "practical-guide", "case-study", "course-material"),
    target: { minimum: 10, ideal: 22, minimumCore: 1, minimumScientific: 1, minimumPractical: 7 },
  },
  {
    topicId: "cmg", priority: "medium",
    ruSearchTerms: ["CMG руководство", "CMG гидродинамическое моделирование", "CMG GEM", "CMG STARS", "CMG IMEX", "CMG обучение"],
    enSearchTerms: ["CMG reservoir simulation manual", "CMG GEM", "CMG STARS", "CMG IMEX", "CMG tutorial", "CMG workflow"],
    relatedTopicIds: ["petroleum-software", "modeling", "pvt", "enhanced-oil-recovery", "gas-condensate-field-development"],
    preferredSourceTypes: types("manual", "software-documentation", "practical-guide", "case-study", "course-material"),
    target: { minimum: 10, ideal: 22, minimumCore: 1, minimumScientific: 1, minimumPractical: 7 },
  },
  {
    topicId: "development-economics", priority: "supporting",
    ruSearchTerms: ["экономика разработки месторождений", "оценка эффективности нефтегазового проекта", "экономическая оценка запасов", "денежный поток нефтегазового проекта", "налогообложение добычи", "экономические риски разработки"],
    enSearchTerms: ["petroleum project economics", "field development economics", "economic reserves evaluation", "upstream cash flow", "petroleum fiscal regime", "development economic risk"],
    relatedTopicIds: ["reserves-estimation", "development-management", "development-forecasting", "uncertainty-and-risk", "development-design"],
    preferredSourceTypes: types("book", "textbook", "practical-guide", "technical-report", "case-study", "standard"),
    target: { minimum: 10, ideal: 22, minimumCore: 2, minimumScientific: 2, minimumPractical: 4 },
  },
  {
    topicId: "development-design", priority: "high",
    ruSearchTerms: ["проектирование разработки месторождений", "проектный технологический документ", "технологическая схема разработки", "проект разработки месторождения", "варианты разработки", "проектные решения по разработке"],
    enSearchTerms: ["field development planning", "reservoir development plan", "field development plan", "development concept selection", "development scenario design", "reservoir project design"],
    relatedTopicIds: ["development", "modeling", "development-forecasting", "uncertainty-and-risk", "surface-facilities", "regulatory-documentation"],
    preferredSourceTypes: types("book", "methodical-material", "standard", "technical-report", "practical-guide", "case-study"),
    target: { minimumPractical: 6 },
  },
  {
    topicId: "regulatory-documentation", priority: "supporting",
    ruSearchTerms: ["нормативная документация нефтегазовой отрасли", "правила разработки месторождений", "проектная документация недропользования", "ГОСТ нефтегазовая отрасль", "федеральные нормы и правила", "методические рекомендации Роснедр"],
    enSearchTerms: ["oil and gas regulatory documentation", "petroleum development regulations", "subsurface use regulations", "petroleum industry standards", "oilfield codes and standards", "reservoir reporting guidelines"],
    relatedTopicIds: ["reserves-estimation", "development-design", "industrial-safety", "environment", "data-management"],
    preferredSourceTypes: types("standard", "methodical-material", "technical-report", "practical-guide"),
    target: { minimum: 10, ideal: 25, minimumCore: 2, minimumScientific: 1, minimumPractical: 5 },
  },
  {
    topicId: "industrial-safety", priority: "supporting",
    ruSearchTerms: ["промышленная безопасность нефтегазовых объектов", "безопасность опасных производственных объектов", "федеральные нормы нефтегаз", "противофонтанная безопасность", "анализ аварийных рисков", "охрана труда нефтегаз"],
    enSearchTerms: ["oil and gas process safety", "upstream industrial safety", "major accident hazard", "well control safety", "oilfield risk assessment", "petroleum occupational safety"],
    relatedTopicIds: ["drilling", "well-construction", "well-workover", "surface-facilities", "regulatory-documentation", "environment"],
    preferredSourceTypes: types("standard", "technical-report", "practical-guide", "methodical-material", "case-study"),
    target: { minimum: 10, ideal: 22, minimumCore: 2, minimumScientific: 1, minimumPractical: 5 },
  },
  {
    topicId: "environment", priority: "supporting",
    ruSearchTerms: ["экология нефтегазовой отрасли", "воздействие нефтедобычи на окружающую среду", "экологическая безопасность месторождений", "ликвидация нефтяных разливов", "выбросы нефтегазовых объектов", "утилизация промысловых отходов"],
    enSearchTerms: ["oil and gas environmental impact", "upstream environmental management", "oilfield environmental safety", "oil spill response", "upstream emissions", "oilfield waste management"],
    relatedTopicIds: ["formation-water-properties", "formation-water-treatment", "surface-facilities", "regulatory-documentation", "industrial-safety"],
    preferredSourceTypes: types("standard", "technical-report", "review-article", "journal-article", "practical-guide", "case-study"),
  },
  {
    topicId: "data-management", priority: "supporting",
    ruSearchTerms: ["управление нефтегазовыми данными", "данные разработки месторождений", "качество промысловых данных", "единая модель данных нефтегаз", "управление мастер-данными", "каталог данных нефтегаз"],
    enSearchTerms: ["petroleum data management", "reservoir data management", "oilfield data quality", "upstream data model", "petroleum master data management", "upstream data catalog"],
    relatedTopicIds: ["petroleum-software", "automation-and-digitalization", "modeling", "development-management", "regulatory-documentation"],
    preferredSourceTypes: types("standard", "technical-report", "practical-guide", "software-documentation", "case-study"),
  },
  {
    topicId: "automation-and-digitalization", priority: "supporting",
    ruSearchTerms: ["цифровизация нефтегазовой отрасли", "автоматизация добычи нефти и газа", "цифровое месторождение", "интеллектуальное месторождение", "промышленный интернет вещей нефтегаз", "цифровой двойник месторождения"],
    enSearchTerms: ["oil and gas digitalization", "upstream automation", "digital oilfield", "smart field", "industrial IoT oil and gas", "field digital twin"],
    relatedTopicIds: ["data-management", "petroleum-software", "integrated-modeling", "development-management", "surface-facilities"],
    preferredSourceTypes: types("technical-report", "review-article", "journal-article", "practical-guide", "case-study", "software-documentation"),
    target: { minimum: 10, ideal: 22, minimumCore: 1, minimumScientific: 3, minimumPractical: 4 },
  },
];

const topicsById = new Map(allTopics.map((topic) => [topic.id, topic]));

export const topicCorpusProfiles: TopicCorpusProfile[] = profileDefinitions.map((definition) => ({
  ...definition,
  aliases: [...(topicsById.get(definition.topicId)?.aliases ?? [])],
  target: { ...defaultTargets[definition.priority], ...definition.target },
}));

export type CoverageDimension = "total" | "core" | "scientific" | "practical";

export interface CoverageGap {
  dimension: CoverageDimension;
  current: number;
  required: number;
  missing: number;
}

export type TopicCoverageLevel = "empty" | "low" | "partial" | "good" | "complete";

export interface TopicCoverageStatus {
  topicId: string;
  current: TopicSourceCount;
  target: TopicCoverageTarget;
  coverageScore: number;
  status: TopicCoverageLevel;
  gaps: CoverageGap[];
}

const scoreWeights: Record<CorpusPriority, Record<CoverageDimension, number>> = {
  critical: { total: 0.35, core: 0.3, scientific: 0.2, practical: 0.15 },
  high: { total: 0.4, core: 0.25, scientific: 0.2, practical: 0.15 },
  medium: { total: 0.45, core: 0.2, scientific: 0.2, practical: 0.15 },
  supporting: { total: 0.55, core: 0.2, scientific: 0.1, practical: 0.15 },
};

function fulfillment(current: number, required: number | undefined) {
  return required && required > 0 ? Math.min(current / required, 1) : 1;
}

export function getTopicCoverageStatus(profile: TopicCorpusProfile, current: TopicSourceCount): TopicCoverageStatus {
  const weights = scoreWeights[profile.priority];
  const weightedFulfillment =
    fulfillment(current.total, profile.target.ideal) * weights.total
    + fulfillment(current.core, profile.target.minimumCore) * weights.core
    + fulfillment(current.scientific, profile.target.minimumScientific) * weights.scientific
    + fulfillment(current.practical, profile.target.minimumPractical) * weights.practical;
  const coverageScore = Math.round(weightedFulfillment * 100);

  const requirements: Array<[CoverageDimension, number, number | undefined]> = [
    ["total", current.total, profile.target.minimum],
    ["core", current.core, profile.target.minimumCore],
    ["scientific", current.scientific, profile.target.minimumScientific],
    ["practical", current.practical, profile.target.minimumPractical],
  ];
  const gaps = requirements.flatMap(([dimension, value, required]) =>
    required !== undefined && value < required
      ? [{ dimension, current: value, required, missing: required - value }]
      : [],
  );

  let status: TopicCoverageLevel;
  if (current.total === 0) status = "empty";
  else if (gaps.length === 0 && current.total >= profile.target.ideal) status = "complete";
  else if (gaps.length === 0 && coverageScore >= 70) status = "good";
  else if (coverageScore >= 40) status = "partial";
  else status = "low";

  return { topicId: profile.topicId, current: { ...current }, target: { ...profile.target }, coverageScore, status, gaps };
}

export interface CorpusCoverageOptions {
  includeDemo?: boolean;
  recordStatuses?: readonly SourceRecordStatus[];
}

export function selectCoverageSources(sourceList: readonly Source[], options: CorpusCoverageOptions = {}) {
  const statuses = options.recordStatuses
    ?? (options.includeDemo ? sourceRecordStatuses : (["verified"] as const));
  const allowedStatuses = new Set(statuses);
  return sourceList.filter((source) => allowedStatuses.has(source.recordStatus));
}

export function getCorpusCoverageStatuses(
  sourceList: readonly Source[] = sources,
  options: CorpusCoverageOptions = {},
) {
  const selectedSources = selectCoverageSources(sourceList, options);
  const counts = getTopicSourceCounts(selectedSources, topicCorpusProfiles.map((profile) => profile.topicId));
  return topicCorpusProfiles.map((profile) => getTopicCoverageStatus(profile, counts[profile.topicId]));
}

const priorityBase: Record<CorpusPriority, number> = { critical: 40, high: 30, medium: 20, supporting: 10 };

export function getDiscoveryPriority(profile: TopicCorpusProfile, coverage: TopicCoverageStatus) {
  const gapByDimension = new Map(coverage.gaps.map((gap) => [gap.dimension, gap]));
  const missingRatio = (dimension: CoverageDimension, required: number | undefined) => {
    if (!required) return 0;
    return (gapByDimension.get(dimension)?.missing ?? 0) / required;
  };

  return Math.round((
    priorityBase[profile.priority]
    + (100 - coverage.coverageScore) * 0.35
    + missingRatio("core", profile.target.minimumCore) * 12
    + missingRatio("practical", profile.target.minimumPractical) * 8
    + missingRatio("scientific", profile.target.minimumScientific) * 5
    + Math.min(profile.target.ideal / 15, 5)
  ) * 100) / 100;
}

export interface CorpusDiscoveryQueueItem {
  topicId: string;
  title: string;
  priority: CorpusPriority;
  discoveryPriorityScore: number;
  coverage: TopicCoverageStatus;
  reasons: string[];
}

export function getCorpusDiscoveryQueue(
  sourceList: readonly Source[] = sources,
  options: CorpusCoverageOptions = {},
): CorpusDiscoveryQueueItem[] {
  const coverageByTopic = new Map(getCorpusCoverageStatuses(sourceList, options).map((coverage) => [coverage.topicId, coverage]));
  return topicCorpusProfiles
    .map((profile) => {
      const coverage = coverageByTopic.get(profile.topicId)!;
      const topic = topicsById.get(profile.topicId)!;
      const reasons = [profile.priority, `coverage ${coverage.coverageScore}%`];
      for (const dimension of ["core", "scientific", "practical"] as const) {
        const gap = coverage.gaps.find((candidate) => candidate.dimension === dimension);
        if (gap) reasons.push(`missing ${gap.missing} ${dimension}`);
      }
      return {
        topicId: profile.topicId,
        title: topic.title,
        priority: profile.priority,
        discoveryPriorityScore: getDiscoveryPriority(profile, coverage),
        coverage,
        reasons,
      };
    })
    .sort((left, right) =>
      right.discoveryPriorityScore - left.discoveryPriorityScore
      || corpusPriorities.indexOf(left.priority) - corpusPriorities.indexOf(right.priority)
      || left.coverage.coverageScore - right.coverage.coverageScore
      || left.topicId.localeCompare(right.topicId, "en"),
    );
}

export interface CorpusPlanValidationIssue {
  topicId?: string;
  path: string;
  code: string;
  message: string;
}

export function validateCorpusPlan(
  profiles: readonly TopicCorpusProfile[] = topicCorpusProfiles,
  validTopics = allTopics,
) {
  const issues: CorpusPlanValidationIssue[] = [];
  const validTopicIds = new Set(validTopics.map((topic) => topic.id));
  const validSourceTypes = new Set<string>(sourceTypes);
  const validPriorities = new Set<string>(corpusPriorities);
  const seenProfileIds = new Set<string>();
  const add = (profile: TopicCorpusProfile | undefined, path: string, code: string, message: string) => {
    issues.push({ topicId: profile?.topicId, path, code, message });
  };

  for (const profile of profiles) {
    if (seenProfileIds.has(profile.topicId)) add(profile, "topicId", "duplicate", "Профиль темы должен быть уникальным");
    seenProfileIds.add(profile.topicId);
    if (!validTopicIds.has(profile.topicId)) add(profile, "topicId", "unknown-topic", "Профиль ссылается на неизвестную тему");
    if (!validPriorities.has(profile.priority)) add(profile, "priority", "invalid-enum", "Неизвестный приоритет");
    const expectedAliases = validTopics.find((topic) => topic.id === profile.topicId)?.aliases ?? [];
    if (JSON.stringify(profile.aliases) !== JSON.stringify(expectedAliases)) add(profile, "aliases", "aliases-changed", "Aliases должны совпадать с KnowledgeTopic");

    for (const [field, terms] of [["ruSearchTerms", profile.ruSearchTerms], ["enSearchTerms", profile.enSearchTerms]] as const) {
      if (terms.length === 0) add(profile, field, "required", "Поисковые термины не могут быть пустыми");
      const normalized = terms.map(normalizeTitle);
      if (normalized.some((term) => !term)) add(profile, field, "required", "Пустой поисковый термин запрещён");
      if (new Set(normalized).size !== normalized.length) add(profile, field, "duplicate-term", "Поисковые термины не должны дублироваться после нормализации");
    }

    const relatedIds = new Set<string>();
    for (const relatedTopicId of profile.relatedTopicIds) {
      if (!validTopicIds.has(relatedTopicId)) add(profile, "relatedTopicIds", "unknown-topic", `Неизвестная связанная тема: ${relatedTopicId}`);
      if (relatedTopicId === profile.topicId) add(profile, "relatedTopicIds", "self-reference", "Тема не может ссылаться на себя");
      if (relatedIds.has(relatedTopicId)) add(profile, "relatedTopicIds", "duplicate", "Связанные темы не должны дублироваться");
      relatedIds.add(relatedTopicId);
    }
    if (profile.relatedTopicIds.length < 2 || profile.relatedTopicIds.length > 8) add(profile, "relatedTopicIds", "relation-count", "Ожидается от 2 до 8 связанных тем");

    for (const sourceType of profile.preferredSourceTypes) {
      if (!validSourceTypes.has(sourceType)) add(profile, "preferredSourceTypes", "invalid-enum", `Неизвестный SourceType: ${sourceType}`);
    }
    if (profile.preferredSourceTypes.length === 0) add(profile, "preferredSourceTypes", "required", "Нужен хотя бы один предпочтительный SourceType");

    const targetValues = Object.entries(profile.target) as Array<[keyof TopicCoverageTarget, number]>;
    for (const [field, value] of targetValues) {
      if (!Number.isInteger(value) || value < 0) add(profile, `target.${field}`, "invalid-target", "Цель должна быть неотрицательным целым числом");
    }
    if (profile.target.minimum > profile.target.ideal) add(profile, "target.minimum", "invalid-target", "minimum не может превышать ideal");
    for (const field of ["minimumCore", "minimumScientific", "minimumPractical"] as const) {
      if ((profile.target[field] ?? 0) > profile.target.ideal) add(profile, `target.${field}`, "invalid-target", `${field} не может превышать ideal`);
    }
  }

  for (const topic of validTopics) {
    if (!seenProfileIds.has(topic.id)) add(undefined, "topicId", "missing-profile", `Нет профиля темы: ${topic.id}`);
  }
  return issues;
}

export function assertCorpusPlan() {
  const issues = validateCorpusPlan();
  if (issues.length > 0) {
    throw new Error(`Corpus plan validation failed:\n${issues.map((issue) => `${issue.topicId ?? "plan"}.${issue.path}: ${issue.message}`).join("\n")}`);
  }
}

assertCorpusPlan();
