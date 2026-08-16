import type { SourceLanguage, SourceType } from "../source-registry.ts";
import type { ProviderAutomationStatus } from "./provider-capabilities.ts";
import type {
  DiscoveryAccessHint,
  DiscoveryIdentifiers,
  EngineeringAccessMetadata,
  EngineeringAuthority,
  EngineeringKnowledgeLayer,
  EngineeringRelationship,
  EngineeringSoftwareMetadata,
} from "./types.ts";

export interface EngineeringProduct {
  id: string;
  name: string;
  aliases?: string[];
  current: boolean;
  officialUrl: string;
}

export interface EngineeringVendor {
  id: string;
  name: string;
  officialDomain: string;
  products: EngineeringProduct[];
  checkedAt: string;
  evidenceUrls: string[];
}

export const engineeringVendors: readonly EngineeringVendor[] = [
  {
    id: "rfd",
    name: "Rock Flow Dynamics",
    officialDomain: "rfdyn.com",
    products: [
      { id: "tnavigator", name: "tNavigator", current: true, officialUrl: "https://www.rfdyn.com/software/" },
      { id: "adviser", name: "Adviser", current: true, officialUrl: "https://rfdyn.com/module/adviser/" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://www.rfdyn.com/software/", "https://rfdyn.com/module/adviser/"],
  },
  {
    id: "slb",
    name: "SLB",
    officialDomain: "software.slb.com",
    products: [
      { id: "petrel", name: "Petrel", current: true, officialUrl: "https://www.software.slb.com/products/petrel" },
      { id: "eclipse", name: "ECLIPSE", current: true, officialUrl: "https://www.software.slb.com/products/eclipse" },
      { id: "intersect", name: "INTERSECT", current: true, officialUrl: "https://www.software.slb.com/products/intersect" },
      { id: "techlog", name: "Techlog", current: true, officialUrl: "https://www.software.slb.com/products/techlog" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://www.software.slb.com/support/product"],
  },
  {
    id: "cmg",
    name: "Computer Modelling Group",
    officialDomain: "cmgl.ca",
    products: [
      { id: "imex", name: "IMEX", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "gem", name: "GEM", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "stars", name: "STARS", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "winprop", name: "WinProp", current: true, officialUrl: "https://www.cmgl.ca/resources/winprop-brochure/" },
      { id: "cmost", name: "CMOST", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "builder", name: "Builder", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "results", name: "Results", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
      { id: "coflow", name: "CoFlow", current: true, officialUrl: "https://www.cmgl.ca/plus-mega-menu/software/" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://www.cmgl.ca/plus-mega-menu/software/", "https://www.cmgl.ca/solutions/software/training-by-imex/"],
  },
  {
    id: "kappa",
    name: "KAPPA Engineering",
    officialDomain: "kappaeng.com",
    products: [
      { id: "saphir", name: "Saphir", current: true, officialUrl: "https://www.kappaeng.com/software/kw/overview" },
      { id: "topaze", name: "Topaze", current: true, officialUrl: "https://www.kappaeng.com/software/kw/overview" },
      { id: "emeraude", name: "Emeraude", current: true, officialUrl: "https://www.kappaeng.com/software/kw/overview" },
      { id: "rubis", name: "Rubis", current: true, officialUrl: "https://www.kappaeng.com/software/kw/overview" },
      { id: "amethyste", name: "Amethyste", current: true, officialUrl: "https://www.kappaeng.com/software/kw/overview" },
      { id: "diamant", name: "Diamant", aliases: ["Diamant Master"], current: false, officialUrl: "https://www.kappaeng.com/history" },
      { id: "azurite", name: "Azurite", current: true, officialUrl: "https://www.kappaeng.com/" },
      { id: "carbone", name: "Carbone", current: true, officialUrl: "https://www.kappaeng.com/" },
      { id: "grenat", name: "Grenat", current: true, officialUrl: "https://www.kappaeng.com/" },
      { id: "citrine", name: "Citrine", current: true, officialUrl: "https://www.kappaeng.com/software/kw/videos" },
      { id: "orchid", name: "Orchid", current: true, officialUrl: "https://www.kappaeng.com/downloads/" },
      { id: "kappa-automate", name: "KAPPA-Automate", current: true, officialUrl: "https://www.kappaeng.com/downloads/" },
      { id: "kappa-server", name: "KAPPA-Server", current: true, officialUrl: "https://www.kappaeng.com/downloads/" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://www.kappaeng.com/software/kw", "https://www.kappaeng.com/software/kw/videos", "https://www.kappaeng.com/downloads/", "https://www.kappaeng.com/lsn/pdgks"],
  },
  {
    id: "petex",
    name: "Petroleum Experts",
    officialDomain: "petex.com",
    products: [
      { id: "prosper", name: "PROSPER", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "mbal", name: "MBAL", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "gap", name: "GAP", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "pvtp", name: "PVTP", aliases: ["PVTp"], current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "reveal", name: "REVEAL", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "resolve", name: "RESOLVE", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "openserver", name: "OpenServer", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "ipm", name: "IPM Suite", current: true, officialUrl: "https://petex.com/products/ipm-suite/" },
      { id: "move", name: "MOVE", current: true, officialUrl: "https://www.petex.com/pe-geology/move-suite/" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://petex.com/products/ipm-suite/", "https://www.petex.com/pe-geology/move-suite/"],
  },
  {
    id: "halliburton",
    name: "Halliburton Landmark",
    officialDomain: "halliburton.com",
    products: [
      { id: "decisionspace-365", name: "DecisionSpace 365", current: true, officialUrl: "https://www.halliburton.com/en/software" },
      { id: "reservoir-suite", name: "Reservoir Suite", current: true, officialUrl: "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production" },
      { id: "full-scale-asset-simulation", name: "Full-Scale Asset Simulation", current: true, officialUrl: "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production/full-scale-asset-simulation" },
      { id: "nexus", name: "Nexus", current: true, officialUrl: "https://www.halliburton.com/en/software/academic-engagement/university-grants-program" },
      { id: "netool", name: "NETool", current: true, officialUrl: "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production" },
      { id: "powergrid", name: "PowerGrid", current: true, officialUrl: "https://www.halliburton.com/en/software/academic-engagement/university-grants-program" },
      { id: "resx", name: "ResX", current: true, officialUrl: "https://www.halliburton.com/en/products/reservoir-suite/unified-ensemble-modeling" },
    ],
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://www.halliburton.com/en/software",
      "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production",
      "https://www.halliburton.com/en/software/academic-engagement/university-grants-program",
    ],
  },
] as const;

export interface EngineeringProviderCapability {
  id: string;
  label: string;
  group: "DOMAIN_LIBRARY" | "VENDOR" | "UNIVERSITY" | "PROFESSIONAL_SOCIETY" | "RESEARCH_ORGANIZATION" | "LOCAL_REGISTRY";
  searchInterface: string;
  machineInterface: string;
  metadata: string;
  access: string;
  rateLimits: string;
  terms: string;
  status: ProviderAutomationStatus;
  curatedRegistry: boolean;
  checkedAt: string;
  evidenceUrls: string[];
}

export const engineeringProviderCapabilities: readonly EngineeringProviderCapability[] = [
  {
    id: "engineering-registry",
    label: "PLAST Engineering Curated Registry",
    group: "LOCAL_REGISTRY",
    searchInterface: "Детерминированный поиск по проверенным metadata records",
    machineInterface: "Локальный typed registry adapter; сеть не используется",
    metadata: "title, type, topic, authority, access, software/version, landing URL, relations",
    access: "Только metadata и official landing URLs",
    rateLimits: "Не применимы",
    terms: "Каждый record хранит evidence и не даёт разрешения на загрузку файла",
    status: "IMPLEMENT",
    curatedRegistry: true,
    checkedAt: "2026-08-16",
    evidenceUrls: [],
  },
  {
    id: "geokniga",
    label: "GeoКнига",
    group: "DOMAIN_LIBRARY",
    searchInterface: "Публичный каталог /books и постоянные карточки /books/{id}",
    machineInterface: "Есть sitemap index; API, OAI, RSS/Atom и JSON-LD не подтверждены; /search/ запрещён robots.txt",
    metadata: "title, authors, edition/publisher/year/pages, UDC, ISBN, language, annotation, topics, tags, landing URL",
    access: "Карточки публичны; файлы предоставляются только для ознакомления",
    rateLimits: "robots.txt: Crawl-delay 10",
    terms: "Права принадлежат правообладателям; публичная кнопка скачивания не разрешает массовое копирование или републикацию",
    status: "REQUIRES_PERMISSION",
    curatedRegistry: true,
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://www.geokniga.org/robots.txt",
      "https://www.geokniga.org/sitemap.xml",
      "https://www.geokniga.org/books",
      "https://www.geokniga.org/geowiki/%D0%B3%D0%B5%D0%BE%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0",
    ],
  },
  ...engineeringVendors.map((vendor): EngineeringProviderCapability => ({
    id: vendor.id,
    label: vendor.name,
    group: "VENDOR",
    searchInterface: "Официальные product, support, training и resource pages",
    machineInterface: "Документированный публичный discovery API/feed не подтверждён",
    metadata: "product, resource title/type, version when published, landing URL, access condition",
    access: "Смешанный: публичные страницы, регистрация, клиентский support или лицензия продукта",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "Remote crawler не реализован; используются только вручную проверенные official landing pages",
    status: "MANUAL_ONLY",
    curatedRegistry: true,
    checkedAt: vendor.checkedAt,
    evidenceUrls: vendor.evidenceUrls,
  })),
  {
    id: "onepetro",
    label: "SPE / OnePetro",
    group: "PROFESSIONAL_SOCIETY",
    searchInterface: "Публичные metadata cards и DOI landing pages",
    machineInterface: "Публичный документированный discovery API не подтверждён; DOI metadata доступны через Crossref",
    metadata: "title, authors, year, DOI, publication, subjects, abstract/snippet, access state, landing URL",
    access: "OPEN, MEMBER_ONLY или PAID; paywall и authentication не обходятся",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "Curated records и Crossref metadata only; full text не запрашивается",
    status: "MANUAL_ONLY",
    curatedRegistry: true,
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://onepetro.org/", "https://jpt.spe.org/creating-our-energy-future-the-value-of-publishing-technical-papers-for-your-career"],
  },
  ...[
    ["seg", "SEG", "https://seg.org/education/"],
    ["aapg", "AAPG", "https://www.aapg.org/resources/training/"],
    ["eage", "EAGE", "https://eage.org/communities/basinpetroleumsystems/"],
  ].map(([id, label, url]): EngineeringProviderCapability => ({
    id,
    label,
    group: "PROFESSIONAL_SOCIETY",
    searchInterface: "Официальные education, lecture, webinar и publication pages",
    machineInterface: "Документированный публичный discovery API не подтверждён",
    metadata: "title, speaker/author, material type, date, access state, landing URL",
    access: "Смешанный публичный/member/registration access",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "Curated metadata only; authentication не обходится",
    status: "MANUAL_ONLY",
    curatedRegistry: true,
    checkedAt: "2026-08-16",
    evidenceUrls: [url],
  })),
  {
    id: "opm-sintef",
    label: "OPM / SINTEF MRST",
    group: "RESEARCH_ORGANIZATION",
    searchInterface: "Официальные public dataset catalogues",
    machineInterface: "Проверенные registry records; remote archive не скачивается",
    metadata: "dataset/model name, description, licence, landing URL, relationships",
    access: "Public metadata; OPM datasets explicitly use ODbL",
    rateLimits: "Не применимы к локальному registry",
    terms: "Discovery не выполняет clone/download; licence сохраняется отдельно",
    status: "IMPLEMENT",
    curatedRegistry: true,
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://opm-project.org/?page_id=559", "https://www.sintef.no/projectweb/mrst/modules/mrst-core/data-sets/"],
  },
] as const;

export interface AcademicDomainRegistryEntry {
  id: string;
  label: string;
  country: string;
  officialDomain: string;
  programmeUrl: string;
  repositoryUrls: string[];
  materialTypes: SourceType[];
  automationStatus: ProviderAutomationStatus;
  checkedAt: string;
}

export const academicDomainRegistry: readonly AcademicDomainRegistryEntry[] = [
  { id: "gubkin", label: "РГУ нефти и газа имени И. М. Губкина", country: "RU", officialDomain: "gubkin.ru", programmeUrl: "https://www.gubkin.ru/", repositoryUrls: ["https://elib.gubkin.ru/"], materialTypes: ["lecture-note", "presentation", "course-material", "dataset"], automationStatus: "REQUIRES_PERMISSION", checkedAt: "2026-08-16" },
  { id: "tiu", label: "Тюменский индустриальный университет", country: "RU", officialDomain: "tyuiu.ru", programmeUrl: "https://www.tyuiu.ru/", repositoryUrls: [], materialTypes: ["lecture-note", "methodical-material", "course-material"], automationStatus: "REQUIRES_PERMISSION", checkedAt: "2026-08-16" },
  { id: "kpfu", label: "КФУ — Институт геологии и нефтегазовых технологий", country: "RU", officialDomain: "kpfu.ru", programmeUrl: "https://kpfu.ru/geo", repositoryUrls: ["https://dspace.kpfu.ru/xmlui/handle/net/6046"], materialTypes: ["lecture-note", "methodical-material", "course-material", "presentation"], automationStatus: "IMPLEMENT", checkedAt: "2026-08-16" },
  { id: "tpu", label: "Томский политехнический университет", country: "RU", officialDomain: "tpu.ru", programmeUrl: "https://tpu.ru/", repositoryUrls: ["https://earchive.tpu.ru/"], materialTypes: ["lecture-note", "methodical-material", "presentation", "dataset"], automationStatus: "DEFER", checkedAt: "2026-08-16" },
  { id: "mining-university", label: "Санкт-Петербургский горный университет", country: "RU", officialDomain: "spmi.ru", programmeUrl: "https://spmi.ru/", repositoryUrls: ["https://spmi.ru/elektronnye-resursy"], materialTypes: ["lecture-note", "methodical-material", "course-material"], automationStatus: "REQUIRES_PERMISSION", checkedAt: "2026-08-16" },
  { id: "heriot-watt", label: "Heriot-Watt Institute of GeoEnergy Engineering", country: "GB", officialDomain: "hw.ac.uk", programmeUrl: "https://www.hw.ac.uk/study/subjects/petroleum-engineering-geoscience", repositoryUrls: ["https://researchportal.hw.ac.uk/"], materialTypes: ["lecture-note", "presentation", "course-material", "dataset"], automationStatus: "MANUAL_ONLY", checkedAt: "2026-08-16" },
  { id: "ut-austin-pge", label: "UT Austin Hildebrand Department of Petroleum and Geosystems Engineering", country: "US", officialDomain: "pge.utexas.edu", programmeUrl: "https://www.pge.utexas.edu/", repositoryUrls: [], materialTypes: ["lecture-note", "presentation", "course-material", "dataset"], automationStatus: "MANUAL_ONLY", checkedAt: "2026-08-16" },
  { id: "stanford-ese", label: "Stanford Energy Science & Engineering", country: "US", officialDomain: "ese.stanford.edu", programmeUrl: "https://ese.stanford.edu/academics-admissions", repositoryUrls: [], materialTypes: ["lecture-note", "presentation", "course-material", "dataset"], automationStatus: "MANUAL_ONLY", checkedAt: "2026-08-16" },
] as const;

export interface EngineeringRegistryRecord {
  id: string;
  originProviderId: string;
  title: string;
  description: string;
  authors?: string[];
  publicationYear?: number;
  sourceType: SourceType;
  language: SourceLanguage;
  topicIds: string[];
  keywords: string[];
  landingPage: string;
  evidenceUrls: string[];
  identifiers?: DiscoveryIdentifiers;
  publication?: { publisher?: string; institution?: string; conference?: string };
  authority: EngineeringAuthority;
  officialSource: boolean;
  knowledgeLayers: EngineeringKnowledgeLayer[];
  access: EngineeringAccessMetadata;
  accessHint: DiscoveryAccessHint;
  software?: EngineeringSoftwareMetadata;
  relationships?: EngineeringRelationship[];
}

const productTarget = (vendorId: string, productId: string) => `product:${vendorId}:${productId}`;

export const engineeringRegistryRecords: readonly EngineeringRegistryRecord[] = [
  {
    id: "geokniga-24618",
    originProviderId: "geokniga",
    title: "Разработка нефтяных месторождений",
    description: "Проверенная вручную карточка русскоязычного учебного пособия по теории и проектированию разработки нефтяных месторождений.",
    authors: ["К. М. Донцов"], publicationYear: 1977, sourceType: "book", language: "ru",
    topicIds: ["development", "oil-field-development"], keywords: ["разработка месторождений", "гидродинамика пласта", "проектирование"],
    landingPage: "https://www.geokniga.org/books/24618", evidenceUrls: ["https://www.geokniga.org/books/24618"],
    publication: { publisher: "Недра" }, authority: "DOMAIN_LIBRARY", officialSource: false, knowledgeLayers: ["THEORY"],
    access: { availability: "UNKNOWN", rightsNote: "GeoКнига указывает ознакомительный доступ и права законных правообладателей.", evidenceUrl: "https://www.geokniga.org/geowiki/%D0%B3%D0%B5%D0%BE%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0" },
    accessHint: "metadata-only",
  },
  {
    id: "rfd-tnavigator-manuals",
    originProviderId: "rfd", title: "tNavigator Manuals in Adviser", sourceType: "manual", language: "en",
    description: "Официальный каталог руководств tNavigator в Adviser; отдельные документы доступны в продуктовой среде.",
    topicIds: ["tnavigator", "modeling", "petroleum-software"], keywords: ["tNavigator", "manual", "reservoir simulation"],
    landingPage: "https://rfdyn.com/module/adviser/", evidenceUrls: ["https://rfdyn.com/module/adviser/"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING"],
    access: { availability: "AUTH_REQUIRED", rightsNote: "Доступ к документации зависит от установки/лицензии tNavigator.", evidenceUrl: "https://rfdyn.com/module/adviser/" }, accessHint: "metadata-only",
    software: { vendorId: "rfd", productIds: ["tnavigator", "adviser"], productNames: ["tNavigator", "Adviser"] },
    relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: productTarget("rfd", "tnavigator") }],
  },
  {
    id: "rfd-tnavigator-tutorials",
    originProviderId: "rfd", title: "tNavigator Step-by-Step Tutorials", sourceType: "tutorial", language: "en",
    description: "Официальная коллекция из более чем двухсот пошаговых tutorials по geology, simulation, PVT, AHM и другим workflows.",
    topicIds: ["tnavigator", "modeling", "pvt", "geomodeling", "petroleum-software"], keywords: ["tNavigator", "tutorial", "history matching", "PVT"],
    landingPage: "https://rfdyn.com/module/adviser/", evidenceUrls: ["https://rfdyn.com/module/adviser/"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "PRACTICE"],
    access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://rfdyn.com/module/adviser/" }, accessHint: "metadata-only",
    software: { vendorId: "rfd", productIds: ["tnavigator", "adviser"], productNames: ["tNavigator", "Adviser"] },
    relationships: [{ type: "TRAINING_FOR", targetId: productTarget("rfd", "tnavigator") }, { type: "USES_DATASET", targetId: "rfd-tnavigator-demo-data" }],
  },
  {
    id: "rfd-tnavigator-demo-data",
    originProviderId: "rfd", title: "tNavigator Adviser Demo Data", sourceType: "dataset", language: "en",
    description: "Официально заявленные demo data для самостоятельного повторения tNavigator workflows.",
    topicIds: ["tnavigator", "modeling", "petroleum-software"], keywords: ["tNavigator", "demo data", "training dataset"],
    landingPage: "https://rfdyn.com/module/adviser/", evidenceUrls: ["https://rfdyn.com/module/adviser/"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["EXAMPLES_DATASETS", "SOFTWARE_TRAINING"],
    access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://rfdyn.com/module/adviser/" }, accessHint: "metadata-only",
    software: { vendorId: "rfd", productIds: ["tnavigator", "adviser"], productNames: ["tNavigator", "Adviser"] },
    relationships: [{ type: "EXAMPLE_FOR", targetId: productTarget("rfd", "tnavigator") }, { type: "COMPANION_TO", targetId: "rfd-tnavigator-tutorials" }],
  },
  {
    id: "slb-eclipse-installation-guide-2023-1",
    originProviderId: "slb", title: "ECLIPSE Installation Guide 2023.1", sourceType: "manual", language: "en",
    description: "Официальное руководство по установке и вычислительным конфигурациям ECLIPSE/INTERSECT версии 2023.1.",
    topicIds: ["eclipse", "modeling", "petroleum-software"], keywords: ["ECLIPSE", "INTERSECT", "installation guide"],
    landingPage: "https://www.software.slb.com/support/product", evidenceUrls: ["https://www.software.slb.com/-/media/software-media-items/support/product-documents/eclipse/2023/eclipseinstallationguide.pdf"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING"],
    access: { availability: "OPEN", rightsNote: "Публичный vendor PDF; licence на повторное распространение не указана.", evidenceUrl: "https://www.software.slb.com/support/product" }, accessHint: "external-fulltext",
    software: { vendorId: "slb", productIds: ["eclipse", "intersect"], productNames: ["ECLIPSE", "INTERSECT"], softwareVersion: "2023.1", documentVersion: "2023.1" },
    relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: productTarget("slb", "eclipse") }],
  },
  {
    id: "slb-petrel-training-courses",
    originProviderId: "slb", title: "Petrel Training Courses", sourceType: "training-material", language: "en",
    description: "Официальный entry point к курсам Petrel core, geology, geophysics, reservoir engineering, geomechanics и drilling.",
    topicIds: ["petrel", "geomodeling", "modeling", "petroleum-software"], keywords: ["Petrel", "training", "reservoir engineering"],
    landingPage: "https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training", evidenceUrls: ["https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING"],
    access: { availability: "AUTH_REQUIRED", rightsNote: "Курсы доступны по vendor training workflow.", evidenceUrl: "https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training" }, accessHint: "metadata-only",
    software: { vendorId: "slb", productIds: ["petrel"], productNames: ["Petrel"] }, relationships: [{ type: "TRAINING_FOR", targetId: productTarget("slb", "petrel") }],
  },
  {
    id: "slb-petrel-ongc-case-study",
    originProviderId: "slb", title: "ONGC Maximizes Recovery for Mature Onshore Field", sourceType: "case-study", language: "en",
    description: "Официальный Petrel customer case study, связанный с моделированием и повышением извлечения на зрелом месторождении.",
    topicIds: ["petrel", "modeling", "development-management", "enhanced-oil-recovery"], keywords: ["Petrel", "ONGC", "mature field", "recovery"],
    landingPage: "https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training", evidenceUrls: ["https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["PRACTICE"], access: { availability: "OPEN", evidenceUrl: "https://www.software.slb.com/products/petrel/petrel-drilling?tab=Training" }, accessHint: "external-fulltext",
    software: { vendorId: "slb", productIds: ["petrel"], productNames: ["Petrel"] }, relationships: [{ type: "EXAMPLE_FOR", targetId: productTarget("slb", "petrel") }],
  },
  {
    id: "cmg-imex-training",
    originProviderId: "cmg", title: "Training by IMEX", sourceType: "tutorial", language: "en",
    description: "Официальный каталог практических CMG courses по IMEX, CMOST, WinProp, GEM и simulation workflows.",
    topicIds: ["cmg", "modeling", "pvt", "petroleum-software"], keywords: ["IMEX", "CMOST", "WinProp", "training"],
    landingPage: "https://www.cmgl.ca/solutions/software/training-by-imex/", evidenceUrls: ["https://www.cmgl.ca/solutions/software/training-by-imex/"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "PRACTICE"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://www.cmgl.ca/solutions/software/training-by-imex/" }, accessHint: "metadata-only",
    software: { vendorId: "cmg", productIds: ["imex", "cmost", "winprop", "gem"], productNames: ["IMEX", "CMOST", "WinProp", "GEM"] }, relationships: [{ type: "TRAINING_FOR", targetId: productTarget("cmg", "imex") }],
  },
  {
    id: "cmg-imex-whats-new-2026-11",
    originProviderId: "cmg", title: "What's New in IMEX v2026.11", sourceType: "presentation", language: "en",
    description: "Официальный release presentation по изменениям IMEX версии 2026.11.",
    publicationYear: 2026, topicIds: ["cmg", "modeling", "petroleum-software"], keywords: ["IMEX", "release", "presentation"],
    landingPage: "https://www.cmgl.ca/sdm_downloads/second-quarter-release-whats-new-in-imex-v2026-11/", evidenceUrls: ["https://www.cmgl.ca/sdm_downloads/second-quarter-release-whats-new-in-imex-v2026-11/"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING"], access: { availability: "OPEN", evidenceUrl: "https://www.cmgl.ca/sdm_downloads/second-quarter-release-whats-new-in-imex-v2026-11/" }, accessHint: "external-fulltext",
    software: { vendorId: "cmg", productIds: ["imex"], productNames: ["IMEX"], softwareVersion: "2026.11", documentVersion: "2026.11" }, relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: productTarget("cmg", "imex") }],
  },
  {
    id: "kappa-ecrin-tutorials-4-30",
    originProviderId: "kappa", title: "Ecrin 4.30 Tutorials", sourceType: "tutorial", language: "en",
    description: "Официальные guided sessions для Saphir, Topaze, Rubis, Amethyste и связанных KAPPA workflows.",
    topicIds: ["well-testing", "modeling", "petroleum-software"], keywords: ["Saphir", "Topaze", "Rubis", "tutorial"],
    landingPage: "https://www.kappaeng.com/documents/flip/ecrin_430_tutorials/files/assets/basic-html/toc.html", evidenceUrls: ["https://www.kappaeng.com/documents/flip/ecrin_430_tutorials/files/assets/basic-html/toc.html"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "PRACTICE"], access: { availability: "OPEN", evidenceUrl: "https://www.kappaeng.com/documents/flip/ecrin_430_tutorials/files/assets/basic-html/toc.html" }, accessHint: "external-fulltext",
    software: { vendorId: "kappa", productIds: ["saphir", "topaze", "rubis", "amethyste"], productNames: ["Saphir", "Topaze", "Rubis", "Amethyste"], softwareVersion: "4.30", documentVersion: "4.30" }, relationships: [{ type: "TRAINING_FOR", targetId: productTarget("kappa", "saphir") }],
  },
  {
    id: "petex-ipm13-getting-started",
    originProviderId: "petex", title: "IPM 13 Getting Started Guide", sourceType: "manual", language: "en",
    description: "Официальное вводное руководство по IPM Suite: GAP, PROSPER, MBAL, PVTP, REVEAL, RESOLVE и OpenServer.",
    publicationYear: 2022, topicIds: ["petroleum-software", "production", "pvt", "modeling"], keywords: ["IPM", "PROSPER", "MBAL", "GAP", "PVTP"],
    landingPage: "https://petex.com/products/ipm-suite/", evidenceUrls: ["https://www.petex.com/media/3138/getting_started_guide_ipm13.pdf"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING"], access: { availability: "OPEN", rightsNote: "Публичный vendor PDF; licence на повторное распространение не указана.", evidenceUrl: "https://petex.com/products/ipm-suite/" }, accessHint: "external-fulltext",
    software: { vendorId: "petex", productIds: ["ipm", "prosper", "mbal", "gap", "pvtp", "reveal", "resolve", "openserver"], productNames: ["IPM Suite", "PROSPER", "MBAL", "GAP", "PVTP", "REVEAL", "RESOLVE", "OpenServer"], softwareVersion: "13", documentVersion: "13", releaseDate: "2022-04" }, relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: productTarget("petex", "ipm") }],
  },
  {
    id: "petex-training-courses",
    originProviderId: "petex", title: "Petroleum Experts Training Courses", sourceType: "training-material", language: "en",
    description: "Официальный каталог курсов по Integrated Production Modelling, REVEAL, RESOLVE и практическим engineering projects.",
    topicIds: ["petroleum-software", "production", "modeling"], keywords: ["IPM", "training", "PROSPER", "MBAL", "GAP"],
    landingPage: "https://www.petex.com/public_area/courses/courses_schedule_list.asp", evidenceUrls: ["https://www.petex.com/public_area/courses/courses_schedule_list.asp"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "PRACTICE"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://www.petex.com/public_area/courses/courses_schedule_list.asp" }, accessHint: "metadata-only",
    software: { vendorId: "petex", productIds: ["ipm", "prosper", "mbal", "gap", "reveal", "resolve"], productNames: ["IPM Suite", "PROSPER", "MBAL", "GAP", "REVEAL", "RESOLVE"] }, relationships: [{ type: "TRAINING_FOR", targetId: productTarget("petex", "ipm") }],
  },
  {
    id: "halliburton-nexus-user-guide-r5000-0-2",
    originProviderId: "halliburton", title: "Nexus User Guide R5000.0.2", sourceType: "manual", language: "en",
    description: "Официальное руководство Landmark Nexus по reservoir simulation и integrated asset workflows.",
    topicIds: ["modeling", "petroleum-software"], keywords: ["Nexus", "Landmark", "reservoir simulation"],
    landingPage: "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production", evidenceUrls: ["https://esd.halliburton.com/support/LSM/ResMgmt/NexusVIPDT/Nexus/5000/5000_4/Help/Nexus_User_Ref.pdf"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "METHODOLOGY"], access: { availability: "OPEN", rightsNote: "Публично индексируемый vendor PDF; licence на повторное распространение не указана.", evidenceUrl: "https://www.halliburton.com/en/software/decisionspace-365-enterprise/decisionspace-365-reservoir-and-production" }, accessHint: "external-fulltext",
    software: { vendorId: "halliburton", productIds: ["nexus", "decisionspace-365"], productNames: ["Nexus", "DecisionSpace 365"], softwareVersion: "R5000.0.2", documentVersion: "R5000.0.2" }, relationships: [{ type: "DOCUMENTS_PRODUCT", targetId: productTarget("halliburton", "nexus") }],
  },
  {
    id: "halliburton-landmark-webinars",
    originProviderId: "halliburton", title: "Halliburton Landmark On-Demand Webinars", sourceType: "webinar", language: "en",
    description: "Официальная коллекция on-demand webinars по DecisionSpace 365, geoscience и petroleum workflows.",
    topicIds: ["petroleum-software", "geomodeling", "seismic-exploration"], keywords: ["Landmark", "DecisionSpace 365", "webinar"],
    landingPage: "https://www.halliburton.com/en/webinars", evidenceUrls: ["https://www.halliburton.com/en/webinars"],
    authority: "OFFICIAL_VENDOR", officialSource: true, knowledgeLayers: ["SOFTWARE_TRAINING", "PRACTICE"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://www.halliburton.com/en/webinars" }, accessHint: "metadata-only",
    software: { vendorId: "halliburton", productIds: ["decisionspace-365"], productNames: ["DecisionSpace 365"] }, relationships: [{ type: "TRAINING_FOR", targetId: productTarget("halliburton", "decisionspace-365") }],
  },
  {
    id: "spe-jpt-edge-iiot-case-study-2026",
    originProviderId: "onepetro", title: "Case Study: Edge Computing and IIoT Enable Autonomous Artificial Lift and Well Optimization Across Multi-Basin Deployments", sourceType: "case-study", language: "en",
    description: "SPE/JPT field case study по автономной оптимизации artificial lift в четырёх бассейнах.",
    authors: ["Akshay Dhavale", "Zeshan Hyder"], publicationYear: 2026, topicIds: ["artificial-lift", "production"], keywords: ["artificial lift", "field case", "production optimization"],
    landingPage: "https://jpt.spe.org/case-study-edge-computing-and-iiot-enable-autonomous-artificial-lift-and-well-optimization-across-multi-basin-deployments", evidenceUrls: ["https://jpt.spe.org/case-study-edge-computing-and-iiot-enable-autonomous-artificial-lift-and-well-optimization-across-multi-basin-deployments"],
    publication: { publisher: "Society of Petroleum Engineers" }, authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["PRACTICE"], access: { availability: "OPEN", evidenceUrl: "https://jpt.spe.org/case-study-edge-computing-and-iiot-enable-autonomous-artificial-lift-and-well-optimization-across-multi-basin-deployments" }, accessHint: "external-fulltext",
  },
  {
    id: "onepetro-drilling-data-acquisition-chapter",
    originProviderId: "onepetro", title: "Drilling-Data Acquisition", sourceType: "book-chapter", language: "en",
    description: "Metadata record OnePetro for a technical Petroleum Engineering Handbook chapter; full access is paid.",
    authors: ["Iain Dowell"], publicationYear: 2006, topicIds: ["drilling"], keywords: ["drilling data", "wellsite data", "sensors"],
    landingPage: "https://onepetro.org/books/book/74/chapter/14372661/Drilling-Data-Acquisition", evidenceUrls: ["https://onepetro.org/books/book/74/chapter/14372661/Drilling-Data-Acquisition"],
    identifiers: { doi: "10.2118/9781555631147-ch15", isbn: ["9781555633325"] }, publication: { publisher: "Society of Petroleum Engineers" }, authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["METHODOLOGY"],
    access: { availability: "PAID", rightsNote: "OnePetro marks the chapter Available to Purchase.", evidenceUrl: "https://onepetro.org/books/book/74/chapter/14372661/Drilling-Data-Acquisition" }, accessHint: "metadata-only",
  },
  {
    id: "spe-csp11-description",
    originProviderId: "onepetro", title: "SPE 11th Comparative Solution Project Description", sourceType: "technical-report", language: "en",
    description: "Официальное описание SPE comparative solution project с условиями benchmark cases и submission outputs.",
    publicationYear: 2023, topicIds: ["modeling"], keywords: ["SPE CSP", "comparative solution project", "benchmark"],
    landingPage: "https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje", evidenceUrls: ["https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje"],
    publication: { institution: "Society of Petroleum Engineers" }, authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["METHODOLOGY", "EXAMPLES_DATASETS"], access: { availability: "AUTH_REQUIRED", rightsNote: "SPE Connect требует принятия copyright terms перед download.", evidenceUrl: "https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje" }, accessHint: "metadata-only",
    relationships: [{ type: "COMPANION_TO", targetId: "spe-csp11-benchmark" }],
  },
  {
    id: "spe-csp11-benchmark",
    originProviderId: "onepetro", title: "SPE 11th Comparative Solution Project Benchmark", sourceType: "benchmark", language: "en",
    description: "Benchmark record for SPE CSP11; PLAST stores only metadata and landing URL at this stage.",
    publicationYear: 2023, topicIds: ["modeling"], keywords: ["SPE CSP11", "benchmark", "reservoir simulation"],
    landingPage: "https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje", evidenceUrls: ["https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje"],
    authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["EXAMPLES_DATASETS"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://connect.spe.org/viewdocument/spe-11th-comparative-solution-proje" }, accessHint: "metadata-only",
    relationships: [{ type: "BENCHMARK_FOR", targetId: "modeling" }, { type: "COMPANION_TO", targetId: "spe-csp11-description" }],
  },
  {
    id: "opm-open-datasets",
    originProviderId: "opm-sintef", title: "Open Porous Media Open Datasets", sourceType: "dataset", language: "en",
    description: "Официальный каталог OPM benchmark datasets: Norne, SPE1, SPE3, SPE9, SPE10 and test suites.",
    topicIds: ["modeling"], keywords: ["OPM", "Norne", "SPE10", "dataset"],
    landingPage: "https://opm-project.org/?page_id=559", evidenceUrls: ["https://opm-project.org/?page_id=559"],
    authority: "RESEARCH_ORGANIZATION", officialSource: true, knowledgeLayers: ["EXAMPLES_DATASETS"], access: { availability: "OPEN", license: "Open Database License (ODbL)", evidenceUrl: "https://opm-project.org/?page_id=559" }, accessHint: "external-fulltext",
    relationships: [{ type: "BENCHMARK_FOR", targetId: "modeling" }, { type: "COMPANION_TO", targetId: "opm-norne-example-model" }],
  },
  {
    id: "opm-norne-example-model",
    originProviderId: "opm-sintef", title: "Norne Full-Field Black-Oil Example Model", sourceType: "example-model", language: "en",
    description: "Real-field black-oil model of the Norne field published as an open OPM dataset.",
    topicIds: ["modeling", "oil-field-development"], keywords: ["Norne", "black oil", "history matching", "example model"],
    landingPage: "https://opm-project.org/?page_id=559", evidenceUrls: ["https://opm-project.org/?page_id=559", "https://www.sintef.no/projectweb/mrst/modules/mrst-core/data-sets/"],
    authority: "RESEARCH_ORGANIZATION", officialSource: true, knowledgeLayers: ["EXAMPLES_DATASETS", "PRACTICE"], access: { availability: "OPEN", license: "Open Database License (ODbL)", evidenceUrl: "https://opm-project.org/?page_id=559" }, accessHint: "external-fulltext",
    relationships: [{ type: "EXAMPLE_FOR", targetId: "modeling" }, { type: "COMPANION_TO", targetId: "opm-open-datasets" }],
  },
  {
    id: "sintef-mrst-public-datasets",
    originProviderId: "opm-sintef", title: "MRST Public Data Sets", sourceType: "dataset", language: "en",
    description: "SINTEF catalogue of SPE benchmarks, Egg, Norne, SAIGUP, Johansen and other model datasets with per-dataset access notes.",
    topicIds: ["modeling"], keywords: ["MRST", "SPE10", "Egg model", "Norne"],
    landingPage: "https://www.sintef.no/projectweb/mrst/modules/mrst-core/data-sets/", evidenceUrls: ["https://www.sintef.no/projectweb/mrst/modules/mrst-core/data-sets/"],
    publication: { institution: "SINTEF Digital" }, authority: "RESEARCH_ORGANIZATION", officialSource: true, knowledgeLayers: ["EXAMPLES_DATASETS", "SOFTWARE_TRAINING"], access: { availability: "OPEN", rightsNote: "SINTEF notes that individual datasets may require registration or a separate licence form.", evidenceUrl: "https://www.sintef.no/projectweb/mrst/modules/mrst-core/data-sets/" }, accessHint: "external-fulltext",
    relationships: [{ type: "BENCHMARK_FOR", targetId: "modeling" }],
  },
  {
    id: "seg-education-lectures",
    originProviderId: "seg", title: "SEG Distinguished and Honorary Lectures", sourceType: "presentation", language: "en",
    description: "Официальный каталог SEG technical lectures and recordings по applied geophysics workflows.",
    topicIds: ["seismic-exploration", "geophysics"], keywords: ["SEG", "distinguished lecture", "geophysics"],
    landingPage: "https://seg.org/education/lectures/", evidenceUrls: ["https://seg.org/education/", "https://seg.org/education/lectures/"],
    authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["METHODOLOGY", "PRACTICE"], access: { availability: "MEMBER_ONLY", rightsNote: "Часть lectures публична, SEG On Demand member access определяется на карточке.", evidenceUrl: "https://seg.org/education/" }, accessHint: "metadata-only",
  },
  {
    id: "aapg-training-case-workshops",
    originProviderId: "aapg", title: "AAPG Geoscience Technical Workshops and Academy Webinars", sourceType: "webinar", language: "en",
    description: "Официальные AAPG workshops and webinars с real-world case studies, field applications и technical discussions.",
    topicIds: ["geology", "geomodeling", "seismic-exploration"], keywords: ["AAPG", "case study", "webinar", "workshop"],
    landingPage: "https://www.aapg.org/resources/training/", evidenceUrls: ["https://www.aapg.org/resources/training/"],
    authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["METHODOLOGY", "PRACTICE"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://www.aapg.org/resources/training/" }, accessHint: "metadata-only",
  },
  {
    id: "eage-subsurface-systems-webinars",
    originProviderId: "eage", title: "EAGE Subsurface Systems Modeling Webinar Series", sourceType: "webinar", language: "en",
    description: "Официальная educational webinar series по petroleum systems, applications, technologies и best practices.",
    topicIds: ["geology", "geomodeling"], keywords: ["EAGE", "basin modeling", "petroleum systems", "webinar"],
    landingPage: "https://eage.org/communities/basinpetroleumsystems/", evidenceUrls: ["https://eage.org/communities/basinpetroleumsystems/"],
    authority: "PROFESSIONAL_SOCIETY", officialSource: true, knowledgeLayers: ["METHODOLOGY", "PRACTICE"], access: { availability: "AUTH_REQUIRED", evidenceUrl: "https://eage.org/communities/basinpetroleumsystems/" }, accessHint: "metadata-only",
  },
] as const;

export function validateEngineeringRegistries() {
  const vendorIds = new Set<string>();
  const products = new Set<string>();
  for (const vendor of engineeringVendors) {
    if (vendorIds.has(vendor.id)) throw new Error(`Duplicate engineering vendor: ${vendor.id}`);
    vendorIds.add(vendor.id);
    for (const product of vendor.products) {
      const key = productTarget(vendor.id, product.id);
      if (products.has(key)) throw new Error(`Duplicate engineering product: ${key}`);
      products.add(key);
    }
  }
  for (const required of ["rfd", "slb", "cmg", "kappa", "petex", "halliburton"]) {
    if (!vendorIds.has(required)) throw new Error(`Missing required engineering vendor: ${required}`);
  }

  const capabilityIds = new Set<string>();
  for (const capability of engineeringProviderCapabilities) {
    if (capabilityIds.has(capability.id)) throw new Error(`Duplicate engineering provider capability: ${capability.id}`);
    capabilityIds.add(capability.id);
  }
  for (const required of ["geokniga", "rfd", "slb", "cmg", "kappa", "petex", "halliburton", "onepetro", "seg", "aapg", "eage"]) {
    if (!capabilityIds.has(required)) throw new Error(`Missing required engineering provider: ${required}`);
  }

  const academicIds = new Set<string>();
  const academicDomains = new Set<string>();
  for (const institution of academicDomainRegistry) {
    if (academicIds.has(institution.id)) throw new Error(`Duplicate academic registry entry: ${institution.id}`);
    if (academicDomains.has(institution.officialDomain)) throw new Error(`Duplicate academic registry domain: ${institution.officialDomain}`);
    academicIds.add(institution.id);
    academicDomains.add(institution.officialDomain);
  }

  const recordIds = new Set<string>();
  for (const record of engineeringRegistryRecords) {
    if (recordIds.has(record.id)) throw new Error(`Duplicate engineering registry record: ${record.id}`);
    recordIds.add(record.id);
    if (!record.landingPage.startsWith("https://")) throw new Error(`Unsafe engineering landing URL: ${record.id}`);
    if (record.authority === "OFFICIAL_VENDOR") {
      if (!record.officialSource || !record.software || !vendorIds.has(record.software.vendorId)) {
        throw new Error(`Official vendor record lacks vendor provenance: ${record.id}`);
      }
      for (const productId of record.software.productIds) {
        const key = productTarget(record.software.vendorId, productId);
        if (!products.has(key)) throw new Error(`Official vendor record references an unknown product: ${record.id} -> ${key}`);
      }
    }
  }

  const materialTypes = new Set(engineeringRegistryRecords.map((record) => record.sourceType));
  for (const required of ["manual", "tutorial", "presentation", "case-study", "technical-report", "dataset", "example-model"] as const) {
    if (!materialTypes.has(required)) throw new Error(`Missing required engineering material type: ${required}`);
  }
  for (const record of engineeringRegistryRecords) {
    for (const relation of record.relationships ?? []) {
      if (!recordIds.has(relation.targetId) && !products.has(relation.targetId) && !relation.targetId.match(/^[a-z][a-z0-9-]+$/u)) {
        throw new Error(`Unknown engineering relationship target: ${record.id} -> ${relation.targetId}`);
      }
    }
  }
  return true;
}
