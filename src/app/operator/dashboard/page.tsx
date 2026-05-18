export const dynamic = "force-dynamic";

import { Users, MessageSquare, TrendingUp, Smartphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getOperatorStats, getClients, getDailySendCount } from "@/lib/db";

export default async function OperatorDashboard() {
  const [stats, clients] = await Promise.all([getOperatorStats(), getClients()]);
  const today = new Date().toISOString().split("T")[0];
  const dailyCounts = await Promise.all(clients.map((c) => getDailySendCount(c.id, today)));
  const totalToday = dailyCounts.reduce((acc, n) => acc + n, 0);

  const cards = [
    { label: "Clientes Ativos", value: stats.totalClients, icon: Users, color: "bg-blue-50 text-brand-600" },
    { label: "Total de Leads", value: stats.totalLeads, icon: MessageSquare, color: "bg-green-50 text-green-600" },
    { label: "Mensagens Enviadas", value: stats.totalSent, icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
    { label: "Envios Hoje", value: totalToday, icon: Smartphone, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral de todos os clientes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString("pt-BR")}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Clientes Recentes</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {clients.map((client) => (
            <div key={client.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{client.name}</p>
                <p className="text-sm text-slate-500">{client.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${client.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                  {client.active ? "Ativo" : "Inativo"}
                </span>
                <span className="text-xs text-slate-400">{formatDate(client.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
