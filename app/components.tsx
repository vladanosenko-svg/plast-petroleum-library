"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  allTopics,
  materialLanguageLabels,
  materialTypeLabels,
  type Material,
} from "./data";
import type { LibraryFilters } from "./library-search";

const navigation = [
  { href: "/library", label: "Библиотека" },
  { href: "/topics", label: "Темы" },
  { href: "/courses", label: "Курсы" },
  { href: "/about", label: "О проекте" },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return navigation.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        className={isActive ? "active" : undefined}
        href={item.href}
        prefetch={false}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
        key={item.href}
      >
        {item.label}
      </Link>
    );
  });
}

export function Header() {
  const toggle = () => {
    const current = document.documentElement.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  };
  const closeMobileMenu = () => {
    document.querySelector<HTMLDetailsElement>(".mobile-menu")?.removeAttribute("open");
  };

  return <header className="site-header"><div className="shell header-inner">
    <Link className="wordmark" href="/" prefetch={false} aria-label="Пласт — на главную"><span aria-hidden="true" />ПЛАСТ<small>библиотека знаний</small></Link>
    <nav className="desktop-nav" aria-label="Основная навигация"><NavigationLinks /></nav>
    <button className="theme-toggle" onClick={toggle} aria-label="Переключить цветовую тему"><span>Тема</span><i /></button>
    <details className="mobile-menu"><summary>Меню</summary><nav aria-label="Мобильная навигация"><NavigationLinks onNavigate={closeMobileMenu} /></nav></details>
  </div></header>;
}

export function Footer() { return <footer id="about"><div className="shell footer-grid"><div><strong>ПЛАСТ</strong><p>Интеллектуальная библиотека нефтегазовых знаний.</p></div><div><p>Проект развивается как открытый цифровой архив для студентов, инженеров и исследователей.</p></div><div><span>© 2026</span><Link href="/library" prefetch={false}>В библиотеку →</Link></div></div></footer>; }

export function SearchField({ compact = false, defaultQuery = "" }: { compact?: boolean; defaultQuery?: string }) {
  return <form className={`search-field ${compact ? "compact" : ""}`} role="search" action="/library" method="get"><label className="sr-only" htmlFor={compact ? "catalog-search" : "main-search"}>Поиск по библиотеке</label><input id={compact ? "catalog-search" : "main-search"} name="q" defaultValue={defaultQuery} placeholder="Найти книгу, статью или тему…" /><button type="submit" aria-label="Найти">Найти <span>→</span></button></form>;
}

export function SectionHeader({ index, title, href, linkText }: { index: string; title: string; href: string; linkText: string }) { return <div className="section-header"><span>{index}</span><h2>{title}</h2><Link href={href} prefetch={false}>{linkText} →</Link></div>; }
export function BookCover({ book, index = 0 }: { book: Material; index?: number }) {
  return <div className="book-cover" style={{ backgroundColor: book.coverColor ?? "#3b586b" }}><span>ПЛАСТ / {String(index + 1).padStart(2, "0")}</span><div><i /><h4>{book.title}</h4><p>{book.authors.join(", ")}</p></div><small>{book.year ?? "—"}</small></div>;
}

export function LibraryFilterForm({ filters, years }: { filters: LibraryFilters; years: number[] }) {
  const router = useRouter();
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value) params.set(name, value);
    }
    const query = params.toString();
    router.push(query ? `/library?${query}` : "/library");
  };

  return (
    <form className="library-filter-form" role="search" action="/library" method="get" onSubmit={applyFilters}>
      <div className="filter-search">
        <label htmlFor="catalog-search">Поиск</label>
        <div><input id="catalog-search" name="q" defaultValue={filters.query} placeholder="Название, автор или термин…" /><button type="submit">Найти →</button></div>
      </div>
      <div className="filter-controls">
        <label>Тип
          <select name="type" defaultValue={filters.type ?? ""}>
            <option value="">Все</option>
            {Object.entries(materialTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>Язык
          <select name="language" defaultValue={filters.language ?? ""}>
            <option value="">Все</option>
            {Object.entries(materialLanguageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>Год
          <select name="year" defaultValue={filters.year ?? ""}>
            <option value="">Все</option>
            {years.map((year) => <option value={year} key={year}>{year}</option>)}
          </select>
        </label>
        <label>Тема
          <select name="topic" defaultValue={filters.topic ?? ""}>
            <option value="">Все направления</option>
            {allTopics.map((topic) => <option value={topic.id} key={topic.id}>{topic.title}</option>)}
          </select>
        </label>
        <button className="filter-submit" type="submit">Применить</button>
        <Link className="filter-reset" href="/library" prefetch={false}>Сбросить всё</Link>
      </div>
    </form>
  );
}
