export const dynamic = "force-dynamic";

import { getClients } from "@/lib/db";
import ExtracaoClient from "./ExtracaoClient";

export default async function ExtracaoPage() {
  const clients = await getClients();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Extração de Leads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Extraia leads automaticamente do Google Maps
        </p>
      </div>
      <ExtracaoClient clients={clients} />
    </div>
  );
}
