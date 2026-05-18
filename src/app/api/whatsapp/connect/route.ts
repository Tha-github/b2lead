import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "WhatsApp não disponível nesta versão" }, { status: 410 });
}
