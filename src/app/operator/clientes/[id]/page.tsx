export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientDetailActions from "./ClientDetailActions";
import { getClientById, getLeads, getDailySendCount } from "@/lib/db";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, leads] = await Promise.all([
    getClientById(params.id),
    getLeads({ clientId: params.id }),
  ]);
  if (!client) notFound();

  const today = new Date().toISOString().split("T")[0];
  const sentToday = await getDailySendCount(params.id, today);

  const statusCount: Record<string, number> = {};
  leads.forEach((l) => { statusCount[l.status] = (statusCount[l.status] || 0) + 1; });

  const pendingLeads = leads.filter((l) => l.status === "novo" && !l.sent_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operator/clientes" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500 text-sm">{client.email}</p>
        </div>
        <ClientDetailActions client={client as never} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Leads", value: leads.length },
          { label: "Envios Hoje", value: sentToday },
          { label: "Limite Diário", value: client.daily_limit },
          { label: "Interessados", value: statusCount["interessado"] ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Informações</h2></div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-800 font-medium">{client.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Limite Diário</span>
              <span className="text-slate-800 font-medium">{client.daily_limit} leads/dia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Na fila hoje</span>
              <span className="text-slate-800 font-medium">{pendingLeads} leads pendentes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cadastro</span>
              <span className="text-slate-800">{formatDate(client.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Pipeline de Leads</h2></div>
          <div className="p-6 space-y-2">
            {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className={`badge ${LEAD_STATUS_COLORS[key]}`}>{label}</span>
                <span className="font-semibold text-slate-700">{statusCount[key] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Leads Recentes</h2>
          <Link href={`/operator/leads?client=${params.id}`} className="text-sm text-brand-600 hover:text-brand-700">Ver todos</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.slice(0, 10).map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{lead.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{lead.company || "—"}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{lead.phone}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${LEAD_STATUS_COLORS[lead.status]}`}>{LEAD_STATUS_LABELS[lead.status]}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
