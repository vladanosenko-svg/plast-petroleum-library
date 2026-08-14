import Link from "next/link";
import { BookCover, SearchField, SectionHeader } from "./components";
import { books, materials, topics } from "./data";

export default function Home() {
  return (
    <main>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Открытая отраслевая библиотека</p>
          <h1 id="hero-title">Библиотека<br />нефтегазовых знаний</h1>
          <p className="hero-lead">Книги, статьи, учебные материалы и инженерные знания по разработке нефтяных и газовых месторождений.</p>
          <SearchField />
          <div className="search-examples" aria-label="Примеры поиска">
            <span>Например:</span>
            <Link href="/library?q=Гидродинамическое моделирование">Гидродинамическое моделирование</Link>
            <Link href="/library?q=PVT">PVT</Link>
            <Link href="/library?q=ГДИС">ГДИС</Link>
          </div>
        </div>
        <div className="strata" aria-hidden="true">
          <span className="strata-label">КОЛЛЕКЦИЯ / 01—08</span>
          <div className="strata-lines"><i /><i /><i /><i /><i /><i /></div>
          <p>геология<br />пласт<br />скважина<br />добыча</p>
        </div>
      </section>

      <section className="shell section" id="topics">
        <SectionHeader index="01" title="Основные направления" href="/topics" linkText="Все направления" />
        <div className="topic-grid">
          {topics.map((topic, index) => (
            <Link className="topic-row" href={`/topics#${topic.slug}`} key={topic.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{topic.title}</strong><i>↗</i>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell section">
        <SectionHeader index="02" title="Рекомендуем" href="/library" linkText="Вся коллекция" />
        <div className="book-grid">
          {books.slice(0, 5).map((book, index) => (
            <Link className="book-card" href={`/library/${book.slug}`} key={book.slug}>
              <BookCover book={book} index={index} />
              <h3>{book.title}</h3><p>{book.author}</p><span>{book.year}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="study-section section">
        <div className="shell study-grid">
          <div><p className="eyebrow">03 / Изучать по темам</p><h2>Гидродинамическое моделирование</h2><p>От основ фильтрации до адаптации модели и прогнозирования.</p><Link className="text-link" href="/topics#modeling">Открыть направление →</Link></div>
          <ol className="study-path">
            {['Основы','Исходные данные','Инициализация','Адаптация','Прогноз'].map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, '0')}</span>{step}</li>)}
          </ol>
        </div>
      </section>

      <section className="shell section">
        <SectionHeader index="04" title="Новые материалы" href="/library" linkText="Смотреть библиотеку" />
        <div className="material-table" role="table" aria-label="Новые материалы">
          <div className="material-head" role="row"><span>Название</span><span>Тип</span><span>Год</span><span>Язык</span></div>
          {materials.slice(0, 5).map((item) => <Link href={`/library/${item.slug}`} className="material-row" role="row" key={item.slug}><strong>{item.title}</strong><span>{item.type}</span><span>{item.year}</span><span>{item.language}</span></Link>)}
        </div>
      </section>
    </main>
  );
}
