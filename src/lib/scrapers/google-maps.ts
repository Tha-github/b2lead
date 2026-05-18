import { chromium, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { pushResult, updateJob, getJob, type ExtractedLead } from "./jobs";

const DEBUG = process.env.SCRAPER_DEBUG === "true";
const DEBUG_DIR = path.join(process.cwd(), "data", "debug");

function ensureDebugDir() {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

async function snap(page: Page, name: string) {
  ensureDebugDir();
  const file = path.join(DEBUG_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`[Maps] Screenshot: ${file}`);
}

async function diagnose(page: Page) {
  const url = page.url();
  const title = await page.title().catch(() => "?");
  const placeLinks = await page.locator('a[href*="/maps/place/"]').count().catch(() => 0);
  const feedExists = await page.locator('[role="feed"]').count().catch(() => 0);
  const allLinks = await page.locator("a").count().catch(() => 0);
  console.log(`[Maps] URL: ${url}`);
  console.log(`[Maps] Título: ${title}`);
  console.log(`[Maps] Links totais: ${allLinks} | place/ links: ${placeLinks} | feed: ${feedExists}`);
}

export async function scrapeGoogleMaps(
  jobId: string,
  query: string,
  location: string,
  maxResults: number
) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });
  const ctx = await browser.newContext({
    locale: "pt-BR",
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  // Remove o flag de webdriver para evitar detecção
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await ctx.newPage();

  try {
    updateJob(jobId, { total: maxResults });
    const searchTerm = [query, location].filter(Boolean).join(" ");
    console.log(`[Maps] Buscando: "${searchTerm}"`);

    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}?hl=pt-BR`,
      { waitUntil: "load", timeout: 40000 }
    );
    await page.waitForTimeout(3000);

    if (DEBUG) await snap(page, "01-load");
    await diagnose(page);

    // Aceita cookies / consentimento
    const consentBtns = [
      'button:has-text("Aceitar tudo")',
      'button:has-text("Accept all")',
      'button:has-text("Aceitar")',
      'button:has-text("I agree")',
      'button:has-text("Concordar")',
      '[aria-label*="Accept"]',
    ];
    for (const sel of consentBtns) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1200 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(2000);
        console.log(`[Maps] Consent clicado: ${sel}`);
        if (DEBUG) await snap(page, "02-consent");
        break;
      }
    }

    await diagnose(page);

    // Aguarda place links ou feed
    const hasResults = await page
      .waitForFunction(
        () => {
          const links = document.querySelectorAll('a[href*="/maps/place/"]');
          const feed = document.querySelector('[role="feed"]');
          return links.length > 0 || !!feed;
        },
        { timeout: 25000 }
      )
      .catch(() => null);

    if (!hasResults) {
      if (DEBUG) await snap(page, "03-no-feed");
      await diagnose(page);

      // Tenta URL alternativa
      console.log("[Maps] Tentando URL alternativa...");
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&tbm=map&hl=pt-BR`,
        { waitUntil: "load", timeout: 30000 }
      );
      await page.waitForTimeout(3000);
      if (DEBUG) await snap(page, "04-alternative");
      await diagnose(page);

      const hasResults2 = await page
        .waitForFunction(
          () => document.querySelectorAll('a[href*="/maps/place/"]').length > 0,
          { timeout: 15000 }
        )
        .catch(() => null);

      if (!hasResults2) {
        throw new Error(
          `Nenhum resultado encontrado para "${searchTerm}". Tente uma busca diferente.`
        );
      }
    }

    console.log("[Maps] Resultados carregados. Iniciando extração...");
    await page.waitForTimeout(2000);
    if (DEBUG) await snap(page, "05-results");

    const collected = new Set<string>();
    let scrollTries = 0;
    let noNewCount = 0;

    while (true) {
      const job = getJob(jobId);
      if (!job || job.shouldStop || job.results.length >= maxResults) break;
      if (scrollTries > 30 || noNewCount >= 4) break;
      scrollTries++;

      const rawUrls: string[] = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
        return links
          .map((a) => {
            const href =
              (a as HTMLAnchorElement).href ||
              (a as HTMLAnchorElement).getAttribute("href") ||
              "";
            return href.split("?")[0].split("@")[0].split(" ")[0];
          })
          .filter((h) => h.includes("/maps/place/") && h.length > 30);
      });

      const unique = Array.from(new Set(rawUrls));
      const newUrls = unique.filter((u) => !collected.has(u));
      console.log(`[Maps] Iter ${scrollTries}: ${unique.length} total, ${newUrls.length} novos`);

      if (newUrls.length === 0) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }

      for (const url of newUrls) {
        const job = getJob(jobId);
        if (!job || job.shouldStop || job.results.length >= maxResults) break;
        collected.add(url);

        try {
          const detail = await ctx.newPage();
          const fullUrl = url.startsWith("http") ? url : `https://www.google.com${url}`;
          await detail.goto(`${fullUrl}?hl=pt-BR`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          await detail.waitForTimeout(1500);

          const data = await detail.evaluate(() => {
            const name = document.querySelector("h1")?.textContent?.trim() ?? "";
            if (!name || name.length < 2) return null;

            // Telefone — prioriza link tel: (mais confiável)
            let phone = "";
            const telLink = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
            if (telLink) {
              phone = telLink.href.replace("tel:", "");
            } else {
              const phoneEl = document.querySelector(
                '[data-item-id*="phone"] button, [aria-label*="telefone" i], [data-tooltip*="phone" i]'
              );
              const raw =
                phoneEl?.getAttribute("aria-label") ?? phoneEl?.textContent?.trim() ?? "";
              const m = raw.match(/[\d\s\(\)\-\+]{7,}/);
              phone = m?.[0] ?? "";
              if (!phone) {
                const m2 = document.body.innerText.match(
                  /(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4,5}[-\s]?\d{4}/
                );
                phone = m2?.[0] ?? "";
              }
            }
            phone = phone.replace(/\D/g, "").replace(/^55/, "");

            // Endereço
            const addrEl = document.querySelector(
              '[data-item-id^="address"] button, button[aria-label*="enderec" i], button[aria-label*="address" i]'
            );
            const address =
              addrEl?.textContent?.trim() ?? addrEl?.getAttribute("aria-label") ?? "";

            // Segmento — vários seletores possíveis
            const segEl =
              document.querySelector('button[jsaction*="category"]') ??
              document.querySelector(".DkEaL") ??
              document.querySelector('[jsaction*="pane.rating.category"]');
            const segment = segEl?.textContent?.trim() ?? "";

            // Website
            const webEl = document.querySelector<HTMLAnchorElement>(
              'a[data-item-id="authority"], a[aria-label*="site" i], a[aria-label*="Site"]'
            );
            const website = webEl?.href ?? "";

            return { name, phone, address, segment, website };
          });

          if (!data?.name) {
            await detail.close();
            continue;
          }

          // Extrai cidade e estado do endereço
          let city = "",
            state = "";
          if (data.address) {
            const parts = data.address
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .reverse();
            for (const p of parts) {
              const m = p.match(/\b([A-Z]{2})\b/);
              if (m && !state) {
                state = m[1];
                continue;
              }
              const cleaned = p.replace(/\d{5}-?\d{3}/, "").trim();
              if (cleaned && !city) city = cleaned;
            }
          }

          // Email do site (best-effort)
          let email = "";
          if (data.website) {
            try {
              const sp = await ctx.newPage();
              await sp.goto(data.website, { timeout: 6000, waitUntil: "domcontentloaded" });
              const txt = await sp.locator("body").innerText({ timeout: 2000 }).catch(() => "");
              const m = txt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/);
              email = m?.[0] ?? "";
              await sp.close();
            } catch {}
          }

          const lead: ExtractedLead = {
            name: data.name,
            company: data.name,
            phone: data.phone,
            email,
            segment: data.segment,
            city,
            state,
            website: data.website,
            source: "Google Maps",
          };

          pushResult(jobId, lead);
          console.log(
            `[Maps] ✓ ${getJob(jobId)?.results.length}/${maxResults} | ${data.name} | tel: ${data.phone || "—"}`
          );
          await detail.close();
          await page.waitForTimeout(400);
        } catch (err) {
          console.error(`[Maps] Erro no lead: ${(err as Error).message}`);
        }
      }

      // Scrola o painel de resultados
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]') as HTMLElement | null;
        if (feed) {
          feed.scrollBy(0, 1500);
          return;
        }
        window.scrollBy(0, 1000);
      });
      await page.waitForTimeout(2500);

      const ended = await page
        .locator("text=/fim da lista|Você chegou ao fim/i")
        .isVisible()
        .catch(() => false);
      if (ended) {
        console.log("[Maps] Fim da lista atingido");
        break;
      }
    }

    const finalJob = getJob(jobId);
    if (finalJob && !finalJob.shouldStop) updateJob(jobId, { status: "done" });
    console.log(`[Maps] Concluído. ${getJob(jobId)?.results.length} leads extraídos.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Maps] Erro:", msg);
    if (DEBUG) await snap(page, "error").catch(() => {});
    updateJob(jobId, { status: "error", error: msg });
  } finally {
    await browser.close();
  }
}
