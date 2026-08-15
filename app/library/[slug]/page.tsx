import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "../../components";
import {
  getTopicById,
  materialLanguageLabels,
  materialTypeLabels,
  materials,
} from "../../data";

type MaterialPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return materials.map((material) => ({ slug: material.slug }));
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const material = materials.find((item) => item.slug === slug);
  if (!material) return {};

  return {
    title: material.title,
    description: material.description,
    openGraph: {
      title: `${material.title} — ПЛАСТ`,
      description: material.description,
    },
  };
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { slug } = await params;
  const material = materials.find((item) => item.slug === slug);
  if (!material) notFound();
  const linkedTopics = material.topics.map(getTopicById).filter((topic) => Boolean(topic));

  return (
    <main className="shell publication page-space">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link href="/library" prefetch={false}>Библиотека</Link><span aria-hidden="true">/</span><span>{materialTypeLabels[material.type]}</span>
      </nav>
      <div className="publication-grid">
        <BookCover book={material} />
        <article>
          <p className="eyebrow">{materialTypeLabels[material.type]}{material.year ? ` / ${material.year}` : ""}</p>
          <h1>{material.title}</h1>
          <p className="publication-author">{material.authors.join(", ")}</p>
          <p className={`material-status ${material.verified ? "verified" : "demo"}`}>{material.verified ? "Проверенный источник" : "Демонстрационный материал"}</p>
          <dl>
            <div><dt>Язык</dt><dd>{materialLanguageLabels[material.language]}</dd></div>
            {material.year && <div><dt>Год</dt><dd>{material.year}</dd></div>}
            <div><dt>Тип</dt><dd>{materialTypeLabels[material.type]}</dd></div>
            {material.source && <div><dt>Источник</dt><dd>{material.source.name}</dd></div>}
          </dl>
          <div className="topic-tags" aria-label="Темы материала">
            {linkedTopics.map((topic) => <Link href={`/library?topic=${topic?.id}`} prefetch={false} key={topic?.id}>{topic?.title}</Link>)}
          </div>
          {material.externalUrl ? (
            <a className="primary-link" href={material.externalUrl} target="_blank" rel="noopener noreferrer">Читать в источнике ↗</a>
          ) : (
            <p className="source-unavailable">Источник пока не добавлен</p>
          )}
        </article>
      </div>
      <section className="contents" aria-labelledby="overview-title">
        <p className="eyebrow">Краткое содержание</p>
        <h2 id="overview-title">Обзор материала</h2>
        <p>{material.description}</p>
      </section>
    </main>
  );
}
