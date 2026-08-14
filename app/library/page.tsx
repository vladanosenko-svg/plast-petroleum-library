import Link from "next/link";
import { BookCover, SearchField } from "../components";
import { books } from "../data";

export default function LibraryPage() { return <main className="shell page-space">
  <div className="page-intro"><p className="eyebrow">Каталог / 47 материалов</p><h1>Библиотека</h1><p>Профессиональные источники по геологии, исследованию и разработке месторождений.</p></div>
  <SearchField compact />
  <div className="catalog-toolbar"><div><button className="filter-active">Все материалы</button><button>Книги</button><button>Статьи</button><button>Пособия</button></div><div><label>Язык <select defaultValue="all"><option value="all">Все</option><option>Русский</option><option>Английский</option></select></label><label>Год <select defaultValue="new"><option value="new">Сначала новые</option><option>2025</option><option>2024</option></select></label></div></div>
  <div className="catalog-grid">{books.map((book, index) => <Link href={`/library/${book.slug}`} className="catalog-item" key={book.slug}><BookCover book={book} index={index}/><div><p>{book.type} · {book.language}</p><h2>{book.title}</h2><span>{book.author}</span><small>{book.year}</small></div></Link>)}</div>
</main>; }
