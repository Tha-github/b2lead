import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBatch, insertLeads } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { client_id, file_name, leads } = await req.json();
  if (!client_id || !leads?.length) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const batchId = await createBatch(client_id, file_name, leads.length);

  const rows = leads
    .filter((r: Record<string, string>) => r.name?.trim() && r.phone?.trim())
    .map((r: Record<string, string>) => ({
      client_id,
      import_batch_id: batchId,
      name: r.name.trim(),
      phone: r.phone.trim().replace(/\D/g, ""),
      company: r.company?.trim() || null,
      email: r.email?.trim() || null,
      segment: r.segment?.trim() || null,
      position: r.position?.trim() || null,
      city: r.city?.trim() || null,
      state: r.state?.trim() || null,
      status: "novo",
      sent_at: null,
    }));

  if (!rows.length) return NextResponse.json({ error: "Nenhuma linha válida" }, { status: 400 });

  const count = await insertLeads(rows);
  return NextResponse.json({ success: true, count });
}
