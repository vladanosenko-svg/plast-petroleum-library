"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { Book } from "./data";

export function Header() {
  const toggle = () => { const current = document.documentElement.dataset.theme || "light"; const next = current === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("theme", next); };
  return <header className="site-header"><div className="shell header-inner">
    <Link className="wordmark" href="/" aria-label="Пласт — на главную"><span aria-hidden="true" />ПЛАСТ<small>библиотека знаний</small></Link>
    <nav className="desktop-nav" aria-label="Основная навигация"><Link href="/library">Библиотека</Link><Link href="/topics">Темы</Link><Link href="/topics#modeling">Курсы</Link><Link href="/#about">О проекте</Link></nav>
    <button className="theme-toggle" onClick={toggle} aria-label="Переключить цветовую тему"><span>Тема</span><i /></button>
    <details className="mobile-menu"><summary>Меню</summary><nav><Link href="/library">Библиотека</Link><Link href="/topics">Темы</Link><Link href="/topics#modeling">Курсы</Link><Link href="/#about">О проекте</Link></nav></details>
  </div></header>;
}

export function Footer() { return <footer id="about"><div className="shell footer-grid"><div><strong>ПЛАСТ</strong><p>Интеллектуальная библиотека нефтегазовых знаний.</p></div><div><p>Проект развивается как открытый цифровой архив для студентов, инженеров и исследователей.</p></div><div><span>© 2026</span><Link href="/library">В библиотеку →</Link></div></div></footer>; }

export function SearchField({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); window.location.href = `/library?q=${encodeURIComponent(query)}`; };
  return <form className={`search-field ${compact ? "compact" : ""}`} role="search" onSubmit={submit}><label className="sr-only" htmlFor={compact ? "catalog-search" : "main-search"}>Поиск по библиотеке</label><input id={compact ? "catalog-search" : "main-search"} value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти книгу, тему или задать вопрос…" /><button type="submit" aria-label="Найти">Найти <span>↗</span></button></form>;
}

export function SectionHeader({ index, title, href, linkText }: { index: string; title: string; href: string; linkText: string }) { return <div className="section-header"><span>{index}</span><h2>{title}</h2><Link href={href}>{linkText} →</Link></div>; }
export function BookCover({ book, index = 0 }: { book: Book; index?: number }) { return <div className={`book-cover ${book.tone}`}><span>ПЛАСТ / {String(index + 1).padStart(2, "0")}</span><div><i /><h4>{book.title}</h4><p>{book.author}</p></div><small>{book.year}</small></div>; }
