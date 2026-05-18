export const dynamic = "force-dynamic";

import { getClients, getPendingLeads, getDailySendCount } from "@/lib/db";
import FilaClient from "./FilaClient";

export default async function FilaPage() {
  const clients = await getClients();
  const today = new Date().toISOString().split("T")[0];

  const filaData = await Promise.all(
    clients
      .filter((c) => c.active)
      .map(async (client) => {
        const sentToday = await getDailySendCount(client.id, today);
        const remaining = Math.max(0, client.daily_limit - sentToday);
        const leads = remaining > 0 ? await getPendingLeads(client.id, remaining) : [];
        return { client, sentToday, remaining, leads };
      })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fila do Dia</h1>
        <p className="text-slate-500 text-sm mt-1">
          Leads para contato hoje via WhatsApp Web. Clique no número para abrir a conversa.
        </p>
      </div>
      <FilaClient filaData={filaData} today={today} />
    </div>
  );
}
