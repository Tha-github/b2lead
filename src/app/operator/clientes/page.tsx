export const dynamic = "force-dynamic";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import NewClientButton from "./NewClientButton";
import { getClients } from "@/lib/db";

export default async function ClientesPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <NewClientButton />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Limite Diário</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cadastro</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{client.name}</p>
                  <p className="text-sm text-slate-500">{client.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">{client.daily_limit} leads/dia</td>
                <td className="px-6 py-4">
                  <span className={`badge ${client.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {client.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{formatDate(client.created_at)}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/operator/clientes/${client.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Gerenciar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
