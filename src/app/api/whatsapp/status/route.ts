import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "disconnected" });
}

export async function POST() {
  return NextResponse.json({ error: "WhatsApp não disponível nesta versão" }, { status: 410 });
}
