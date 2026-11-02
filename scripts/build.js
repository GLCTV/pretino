// Generează site-ul static Pretino în dist/. `--demo` folosește data/demo-oferte.json (doar pentru preview, niciodată publicat).
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "../src/config.js";
import { PAGINI_LEGALE } from "./lib/legal.js";
import { esc, reducere } from "./lib/html.js";
import { clasifica, subcategoriiDe } from "./lib/clasificare.js";
import { icoana } from "./lib/iconite.js";

const DEMO = process.argv.includes("--demo");
const citeste = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const categorii = citeste("categorii.json");
const magazine = citeste("magazine.json");
// doar oferte cu pret redus (pret vechi taiat + pret nou); categoria/subcategoria se corecteaza dupa titlu (lib/clasificare.js)
// magazinele cu „reducereMaxProcent” (ex. evoMAG 45%): reducerile mai mari nu sunt considerate reale si nu se afiseaza
const maxRed = Object.fromEntries(magazine.filter((m) => m.reducereMaxProcent).map((m) => [m.id, m.reducereMaxProcent]));
const reala = (o) => !maxRed[o.magazin] || (1 - o.pret / o.pretVechi) * 100 <= maxRed[o.magazin];
const oferte = citeste(DEMO ? "demo-oferte.json" : "oferte.json").filter((o) => o.pretVechi > o.pret && reala(o)).map((o) => ({ ...o, ...clasifica(o) }));
const mag = Object.fromEntries(magazine.map((m) => [m.id, m]));
const cat = Object.fromEntries(categorii.map((c) => [c.slug, c]));
const lei = (n) => `${Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;

const CSS = readFileSync(new URL("../src/stil.css", import.meta.url), "utf8");
// versiune pentru fisierele statice (stil.css, cauta.js): se schimba cand se schimba continutul, ca browserele sa nu foloseasca varianta veche din cache
const VER_ASSET = createHash("sha1").update(CSS + (existsSync("public/cauta.js") ? readFileSync("public/cauta.js", "utf8") : "")).digest("hex").slice(0, 8);

// Script Profitshare „Linkuri automate" (cont Pretino, site validat): transforma linkurile catre magazinele partenere in linkuri de afiliere. Fara el, linkurile raman cele din catalog.
const PROFITSHARE_SCRIPT = `<!-- Start ProfitShare Zone --><script>(function(){var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="//l.profitshare.ro/files_shared/lps/js/AZC/NI.js?v=1793640493";(document.getElementsByTagName("head")[0]||document.getElementsByTagName("body")[0]).appendChild(s);})();</script><!-- End ProfitShare Zone -->`;
// tema: inchisa implicit (ca in design); alegerea utilizatorului se pastreaza local. Inline, ca sa nu apara „licarire” de tema.
const TEMA_INIT = `<script>try{var t=localStorage.getItem("pretino-tema");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>`;

const FOOTER = `<footer><nav class="legal">${PAGINI_LEGALE.map((p) => `<a href="${p.cale}">${esc(p.nume)}</a>`).join("")}</nav>Pretino.ro afișează oferte din magazine partenere. Unele linkuri pot fi linkuri de afiliere (marcate sponsorizat), iar unele magazine ne oferă un cod de cupon pentru care putem primi comision; prețul pentru tine nu se schimbă. Unde apare „reducere afișată de magazin”, prețul vechi este cel de referință arătat de magazin, nu istoricul Pretino. Verifică mereu prețul final în magazin.</footer>`;

const antet = (catActiva) => `<header class="antet"><div class="antet-in">
<div class="rand1"><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><img class="l-noapte" src="/logo-dark-antet.svg" alt="${esc(SITE_NAME)}" width="190" height="35"><img class="l-lumina" src="/logo-antet.svg" alt="" width="190" height="35" aria-hidden="true"></a>
<form id="cautare" class="cauta" role="search" action="/cauta/" method="get"><label class="cauta-in"><span class="sr">Caută oferte</span>${icoana("cauta")}<input id="q" name="q" type="search" placeholder="Caută produse, magazine sau oferte…" autocomplete="off" enterkeyhint="search"></label><button type="submit">Caută</button><div id="sugestii" class="sugestii" hidden></div></form>
<div class="unelte"><a class="ibtn" id="fav-link" href="/favorite/" aria-label="Favorite">${icoana("inima")}<span class="nr" id="fav-nr" hidden>0</span></a><button class="ibtn" id="tema" type="button" aria-label="Schimbă tema (închisă / deschisă)"><span class="tema-luna">${icoana("luna")}</span><span class="tema-soare">${icoana("soare")}</span></button></div></div>
<nav class="cats" aria-label="Categorii">${categorii.map((c) => `<a href="/categorie/${c.slug}/"${c.slug === catActiva ? ' aria-current="page"' : ""}>${icoana(c.slug)}<span>${esc(c.nume)}</span></a>`).join("")}</nav></div></header>`;

function pagina({ titlu, descriere, cale, corp, noindex = false, catActiva = null, simplu = false }) {
  const robots = noindex || DEMO ? '<meta name="robots" content="noindex">' : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="profitshareid" content="7dd842fc7074c28872c609438ead55e6"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${robots}
<link rel="canonical" href="${SITE_URL}${cale}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#0a1916"><link rel="preload" href="/fonts/montserrat-var-latin.woff" as="font" type="font/woff" crossorigin><link rel="stylesheet" href="/stil.css?v=${VER_ASSET}">${TEMA_INIT}<script src="/cauta.js?v=${VER_ASSET}" defer></script>${DEMO ? "" : PROFITSHARE_SCRIPT}</head><body>
${DEMO ? '<div class="demo">PREVIEW cu date DEMO – nu este conținut real și nu se publică</div>' : ""}
${antet(catActiva)}
${simplu ? `<main class="simplu">${corp}</main>` : corp}
${FOOTER}</body></html>`;
}

