import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getJob } from "@/lib/scrapers/jobs";
import { createBatch, insertLeads } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { jobId, clientId, selectedIndexes } = await req.json();

  if (!jobId || !clientId) {
    return NextResponse.json({ error: "Job ID e cliente são obrigatórios" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });

  const toSave = selectedIndexes?.length
    ? job.results.filter((_: unknown, i: number) => selectedIndexes.includes(i))
    : job.results;

  if (!toSave.length) {
    return NextResponse.json({ error: "Nenhum lead selecionado" }, { status: 400 });
  }

  const batchId = await createBatch(clientId, `${job.source} - ${new Date().toLocaleDateString("pt-BR")}`, toSave.length);

  const rows = toSave.map((lead: {
    name: string; phone: string; company: string; email: string;
    segment: string; city: string; state: string;
  }) => ({
    client_id: clientId,
    import_batch_id: batchId,
    name: lead.name,
    phone: lead.phone?.replace(/\D/g, "") || "",
    company: lead.company || null,
    email: lead.email || null,
    segment: lead.segment || null,
    position: null,
    city: lead.city || null,
    state: lead.state || null,
    status: "novo",
    sent_at: null,
  }));

  const count = await insertLeads(rows);
  return NextResponse.json({ success: true, count });
}
