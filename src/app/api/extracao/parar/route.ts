import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { stopJob } from "@/lib/scrapers/jobs";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Job ID obrigatório" }, { status: 400 });

  stopJob(jobId);
  return NextResponse.json({ success: true });
}
