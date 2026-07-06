import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "midreb 営業CRM",
  description: "midreb 営業パイプライン管理CRM",
};

const NAV = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/", label: "商談" },
  { href: "/accounts", label: "顧客" },
  { href: "/progress", label: "案件進捗管理" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-6 px-6 h-14">
            <Link href="/" className="font-bold text-lg tracking-tight">
              midreb <span className="text-emerald-600">CRM</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 min-h-0 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
