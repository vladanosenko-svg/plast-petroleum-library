import type { Metadata } from "next";
import Link from "next/link";
import { BookCover, LibraryFilterForm } from "../components";
import {
  getTopicById,
  materialLanguageLabels,
  materialTypeLabels,
  materials,
} from "../data";
import { filterMaterials, parseLibraryFilters, pluralizeMaterials } from "../library-search";

export const metadata: Metadata = {
  title: "Библиотека",
  description: "Каталог демонстрационных материалов по геологии, исследованию и разработке месторождений.",
};

type LibrarySearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LibraryPage({ searchParams }: { searchParams: LibrarySearchParams }) {
  const filters = parseLibraryFilters(await searchParams);
  const filteredMaterials = filterMaterials(materials, filters);
  const resultCount = pluralizeMaterials(filteredMaterials.length);
  const selectedTopic = getTopicById(filters.topic);
  const years = [...new Set(materials.flatMap((material) => material.year ? [material.year] : []))].sort((a, b) => b - a);
  const hasFilters = Boolean(filters.query || filters.type || filters.language || filters.year || filters.topic);

  return (
    <main className="shell page-space">
      <div className="page-intro">
        <p className="eyebrow">Каталог / {resultCount}</p>
        <h1>Библиотека</h1>
        <p>Демонстрационная коллекция материалов по геологии, исследованию и разработке месторождений.</p>
      </div>

      <LibraryFilterForm filters={filters} years={years} />

      {hasFilters && (
        <section className="search-summary" aria-live="polite" aria-label="Результаты фильтрации">
          <p>
            {filters.query ? <>Результаты по запросу <strong>«{filters.query}»</strong></> : selectedTopic ? <>Направление <strong>«{selectedTopic.title}»</strong></> : "Выбранные фильтры"}
          </p>
          <span>{resultCount}</span>
          <Link href="/library" prefetch={false}>Сбросить всё →</Link>
        </section>
      )}

      {filteredMaterials.length > 0 ? (
        <div className="catalog-grid" data-testid="catalog-results">
          {filteredMaterials.map((material, index) => (
            <Link href={`/library/${material.slug}`} prefetch={false} className="catalog-item" key={material.id}>
              <BookCover book={material} index={index} />
              <div>
                <p>{materialTypeLabels[material.type]} · {materialLanguageLabels[material.language]}</p>
                <h2>{material.title}</h2>
                <span>{material.authors.join(", ")}</span>
                <small>{material.year ?? "Год не указан"}</small>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="library-empty" aria-labelledby="library-empty-title">
          <p className="eyebrow">Ничего не найдено</p>
          {filters.query ? (
            <>
              <h2 id="library-empty-title">По вашему запросу ничего не найдено.</h2>
              <p>Попробуйте изменить формулировку или сбросить выбранные фильтры.</p>
              <Link href="/library" prefetch={false}>Сбросить поиск →</Link>
            </>
          ) : selectedTopic ? (
            <>
              <h2 id="library-empty-title">Материалы пока не добавлены</h2>
              <p>Материалы по направлению «{selectedTopic.title}» пока не добавлены.</p>
              <Link href="/library" prefetch={false}>Посмотреть все материалы →</Link>
            </>
          ) : (
            <>
              <h2 id="library-empty-title">Нет подходящих материалов</h2>
              <p>Измените или сбросьте выбранные фильтры.</p>
              <Link href="/library" prefetch={false}>Сбросить фильтры →</Link>
            </>
          )}
        </section>
      )}
    </main>
  );
}
