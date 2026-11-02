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
header{display:flex;gap:16px;align-items:center;flex-wrap:wrap}header .logo{display:flex;line-height:0;text-decoration:none}header .logo img{height:38px;width:auto;display:block}
nav{display:flex;gap:12px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px}
.pret{font-size:1.3rem;font-weight:700}.vechi{color:var(--mut);text-decoration:line-through;margin-left:8px;font-weight:400;font-size:1rem}
.badge{background:var(--acc);color:#fff;border-radius:8px;padding:1px 8px;font-size:.85rem;align-self:flex-start}
.btn{margin-top:auto;display:inline-block;background:var(--acc);color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;text-align:center}
.demo{background:#b45309;color:#fff;text-align:center;padding:6px}.mut{color:var(--mut)}header{flex-wrap:wrap}header .logo{flex:none}.cauta{position:relative;flex:1 1 320px;max-width:680px;display:flex}.cauta input{flex:1;min-width:0;padding:11px 14px;border:2px solid var(--acc);border-right:0;border-radius:10px 0 0 10px;background:var(--card);color:var(--fg);font:inherit}.cauta input:focus{outline:2px solid var(--acc);outline-offset:1px}.cauta button{padding:0 20px;border:2px solid var(--acc);background:var(--acc);color:#fff;font:inherit;font-weight:600;border-radius:0 10px 10px 0;cursor:pointer}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.sugestii{position:absolute;top:100%;left:0;right:0;z-index:20;margin-top:4px;background:var(--card);border:1px solid var(--bd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);overflow:hidden}.sugestii a{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;text-decoration:none;color:var(--fg)}.sugestii a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.sugestii a:hover,.sugestii a:focus{background:var(--bg)}.sugestii small{color:var(--mut);white-space:nowrap}.sugestii .sug-toate{color:var(--acc);font-weight:600;border-top:1px solid var(--bd);justify-content:center}.sug-gol{padding:12px 14px;color:var(--mut)}header>nav{order:3;flex-basis:100%}#mai{display:block;margin:20px auto;padding:10px 22px;border:0;border-radius:8px;background:var(--acc);color:#fff;font:inherit;cursor:pointer}#mai[hidden]{display:none}footer{color:var(--mut);font-size:.9rem}footer .legal{margin-bottom:8px}main h2{margin-top:1.4em}`;

// Script Profitshare „Linkuri automate" (cont Pretino, site validat): transforma linkurile catre magazinele partenere in linkuri de afiliere. Fara el, linkurile raman cele din catalog.
const PROFITSHARE_SCRIPT = `<!-- Start ProfitShare Zone --><script>(function(){var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="//l.profitshare.ro/files_shared/lps/js/AZC/NI.js?v=1793640493";(document.getElementsByTagName("head")[0]||document.getElementsByTagName("body")[0]).appendChild(s);})();</script><!-- End ProfitShare Zone -->`;

function pagina({ titlu, descriere, cale, corp, noindex = false }) {
  const robots = noindex || DEMO ? '<meta name="robots" content="noindex">' : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="profitshareid" content="7dd842fc7074c28872c609438ead55e6"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${robots}
<link rel="canonical" href="${SITE_URL}${cale}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#0f766e"><link rel="stylesheet" href="/stil.css"><script src="/cauta.js" defer></script>${DEMO ? "" : PROFITSHARE_SCRIPT}</head><body>
${DEMO ? '<div class="demo">PREVIEW cu date DEMO – nu este conținut real și nu se publică</div>' : ""}
<header><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><picture><source srcset="/logo-dark.svg" media="(prefers-color-scheme: dark)"><img src="/logo.svg" alt="${esc(SITE_NAME)}" width="150" height="38"></picture></a><form id="cautare" class="cauta" role="search" action="/cauta/" method="get"><label class="sr" for="q">Caută oferte</label><input id="q" name="q" type="search" placeholder="Caută produse, magazine, categorii…" autocomplete="off" enterkeyhint="search"><button type="submit" aria-label="Caută">Caută</button><div id="sugestii" class="sugestii" hidden></div></form><nav>${categorii.map((c) => `<a href="/categorie/${c.slug}/">${esc(c.nume)}</a>`).join("")}</nav></header>
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
pagini.push({ cale: "/cauta/", index: false, html: pagina({ titlu: `Căutare – ${SITE_NAME}`, descriere: "Caută oferte în catalogul Pretino.ro.", cale: "/cauta/", noindex: true, corp: '<h1>Căutare</h1><p id="stare" class="mut">Pentru căutare este nevoie de JavaScript activat.</p><div class="grid" id="lista"></div><button id="mai" type="button" hidden>Arată mai multe</button>' }) });
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
// index de cautare (citit de /cauta.js): campuri scurte, ordinea = cele mai mari reduceri primele
writeFileSync("dist/cauta-index.json", JSON.stringify({ m: Object.fromEntries(magazine.map((x) => [x.id, x.nume])), c: Object.fromEntries(categorii.map((x) => [x.slug, x.nume])), o: sortate.map((o) => ({ t: o.titlu, m: o.magazin, c: o.categorie, p: o.pret, v: o.pretVechi > o.pret ? o.pretVechi : 0, r: o.referintaMagazin ? 1 : 0, u: o.url })) }));
for (const p of pagini) {
  const dir = "dist" + p.cale;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", p.html);
}
writeFileSync("dist/404.html", pagina({ titlu: `Pagină negăsită – ${SITE_NAME}`, descriere: "Pagina nu există.", cale: "/404.html", noindex: true, corp: '<h1>Pagina nu există</h1><p><a href="/">Înapoi la oferte</a></p>' }));
const indexabile = pagini.filter((p) => p.index);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexabile.map((p) => `<url><loc>${SITE_URL}${p.cale}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("dist/robots.txt", DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// stare publica a catalogului (citita de panoul de control; fara date sensibile)
{ const num = (k, nume) => Object.fromEntries(Object.entries(oferte.reduce((a, o) => ((a[nume(o)] = (a[nume(o)] ?? 0) + 1), a), {})).sort((p, q) => q[1] - p[1]));
  writeFileSync("dist/status.json", JSON.stringify({ generat: new Date().toISOString(), total: oferte.length, magazine: num("m", (o) => mag[o.magazin]?.nume ?? o.magazin), categorii: num("c", (o) => cat[o.categorie]?.nume ?? o.categorie), demo: DEMO }) + "\n"); }
let sha = "";
try { sha = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
writeFileSync("dist/version.json", JSON.stringify({ sha, built: new Date().toISOString(), demo: DEMO }) + "\n");
console.log(`Pretino build${DEMO ? " (DEMO)" : ""}: ${pagini.length} pagini, ${oferte.length} oferte → dist/`);