// poza produsului: URL-ul din feed-ul magazinului (hotlink), incarcata lenes; daca nu exista / nu se incarca, zona ramane uniforma, cu o pictograma discreta
const areImg = (o) => /^https:\/\//.test(o.imagine ?? "");
const poza = (o) => `<a class="poza${areImg(o) ? "" : " fara"}" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true">${areImg(o) ? `<img src="${esc(o.imagine)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="275" height="167" onerror="this.parentNode.classList.add('fara')">` : ""}</a>`;
// cupon al magazinului (ex. PC Garage): afisat pe card, se introduce in cos; butonul copiaza codul (cauta.js)
const cupon = (c) => c ? `<div class="cupon"><span>Cupon <b>${esc(c.cod)}</b> (${esc(c.text)}) – introdu-l în coș</span><button type="button" class="copiaza" data-cod="${esc(c.cod)}">Copiază</button></div>` : "";
const card = (o) => {
  const r = reducere(o);
  return `<article class="card">${poza(o)}<span class="badge">-${r}%</span><button class="fav" type="button" data-id="${esc(o.id)}" aria-pressed="false" aria-label="Adaugă la favorite">${icoana("inima")}</button>
<a class="titlu" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(o.titlu)}</a><span class="magazin">${esc(mag[o.magazin]?.nume ?? o.magazin)}</span>
<div class="pretrand"><span class="pret">${lei(o.pret)}</span><span class="vechi"${o.referintaMagazin ? ' title="Preț de referință afișat de magazin"' : ""}>${lei(o.pretVechi)}</span><span class="econ">Economisești<b>${lei(o.pretVechi - o.pret)}</b></span></div>
${cupon(mag[o.magazin]?.cupon)}<a class="btn" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">Vezi oferta ${icoana("extern")}</a></article>`;
};
const sortate = [...oferte].sort((a, b) => reducere(b) - reducere(a) || a.pret - b.pret);

// ilustratia din dreapta titlului: placa cu pictograma categoriei (desenata de noi)
const ilustratie = (slug) => `<div class="hero-poza" aria-hidden="true"><svg viewBox="0 0 290 170" fill="none"><defs><radialGradient id="g1" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#61e2c5" stop-opacity=".28"/><stop offset="1" stop-color="#61e2c5" stop-opacity="0"/></radialGradient><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3a34"/><stop offset="1" stop-color="#112722"/></linearGradient></defs><ellipse cx="145" cy="110" rx="135" ry="58" fill="url(#g1)"/><rect x="82" y="30" width="112" height="104" rx="20" fill="url(#g2)" stroke="#2c5a4e"/><g transform="translate(103 49) scale(2.6)" stroke="#61e2c5" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" fill="none">${icoana(slug, "x").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g><circle cx="222" cy="52" r="6" fill="#fdc950"/><circle cx="62" cy="62" r="4" fill="#61e2c5" opacity=".7"/></svg></div>`;

