import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateClient } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  // Apaga leads, batches e o usuário vinculado em cascata via FK, depois apaga o cliente
  const { data: client } = await sb().from("clients").select("user_id").eq("id", params.id).single();
  await sb().from("clients").delete().eq("id", params.id);
  if (client?.user_id) await sb().from("users").delete().eq("id", client.user_id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (session.role !== "operator") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await req.json();
  const { name, daily_limit, message_template, active } = body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (daily_limit !== undefined) update.daily_limit = parseInt(daily_limit);
  if (message_template !== undefined) update.message_template = message_template;
  if (active !== undefined) update.active = active;

  if (Object.keys(update).length > 0) await updateClient(params.id, update);
  return NextResponse.json({ success: true });
}
