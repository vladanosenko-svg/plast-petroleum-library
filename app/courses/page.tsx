import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Курсы",
  description: "Будущие учебные маршруты по направлениям нефтегазового дела.",
};

const futureDirections = [
  "Основы разработки месторождений",
  "PVT и фазовое поведение",
  "Гидродинамическое моделирование",
  "Геология и петрофизика",
];

export default function CoursesPage() {
  return (
    <main className="shell page-space">
      <header className="page-intro">
        <p className="eyebrow">Учебные маршруты</p>
        <h1>Курсы</h1>
        <p>Структурированные учебные маршруты по направлениям нефтегазового дела.</p>
      </header>

      <section className="development-note" aria-labelledby="courses-status-title">
        <div>
          <p className="eyebrow">Раздел в разработке</p>
          <h2 id="courses-status-title">Учиться последовательно</h2>
          <p>В дальнейшем здесь появятся учебные последовательности, связывающие темы, книги, статьи и практические материалы.</p>
        </div>
        <ol className="future-list" aria-label="Будущие направления курсов">
          {futureDirections.map((direction, index) => (
            <li key={direction}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{direction}</strong><small>Будущее направление</small></div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
