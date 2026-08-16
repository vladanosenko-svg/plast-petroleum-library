import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sources } from "../../../data";
import { DocumentReader } from "../../../readers/document-reader";

type ReaderPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export function generateStaticParams() {
  return sources.map((source) => ({ slug: source.slug }));
}

export async function generateMetadata({ params }: ReaderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const source = sources.find((item) => item.slug === slug);
  return source ? { title: `Чтение: ${source.title}`, description: `Документ источника «${source.title}» в библиотеке ПЛАСТ.` } : {};
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const source = sources.find((item) => item.slug === slug);
  if (!source) notFound();

  const pageValue = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsedPage = Number(pageValue);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const localDocument = source.access.status === "local-fulltext" && source.document?.storageKey ? source.document : undefined;

  return <main className="shell page-space reader-page">
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      <Link href="/library" prefetch={false}>Библиотека</Link><span aria-hidden="true">/</span>
      <Link href={`/library/${source.slug}`} prefetch={false}>{source.title}</Link><span aria-hidden="true">/</span><span>Чтение</span>
    </nav>
    <div className="reader-heading">
      <Link className="reader-back" href={`/library/${source.slug}`} prefetch={false}>← Назад к источнику</Link>
      <p className="eyebrow">Document reader</p>
      <h1>{source.title}</h1>
      <p>{source.authors.map((author) => author.fullName).join(", ")}{source.year ? ` / ${source.year}` : ""}</p>
    </div>

    {localDocument ? <section className="reader-shell" aria-label="Просмотр документа">
      <div className="reader-toolbar" role="toolbar" aria-label="Действия с документом">
        <span>{localDocument.originalFilename}</span>
        <a href={`/library/${source.slug}/document`} target="_blank" rel="noopener noreferrer">Открыть оригинал ↗</a>
      </div>
      <div className="reader-viewport">
        <DocumentReader
          documentUrl={`/library/${source.slug}/document`}
          filename={localDocument.originalFilename ?? "document"}
          format={localDocument.format}
          initialPage={page}
        />
      </div>
    </section> : source.access.status === "external-fulltext" && source.access.externalUrl ? (
      <section className="reader-unavailable"><h2>Полный текст находится у внешнего источника</h2><p>PLAST не проксирует внешние документы.</p><a className="primary-link" href={source.access.externalUrl} target="_blank" rel="noopener noreferrer">Открыть в источнике ↗</a></section>
    ) : (
      <section className="reader-unavailable"><h2>Этот источник пока недоступен для чтения в PLAST.</h2><p>Карточка и библиографические сведения доступны, но разрешённый локальный файл ещё не добавлен.</p></section>
    )}
  </main>;
}
