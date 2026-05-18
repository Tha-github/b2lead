import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createUser, createClientRecord, getUserByEmail } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { name, email, password, daily_limit, message_template } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });

  const existing = await getUserByEmail(email);
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });

  const userId = await createUser(name, email, password, "client");
  await createClientRecord({
    name,
    email,
    userId,
    dailyLimit: parseInt(daily_limit) || 50,
    messageTemplate: message_template || "Olá {{name}}, tudo bem? Vi que você atua na área de {{segment}} e gostaria de apresentar uma solução que pode te ajudar. Podemos conversar?",
  });

  return NextResponse.json({ success: true });
}
