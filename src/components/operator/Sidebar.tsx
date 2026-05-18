"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UserSquare2, LogOut, ChevronRight, Magnet, CalendarClock } from "lucide-react";

const links = [
  { href: "/operator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operator/clientes", label: "Clientes", icon: Users },
  { href: "/operator/leads", label: "Leads", icon: UserSquare2 },
  { href: "/operator/extracao", label: "Extração", icon: Magnet },
  { href: "/operator/fila", label: "Fila do Dia", icon: CalendarClock },
];

export default function OperatorSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen bg-sidebar-bg flex flex-col fixed left-0 top-0 z-40">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-2xl font-black text-white tracking-tight">B2<span className="text-brand-500">lead</span></h1>
        <span className="text-xs text-slate-400 font-medium mt-1 block">Painel Operador</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("sidebar-link", active && "active")}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
