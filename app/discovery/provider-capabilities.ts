import type { DiscoveryAccessHint, DiscoveryProvider } from "./types.ts";

export const providerAutomationStatuses = [
  "IMPLEMENT",
  "DEFER",
  "MANUAL_ONLY",
  "UNSUITABLE",
  "REQUIRES_PERMISSION",
] as const;

export type ProviderAutomationStatus = (typeof providerAutomationStatuses)[number];

export interface RussianProviderCapability {
  id: string;
  label: string;
  searchInterface: string;
  protocol: string;
  publicAccess: string;
  metadata: string;
  pagination: string;
  rateLimits: string;
  terms: string;
  status: ProviderAutomationStatus;
  implementedProvider?: DiscoveryProvider;
  checkedAt: string;
  evidenceUrls: string[];
}

export interface OaiPmhProviderConfig {
  id: Extract<DiscoveryProvider, "cyberleninka" | "kpfu">;
  baseUrl: string;
  metadataPrefix: "oai_dc";
  set: string;
  setsByTopic?: Readonly<Record<string, string>>;
  institution: string;
  accessHint: DiscoveryAccessHint;
  maxPagesPerQuery: number;
  maxRawRecordsPerQuery: number;
  requestDelayMs: number;
}

export const russianOaiProviderConfigs: readonly OaiPmhProviderConfig[] = [
  {
    id: "cyberleninka",
    baseUrl: "https://cyberleninka.ru/oai",
    metadataPrefix: "oai_dc",
    set: "journal_9416",
    setsByTopic: {
      pvt: "journal_35058",
      modeling: "journal_35058",
      "well-testing": "journal_32093",
      "reservoir-physics": "journal_30227",
      "subsurface-hydromechanics": "journal_30227",
      "porous-media-flow": "journal_32093",
    },
    institution: "Научная электронная библиотека «КиберЛенинка»",
    accessHint: "external-fulltext",
    maxPagesPerQuery: 3,
    maxRawRecordsPerQuery: 30,
    requestDelayMs: 1_000,
  },
  {
    id: "kpfu",
    baseUrl: "https://dspace.kpfu.ru/oai/request",
    metadataPrefix: "oai_dc",
    set: "com_net_6046",
    setsByTopic: {
      pvt: "col_net_6048",
      modeling: "col_net_6049",
      "reservoir-physics": "col_net_6049",
      "subsurface-hydromechanics": "col_net_6049",
      "porous-media-flow": "col_net_6049",
    },
    institution: "Институт геологии и нефтегазовых технологий КФУ",
    accessHint: "unknown",
    maxPagesPerQuery: 2,
    maxRawRecordsPerQuery: 200,
    requestDelayMs: 1_000,
  },
] as const;

