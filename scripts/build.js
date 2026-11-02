// Generează site-ul static Pretino în dist/. `--demo` folosește data/demo-oferte.json (doar pentru preview, niciodată publicat).
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "../src/config.js";
import { PAGINI_LEGALE } from "./lib/legal.js";
import { esc, lei, reducere } from "./lib/html.js";

const DEMO = process.argv.includes("--demo");
const citeste = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const categorii = citeste("categorii.json");
const magazine = citeste("magazine.json");
const oferte = citeste(DEMO ? "demo-oferte.json" : "oferte.json");
const mag = Object.fromEntries(magazine.map((m) => [m.id, m]));
const cat = Object.fromEntries(categorii.map((c) => [c.slug, c]));

const CSS = `:root{--bg:#f6f8f8;--fg:#10211f;--card:#fff;--mut:#5b6b69;--acc:#0f766e;--bd:#dbe4e2}
@media(prefers-color-scheme:dark){:root{--bg:#0d1514;--fg:#e6f0ee;--card:#142120;--mut:#9bb0ad;--acc:#2dd4bf;--bd:#243735}}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--fg)}
a{color:var(--acc)}header,main,footer{max-width:1100px;margin:0 auto;padding:16px}
header{display:flex;gap:16px;align-items:center;flex-wrap:wrap}header .logo{font-weight:800;font-size:1.4rem;text-decoration:none}
nav{display:flex;gap:12px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px}
.pret{font-size:1.3rem;font-weight:700}.vechi{color:var(--mut);text-decoration:line-through;margin-left:8px;font-weight:400;font-size:1rem}
.badge{background:var(--acc);color:#fff;border-radius:8px;padding:1px 8px;font-size:.85rem;align-self:flex-start}
.btn{margin-top:auto;display:inline-block;background:var(--acc);color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;text-align:center}
.demo{background:#b45309;color:#fff;text-align:center;padding:6px}.mut{color:var(--mut)}footer{color:var(--mut);font-size:.9rem}footer .legal{margin-bottom:8px}main h2{margin-top:1.4em}`;

function pagina({ titlu, descriere, cale, corp, noindex = false }) {
  const robots = noindex || DEMO ? '<meta name="robots" content="noindex">' : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="profitshareid" content="7dd842fc7074c28872c609438ead55e6"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${robots}
<link rel="canonical" href="${SITE_URL}${cale}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/stil.css"></head><body>
${DEMO ? '<div class="demo">PREVIEW cu date DEMO – nu este conținut real și nu se publică</div>' : ""}
<header><a class="logo" href="/">${esc(SITE_NAME)}</a><nav>${categorii.map((c) => `<a href="/categorie/${c.slug}/">${esc(c.nume)}</a>`).join("")}</nav></header>
<main>${corp}</main>
<footer><nav class="legal">${PAGINI_LEGALE.map((p) => `<a href="${p.cale}">${esc(p.nume)}</a>`).join("")}</nav>Pretino.ro afișează oferte din magazine partenere. Unele linkuri pot fi linkuri de afiliere (marcate sponsorizat); prețul pentru tine nu se schimbă. Unde apare „reducere afișată de magazin”, prețul vechi este cel de referință arătat de magazin, nu istoricul Pretino. Verifică mereu prețul final în magazin.</footer></body></html>`;
}

const card = (o) => {
  const r = reducere(o);
  return `<article class="card">${r ? `<span class="badge">-${r}%</span>` : ""}<strong>${esc(o.titlu)}</strong>
<span class="mut">${esc(mag[o.magazin]?.nume ?? o.magazin)} · ${esc(cat[o.categorie]?.nume ?? o.categorie)}</span>
<div><span class="pret">${lei(o.pret)}</span>${r ? `<span class="vechi"${o.referintaMagazin ? ' title="Preț de referință afișat de magazin"' : ""}>${lei(o.pretVechi)}</span>` : ""}</div>${o.referintaMagazin && r ? '<span class="mut">reducere afișată de magazin</span>' : ""}
<a class="btn" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">Vezi oferta</a></article>`;
};
const grila = (l) => `<div class="grid">${l.map(card).join("")}</div>`;
const sortate = [...oferte].sort((a, b) => reducere(b) - reducere(a) || a.pret - b.pret);

const pagini = []; // { cale, html, index }
pagini.push({
  cale: "/",
  index: oferte.length > 0,
  html: pagina({
    titlu: `${SITE_NAME} – ${SITE_TAGLINE}`,
    descriere: "Cele mai bune oferte și reduceri actuale din magazinele din România, într-un singur loc.",
    cale: "/",
    noindex: oferte.length === 0,
    corp: `<h1>${esc(SITE_TAGLINE)}</h1>` + (oferte.length ? grila(sortate.slice(0, 48)) : "<p>Ofertele apar în curând.</p>"),
  }),
});
for (const c of categorii) {
  const l = sortate.filter((o) => o.categorie === c.slug);
  if (!l.length) continue;
  const cale = `/categorie/${c.slug}/`;
  pagini.push({ cale, index: true, html: pagina({ titlu: `Oferte ${c.nume} – ${SITE_NAME}`, descriere: `Oferte actuale la ${c.nume.toLowerCase()} din magazinele din România.`, cale, corp: `<h1>Oferte ${esc(c.nume)}</h1>${grila(l)}` }) });
}
for (const p of PAGINI_LEGALE) pagini.push({ cale: p.cale, index: true, html: pagina({ titlu: `${p.titlu} – ${SITE_NAME}`, descriere: p.descriere, cale: p.cale, corp: p.corp() }) });
for (const m of magazine) {
  const l = sortate.filter((o) => o.magazin === m.id);
  if (!l.length) continue;
  const cale = `/magazin/${m.id}/`;
  pagini.push({ cale, index: true, html: pagina({ titlu: `Oferte ${m.nume} – ${SITE_NAME}`, descriere: `Ofertele actuale de la ${m.nume}.`, cale, corp: `<h1>Oferte ${esc(m.nume)}</h1>${grila(l)}` }) });
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
writeFileSync("dist/stil.css", CSS);
for (const p of pagini) {
  const dir = "dist" + p.cale;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", p.html);
}
writeFileSync("dist/404.html", pagina({ titlu: `Pagină negăsită – ${SITE_NAME}`, descriere: "Pagina nu există.", cale: "/404.html", noindex: true, corp: '<h1>Pagina nu există</h1><p><a href="/">Înapoi la oferte</a></p>' }));
const indexabile = pagini.filter((p) => p.index);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexabile.map((p) => `<url><loc>${SITE_URL}${p.cale}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("dist/robots.txt", DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
let sha = "";
try { sha = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
writeFileSync("dist/version.json", JSON.stringify({ sha, built: new Date().toISOString(), demo: DEMO }) + "\n");
console.log(`Pretino build${DEMO ? " (DEMO)" : ""}: ${pagini.length} pagini, ${oferte.length} oferte → dist/`);
