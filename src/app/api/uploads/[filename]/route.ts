import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(_req: Request, { params }: { params: { filename: string } }) {
  const filename = params.filename.replace(/[^a-zA-Z0-9.\-_]/g, "");
  const filepath = path.join(process.cwd(), "data", "uploads", filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", gif: "image/gif",
    webp: "image/webp", mp4: "video/mp4",
  };
  const mime = mimeMap[ext] || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000" },
  });
}
