import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell not-found page-space">
      <p className="not-found-code">404</p>
      <h1>Страница не найдена</h1>
      <p>Возможно, ссылка устарела или адрес указан неверно.</p>
      <div className="not-found-actions">
        <Link className="primary-link" href="/" prefetch={false}>На главную</Link>
        <Link className="text-link" href="/library" prefetch={false}>Перейти в библиотеку →</Link>
      </div>
    </main>
  );
}