export const russianProviderCapabilities: readonly RussianProviderCapability[] = [
  {
    id: "rsl",
    label: "РГБ",
    searchInterface: "Официальный Search/ALEPH-каталог для пользователей",
    protocol: "Публичный discovery API, SRU или OAI-PMH не подтверждён",
    publicAccess: "Ручной поиск публичен; часть электронных документов ограничена",
    metadata: "Библиографические записи в веб-каталоге",
    pagination: "Только веб-интерфейс",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "API ОЭК относится к приёму обязательного экземпляра, а не к поиску",
    status: "MANUAL_ONLY",
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://www.rsl.ru/elektronnye-resursy/elektronnyy-katalog",
      "https://oek.rsl.ru/page/api_p1",
    ],
  },
  {
    id: "neb",
    label: "НЭБ",
    searchInterface: "Официальный публичный веб-каталог",
    protocol: "Документированный публичный discovery API/OAI-PMH не подтверждён",
    publicAccess: "Метаданные видимы; доступ к части текстов требует авторизации",
    metadata: "Подробные библиографические и MARC-поля на карточке",
    pagination: "Только веб-интерфейс",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "Автоматизированное harvesting-основание не найдено",
    status: "MANUAL_ONLY",
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://rusneb.ru/catalog/"],
  },
  {
    id: "cyberleninka",
    label: "КиберЛенинка",
    searchInterface: "Официальный OAI endpoint и журнальные sets",
    protocol: "OAI-PMH 2.0 / Dublin Core",
    publicAccess: "Публичный без ключа и входа",
    metadata: "title, creator, subject, description, publisher, date, type, identifier, language, rights",
    pagination: "resumptionToken; фактически 10 records/page",
    rateLimits: "Не опубликованы; PLAST использует concurrency 1 и задержку",
    terms: "Open Access; используется только OAI metadata, без загрузки fulltext",
    status: "IMPLEMENT",
    implementedProvider: "cyberleninka",
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://cyberleninka.ru/oai?verb=Identify",
      "https://cyberleninka.ru/oai?verb=ListMetadataFormats",
      "https://cyberleninka.ru/terms.html",
    ],
  },
  {
    id: "gubkin",
    label: "Электронная нефтегазовая библиотека Губкина",
    searchInterface: "Официальное Angular-приложение библиотеки",
    protocol: "Публичный документированный API/OAI-PMH не подтверждён",
    publicAccess: "Вход для читателей, сотрудников и партнёров",
    metadata: "Каталожные записи через пользовательский интерфейс",
    pagination: "Не документирована для machine access",
    rateLimits: "Не опубликованы",
    terms: "Не обходить личный кабинет и не использовать внутренние endpoints",
    status: "REQUIRES_PERMISSION",
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://elib.gubkin.ru/"],
  },
  {
    id: "tiu",
    label: "Тюменский индустриальный университет",
    searchInterface: "Электронный каталог/библиотека на ИРБИС64+",
    protocol: "Публичный OAI-PMH/SRU не подтверждён",
    publicAccess: "Каталог ориентирован на авторизованных читателей",
    metadata: "Каталог, ВКР и внутривузовские издания",
    pagination: "Не документирована для machine access",
    rateLimits: "Не опубликованы",
    terms: "Автоматизация без разрешения не выполняется",
    status: "REQUIRES_PERMISSION",
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://www.tyuiu.ru/infrastruktura/bibliotecno-izdatelskii-kompleks",
      "https://news.tyuiu.ru/biblioteka-u-vas-doma",
    ],
  },
  {
    id: "tpu",
    label: "Томский политехнический университет",
    searchInterface: "Публичные DSpace HTML records",
    protocol: "Проверенные OAI routes вернули 404, REST route — 403",
    publicAccess: "Ручной просмотр metadata публичен",
    metadata: "Богатые карточки DSpace, включая УДК и ключевые слова",
    pagination: "Только веб-интерфейс в подтверждённом доступе",
    rateLimits: "Для machine discovery не опубликованы",
    terms: "HTML scraping не используется при неясном основании",
    status: "DEFER",
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://earchive.tpu.ru/"],
  },
  {
    id: "mining-university",
    label: "Санкт-Петербургский горный университет",
    searchInterface: "Электронный каталог и библиотечные ресурсы",
    protocol: "Публичный OAI-PMH/SRU не подтверждён",
    publicAccess: "Официальная страница ограничивает электронные ресурсы зарегистрированными пользователями",
    metadata: "Книги, диссертации, отчёты и статьи в каталогах",
    pagination: "Не документирована для machine access",
    rateLimits: "Не опубликованы",
    terms: "Не обходить регистрацию или внутреннюю сеть",
    status: "REQUIRES_PERMISSION",
    checkedAt: "2026-08-16",
    evidenceUrls: ["https://spmi.ru/elektronnye-resursy"],
  },
  {
    id: "kpfu",
    label: "КФУ — Институт геологии и нефтегазовых технологий",
    searchInterface: "Публичная профильная DSpace community и OAI set",
    protocol: "OAI-PMH 2.0 / Dublin Core",
    publicAccess: "Публичный без ключа и входа",
    metadata: "title, creator, subject, description, publisher, date, type, identifier, language, rights",
    pagination: "resumptionToken; фактически до 100 records/page",
    rateLimits: "Не опубликованы; PLAST использует concurrency 1 и задержку",
    terms: "Только OAI metadata; права fulltext определяются каждой записью",
    status: "IMPLEMENT",
    implementedProvider: "kpfu",
    checkedAt: "2026-08-16",
    evidenceUrls: [
      "https://dspace.kpfu.ru/oai/request?verb=Identify",
      "https://dspace.kpfu.ru/xmlui/handle/net/6046",
    ],
  },
] as const;

export function validateRussianProviderCapabilities() {
  const required = new Set(["rsl", "neb", "cyberleninka", "gubkin", "tiu", "tpu", "mining-university"]);
  const seen = new Set<string>();
  for (const capability of russianProviderCapabilities) {
    if (seen.has(capability.id)) throw new Error(`Duplicate provider capability: ${capability.id}`);
    seen.add(capability.id);
    if (!providerAutomationStatuses.includes(capability.status)) {
      throw new Error(`Invalid provider status: ${capability.id}`);
    }
    if (capability.status === "IMPLEMENT" && !capability.implementedProvider) {
      throw new Error(`Implemented capability has no provider ID: ${capability.id}`);
    }
    for (const value of capability.evidenceUrls) {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error(`Provider evidence URL must use HTTPS: ${capability.id}`);
    }
  }
  for (const id of required) {
    if (!seen.has(id)) throw new Error(`Missing required provider capability: ${id}`);
  }

  for (const config of russianOaiProviderConfigs) {
    const capability = russianProviderCapabilities.find((item) => item.implementedProvider === config.id);
    if (!capability || capability.status !== "IMPLEMENT") {
      throw new Error(`OAI config has no IMPLEMENT capability: ${config.id}`);
    }
    if (new URL(config.baseUrl).protocol !== "https:") throw new Error(`OAI base URL must use HTTPS: ${config.id}`);
    if (!config.set.trim()) throw new Error(`OAI set is required: ${config.id}`);
    for (const [topicId, set] of Object.entries(config.setsByTopic ?? {})) {
      if (!topicId.trim() || !set.trim()) throw new Error(`Invalid topic OAI set: ${config.id}`);
    }
  }
  return true;
}
