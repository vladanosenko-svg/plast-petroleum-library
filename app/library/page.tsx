import type { Metadata } from "next";
import Link from "next/link";
import { BookCover, LibraryFilterForm } from "../components";
import {
  getTopicById,
  materialLanguageLabels,
  sourceAccessStatusLabels,
  sourceRecordStatusLabels,
  sources,
  sourceTypeLabels,
} from "../data";
import { filterSources, parseLibraryFilters, pluralizeMaterials } from "../library-search";

export const metadata: Metadata = {
  title: "Библиотека",
  description: "Каталог демонстрационных материалов по геологии, исследованию и разработке месторождений.",
};

type LibrarySearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LibraryPage({ searchParams }: { searchParams: LibrarySearchParams }) {
  const filters = parseLibraryFilters(await searchParams);
  const filteredSources = filterSources(sources, filters);
  const resultCount = pluralizeMaterials(filteredSources.length);
  const selectedTopic = getTopicById(filters.topic);
  const years = [...new Set(sources.flatMap((source) => source.year ? [source.year] : []))].sort((a, b) => b - a);
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

      {filteredSources.length > 0 ? (
        <div className="catalog-grid" data-testid="catalog-results">
          {filteredSources.map((source, index) => {
            const linkedTopics = source.topics.map(getTopicById).filter((topic) => Boolean(topic));
            return (
            <Link href={`/library/${source.slug}`} prefetch={false} className="catalog-item" key={source.id}>
              <BookCover book={source} index={index} />
              <div>
                <p>{sourceTypeLabels[source.type]} · {materialLanguageLabels[source.language]}</p>
                <h2>{source.title}</h2>
                <span>{source.authors.map((author) => author.fullName).join(", ")}</span>
                <small>{source.year ?? "Год не указан"}</small>
                <p className="catalog-description">{source.description}</p>
                <div className="catalog-topics" aria-label="Темы источника">
                  {linkedTopics.slice(0, 3).map((topic) => <span key={topic?.id}>{topic?.title}</span>)}
                </div>
                <div className="catalog-status">
                  <span>{sourceAccessStatusLabels[source.access.status]}</span>
                  <span>{sourceRecordStatusLabels[source.recordStatus]}</span>
                </div>
              </div>
            </Link>
          );})}
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
