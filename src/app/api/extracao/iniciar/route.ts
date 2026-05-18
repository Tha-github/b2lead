import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createJob } from "@/lib/scrapers/jobs";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.role !== "operator") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { source, query, location, hashtag, maxResults } = await req.json();

  if (!source) return NextResponse.json({ error: "Fonte obrigatória" }, { status: 400 });

  const max = Math.min(parseInt(maxResults) || 50, 200);
  const job = createJob(source);

  // Inicia scraping em background (não bloqueia a resposta)
  if (source === "google_maps") {
    if (!query) return NextResponse.json({ error: "Busca obrigatória" }, { status: 400 });

    import("@/lib/scrapers/google-maps").then(({ scrapeGoogleMaps }) => {
      scrapeGoogleMaps(job.id, query, location || "", max).catch(console.error);
    });
  } else if (source === "instagram") {
    if (!hashtag) return NextResponse.json({ error: "Hashtag obrigatória" }, { status: 400 });

    import("@/lib/scrapers/instagram").then(({ scrapeInstagram }) => {
      scrapeInstagram(job.id, hashtag, max).catch(console.error);
    });
  } else {
    return NextResponse.json({ error: "Fonte inválida" }, { status: 400 });
  }

  return NextResponse.json({ jobId: job.id });
}
