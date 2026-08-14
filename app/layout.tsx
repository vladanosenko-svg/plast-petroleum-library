import type { Metadata } from "next";
import { Lora, Manrope } from "next/font/google";
import { headers } from "next/headers";
import { Footer, Header } from "./components";
import "./globals.css";

const lora = Lora({ variable: "--font-editorial", subsets: ["cyrillic", "latin"] });
const manrope = Manrope({ variable: "--font-sans", subsets: ["cyrillic", "latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "ПЛАСТ — библиотека нефтегазовых знаний", template: "%s — ПЛАСТ" },
    description: "Книги, статьи и инженерные знания по разработке нефтяных и газовых месторождений.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "ПЛАСТ — библиотека нефтегазовых знаний", description: "Отраслевая коллекция книг, статей и инженерных материалов.", images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}`;
  return <html lang="ru" suppressHydrationWarning><body className={`${lora.variable} ${manrope.variable}`}><script dangerouslySetInnerHTML={{ __html: themeScript }} /><Header />{children}<Footer /></body></html>;
}
