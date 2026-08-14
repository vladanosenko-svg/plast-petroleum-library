import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "../../components";
import { materials } from "../../data";

export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const book = materials.find(b => b.slug === slug); if (!book) notFound(); return <main className="shell publication page-space">
  <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/library">Библиотека</Link><span>/</span><span>{book.type}</span></nav>
  <div className="publication-grid"><BookCover book={book} /><article><p className="eyebrow">{book.type} / {book.year}</p><h1>{book.title}</h1><p className="publication-author">{book.author}</p>{book.description && <p className="publication-description">{book.description}</p>}<dl><div><dt>Язык</dt><dd>{book.language}</dd></div><div><dt>Издание</dt><dd>Первое</dd></div><div><dt>Источник</dt><dd>Отраслевая коллекция</dd></div></dl>{book.topics && <div className="topic-tags">{book.topics.map(t => <span key={t}>{t}</span>)}</div>}<a className="primary-link" href="#contents">Читать материал ↗</a></article></div>
  <section id="contents" className="contents"><p className="eyebrow">Содержание</p><ol><li><span>01</span>Введение и основные определения</li><li><span>02</span>Подготовка и контроль исходных данных</li><li><span>03</span>Методы расчёта и интерпретации</li><li><span>04</span>Инженерные примеры</li></ol></section>
</main>; }
