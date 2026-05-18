import { chromium } from "playwright";
import { pushResult, updateJob, type ExtractedLead } from "./jobs";

export async function scrapeInstagram(
  jobId: string,
  hashtag: string,
  maxResults: number
) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  try {
    const tag = hashtag.replace(/^#/, "").trim();
    updateJob(jobId, { total: maxResults });

    // Busca perfis via hashtag sem login (página pública)
    await page.goto(`https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const seen = new Set<string>();
    const profileLinks: string[] = [];

    // Coleta links de posts
    const posts = await page.locator("article a[href*='/p/']").all();
    for (const post of posts.slice(0, maxResults * 3)) {
      const href = await post.getAttribute("href");
      if (href && !seen.has(href)) {
        seen.add(href);
        profileLinks.push(href);
      }
    }

    updateJob(jobId, { total: Math.min(maxResults, profileLinks.length) });

    const visitedProfiles = new Set<string>();

    for (const postHref of profileLinks) {
      const job = (await import("./jobs")).getJob(jobId);
      if (!job || job.shouldStop || job.results.length >= maxResults) break;

      try {
        await page.goto(`https://www.instagram.com${postHref}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await page.waitForTimeout(1500);

        // Pega link do perfil do autor
        const authorLink = await page
          .locator("article header a")
          .first()
          .getAttribute("href")
          .catch(() => null);

        if (!authorLink || visitedProfiles.has(authorLink)) continue;
        visitedProfiles.add(authorLink);

        // Visita o perfil
        await page.goto(`https://www.instagram.com${authorLink}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await page.waitForTimeout(1500);

        // Bio text
        const bio = await page
          .locator("section main header section div")
          .nth(2)
          .textContent({ timeout: 3000 })
          .catch(() => "");

        // Nome
        const name = await page
          .locator("section main header h2")
          .first()
          .textContent({ timeout: 3000 })
          .catch(async () =>
            page
              .locator("section main header h1")
              .first()
              .textContent({ timeout: 3000 })
              .catch(() => "")
          );

        if (!name?.trim()) continue;

        // Extrai email do bio
        const emailMatch = bio?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch?.[0] ?? "";

        // Extrai telefone do bio
        const phoneMatch = bio?.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4,5}[-\s]?\d{4}/);
        const phone = phoneMatch?.[0]?.replace(/\D/g, "") ?? "";

        // Website
        const website = await page
          .locator('a[rel="me noopener noreferrer"]')
          .first()
          .textContent({ timeout: 2000 })
          .catch(() => "");

        // Só salva se tiver telefone ou email (indica conta comercial)
        if (!phone && !email && !website) continue;

        const lead: ExtractedLead = {
          name: name.trim(),
          phone,
          company: name.trim(),
          email,
          segment: tag,
          city: "",
          state: "",
          website: website ?? "",
          source: "Instagram",
        };

        pushResult(jobId, lead);
        console.log(`[Instagram] ${job.results.length}/${maxResults} - ${name}`);
      } catch (err) {
        console.error("[Instagram] Erro no perfil:", err);
      }
    }

    const finalJob = (await import("./jobs")).getJob(jobId);
    if (finalJob && !finalJob.shouldStop) {
      updateJob(jobId, { status: "done" });
    }
  } catch (err) {
    console.error("[Instagram] Erro geral:", err);
    updateJob(jobId, {
      status: "error",
      error: err instanceof Error ? err.message : "Erro desconhecido",
    });
  } finally {
    await browser.close();
  }
}
