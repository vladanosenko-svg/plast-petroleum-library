import Link from "next/link";
import type { Metadata } from "next";
import { knowledgeAreas } from "../data";

export const metadata: Metadata = {
  title: "Все направления",
  description: "Карта основных направлений нефтегазовой отрасли.",
};

export default function TopicsPage() {
  return (
    <main className="shell page-space knowledge-page">
      <header className="page-intro topics-intro">
        <p className="eyebrow">Навигатор знаний</p>
        <h1>Все направления</h1>
        <p>Теория, методы и практические материалы по основным направлениям нефтегазовой отрасли.</p>
      </header>

      <div className="knowledge-map">
        {knowledgeAreas.map((area) => (
          <section className="knowledge-area" id={area.slug} key={area.id} aria-labelledby={`${area.id}-title`}>
            <header className="knowledge-area-header">
              <span>{area.number}</span>
              <div>
                <h2 id={`${area.id}-title`}>{area.title}</h2>
                {area.description && <p>{area.description}</p>}
              </div>
            </header>
            <ul className="knowledge-topic-list">
              {area.topics.map((topic) => (
                <li id={topic.slug} key={topic.slug}>
                  <Link href={`/library?topic=${topic.id}`} prefetch={false}>
                    <span>{topic.title}</span>
                    <i aria-hidden="true">→</i>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
