import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateClient } from "@/lib/db";

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
