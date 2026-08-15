import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "../../components";
import {
  getTopicById,
  materialLanguageLabels,
  sourceAccessStatusLabels,
  sourceProviderLabels,
  sourceRecordStatusLabels,
  sources,
  sourceTypeLabels,
} from "../../data";

type SourcePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return sources.map((source) => ({ slug: source.slug }));
}

export async function generateMetadata({ params }: SourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const source = sources.find((item) => item.slug === slug);
  if (!source) return {};

  return {
    title: source.title,
    description: source.description,
    openGraph: {
      title: `${source.title} — ПЛАСТ`,
      description: source.description,
    },
  };
}

export default async function SourcePage({ params }: SourcePageProps) {
  const { slug } = await params;
  const source = sources.find((item) => item.slug === slug);
  if (!source) notFound();
  const linkedTopics = source.topics.map(getTopicById).filter((topic) => Boolean(topic));

  return (
    <main className="shell publication page-space">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link href="/library" prefetch={false}>Библиотека</Link><span aria-hidden="true">/</span><span>{sourceTypeLabels[source.type]}</span>
      </nav>
      <div className="publication-grid">
        <BookCover book={source} />
        <article>
          <p className="eyebrow">{sourceTypeLabels[source.type]}{source.year ? ` / ${source.year}` : ""}</p>
          <h1>{source.title}</h1>
          {source.subtitle && <p className="publication-subtitle">{source.subtitle}</p>}
          <p className="publication-author">{source.authors.map((author) => author.fullName).join(", ")}</p>
          <p className={`material-status ${source.recordStatus}`}>{sourceRecordStatusLabels[source.recordStatus]}</p>
          <dl>
            <div><dt>Язык</dt><dd>{materialLanguageLabels[source.language]}</dd></div>
            {source.year && <div><dt>Год</dt><dd>{source.year}</dd></div>}
            <div><dt>Тип</dt><dd>{sourceTypeLabels[source.type]}</dd></div>
            <div><dt>Доступ</dt><dd>{sourceAccessStatusLabels[source.access.status]}</dd></div>
            {source.identifiers?.doi && <div><dt>DOI</dt><dd>{source.identifiers.doi}</dd></div>}
            {(source.identifiers?.isbn13 || source.identifiers?.isbn10) && <div><dt>ISBN</dt><dd>{source.identifiers.isbn13 ?? source.identifiers.isbn10}</dd></div>}
            {source.publication?.publisher && <div><dt>Издатель</dt><dd>{source.publication.publisher}</dd></div>}
            {source.publication?.journal && <div><dt>Журнал</dt><dd>{source.publication.journal}</dd></div>}
            {source.publication?.edition && <div><dt>Издание</dt><dd>{source.publication.edition}</dd></div>}
          </dl>
          <div className="topic-tags" aria-label="Темы источника">
            {linkedTopics.map((topic) => <Link href={`/library?topic=${topic?.id}`} prefetch={false} key={topic?.id}>{topic?.title}</Link>)}
          </div>
          {source.access.status === "external-fulltext" && source.access.externalUrl ? (
            <a className="primary-link" href={source.access.externalUrl} target="_blank" rel="noopener noreferrer">Открыть источник ↗</a>
          ) : source.access.status === "local-fulltext" ? (
            <p className="source-unavailable">Документ будет доступен для чтения</p>
          ) : source.access.status === "external-fulltext" ? (
            <p className="source-unavailable">Ссылка на внешний источник уточняется</p>
          ) : (
            <p className="source-unavailable">Полный текст недоступен в PLAST. Источник пока не добавлен.</p>
          )}
        </article>
      </div>
      <section className="contents" aria-labelledby="overview-title">
        <p className="eyebrow">Краткое содержание</p>
        <h2 id="overview-title">Об источнике</h2>
        <p>{source.description}</p>
      </section>
      {source.provenance.length > 0 && (
        <section className="source-provenance" aria-labelledby="provenance-title">
          <p className="eyebrow">Происхождение записи</p>
          <h2 id="provenance-title">Где найдены сведения</h2>
          <ul>
            {source.provenance.map((item) => (
              <li key={`${item.provider}:${item.providerRecordId ?? item.url}`}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{sourceProviderLabels[item.provider]} ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
