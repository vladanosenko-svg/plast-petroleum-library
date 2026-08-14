import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О проекте",
  description: "Идея и направления развития нефтегазовой библиотеки ПЛАСТ.",
};

const plannedCapabilities = [
  "находить профессиональные источники",
  "изучать материалы по темам",
  "строить учебные маршруты",
  "переходить к открытым первоисточникам",
  "получать ответы на инженерные вопросы на основе проверенной литературы",
];

export default function AboutPage() {
  return (
    <main className="shell page-space about-page">
      <header className="page-intro">
        <p className="eyebrow">О проекте</p>
        <h1>ПЛАСТ</h1>
        <p>Специализированная библиотека знаний по разработке нефтяных и газовых месторождений.</p>
      </header>

      <section className="about-grid" aria-labelledby="about-purpose-title">
        <div>
          <p className="eyebrow">Цель</p>
          <h2 id="about-purpose-title">Собрать отраслевые знания в одной системе</h2>
        </div>
        <div className="about-copy">
          <p>Проект объединяет книги, статьи, руководства, стандарты и другие профессиональные материалы и организует их по направлениям нефтегазового дела.</p>
          <p>ПЛАСТ развивается поэтапно. В дальнейшем библиотека должна позволять:</p>
          <ul>
            {plannedCapabilities.map((capability) => <li key={capability}>{capability}</li>)}
          </ul>
          <p className="about-status">Сейчас проект находится на раннем этапе: структура знаний и основная навигация уже формируются, а остальные возможности планируются.</p>
        </div>
      </section>
    </main>
  );
}