// pagina de lista (acasa, categorie, magazin, cautare, favorite): panou de filtre + sortare + grila. Filtrarea completa ruleaza in browser (cauta.js) pe cauta-index.json;
// in HTML sunt deja primele 48 de carduri (pentru Google si pentru cine nu are JavaScript).
function listare({ mod, titlu, descriere, cale, h1, sub, catSlug = null, magId = null, subcat = null, lista, noindex = false, ilustr = null }) {
  const subs = subcat ?? [];
  const nr = (id) => lista.filter((o) => o.sub === id).length;
  const arataSub = subs.filter((s) => nr(s.id) > 0);
  const magazineLista = [...new Set(lista.map((o) => o.magazin))].map((id) => ({ id, nume: mag[id]?.nume ?? id, n: lista.filter((o) => o.magazin === id).length })).sort((a, b) => b.n - a.n);
  const pretMax = Math.max(10, ...lista.map((o) => o.pret));
  const pasMax = pretMax <= 500 ? Math.ceil(pretMax / 10) * 10 : pretMax <= 5000 ? Math.ceil(pretMax / 100) * 100 : Math.ceil(pretMax / 1000) * 1000;
  const date = JSON.stringify({ mod, cat: catSlug, mag: magId, max: pasMax }).replace(/</g, "\\u003c");
  const corp = `<main data-lista='${date}'>
<nav class="migaje" aria-label="Navigare">${mod === "acasa" ? `<span>Acasă</span>` : `<a href="/">Acasă</a><span aria-hidden="true">/</span><span id="migaja-curenta">${esc(catSlug ? categorii.find((c) => c.slug === catSlug)?.nume : mag[magId]?.nume ?? h1)}</span>`}</nav>
<div class="hero"><div><h1 id="h1">${esc(h1)}</h1><p class="sub" id="sub-titlu">${esc(sub)}</p></div>${ilustr ? ilustratie(ilustr) : ""}</div>
${arataSub.length ? `<div class="subcats" role="group" aria-label="Subcategorii"><a class="chip" data-sub="" href="${cale}" aria-pressed="true">Toate</a>${arataSub.map((s) => `<a class="chip" data-sub="${s.id}" href="${cale}?sub=${s.id}" aria-pressed="false">${icoana(s.icoana)}${esc(s.nume)}</a>`).join("")}</div>` : '<div class="subcats-gol"></div>'}
<div class="cont">
<aside class="filtre" id="filtre" aria-label="Filtre"><button class="filtre-x" type="button" id="filtre-x" aria-label="Închide filtrele">${icoana("x")}</button>
<h2 class="filtre-cap">${icoana("filtre")}Filtre</h2>
${magId ? "" : `<details class="fsec" open><summary>Magazine ${icoana("sus")}</summary><div id="f-mag">${magazineLista.map((m) => `<label class="opt"><input type="checkbox" name="m" value="${esc(m.id)}"><span>${esc(m.nume)}</span><span class="nr">${m.n}</span></label>`).join("")}</div></details>`}
<details class="fsec" open><summary>Preț ${icoana("sus")}</summary><div class="pret-slider"><div class="pista"></div><div class="umplere" id="umplere"></div><input type="range" id="p-min-r" min="0" max="${pasMax}" step="1" value="0" aria-label="Preț minim"><input type="range" id="p-max-r" min="0" max="${pasMax}" step="1" value="${pasMax}" aria-label="Preț maxim"></div>
<div class="pret-in"><label><span>Min. (lei)</span><input type="number" id="p-min" min="0" max="${pasMax}" value="0" inputmode="numeric"></label><i>–</i><label><span>Max. (lei)</span><input type="number" id="p-max" min="0" max="${pasMax}" value="${pasMax}" inputmode="numeric"></label></div></details>
<details class="fsec" open><summary>Reducere ${icoana("sus")}</summary><div id="f-red"><label class="opt"><input type="radio" name="red" value="0" checked><span>Orice reducere</span></label>${[20, 30, 40, 50].map((p) => `<label class="opt"><input type="radio" name="red" value="${p}"><span>Minim ${p}%</span></label>`).join("")}</div></details>
<button class="reset" type="button" id="reset">${icoana("reset")}Resetează filtrele</button></aside>
<section aria-live="polite"><div class="rez-cap"><h2>Oferte disponibile<small id="nr-rez">${lista.length} oferte</small></h2>
<div class="sort"><button class="btn-filtre" type="button" id="btn-filtre">${icoana("filtre")}Filtre</button><label class="sort-et" for="sortare">Sortează după:</label><select id="sortare"><option value="red">Reducere descrescătoare</option><option value="econ">Economie descrescătoare</option><option value="pret-cresc">Preț crescător</option><option value="pret-desc">Preț descrescător</option></select></div></div>
<div class="grid" id="lista">${lista.length ? lista.slice(0, 48).map(card).join("") : ""}</div>
<div class="rez-gol" id="rez-gol" ${lista.length ? "hidden" : ""}><b>Nu am găsit oferte</b>Încearcă alte filtre sau o altă căutare.</div>
<button id="mai" type="button" hidden>Arată mai multe</button></section></div><div class="vala" id="vala" hidden></div></main>`;
  return pagina({ titlu, descriere, cale, corp, noindex, catActiva: catSlug });
}

