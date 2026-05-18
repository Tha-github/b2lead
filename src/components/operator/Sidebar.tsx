"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UserSquare2, LogOut, ChevronRight, Magnet, CalendarClock, Menu, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <>
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">B2<span className="text-brand-500">lead</span></h1>
          <span className="text-xs text-slate-400 font-medium mt-1 block">Painel Operador</span>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("sidebar-link", active && "active")}>
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
    </>
  );

  return (
    <>
      {/* Botão hamburguer — só aparece no mobile */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar-bg text-white rounded-lg shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 min-h-screen bg-sidebar-bg flex flex-col fixed left-0 top-0 z-40 transition-transform duration-200",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {nav}
      </aside>
    </>
  );
}
