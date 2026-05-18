export const dynamic = "force-dynamic";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import { Upload } from "lucide-react";
import { getLeads, getClients } from "@/lib/db";
import LeadStatusSelect from "./LeadStatusSelect";
import DeleteLeadButton from "./DeleteLeadButton";

export default async function LeadsPage({ searchParams }: { searchParams: { client?: string; status?: string } }) {
  const [leads, clients] = await Promise.all([
    getLeads({ clientId: searchParams.client, status: searchParams.status }),
    getClients(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-500 text-sm mt-1">{leads.length} leads encontrados</p>
        </div>
        <Link href="/operator/leads/importar" className="btn-primary">
          <Upload className="h-4 w-4" />Importar CSV
        </Link>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <select className="input w-auto" defaultValue={searchParams.client || ""}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" defaultValue={searchParams.status || ""}>
          <option value="">Todos os status</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-800">{lead.name}</p>
                    {lead.company && <p className="text-xs text-slate-400">{lead.company}</p>}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 font-mono">{lead.phone}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{lead.client_name || "—"}</td>
                  <td className="px-6 py-3">
                    <LeadStatusSelect leadId={lead.id} status={lead.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteLeadButton leadId={lead.id} />
                  </td>
                </tr>
              ))}
              {!leads.length && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
