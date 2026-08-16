import { expect, test, type Page } from "@playwright/test";

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message) => {
    const isExpectedNotFoundDocument = message.text().startsWith("Failed to load resource")
      && message.location().url.includes("/random-page-404");
    if (message.type() === "error" && !isExpectedNotFoundDocument) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
});

test.afterEach(async ({ page }) => {
  expect.soft(consoleErrors.get(page) ?? [], "browser console must stay clean").toEqual([]);
});

test("primary navigation changes the URL and page", async ({ page }) => {
  const routes = [
    ["Библиотека", "/library", "Библиотека"],
    ["Темы", "/topics", "Все направления"],
    ["Курсы", "/courses", "Курсы"],
    ["О проекте", "/about", "ПЛАСТ"],
  ] as const;

  for (const [label, pathname, heading] of routes) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${pathname}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("library card opens an individual material with metadata", async ({ page }) => {
  await page.goto("/library");
  const firstCard = page.locator(".catalog-item").first();
  await expect(firstCard.getByText("Только библиографические данные")).toBeVisible();
  await expect(firstCard.getByText("Демонстрационный материал")).toBeVisible();
  await firstCard.click();
  await expect(page).toHaveURL(/\/library\/reservoir-engineering$/);
  await expect(page).toHaveTitle("Физика нефтяного и газового пласта — ПЛАСТ");
  await expect(page.getByText("Демонстрационный материал")).toBeVisible();
  await expect(page.getByText("Только библиографические данные")).toBeVisible();
  await expect(page.getByText("Полный текст недоступен в PLAST")).toBeVisible();
  await expect(page.getByText("Источник пока не добавлен")).toBeVisible();
  await page.getByRole("link", { name: "Библиотека" }).first().click();
  await expect(page).toHaveURL(/\/library$/);
});

test("all 65 topic links navigate by stable topic ID", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/topics");
  await expect(page.locator(".knowledge-topic-list a")).toHaveCount(65);

  for (let index = 0; index < 65; index += 1) {
    const link = page.locator(".knowledge-topic-list a").nth(index);
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/library\?topic=[a-z0-9-]+$/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href?.replace("?", "\\?")}$`));
    await expect(page.getByRole("combobox", { name: "Тема" })).not.toHaveValue("");
    await page.goBack();
    await expect(page).toHaveURL(/\/topics$/);
  }
});

test("search returns expected counts and a truthful empty state", async ({ page }) => {
  await page.goto("/library");
  const search = page.getByRole("textbox", { name: "Поиск" });

  await search.fill("PVT");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.locator(".catalog-item")).toHaveCount(2);
  await expect(page).toHaveURL(/q=PVT/);

  await search.fill("ГДИС");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.locator(".catalog-item")).toHaveCount(1);

  await search.fill("asdfgh123");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.getByRole("heading", { name: "По вашему запросу ничего не найдено." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Сбросить поиск/ })).toBeVisible();
});

test("combined filters persist in URL, reload, Back and Forward", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("textbox", { name: "Поиск" }).fill("PVT");
  await page.getByRole("combobox", { name: "Тип" }).selectOption("guide");
  await page.getByRole("combobox", { name: "Язык" }).selectOption("ru");
  await page.getByRole("combobox", { name: "Год" }).selectOption("2024");
  await page.getByRole("combobox", { name: "Тема" }).selectOption("pvt");
  await page.getByRole("button", { name: "Применить" }).click();

  await expect(page).toHaveURL(/q=PVT&type=guide&language=ru&year=2024&topic=pvt/);
  await expect(page.locator(".catalog-item")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Тема" })).toHaveValue("pvt");
  await expect(page.locator(".catalog-item")).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/library$/);
  await page.goForward();
  await expect(page).toHaveURL(/topic=pvt/);
});

test("existing topic without materials has a topic-specific empty state", async ({ page }) => {
  await page.goto("/library?topic=geophysics");
  await expect(page.getByText("Материалы по направлению «Геофизика» пока не добавлены.")).toBeVisible();
});

test("mobile menu closes after successful navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator("details.mobile-menu");
  await page.getByText("Меню", { exact: true }).click();
  await expect(menu).toHaveAttribute("open", "");
  await menu.getByRole("link", { name: "О проекте" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page.getByRole("heading", { level: 1, name: "ПЛАСТ" })).toBeVisible();
});

test("dark theme survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Переключить цветовую тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("custom Russian 404 is rendered", async ({ page }) => {
  const response = await page.goto("/random-page-404");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную", exact: true })).toBeVisible();
});

test("pages do not overflow across required viewports and themes", async ({ page }) => {
  const widths = [320, 360, 375, 390, 412, 768, 1024, 1280, 1440];
  const routes = ["/", "/library", "/topics", "/courses", "/about", "/library/reservoir-engineering", "/library/reservoir-engineering/read", "/random-page-404"];

  for (const theme of ["light", "dark"]) {
    await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(route);
        const sizes = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(sizes.scrollWidth, `${theme} ${width}px ${route}`).toBeLessThanOrEqual(sizes.clientWidth);
      }
    }
  }
});

test("metadata-only reader stays usable at mobile and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/library/reservoir-engineering/read?page=invalid");
    await expect(page.getByRole("heading", { name: "Этот источник пока недоступен для чтения в PLAST." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Назад к источнику" })).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits, `${width}px metadata reader`).toBe(true);
  }
});

test("all seven source pages render at required widths in both themes", async ({ page }) => {
  test.setTimeout(120_000);
  const slugs = ["reservoir-engineering", "well-test-analysis", "reservoir-simulation", "pvt-properties", "geological-modeling", "eor-review", "eclipse-manual"];
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const slug of slugs) {
        await page.goto(`/library/${slug}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator(".publication h1")).toBeVisible();
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
        expect(fits, `${theme} ${width}px ${slug}`).toBe(true);
      }
    }
  }
});
