// Pretino: verificari si trimitere catre motoarele de cautare (rulat din tab-ul „SEO si motoare de cautare” din program).
//   bun scripts/seo-motoare.js --verifica   verifica site-ul LIVE (sitemap, robots, 200, noindex, canonical, 404, fisiere de verificare)
//   bun scripts/seo-motoare.js --trimite    trimite paginile NOI/MODIFICATE la Bing si alte motoare IndexNow (nu la Google)
//   bun scripts/seo-motoare.js --viteza     masoara homepage, o categorie si un magazin cu PageSpeed Insights (mobil)
//   bun scripts/seo-motoare.js --tot        toate cele de mai sus
// Optiuni: --baza <URL> (implicit https://pretino.ro). Nu publica nimic si nu modifica site-ul.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { SITE_URL } from "../src/config.js";
import { incarcaSecrete } from "./lib/secrete.js";

const CONFIG = "data/seo-motoare.json";
const STARE = ".pretino-local/seo-hash.json"; // hash-uri locale ale paginilor deja trimise (nu se publica)
const UA = "Pretino-SEO/1.0 (+https://pretino.ro)";
const citesteJson = (f, alt) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return alt; } };
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'");
const m1 = (h, re) => dec((h.match(re) ?? [])[1] ?? "");

async function ia(url, optiuni = {}) {
  try {
    const r = await fetch(url, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(25000), ...optiuni });
    return { status: r.status, headers: r.headers, text: await r.text() };
  } catch (e) { return { status: 0, headers: new Headers(), text: "", eroare: String(e.message ?? e) }; }
}
async function inParalel(elemente, n, f) {
  const out = new Array(elemente.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, elemente.length) }, async () => { while (i < elemente.length) { const k = i++; out[k] = await f(elemente[k], k); } }));
  return out;
}
export async function adreseSitemap(baza) {
  const r = await ia(baza + "/sitemap.xml");
  if (r.status !== 200) return { r, urls: [] };
  const urls = [...r.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => dec(m[1]));
  return { r, urls };
}
// Adresa din sitemap (domeniul oficial) se citeste de pe baza aleasa (live sau local pentru teste)
const peBaza = (u, baza) => baza + new URL(u).pathname;

export async function verificaSite(baza, scrie = console.log) {
  const cfg = citesteJson(CONFIG, {});
  let probleme = 0;
  const bun = (m) => scrie("OK     " + m);
  const rau = (m) => { probleme++; scrie("PROBLEMA " + m); };

  const { r: sm, urls } = await adreseSitemap(baza);
  if (sm.status === 200 && urls.length) bun(`sitemap.xml: ${urls.length} adrese`); else rau(`sitemap.xml nu se deschide (status ${sm.status}${sm.eroare ? ", " + sm.eroare : ""}). Publica site-ul (PUBLICA LIVE).`);
  const rb = await ia(baza + "/robots.txt");
  if (rb.status === 200 && /^Sitemap:\s*\S+sitemap\.xml/mi.test(rb.text)) bun("robots.txt permite accesul si indica sitemap-ul"); else rau("robots.txt lipsa sau fara linia Sitemap");
  if (rb.status === 200 && /^Disallow:\s*\/\s*$/mi.test(rb.text)) rau("robots.txt blocheaza tot site-ul (Disallow: /)");
  const bing = await ia(baza + "/BingSiteAuth.xml");
  if (bing.status === 200 && /<user>[0-9A-F]{32}<\/user>/.test(bing.text)) bun("BingSiteAuth.xml accesibil (verificare Bing Webmaster)"); else rau(`BingSiteAuth.xml nu se deschide (status ${bing.status})`);
  if (cfg.indexnowKey) {
    const k = await ia(`${baza}/${cfg.indexnowKey}.txt`);
    if (k.status === 200 && k.text.trim() === cfg.indexnowKey) bun("fisierul cheie IndexNow accesibil"); else rau(`fisierul cheie IndexNow nu se deschide (status ${k.status}); fara el Bing refuza trimiterea`);
  }
  const f404 = await ia(baza + "/pagina-inexistenta-seo-test/");
  if (f404.status === 404) bun("adresele inexistente returneaza 404 real"); else rau(`adresa inexistenta returneaza ${f404.status}, nu 404`);

  const rezultate = await inParalel(urls, 6, async (u) => {
    const r = await ia(peBaza(u, baza));
    const noindex = /<meta name="robots" content="[^"]*noindex/i.test(r.text) || /noindex/i.test(r.headers.get("x-robots-tag") ?? "");
    const canon = m1(r.text, /<link rel="canonical" href="([^"]*)"/);
    return { u, status: r.status, noindex, canon, titlu: m1(r.text, /<title>([^<]*)<\/title>/) };
  });
  const nu200 = rezultate.filter((x) => x.status !== 200);
  const noidx = rezultate.filter((x) => x.status === 200 && x.noindex);
  const canonRau = rezultate.filter((x) => x.status === 200 && x.canon !== x.u);
  const faraTitlu = rezultate.filter((x) => x.status === 200 && !x.titlu);
  if (urls.length) {
    if (!nu200.length) bun(`toate cele ${urls.length} pagini din sitemap raspund 200 (fara redirectionari sau 404)`); else rau(`${nu200.length} pagini din sitemap nu raspund 200: ` + nu200.slice(0, 5).map((x) => `${x.u} (${x.status})`).join(", "));
    if (!noidx.length) bun("nicio pagina din sitemap nu are noindex"); else rau(`${noidx.length} pagini din sitemap au noindex: ` + noidx.slice(0, 5).map((x) => x.u).join(", "));
    if (!canonRau.length) bun("canonical propriu pe toate paginile din sitemap"); else rau(`${canonRau.length} pagini cu canonical diferit: ` + canonRau.slice(0, 3).map((x) => `${x.u} -> ${x.canon || "lipsa"}`).join(", "));
    if (faraTitlu.length) rau(`${faraTitlu.length} pagini fara title`);
  }
  scrie(probleme ? `\nVerificare site: ${probleme} probleme.` : "\nVerificare site: totul in regula.");
  return { probleme, urls, rezultate };
}

