export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { MessageSquare, TrendingUp, Users, Send } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { getClientByUserId, getClientStats } from "@/lib/db";

export default async function ClientDashboard() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const client = await getClientByUserId(session.userId);
  if (!client) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Conta não configurada. Entre em contato com o suporte.</p>
    </div>
  );

  const stats = await getClientStats(client.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {client.name}!</h1>
        <p className="text-slate-500 text-sm mt-1">Acompanhe sua prospecção em tempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Leads", value: stats.totalLeads, icon: Users, color: "bg-blue-50 text-brand-600" },
          { label: "Enviados Hoje", value: stats.sentToday, icon: Send, color: "bg-green-50 text-green-600" },
          { label: "Limite Diário", value: client.daily_limit, icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
          { label: "Interessados", value: stats.interested, icon: MessageSquare, color: "bg-orange-50 text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Progresso diário</h2>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Envios hoje</span>
            <span className="font-semibold text-slate-800">{stats.sentToday} / {client.daily_limit}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-brand-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((stats.sentToday / client.daily_limit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{client.daily_limit - stats.sentToday} envios restantes hoje</p>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Pipeline de Leads</h2></div>
        <div className="p-5 space-y-2">
          {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className={`badge ${LEAD_STATUS_COLORS[key]}`}>{label}</span>
              <span className="font-semibold text-slate-700 text-sm">{stats.statusCounts[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
