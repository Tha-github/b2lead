import { chromium } from "playwright";
import { pushResult, updateJob, getJob, type ExtractedLead } from "./jobs";

export async function scrapeInstagram(jobId: string, hashtag: string, maxResults: number) {
  const igUser = process.env.INSTAGRAM_USERNAME;
  const igPass = process.env.INSTAGRAM_PASSWORD;

  if (!igUser || !igPass) {
    updateJob(jobId, {
      status: "error",
      error:
        "O Instagram requer login. Adicione INSTAGRAM_USERNAME e INSTAGRAM_PASSWORD no arquivo .env.local e reinicie o servidor.",
    });
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--disable-gpu",
    ],
  });
  const ctx = await browser.newContext({
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await ctx.newPage();

  try {
    const tag = hashtag.replace(/^#/, "").trim();
    updateJob(jobId, { total: maxResults });

    // ── Login ──────────────────────────────────────────────────────────────
    console.log("[Instagram] Fazendo login...");
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2500);

    await page.fill('input[name="username"]', igUser);
    await page.fill('input[name="password"]', igPass);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);

    // Verifica se o login falhou
    const loginError = await page
      .locator('[role="alert"], #slfErrorAlert')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (loginError) {
      throw new Error("Login falhou. Verifique INSTAGRAM_USERNAME e INSTAGRAM_PASSWORD.");
    }

    // Fecha diálogos pós-login ("Salvar informações", "Ativar notificações")
    for (let i = 0; i < 2; i++) {
      const notNow = page
        .locator(
          'button:has-text("Agora não"), button:has-text("Not Now"), button:has-text("Não agora")'
        )
        .first();
      if (await notNow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notNow.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
    console.log("[Instagram] Login OK.");

    // ── Navega para a hashtag ──────────────────────────────────────────────
    await page.goto(
      `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await page.waitForTimeout(3000);

    // Coleta links de posts visíveis
    const seen = new Set<string>();
    const postLinks: string[] = [];

    const postEls = await page.locator("a[href*='/p/']").all();
    for (const el of postEls.slice(0, maxResults * 4)) {
      const href = await el.getAttribute("href").catch(() => null);
      if (href && !seen.has(href)) {
        seen.add(href);
        postLinks.push(href);
      }
    }

    console.log(`[Instagram] ${postLinks.length} posts encontrados para #${tag}`);
    updateJob(jobId, { total: Math.min(maxResults, postLinks.length) });

    const visitedProfiles = new Set<string>();

    // ── Visita cada post → pega perfil do autor ────────────────────────────
    for (const postHref of postLinks) {
      const job = getJob(jobId);
      if (!job || job.shouldStop || job.results.length >= maxResults) break;

      try {
        await page.goto(`https://www.instagram.com${postHref}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        await page.waitForTimeout(1500);

        // Link do autor no cabeçalho do post
        const authorLink = await page
          .locator("article header a[href]")
          .first()
          .getAttribute("href")
          .catch(() => null);

        if (!authorLink || visitedProfiles.has(authorLink)) continue;
        visitedProfiles.add(authorLink);

        // ── Visita o perfil ────────────────────────────────────────────────
        await page.goto(`https://www.instagram.com${authorLink}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        await page.waitForTimeout(1500);

        const profileData = await page.evaluate(() => {
          // Nome de exibição (display name) e username
          const h1 = document.querySelector("header h1")?.textContent?.trim() ?? "";
          const h2 = document.querySelector("header h2")?.textContent?.trim() ?? "";
          const displayName = h1 || h2;

          // Bio: pega o texto do span com dir="auto" dentro do header
          const bioSpans = Array.from(
            document.querySelectorAll<HTMLElement>("header span[dir='auto']")
          );
          const bio = bioSpans.map((s) => s.innerText).join(" ").trim();

          // Texto completo da header para regex de fallback
          const headerText = document.querySelector("header")?.innerText ?? "";

          // Website: link externo na bio (não instagram.com)
          const links = Array.from(
            document.querySelectorAll<HTMLAnchorElement>("header a[href]")
          );
          const externalLink = links.find(
            (a) =>
              a.href &&
              !a.href.includes("instagram.com") &&
              !a.href.includes("facebook.com") &&
              a.href.startsWith("http")
          );
          const website = externalLink?.href ?? "";

          return { displayName, bio, headerText, website };
        });

        if (!profileData.displayName) continue;

        const textToSearch = profileData.bio + " " + profileData.headerText;

        const emailMatch = textToSearch.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        const email = emailMatch?.[0] ?? "";

        const phoneMatch = textToSearch.match(
          /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4,5}[-\s]?\d{4}/
        );
        const phone = phoneMatch?.[0]?.replace(/\D/g, "") ?? "";

        if (!phone && !email && !profileData.website) continue;

        const lead: ExtractedLead = {
          name: profileData.displayName,
          company: profileData.displayName,
          phone,
          email,
          segment: tag,
          city: "",
          state: "",
          website: profileData.website,
          source: "Instagram",
        };

        pushResult(jobId, lead);
        console.log(
          `[Instagram] ${getJob(jobId)?.results.length}/${maxResults} - ${profileData.displayName}`
        );
      } catch (err) {
        console.error("[Instagram] Erro no perfil:", (err as Error).message);
      }
    }

    const finalJob = getJob(jobId);
    if (finalJob && !finalJob.shouldStop) updateJob(jobId, { status: "done" });
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
