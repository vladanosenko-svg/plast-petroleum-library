"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Material } from "./data";

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
  const toggle = () => { const current = document.documentElement.dataset.theme || "light"; const next = current === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("theme", next); };
  const closeMobileMenu = () => {
    document.querySelector<HTMLDetailsElement>(".mobile-menu")?.removeAttribute("open");
  };

  return <header className="site-header"><div className="shell header-inner">
    <Link className="wordmark" href="/" aria-label="Пласт — на главную"><span aria-hidden="true" />ПЛАСТ<small>библиотека знаний</small></Link>
    <nav className="desktop-nav" aria-label="Основная навигация"><NavigationLinks /></nav>
    <button className="theme-toggle" onClick={toggle} aria-label="Переключить цветовую тему"><span>Тема</span><i /></button>
    <details className="mobile-menu"><summary>Меню</summary><nav aria-label="Мобильная навигация"><NavigationLinks onNavigate={closeMobileMenu} /></nav></details>
  </div></header>;
}

export function Footer() { return <footer id="about"><div className="shell footer-grid"><div><strong>ПЛАСТ</strong><p>Интеллектуальная библиотека нефтегазовых знаний.</p></div><div><p>Проект развивается как открытый цифровой архив для студентов, инженеров и исследователей.</p></div><div><span>© 2026</span><Link href="/library">В библиотеку →</Link></div></div></footer>; }

export function SearchField({ compact = false, defaultQuery = "" }: { compact?: boolean; defaultQuery?: string }) {
  return <form className={`search-field ${compact ? "compact" : ""}`} role="search" action="/library" method="get"><label className="sr-only" htmlFor={compact ? "catalog-search" : "main-search"}>Поиск по библиотеке</label><input id={compact ? "catalog-search" : "main-search"} name="q" defaultValue={defaultQuery} placeholder="Найти книгу, статью или тему…" /><button type="submit" aria-label="Найти">Найти <span>→</span></button></form>;
}

export function SectionHeader({ index, title, href, linkText }: { index: string; title: string; href: string; linkText: string }) { return <div className="section-header"><span>{index}</span><h2>{title}</h2><Link href={href}>{linkText} →</Link></div>; }
export function BookCover({ book, index = 0 }: { book: Material; index?: number }) { return <div className={`book-cover ${book.tone ?? "blue"}`}><span>ПЛАСТ / {String(index + 1).padStart(2, "0")}</span><div><i /><h4>{book.title}</h4><p>{book.author}</p></div><small>{book.year}</small></div>; }
