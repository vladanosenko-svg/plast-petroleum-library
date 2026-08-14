import Link from "next/link";
import { topics } from "../data";

export default function TopicsPage() { return <main className="shell page-space"><div className="page-intro topics-intro"><p className="eyebrow">Навигатор знаний</p><h1>Темы</h1><p>От строения пласта до управления добычей — системная карта нефтегазовых дисциплин.</p></div><div className="topics-catalog">{topics.map((topic, index) => <section id={topic.slug} key={topic.slug}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{topic.title}</h2><p>{topic.description}</p></div><div className="subtopics"><Link href={`/library?q=${topic.title}`}>Материалы</Link><span>Основы</span><span>Методы</span></div></section>)}</div></main>; }
