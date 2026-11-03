// Teste pentru scripts/seo-motoare.js: ruleaza pe site-ul generat (dist/), servit local, cu trimitere IndexNow simulata (fara retea externa).
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { verificaSite, trimiteIndexNow, adreseSitemap } from "./seo-motoare.js";

export async function testeSeoMotoare(ok) {
  const cfg = JSON.parse(readFileSync("data/seo-motoare.json", "utf8"));
  ok(/^[0-9a-f]{32}$/.test(cfg.indexnowKey) && existsSync(`public/${cfg.indexnowKey}.txt`) && readFileSync(`public/${cfg.indexnowKey}.txt`, "utf8").trim() === cfg.indexnowKey, "seo-motoare: fisierul cheie IndexNow exista in public/ si corespunde configuratiei");
  ok(existsSync("dist/BingSiteAuth.xml") && existsSync(`dist/${cfg.indexnowKey}.txt`), "seo-motoare: fisierele de verificare ajung in dist/");
  const root = join(process.cwd(), "dist");
  const srv = Bun.serve({ port: 0, fetch(req) {
    const p = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^(\.\.[\\/])+/, ""); let f = join(root, p);
    if (existsSync(f) && !/\.[a-z0-9]+$/i.test(f)) f = join(f, "index.html"); else if (p.endsWith("/")) f = join(f, "index.html");
    return existsSync(f) && !f.endsWith("/") ? new Response(Bun.file(f)) : new Response(Bun.file(join(root, "404.html")), { status: 404 });
  } });
  const baza = `http://localhost:${srv.port}`; const tmp = mkdtempSync(join(tmpdir(), "pretino-seo-")); const stare = join(tmp, "hash.json");
  try {
    const linii = []; const v = await verificaSite(baza, (m) => linii.push(m));
    ok(v.probleme === 0 && v.urls.length > 10, `seo-motoare: verificarea live trece pe site-ul generat (${v.urls.length} pagini; ${linii.filter((l) => l.startsWith("PROBLEMA")).join(" | ")})`);
    const { urls } = await adreseSitemap(baza); const trimise = [];
    const post = (cod) => async (url, corp) => { trimise.push(corp); return { status: cod, text: "" }; };
    const mut = () => {};
    let r = await trimiteIndexNow(baza, urls, { post: post(202), stare, scrie: mut });
    ok(r.trimise === urls.length && trimise[0].host === "pretino.ro" && trimise[0].keyLocation === `https://pretino.ro/${cfg.indexnowKey}.txt` && trimise[0].key === cfg.indexnowKey, "seo-motoare: prima trimitere IndexNow include toate paginile, cu host si cheie corecte");
    r = await trimiteIndexNow(baza, urls, { post: post(202), stare, scrie: mut });
    ok(r.trimise === 0 && trimise.length === 1, "seo-motoare: a doua trimitere, fara schimbari, nu trimite nimic");
    const stare2 = join(tmp, "hash2.json");
    r = await trimiteIndexNow(baza, urls, { post: post(403), stare: stare2, scrie: mut });
    ok(r.eroare && !existsSync(stare2), "seo-motoare: la eroare IndexNow starea nu se salveaza (se reincearca data viitoare)");
    const stareVeche = join(tmp, "veche.json"); const { writeFileSync } = await import("node:fs"); writeFileSync(stareVeche, JSON.stringify(Object.fromEntries(urls.map((u) => [u, "x"]))));
    const n0 = trimise.length; r = await trimiteIndexNow(baza, urls, { post: post(200), stare: stareVeche, scrie: mut });
    ok(r.trimise === urls.length && trimise.length === n0 + 1, "seo-motoare: starea veche (fara verificarea cheii) este ignorata si paginile se retrimit");
    const srvFaraCheie = Bun.serve({ port: 0, fetch: () => new Response("nu", { status: 404 }) });
    const n1 = trimise.length; const stare3 = join(tmp, "hash3.json");
    r = await trimiteIndexNow(`http://localhost:${srvFaraCheie.port}`, urls, { post: post(202), stare: stare3, scrie: mut }); srvFaraCheie.stop(true);
    ok(r.eroare && trimise.length === n1 && !existsSync(stare3), "seo-motoare: fara fisier cheie pe site nu se trimite nimic si starea nu se salveaza");
    const verifFara = await verificaSite("http://localhost:1", mut);
    ok(verifFara.probleme > 0, "seo-motoare: site inaccesibil este raportat ca problema");
  } finally { srv.stop(true); rmSync(tmp, { recursive: true, force: true }); }
}
