"use client";

import { useState } from "react";
import { MessageCircle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { ClientRow, LeadRow } from "@/lib/db";
import { toast } from "sonner";

interface FilaEntry {
  client: ClientRow;
  sentToday: number;
  remaining: number;
  leads: LeadRow[];
}

interface Props {
  filaData: FilaEntry[];
  today: string;
}

function buildMessage(template: string, lead: LeadRow): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{segment\}\}/g, lead.segment || "")
    .replace(/\{\{company\}\}/g, lead.company || "")
    .replace(/\{\{position\}\}/g, lead.position || "")
    .replace(/\{\{city\}\}/g, lead.city || "");
}

function buildWaLink(phone: string, message: string): string {
  let num = phone.replace(/\D/g, "");
  if (!num.startsWith("55")) num = "55" + num;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export default function FilaClient({ filaData, today }: Props) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  const totalFila = filaData.reduce((a, e) => a + e.leads.length, 0);
  const totalSentToday = filaData.reduce((a, e) => a + e.sentToday, 0);

  async function markSent(leadId: string, clientId: string) {
    setSending(leadId);
    try {
      const res = await fetch("/api/leads/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, status: "mensagem_enviada" }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");

      await fetch("/api/fila/incrementar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, date: today }),
      });

      setSentIds((prev) => new Set(Array.from(prev).concat(leadId)));
      toast.success("Marcado como enviado!");
    } catch {
      toast.error("Erro ao marcar como enviado");
    } finally {
      setSending(null);
    }
  }

  function toggleCollapse(clientId: string) {
    setCollapsed((prev) => {
      const arr = Array.from(prev);
      if (prev.has(clientId)) return new Set(arr.filter((x) => x !== clientId));
      return new Set(arr.concat(clientId));
    });
  }

  if (filaData.every((e) => e.leads.length === 0)) {
    return (
      <div className="card p-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
        <p className="text-slate-700 font-semibold text-lg">Fila vazia!</p>
        <p className="text-slate-400 text-sm mt-1">Todos os leads do dia já foram contatados ou o limite foi atingido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalFila}</p>
          <p className="text-xs text-slate-500 mt-1">Na fila hoje</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{sentIds.size}</p>
          <p className="text-xs text-slate-500 mt-1">Enviados agora</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalSentToday}</p>
          <p className="text-xs text-slate-500 mt-1">Total enviados hoje</p>
        </div>
      </div>

      {/* Por cliente */}
      {filaData.map(({ client, sentToday, remaining, leads }) => {
        if (leads.length === 0) return null;
        const isCollapsed = collapsed.has(client.id);
        const clientSentNow = leads.filter((l) => sentIds.has(l.id)).length;

        return (
          <div key={client.id} className="card overflow-hidden">
            <button
              onClick={() => toggleCollapse(client.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                <div className="text-left">
                  <p className="font-semibold text-slate-800">{client.name}</p>
                  <p className="text-xs text-slate-500">{sentToday}/{client.daily_limit} enviados hoje</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {clientSentNow > 0 && (
                  <span className="badge bg-green-100 text-green-700">{clientSentNow} enviados</span>
                )}
                <span className="badge bg-blue-100 text-blue-700">{leads.length - clientSentNow} restantes</span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                      <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                      <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                      <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => {
                      const isSent = sentIds.has(lead.id);
                      const message = buildMessage(client.message_template, lead);
                      const waLink = buildWaLink(lead.phone, message);

                      return (
                        <tr key={lead.id} className={`transition-colors ${isSent ? "bg-green-50" : "hover:bg-slate-50"}`}>
                          <td className="px-6 py-3">
                            <p className="font-medium text-slate-800">{lead.name}</p>
                            {lead.segment && <p className="text-xs text-slate-400">{lead.segment}</p>}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">{lead.company || "—"}</td>
                          <td className="px-6 py-3 text-sm text-slate-600 font-mono">{lead.phone}</td>
                          <td className="px-6 py-3">
                            {isSent ? (
                              <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Enviado
                              </span>
                            ) : (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Abrir WhatsApp
                                  <ExternalLink className="h-3 w-3 opacity-60" />
                                </a>
                                <button
                                  onClick={() => markSent(lead.id, client.id)}
                                  disabled={sending === lead.id}
                                  className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap"
                                >
                                  {sending === lead.id ? "..." : "Marcar enviado"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