const pagini = []; // { cale, html, index }
pagini.push({
  cale: "/",
  index: oferte.length > 0,
  html: listare({ mod: "acasa", titlu: `${SITE_NAME} – ${SITE_TAGLINE}`, descriere: "Cele mai bune oferte și reduceri actuale din magazinele din România, într-un singur loc.", cale: "/", h1: "Oferte actuale din magazinele din România", sub: "Găsește oferta potrivită, din mai multe magazine.", lista: sortate, noindex: oferte.length === 0 }),
});
for (const c of categorii) {
  const l = sortate.filter((o) => o.categorie === c.slug);
  if (!l.length) continue;
  const cale = `/categorie/${c.slug}/`;
  pagini.push({ cale, index: true, html: listare({ mod: "categorie", titlu: `Oferte ${c.nume} – ${SITE_NAME}`, descriere: `Oferte actuale la ${c.nume.toLowerCase()} din magazinele din România.`, cale, h1: `Oferte pentru ${c.nume.toLowerCase().replace(" și it", " și IT")}`, sub: "Găsește oferta potrivită, din mai multe magazine.", catSlug: c.slug, subcat: subcategoriiDe(c.slug), lista: l, ilustr: c.slug }) });
}
for (const m of magazine) {
  const l = sortate.filter((o) => o.magazin === m.id);
  if (!l.length) continue;
  const cale = `/magazin/${m.id}/`;
  pagini.push({ cale, index: true, html: listare({ mod: "magazin", titlu: `Oferte ${m.nume} – ${SITE_NAME}`, descriere: `Ofertele actuale de la ${m.nume}.`, cale, h1: `Oferte ${m.nume}`, sub: "Toate ofertele cu preț redus din acest magazin.", magId: m.id, lista: l }) });
}
pagini.push({ cale: "/cauta/", index: false, html: listare({ mod: "cauta", titlu: `Căutare – ${SITE_NAME}`, descriere: "Caută oferte în catalogul Pretino.ro.", cale: "/cauta/", h1: "Căutare", sub: "Pentru căutare este nevoie de JavaScript activat.", lista: [], noindex: true }) });
pagini.push({ cale: "/favorite/", index: false, html: listare({ mod: "favorite", titlu: `Favorite – ${SITE_NAME}`, descriere: "Ofertele salvate de tine la favorite.", cale: "/favorite/", h1: "Favorite", sub: "Ofertele pe care le-ai salvat în acest browser.", lista: [], noindex: true }) });
for (const p of PAGINI_LEGALE) pagini.push({ cale: p.cale, index: true, html: pagina({ titlu: `${p.titlu} – ${SITE_NAME}`, descriere: p.descriere, cale: p.cale, corp: p.corp(), simplu: true }) });

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
writeFileSync("dist/stil.css", CSS);
// index de cautare (citit de /cauta.js): campuri scurte, ordinea = cele mai mari reduceri primele
writeFileSync("dist/cauta-index.json", JSON.stringify({ m: Object.fromEntries(magazine.map((x) => [x.id, x.nume])), c: Object.fromEntries(categorii.map((x) => [x.slug, x.nume])), k: Object.fromEntries(magazine.filter((x) => x.cupon).map((x) => [x.id, x.cupon])), o: sortate.map((o) => ({ id: o.id, t: o.titlu, m: o.magazin, c: o.categorie, s: o.sub ?? "", p: o.pret, v: o.pretVechi > o.pret ? o.pretVechi : 0, r: o.referintaMagazin ? 1 : 0, u: o.url, i: /^https:\/\//.test(o.imagine ?? "") ? o.imagine : "" })) }));
for (const p of pagini) {
  const dir = "dist" + p.cale;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", p.html);
}
writeFileSync("dist/404.html", pagina({ titlu: `Pagină negăsită – ${SITE_NAME}`, descriere: "Pagina nu există.", cale: "/404.html", noindex: true, corp: '<h1>Pagina nu există</h1><p><a href="/">Înapoi la oferte</a></p>', simplu: true }));
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
