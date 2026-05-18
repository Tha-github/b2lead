import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { incrementDailySend } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { clientId, date } = await req.json();
  if (!clientId || !date) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await incrementDailySend(clientId, date, 1);
  return NextResponse.json({ success: true });
}
