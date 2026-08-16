import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

const routes = [
  { pathname: "/", heading: "Библиотека" },
  { pathname: "/library", heading: "Библиотека" },
  { pathname: "/topics", heading: "Все направления" },
  { pathname: "/courses", heading: "Курсы" },
  { pathname: "/about", heading: "ПЛАСТ" },
];

test("server-renders every primary route", async () => {
  for (const route of routes) {
    const response = await render(route.pathname);

    assert.equal(response.status, 200, route.pathname);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

    const html = await response.text();
    assert.match(html, new RegExp(route.heading, "i"), route.pathname);
    assert.doesNotMatch(html, /href=["']#["']/i, route.pathname);
  }
});

test("renders complete Next.js navigation on every route", async () => {
  for (const route of routes) {
    const html = await (await render(route.pathname)).text();

    assert.match(html, /href=["']\/["']/i);
    assert.match(html, /href=["']\/library["']/i);
    assert.match(html, /href=["']\/topics["']/i);
    assert.match(html, /href=["']\/courses["']/i);
    assert.match(html, /href=["']\/about["']/i);
    assert.doesNotMatch(html, /href=["']\/topics#modeling["'][^>]*>Курсы/i);
    assert.doesNotMatch(html, /href=["']\/#about["'][^>]*>О проекте/i);
  }
});

test("marks current sections and describes future functionality truthfully", async () => {
  for (const pathname of ["/library", "/topics", "/courses", "/about"]) {
    const html = await (await render(pathname)).text();
    assert.match(html, /class=["']active["'][^>]*aria-current=["']page["']/i, pathname);
  }

  const coursesHtml = await (await render("/courses")).text();
  assert.match(coursesHtml, /Раздел в разработке/i);
  assert.match(coursesHtml, /Будущее направление/i);

  const aboutHtml = await (await render("/about")).text();
  assert.match(aboutHtml, /В дальнейшем/i);
  assert.match(aboutHtml, /планируются/i);
});

test("server-renders search, topic empty state, materials and custom 404", async () => {
  const pvtHtml = await (await render("/library?q=PVT")).text();
  assert.match(pvtHtml, /2 материала/i);
  assert.match(pvtHtml, /PVT-свойства пластовых флюидов/i);

  const unknownHtml = await (await render("/library?q=asdfgh123")).text();
  assert.match(unknownHtml, /По вашему запросу ничего не найдено/i);
  assert.match(unknownHtml, /Сбросить поиск/i);

  const topicHtml = await (await render("/library?topic=geophysics")).text();
  assert.match(topicHtml, /Материалы по направлению «[\s\S]*?Геофизика[\s\S]*?» пока не добавлены/i);

  const materialResponse = await render("/library/reservoir-engineering");
  assert.equal(materialResponse.status, 200);
  const materialHtml = await materialResponse.text();
  assert.match(materialHtml, /Физика нефтяного и газового пласта — ПЛАСТ/i);
  assert.match(materialHtml, /Демонстрационный материал/i);
  assert.match(materialHtml, /Источник пока не добавлен/i);
  assert.doesNotMatch(materialHtml, /Первое|Отраслевая коллекция|Читать материал/i);

  const notFoundResponse = await render("/random-page-404");
  assert.equal(notFoundResponse.status, 404);
  assert.match(await notFoundResponse.text(), /Страница не найдена/i);
});

test("reader routes handle metadata-only, invalid page and missing sources safely", async () => {
  for (const pathname of [
    "/library/reservoir-engineering/read",
    "/library/reservoir-engineering/read?page=wrong",
    "/library/reservoir-engineering/read?page=-7",
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, /Этот источник пока недоступен для чтения в PLAST/i, pathname);
    assert.doesNotMatch(html, /Error 1101|Worker threw exception/i, pathname);
  }

  const missing = await render("/library/source-that-does-not-exist/read");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Страница не найдена/i);
});
