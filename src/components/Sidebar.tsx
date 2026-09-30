"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; match?: string[] };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "メイン",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: "grid" },
      { href: "/leads", label: "リード", icon: "inbox", match: ["/leads"] },
      { href: "/", label: "商談", icon: "kanban", match: ["/", "/deals"] },
      { href: "/accounts", label: "顧客", icon: "building" },
    ],
  },
  {
    label: "分析・管理",
    items: [
      { href: "/progress", label: "案件進捗管理", icon: "chart" },
      { href: "/reports", label: "レポート", icon: "report", match: ["/reports"] },
    ],
  },
];

function isActive(pathname: string, href: string, match?: string[]): boolean {
  const targets = match ?? [href];
  return targets.some((t) =>
    t === "/" ? pathname === "/" : pathname === t || pathname.startsWith(t + "/")
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-emerald-50 font-semibold text-emerald-700"
          : "font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-600" />}
      <span className={active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500"}>
        <Icon name={item.icon} />
      </span>
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <aside className="w-60 shrink-0 h-screen bg-white border-r border-slate-200/80 flex flex-col">
      {/* ブランド */}
      <div className="h-16 flex items-center gap-2.5 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/20">m</span>
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            midreb <span className="font-semibold text-slate-400">CRM</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {GROUPS.map((g) => (
          <div key={g.label} className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
            {g.items.map((n) => (
              <NavLink key={n.href} item={n} active={isActive(pathname, n.href, n.match)} />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200/80">
        <NavLink item={{ href: "/settings", label: "設定", icon: "settings" }} active={settingsActive} />
      </div>
    </aside>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    className: "h-[18px] w-[18px] shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "kanban":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 3v12M16 3v8" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 15l3-4 3 2 4-6" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return <span className="h-[18px] w-[18px]" />;
  }
}
