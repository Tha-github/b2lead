import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ qr: null, status: "disconnected" });
}