const postImplicit = (url, corp) => fetch(url, { method: "POST", headers: { "content-type": "application/json; charset=utf-8", "user-agent": UA }, body: JSON.stringify(corp), signal: AbortSignal.timeout(30000) }).then(async (r) => ({ status: r.status, text: await r.text() }));

// Trimite DOAR paginile noi sau modificate de la ultima trimitere reusita (IndexNow: Bing, Yandex, Seznam, Naver). Google nu foloseste IndexNow.
export async function trimiteIndexNow(baza, urlsSitemap, { post = postImplicit, stare = STARE, scrie = console.log, host = new URL(SITE_URL).host, site = SITE_URL } = {}) {
  const cfg = citesteJson(CONFIG, {});
  if (!/^[0-9a-f]{8,128}$/.test(cfg.indexnowKey ?? "")) { scrie("PROBLEMA cheia IndexNow lipseste din " + CONFIG); return { trimise: 0, eroare: true }; }
  const salvat = citesteJson(stare, {});
  const vechi = salvat.v === 2 ? salvat.h : {}; // starea veche (fara verificarea cheii) se ignora: paginile se retrimit
  // IndexNow ignora trimiterea daca fisierul cheie nu poate fi citit pe site: nu trimitem (si nu salvam starea) pana nu e publicat
  const k = await ia(`${baza}/${cfg.indexnowKey}.txt`);
  if (k.status !== 200 || k.text.trim() !== cfg.indexnowKey) { scrie(`PROBLEMA fisierul cheie IndexNow nu se deschide pe site (status ${k.status}). Apasa PUBLICA LIVE (versiunea 1.61 sau mai noua), apoi reincearca. Nu am trimis nimic.`); return { trimise: 0, eroare: true }; }
  const noi = {}; const schimbate = [];
  const hashuri = await inParalel(urlsSitemap, 6, async (u) => { const r = await ia(peBaza(u, baza)); return r.status === 200 ? createHash("sha1").update(r.text).digest("hex") : null; });
  urlsSitemap.forEach((u, i) => { if (!hashuri[i]) return; noi[u] = hashuri[i]; if (vechi[u] !== hashuri[i]) schimbate.push(u); });
  if (!schimbate.length) { scrie("IndexNow: nicio pagina noua sau modificata de la ultima trimitere. Nu trimit nimic."); return { trimise: 0 }; }
  const r = await post("https://api.indexnow.org/indexnow", { host, key: cfg.indexnowKey, keyLocation: `${site}/${cfg.indexnowKey}.txt`, urlList: schimbate.slice(0, 10000) });
  if (r.status === 200 || r.status === 202) {
    mkdirSync(dirname(stare), { recursive: true });
    writeFileSync(stare, JSON.stringify({ v: 2, h: { ...vechi, ...noi } }, null, 1));
    scrie(`OK     IndexNow: ${schimbate.length} pagini trimise (status ${r.status}). Bing le va programa la accesare; indexarea nu e garantata si nu e instantanee.`);
    return { trimise: schimbate.length };
  }
  scrie(`PROBLEMA IndexNow a raspuns ${r.status}${r.status === 403 ? " (cheia nu a putut fi verificata: publica site-ul si reincearca)" : r.status === 422 ? " (adrese care nu apartin domeniului)" : r.status === 429 ? " (prea multe cereri, reincearca mai tarziu)" : ""}. ${String(r.text).slice(0, 200)}`);
  return { trimise: 0, eroare: true };
}

