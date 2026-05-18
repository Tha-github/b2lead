export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClientByUserId, getLeadsByClientId } from "@/lib/db";
import KanbanBoard from "./KanbanBoard";

export default async function CrmPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const client = await getClientByUserId(session.userId);
  if (!client) redirect("/dashboard");

  const leads = await getLeadsByClientId(client.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="text-slate-500 text-sm mt-1">{leads.length} leads no pipeline</p>
      </div>
      <KanbanBoard leads={leads as never} clientId={client.id} />
    </div>
  );
}
