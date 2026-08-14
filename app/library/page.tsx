import Link from "next/link";
import { BookCover, SearchField } from "../components";
import { materials } from "../data";
import { cleanSearchQuery, filterMaterials, pluralizeMaterials } from "../library-search";

type LibrarySearchParams = Promise<{ q?: string | string[] }>;

export default async function LibraryPage({ searchParams }: { searchParams: LibrarySearchParams }) {
  const params = await searchParams;
  const query = cleanSearchQuery(Array.isArray(params.q) ? params.q[0] : params.q);
  const filteredMaterials = filterMaterials(materials, query);
  const resultCount = pluralizeMaterials(filteredMaterials.length);

  return (
    <main className="shell page-space">
      <div className="page-intro">
        <p className="eyebrow">Каталог / {resultCount}</p>
        <h1>Библиотека</h1>
        <p>Профессиональные источники по геологии, исследованию и разработке месторождений.</p>
      </div>

      <SearchField compact defaultQuery={query} />

      {query && (
        <section className="search-summary" aria-live="polite" aria-label="Результаты поиска">
          <p>Результаты по запросу <strong>«{query}»</strong></p>
          <span>{resultCount}</span>
          <Link href="/library">Сбросить поиск →</Link>
        </section>
      )}

      <div className="catalog-toolbar">
        <div><button className="filter-active">Все материалы</button><button>Книги</button><button>Статьи</button><button>Пособия</button></div>
        <div><label>Язык <select defaultValue="all"><option value="all">Все</option><option>Русский</option><option>Английский</option></select></label><label>Год <select defaultValue="new"><option value="new">Сначала новые</option><option>2025</option><option>2024</option></select></label></div>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="catalog-grid">
          {filteredMaterials.map((material, index) => (
            <Link href={`/library/${material.slug}`} className="catalog-item" key={material.slug}>
              <BookCover book={material} index={index} />
              <div><p>{material.type} · {material.language}</p><h2>{material.title}</h2><span>{material.author}</span><small>{material.year}</small></div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="library-empty" aria-labelledby="library-empty-title">
          <p className="eyebrow">Коллекция находится в разработке</p>
          <h2 id="library-empty-title">Материалы пока не добавлены</h2>
          <p>По направлению «{query}» в библиотеке пока нет материалов.</p>
          <Link href="/library">Смотреть всю библиотеку →</Link>
        </section>
      )}
    </main>
  );
}