export async function masoaraViteza(baza, urls, scrie = console.log, cheie = process.env.PAGESPEED_API_KEY || incarcaSecrete().PAGESPEED_API_KEY, pauza = 30000) {
  const alese = [urls.find((u) => new URL(u).pathname === "/"), urls.find((u) => /\/categorie\/[^/]+\/$/.test(u)), urls.find((u) => /\/magazin\/[^/]+\/$/.test(u))].filter(Boolean);
  let probleme = 0;
  for (const u of alese) {
    const api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&locale=ro&category=performance&category=accessibility&category=seo&category=best-practices&url=" + encodeURIComponent(peBaza(u, baza)) + (cheie ? "&key=" + cheie : "");
    let r = await ia(api, { redirect: "follow" });
    for (let incercare = 0; r.status === 429 && incercare < 3; incercare++) { scrie(`   PageSpeed: limita Google atinsa, astept ${pauza / 1000} s si reincerc...`); await new Promise((ok) => setTimeout(ok, pauza)); r = await ia(api, { redirect: "follow" }); }
    if (r.status === 429) { scrie("PROBLEMA PageSpeed: limita Google. Reincearca peste cateva minute sau pune o cheie gratuita PAGESPEED_API_KEY in secrete.env (Google Cloud: activeaza PageSpeed Insights API)."); probleme++; continue; }
    if (r.status !== 200) { scrie(`PROBLEMA PageSpeed ${u}: status ${r.status}`); probleme++; continue; }
    const j = JSON.parse(r.text); const lh = j.lighthouseResult; const cat = (n) => Math.round((lh.categories[n]?.score ?? 0) * 100); const au = (n) => lh.audits[n]?.displayValue ?? "?";
    scrie(`${new URL(u).pathname}  Performanta ${cat("performance")} | Accesibilitate ${cat("accessibility")} | Practici ${cat("best-practices")} | SEO ${cat("seo")} | LCP ${au("largest-contentful-paint")} | CLS ${au("cumulative-layout-shift")} | TBT ${au("total-blocking-time")}`);
    const f = j.loadingExperience?.metrics;
    scrie(f ? "   Date reale (CrUX): " + Object.entries(f).map(([k, v]) => `${k.replace("_MS", "").replace(/_/g, " ").toLowerCase()} ${v.category}`).join(", ") : "   Date reale (CrUX): inca insuficiente pentru acest domeniu (normal la un site nou)");
  }
  if (!alese.length) { scrie("PROBLEMA nu am gasit pagini de masurat in sitemap"); probleme++; }
  scrie("Valorile Lighthouse sunt simulate; nu sunt date reale ale utilizatorilor.");
  return { probleme };
}

if (import.meta.main) {
  const a = process.argv.slice(2);
  const baza = (a.includes("--baza") ? a[a.indexOf("--baza") + 1] : SITE_URL).replace(/\/$/, "");
  const tot = a.includes("--tot");
  let cod = 0;
  const { urls: urlsSm } = await adreseSitemap(baza);
  if (tot || a.includes("--verifica")) { console.log("== Verificare site live: " + baza + " =="); const r = await verificaSite(baza); if (r.probleme) cod = 1; console.log(""); }
  if (tot || a.includes("--trimite")) {
    console.log("== Trimitere la Bing si IndexNow ==");
    if (!urlsSm.length) { console.log("PROBLEMA sitemap-ul nu se deschide; nu trimit nimic. Publica site-ul intai."); cod = 1; }
    else { const r = await trimiteIndexNow(baza, urlsSm); if (r.eroare) cod = 1; }
    console.log("\nGoogle: nu accepta trimitere automata pentru acest tip de site. Foloseste butoanele „Deschide Search Console” (sitemap si Inspectare URL).\n");
  }
  if (tot || a.includes("--viteza")) { console.log("== Viteza (PageSpeed Insights, mobil) =="); const r = await masoaraViteza(baza, urlsSm); if (r.probleme) cod = 1; }
  if (!tot && !["--verifica", "--trimite", "--viteza"].some((x) => a.includes(x))) { console.log("Foloseste: --verifica, --trimite, --viteza sau --tot"); cod = 1; }
  process.exit(cod);
}
