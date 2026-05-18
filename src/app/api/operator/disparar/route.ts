import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ jobs: [] });
}

export async function POST() {
  return NextResponse.json({ error: "Dispatch automático não disponível nesta versão. Use a Fila do Dia." }, { status: 410 });
}
