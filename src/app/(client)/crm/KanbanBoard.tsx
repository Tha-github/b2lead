"use client";

import { useState } from "react";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import { formatDate, formatPhone } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";
import { Building2, Phone, MapPin, X, ArrowRight } from "lucide-react";

const COLUMNS: LeadStatus[] = [
  "novo",
  "mensagem_enviada",
  "respondeu",
  "interessado",
  "nao_interessado",
];

const COLUMN_COLORS: Record<LeadStatus, string> = {
  novo: "border-t-slate-400",
  mensagem_enviada: "border-t-blue-500",
  respondeu: "border-t-yellow-500",
  interessado: "border-t-green-500",
  nao_interessado: "border-t-red-400",
};

const COLUMN_BG: Record<LeadStatus, string> = {
  novo: "bg-slate-50",
  mensagem_enviada: "bg-blue-50",
  respondeu: "bg-yellow-50",
  interessado: "bg-green-50",
  nao_interessado: "bg-red-50",
};

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  novo: "mensagem_enviada",
  mensagem_enviada: "respondeu",
  respondeu: "interessado",
};

interface Props {
  leads: Lead[];
  clientId: string;
}

export default function KanbanBoard({ leads: initial }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [selected, setSelected] = useState<Lead | null>(null);

  async function moveToStatus(lead: Lead, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status } : l));
    if (selected?.id === lead.id) setSelected({ ...lead, status });
    await fetch("/api/leads/update-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, status }),
    });
  }

  const grouped = COLUMNS.reduce<Record<LeadStatus, Lead[]>>(
    (acc, col) => { acc[col] = leads.filter((l) => l.status === col); return acc; },
    {} as Record<LeadStatus, Lead[]>
  );

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className={`flex-shrink-0 w-64 rounded-xl border-t-4 ${COLUMN_COLORS[col]} ${COLUMN_BG[col]} border border-slate-200 flex flex-col`}
          >
            <div className="px-4 py-3 border-b border-slate-200/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{LEAD_STATUS_LABELS[col]}</h3>
                <span className="text-xs bg-white border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {grouped[col].length}
                </span>
              </div>
            </div>

            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
              {grouped[col].map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-brand-300 transition-all"
                >
                  <p className="font-semibold text-slate-800 text-sm">{lead.name}</p>
                  {lead.company && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <p className="text-xs text-slate-500 truncate">{lead.company}</p>
                    </div>
                  )}
                  {lead.segment && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {lead.segment}
                    </span>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <p className="text-xs text-slate-500">{formatPhone(lead.phone)}</p>
                  </div>
                  {(lead.city || lead.state) && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <p className="text-xs text-slate-500">{[lead.city, lead.state].filter(Boolean).join(", ")}</p>
                    </div>
                  )}
                  {NEXT_STATUS[col] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); moveToStatus(lead, NEXT_STATUS[col]!); }}
                      className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {LEAD_STATUS_LABELS[NEXT_STATUS[col]!]}
                    </button>
                  )}
                </div>
              ))}
              {grouped[col].length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">Nenhum lead</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: "Empresa", value: selected.company },
                { label: "Telefone", value: selected.phone ? formatPhone(selected.phone) : null },
                { label: "Email", value: selected.email },
                { label: "Segmento", value: selected.segment },
                { label: "Cargo", value: selected.position },
                { label: "Cidade", value: [selected.city, selected.state].filter(Boolean).join(", ") || null },
                { label: "Cadastrado em", value: formatDate(selected.created_at) },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
                  </div>
                ) : null
              )}
            </div>
            <div className="px-6 pb-6">
              <p className="text-xs text-slate-500 mb-2 font-medium">Mover para:</p>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.filter((c) => c !== selected.status).map((col) => (
                  <button
                    key={col}
                    onClick={() => { moveToStatus(selected, col); setSelected(null); }}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    {LEAD_STATUS_LABELS[col]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
