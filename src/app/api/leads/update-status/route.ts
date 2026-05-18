import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateLeadStatus, getClientByUserId } from "@/lib/db";

const VALID = ["novo", "mensagem_enviada", "respondeu", "interessado", "nao_interessado"];

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { lead_id, status } = await req.json();
  if (!lead_id || !VALID.includes(status)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (session.role === "client") {
    const client = await getClientByUserId(session.userId);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  await updateLeadStatus(lead_id, status);
  return NextResponse.json({ success: true });
}
