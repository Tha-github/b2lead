"use client";

import { useState } from "react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/utils";

const STATUSES = ["novo", "mensagem_enviada", "respondeu", "interessado", "nao_interessado"];

export default function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setSaving(true);
    setCurrent(next);
    await fetch("/api/leads/update-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, status: next }),
    });
    setSaving(false);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={saving}
      className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${LEAD_STATUS_COLORS[current]} ${saving ? "opacity-50" : ""}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
