import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getJob } from "@/lib/scrapers/jobs";

export async function GET(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job");
  if (!jobId) return NextResponse.json({ error: "Job ID obrigatório" }, { status: 400 });

  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    total: job.total,
    results: job.results,
    error: job.error,
    source: job.source,
  });
}
