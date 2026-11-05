// Generează site-ul static Pretino în dist/. `--demo` folosește data/demo-oferte.json (doar pentru preview, niciodată publicat).
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, OPERATOR } from "../src/config.js";
import { PAGINI_LEGALE } from "./lib/legal.js";
import { esc, reducere } from "./lib/html.js";
import { clasifica, subcategoriiDe, tipuriDe } from "./lib/clasificare.js";
import { icoana } from "./lib/iconite.js";
import { PE_PAGINA, MIN_SUB_PAGINA, MIN_TIP_PAGINA, MIN_MAGAZIN_INDEX, ZILE_DATE_VECHI, BRAND, jos, metaAcasa, metaCategorie, metaSub, metaTip, metaComponente, metaMagazin, metaMarca, metaTop } from "../src/seo.js";
import { paginaGhid, CALE_GHID } from "./lib/ghid.js";
import { areScena, scena, areScenaSub, scenaSub } from "./lib/ilustratii.js";
import { GHIDURI, GHID_EXTRA, MIN_TOP, N_TOP, MIN_BRAND, marcaOfertei } from "./lib/continut.js";
import { MAX_ZILE as PCG_ZILE, REDUCERE_MAX as PCG_MAX } from "./surse/campanii.js";

const DEMO = process.argv.includes("--demo");
const citeste = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const categorii = citeste("categorii.json");
const magazine = citeste("magazine.json");
// doar oferte cu pret redus (pret vechi taiat + pret nou); categoria/subcategoria se corecteaza dupa titlu (lib/clasificare.js)
// magazinele cu „reducereMaxProcent” (ex. evoMAG 45%): reducerile mai mari nu sunt considerate reale si nu se afiseaza
const maxRed = Object.fromEntries(magazine.filter((m) => m.reducereMaxProcent).map((m) => [m.id, m.reducereMaxProcent]));
const reala = (o) => !maxRed[o.magazin] || (1 - o.pret / o.pretVechi) * 100 <= maxRed[o.magazin];
const fara = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const act = (() => { try { return citeste("actualizat.json"); } catch { return {}; } })();
// politica „date prea vechi”: ofertele unei surse neverificate cu succes de mai mult de ZILE_DATE_VECHI zile nu se afiseaza (doar cand exista data verificarii sursei)
const dataSursa = (sursa) => (act.surse?.[sursa] ? new Date(act.surse[sursa]) : null);
const prea_veche = (o) => { if (DEMO) return false; const d = dataSursa(o.sursa); return Boolean(d) && (Date.now() - d.getTime()) / 864e5 > ZILE_DATE_VECHI; };
const brut = citeste(DEMO ? "demo-oferte.json" : "oferte.json").filter((o) => o.pretVechi > o.pret && reala(o));
const ascunse_vechi = brut.filter(prea_veche).length;
// duplicate certe: acelasi magazin, acelasi titlu si aceleasi preturi
const vazutDup = new Set();
const oferte = brut.filter((o) => !prea_veche(o)).filter((o) => { const k = [o.magazin, fara(o.titlu).replace(/\s+/g, " ").trim(), o.pret, o.pretVechi].join("|"); if (vazutDup.has(k)) return false; vazutDup.add(k); return true; }).map((o) => ({ ...o, ...clasifica(o), marca: marcaOfertei(o.titlu) }));
const duplicate = brut.length - ascunse_vechi - oferte.length;
// conditie: resigilat / refurbished, afisata clar pe card
const conditie = (o) => (/resigilat|desigilat/i.test(o.titlu) ? 1 : /refurbished|renewed|recondi[tț]ionat/i.test(o.titlu) ? 2 : 0);
const COND = { 1: "Resigilat", 2: "Refurbished" };
const mag = Object.fromEntries(magazine.map((m) => [m.id, m]));
// data verificarii afisate: cea mai veche verificare reusita dintre sursele care au oferte pe site (data/actualizat.json -> surse); fallback: data globala, apoi ziua din istoric
let fataOra = false; // fara data exacta (doar ziua din istoric) nu se afiseaza o ora inventata
const dataActualizarii = (() => {
  const surseCuOferte = [...new Set(oferte.map((o) => o.sursa))].map(dataSursa).filter(Boolean);
  if (surseCuOferte.length) return new Date(Math.min(...surseCuOferte.map((d) => d.getTime())));
  try { const t = new Date(act.la); if (!isNaN(t)) return t; } catch {}
  fataOra = true;
  try { const z = Object.values(citeste("istoric-preturi.json")).flat().map((e) => e.d).sort().pop(); if (z) return new Date(`${z}T12:00:00+02:00`); } catch {}
  return null;
})();
const actualizatText = dataActualizarii && !DEMO ? `Prețuri actualizate: ${dataActualizarii.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "long", year: "numeric", ...(fataOra ? {} : { hour: "2-digit", minute: "2-digit" }) })}` : "";
const cat = Object.fromEntries(categorii.map((c) => [c.slug, c]));
const lei = (n) => `${Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;

const CSS = readFileSync(new URL("../src/stil.css", import.meta.url), "utf8");
// versiune pentru fisierele statice (stil.css, cauta.js): se schimba cand se schimba continutul, ca browserele sa nu foloseasca varianta veche din cache
const VER_ASSET = createHash("sha1").update(CSS + (existsSync("public/cauta.js") ? readFileSync("public/cauta.js", "utf8") : "") + (existsSync("public/ghid.js") ? readFileSync("public/ghid.js", "utf8") : "")).digest("hex").slice(0, 8);

// Script Profitshare „Linkuri automate" (cont Pretino, site validat): transforma linkurile catre magazinele partenere in linkuri de afiliere. Fara el, linkurile raman cele din catalog.
const PROFITSHARE_SCRIPT = `<!-- Start ProfitShare Zone --><script>(function(){var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="//l.profitshare.ro/files_shared/lps/js/AZC/NI.js?v=1793640493";(document.getElementsByTagName("head")[0]||document.getElementsByTagName("body")[0]).appendChild(s);})();</script><!-- End ProfitShare Zone -->`;
// tema: inchisa implicit (ca in design); alegerea utilizatorului se pastreaza local. Inline, ca sa nu apara „licarire” de tema.
const TEMA_INIT = `<script>try{var t=null;try{t=localStorage.getItem("pretino-tema")}catch(e){}if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute("content",t==="light"?"#ffffff":"#0a1916")}catch(e){}</script>`;

const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const abs = (cale) => `${SITE_URL}${cale}`;

// ---- liste si pagini derivate din catalog (ordine determinista: reducere desc, pret asc, id asc) ----
const sortate = [...oferte].sort((a, b) => reducere(b) - reducere(a) || a.pret - b.pret || String(a.id).localeCompare(String(b.id)));
const nrMag = (l) => new Set(l.map((o) => o.magazin)).size;
const numeMag = (id) => mag[id]?.nume ?? id;
const magCuOferte = magazine.filter((m) => sortate.some((o) => o.magazin === m.id));
const magIndexabil = (id) => sortate.filter((o) => o.magazin === id).length >= MIN_MAGAZIN_INDEX;

// ---- pagini editoriale: marci, topuri de economii, ghiduri (decise inainte de generare, ca sa existe linkurile din subsol si din liste) ----
const ec = (o) => o.pretVechi - o.pret;
const sortEc = (l) => [...l].sort((a, b) => ec(b) - ec(a) || String(a.id).localeCompare(String(b.id)));
const marci = new Map();
for (const o of sortate) if (o.marca) { const e = marci.get(o.marca.id) ?? { id: o.marca.id, nume: o.marca.nume, lista: [] }; e.lista.push(o); marci.set(e.id, e); }
const marciPagina = [...marci.values()].filter((x) => x.lista.length >= MIN_BRAND).sort((a, b) => b.lista.length - a.lista.length || a.nume.localeCompare(b.nume));
const topuri = [];
for (const c of categorii) {
  const l = sortate.filter((o) => o.categorie === c.slug);
  if (l.length >= MIN_TOP) topuri.push({ cale: `/top-oferte/${c.slug}/`, nume: jos(c.nume), cat: c, sub: null, lista: l });
  for (const s of subcategoriiDe(c.slug)) { const ls = l.filter((o) => o.sub === s.id); if (ls.length >= MIN_SUB_PAGINA) topuri.push({ cale: `/top-oferte/${c.slug}/${s.id}/`, nume: jos(s.nume), cat: c, sub: s, lista: ls }); }
}
for (const t of topuri) if (t.sub && topuri.filter((x) => x.nume === t.nume).length > 1) t.nume = `${t.nume} (${jos(t.cat.nume)})`;
const topDe = (cat, sub = null) => topuri.find((t) => t.cat.slug === cat && (t.sub?.id ?? null) === sub);

const FOOTER = () => `<footer><div class="f-marca"><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><img class="l-noapte" src="/logo-dark-antet.svg" alt="" width="190" height="35" loading="lazy"><img class="l-lumina" src="/logo-antet.svg" alt="" width="190" height="35" loading="lazy" aria-hidden="true"></a><p>Oferte și reduceri din magazinele din România, într-un singur loc.</p></div><nav class="legal" aria-label="Informații">${[...PAGINI_LEGALE.map((p) => ({ cale: p.cale, nume: p.nume })), { cale: CALE_GHID, nume: "Cum interpretăm reducerile" }, { cale: "/ghiduri/", nume: "Ghiduri" }, ...(topuri.length ? [{ cale: "/top-oferte/", nume: "Top economii" }] : []), ...(marciPagina.length ? [{ cale: "/branduri/", nume: "Branduri" }] : [])].map((p) => `<a href="${p.cale}">${esc(p.nume)}</a>`).join("")}</nav>
${magCuOferte.filter((m) => magIndexabil(m.id)).length ? `<nav class="magazine-f" aria-label="Magazine"><b>Magazine:</b>${magCuOferte.filter((m) => magIndexabil(m.id)).map((m) => `<a href="/magazin/${m.id}/">${esc(m.nume)}</a>`).join("")}<a href="/magazine/">Toate magazinele</a></nav>` : ""}<p class="f-legal">Pretino.ro afișează oferte din magazine partenere. Unele linkuri pot fi linkuri de afiliere (marcate sponsorizat), iar unele magazine ne oferă un cod de cupon pentru care putem primi comision; prețul pentru tine nu se schimbă. Unde apare „reducere afișată de magazin”, prețul vechi este cel de referință arătat de magazin, nu istoricul Pretino. Verifică mereu prețul final în magazin.</p></footer>`;

const antet = (catActiva) => `<header class="antet"><div class="antet-in">
<div class="rand1"><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><img class="l-noapte" src="/logo-dark-antet.svg" alt="${esc(SITE_NAME)}" width="190" height="35"><img class="l-lumina" src="/logo-antet.svg" alt="" width="190" height="35" aria-hidden="true"></a>
<form id="cautare" class="cauta" role="search" action="/cauta/" method="get"><label class="cauta-in"><span class="sr">Caută oferte</span>${icoana("cauta")}<input id="q" name="q" type="search" placeholder="Caută produse, magazine sau oferte…" autocomplete="off" enterkeyhint="search"></label><button type="submit">Caută</button><div id="sugestii" class="sugestii" hidden></div></form>
<div class="unelte"><a class="ibtn" id="fav-link" href="/favorite/" aria-label="Favorite">${icoana("inima")}<span class="nr" id="fav-nr" hidden>0</span></a><button class="ibtn" id="tema" type="button" aria-label="Schimbă tema (închisă / deschisă)"><span class="tema-luna">${icoana("luna")}</span><span class="tema-soare">${icoana("soare")}</span></button></div></div>
<nav class="cats" aria-label="Categorii">${categorii.map((c) => `<a href="/categorie/${c.slug}/" data-cat="${c.slug}"${c.slug === catActiva ? ' aria-current="page"' : ""}>${icoana(c.slug)}<span>${esc(c.nume)}</span></a>`).join("")}</nav></div></header>`;

// preconectare la CDN-urile pozelor de produs folosite chiar in pagina (primele 2 gazde)
function preconectari(corp) {
  if (!corp || !corp.includes('class="card"')) return "";
  const gazde = [];
  for (const m of corp.matchAll(/<img[^>]+src="https:\/\/([^\/"]+)/g)) if (!gazde.includes(m[1])) gazde.push(m[1]);
  return gazde.slice(0, 2).map((h) => `<link rel="preconnect" href="https://${h}" crossorigin>`).join("");
}

function pagina({ titlu, descriere, cale, corp, noindex = false, catActiva = null, simplu = false, schema = [] }) {
  const robots = noindex || DEMO ? '<meta name="robots" content="noindex">' : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="profitshareid" content="7dd842fc7074c28872c609438ead55e6"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${robots}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(SITE_NAME)}"><meta property="og:locale" content="ro_RO"><meta property="og:title" content="${esc(titlu)}"><meta property="og:description" content="${esc(descriere)}"><meta property="og:url" content="${abs(cale)}"><meta property="og:image" content="${abs("/og.png")}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(SITE_NAME)} – oferte și reduceri din magazinele din România"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titlu)}"><meta name="twitter:description" content="${esc(descriere)}"><meta name="twitter:image" content="${abs("/og.png")}">
<link rel="canonical" href="${abs(cale)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#0a1916"><meta name="color-scheme" content="dark light"><link rel="preload" href="/fonts/montserrat-var-latin.woff" as="font" type="font/woff" crossorigin>${preconectari(corp)}<link rel="stylesheet" href="/stil.css?v=${VER_ASSET}">${TEMA_INIT}<script src="/cauta.js?v=${VER_ASSET}" defer></script>${DEMO ? "" : PROFITSHARE_SCRIPT}${schema.map(jsonld).join("")}</head><body${catActiva ? ` data-cat="${esc(catActiva)}"` : ""}>
${DEMO ? '<div class="demo">PREVIEW cu date DEMO – nu este conținut real și nu se publică</div>' : ""}
${antet(catActiva)}
${simplu ? `<main class="simplu">${corp}</main>` : corp}
${FOOTER()}</body></html>`;
}

// poza produsului: URL-ul din feed-ul magazinului (hotlink); primele carduri (probabil LCP) nu se incarca lenes, restul da. Fara poza / eroare: zona ramane uniforma.
const areImg = (o) => /^https:\/\//.test(o.imagine ?? "");
// PC Garage serveaza in catalog miniaturi (/thumbnails/); cerem varianta mare, cu revenire automata la miniatura
const imgMare = (u) => (/^https:\/\/\d\.grgs\.ro\/images\/products\/.+\/thumbnails\//.test(u) ? u.replace("/thumbnails/", "/") : u);
const poza = (o, i) => { const mare = imgMare(o.imagine); const fb = mare !== o.imagine; return `<a class="poza${areImg(o) ? "" : " fara"}" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true">${areImg(o) ? `<img src="${esc(mare)}" alt="${esc(o.titlu)}" ${i < 4 ? (i === 0 ? 'fetchpriority="high" ' : "") : 'loading="lazy" '}decoding="async" referrerpolicy="no-referrer" width="275" height="167"${fb ? ` data-t="${esc(o.imagine)}"` : ""} onerror="${fb ? "if(this.dataset.t){this.src=this.dataset.t;delete this.dataset.t;return}" : ""}this.parentNode.classList.add('fara')">` : ""}</a>`; };
// cupon al magazinului (ex. PC Garage): afisat pe card, se introduce in cos; butonul copiaza codul (cauta.js). Pretul afisat NU include cuponul.
const cupon = (c) => c ? `<div class="cupon"><span>Cupon <b>${esc(c.cod)}</b> (${esc(c.text)}) în coș · prețul afișat nu îl include</span><button type="button" class="copiaza" data-cod="${esc(c.cod)}">Copiază</button></div>` : "";
// specificatii citite LITERAL din titlu (diagonala, memorie/stocare), doar la electronice; nu se deduce nimic
const specuri = (titlu, cat) => {
  if (cat !== "electronice") return [];
  const r = [], d = titlu.match(/(?<![\d.,])(\d{2}(?:[.,]\d)?)\s?(?:"|”|″|''|inch|inci)/i);
  if (d) r.push(d[1].replace(",", ".") + '"');
  for (const m of titlu.matchAll(/(?<![\d.,])(\d{1,4})\s?(GB|TB)\b/gi)) { const t = `${m[1]} ${m[2].toUpperCase()}`; if (!r.includes(t)) r.push(t); }
  return r.slice(0, 3);
};
const card = (o, i = 99) => {
  const r = reducere(o), c = conditie(o);
  return `<article class="card">${poza(o, i)}<span class="badge ${r >= 50 ? "t3" : r >= 30 ? "t2" : "t1"}">-${r}%</span><button class="fav" type="button" data-id="${esc(o.id)}" data-p="${o.pret}" aria-pressed="false" aria-label="Adaugă la favorite">${icoana("inima")}</button>
<a class="titlu" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(o.titlu)}</a>${(() => { const sp = specuri(o.titlu, o.categorie); return sp.length ? `<span class="specs">${sp.map((x) => `<i>${esc(x)}</i>`).join("")}</span>` : ""; })()}<span class="magazin"><a href="/magazin/${esc(o.magazin)}/">${esc(numeMag(o.magazin))}</a>${c ? `<span class="cond">${COND[c]}</span>` : ""}</span>
<div class="pretrand"><span class="pret">${lei(o.pret)}</span><span class="vechi"${o.referintaMagazin ? ' title="Preț de referință afișat de magazin"' : ""}>${lei(o.pretVechi)}</span><span class="econ">Economisești<b>${lei(o.pretVechi - o.pret)}</b></span></div>
${cupon(mag[o.magazin]?.cupon)}<a class="btn" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" aria-label="Vezi oferta la ${esc(numeMag(o.magazin))} (se deschide în magazin, fereastră nouă)" title="Se deschide în magazin">Vezi la ${esc(numeMag(o.magazin))} ${icoana("extern")}</a></article>`;
};

// ilustratia din dreapta titlului: placa cu pictograma categoriei (desenata de noi)
const ilustratie = (slug) => (/^scena-sub:/.test(slug) ? ((c, sb) => (areScenaSub(c, sb) ? `<div class="hero-poza hero-scena" aria-hidden="true">${scenaSub(c, sb)}</div>` : ilustratie(c)))(...slug.slice(10).split(":")) : areScena(slug) ? `<div class="hero-poza hero-scena" aria-hidden="true">${scena(slug)}</div>` : ilustratieIcon(slug.replace(/^tile:/, "")));
const ilustratieIcon = (slug) => `<div class="hero-poza" aria-hidden="true"><svg viewBox="0 0 290 170" fill="none"><defs><radialGradient id="g1" cx="50%" cy="60%" r="60%"><stop offset="0" style="stop-color:var(--c,#61e2c5)" stop-opacity=".32"/><stop offset="1" style="stop-color:var(--c,#61e2c5)" stop-opacity="0"/></radialGradient><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--c,#61e2c5) 26%,var(--ilu-a,#16322c))"/><stop offset="1" style="stop-color:var(--ilu-b,#0e231f)"/></linearGradient></defs><ellipse cx="145" cy="112" rx="138" ry="56" fill="url(#g1)"/><g transform="rotate(-9 92 82)"><rect x="52" y="44" width="92" height="84" rx="16" style="fill:var(--ilu-b,#0e231f);stroke:var(--c,#61e2c5)" stroke-opacity=".35"/></g><g transform="rotate(8 200 86)"><rect x="152" y="52" width="86" height="78" rx="15" style="fill:var(--ilu-b,#0e231f);stroke:var(--c,#61e2c5)" stroke-opacity=".3"/><path d="M168 76h40M168 90h26" style="stroke:var(--c,#61e2c5)" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/></g><rect x="82" y="26" width="112" height="108" rx="22" fill="url(#g2)" style="stroke:var(--c,#61e2c5)" stroke-opacity=".7" stroke-width="1.5"/><g transform="translate(103 49) scale(2.6)" style="stroke:var(--c,#61e2c5)" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" fill="none">${icoana(slug, "x").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g><g transform="translate(212 40)"><circle r="19" fill="#fdc950"/><text y="6.5" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-size="19" font-weight="800" fill="#2b2105">%</text></g><circle cx="58" cy="30" r="4" style="fill:var(--c,#61e2c5)" opacity=".75"/><circle cx="262" cy="118" r="3" style="fill:var(--c,#61e2c5)" opacity=".6"/><path d="M40 112l4 4m0-4-4 4" style="stroke:var(--c,#61e2c5)" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></svg></div>`;


const adrPagina = (cale, p) => (p <= 1 ? cale : `${cale}pagina-${p}/`);
// linkuri HTML reale catre paginile listei (functioneaza fara JavaScript); JS le ascunde cand trece pe filtrare in browser
function navPagini(cale, p, n) {
  if (n < 2) return "";
  const nrs = [...new Set([1, p - 2, p - 1, p, p + 1, p + 2, n].filter((x) => x >= 1 && x <= n))].sort((a, b) => a - b);
  const bucati = [];
  nrs.forEach((x, i) => { if (i && x - nrs[i - 1] > 1) bucati.push('<span class="gol" aria-hidden="true">…</span>'); bucati.push(x === p ? `<span aria-current="page">${x}</span>` : `<a href="${adrPagina(cale, x)}" aria-label="Pagina ${x}">${x}</a>`); });
  return `<nav class="pagini" aria-label="Pagini de oferte">${p > 1 ? `<a rel="prev" href="${adrPagina(cale, p - 1)}">‹ Înapoi</a>` : ""}${bucati.join("")}${p < n ? `<a rel="next" href="${adrPagina(cale, p + 1)}">Înainte ›</a>` : ""}</nav>`;
}

// Genereaza TOATE paginile unei liste (pagina 1 + /pagina-N/). Filtrarea completa ruleaza in browser (cauta.js) pe cauta-index.json,
// dar fiecare pagina are in HTML produsele ei, titlu, H1, breadcrumb si canonical propriu.
function listare({ mod, meta, cale, catSlug = null, magId = null, subId = null, tipId = null, lista, indexabil = true, ilustr = null, migaje = [], chips = "", subRute = [], schemaAcasa = false, brandId = null, extra = "", dupa = "" }) {
  const pretMax = Math.max(10, ...lista.map((o) => o.pret));
  const pasMax = pretMax <= 500 ? Math.ceil(pretMax / 10) * 10 : pretMax <= 5000 ? Math.ceil(pretMax / 100) * 100 : Math.ceil(pretMax / 1000) * 1000;
  const magazineLista = [...new Set(lista.map((o) => o.magazin))].map((id) => ({ id, nume: numeMag(id), n: lista.filter((o) => o.magazin === id).length })).sort((a, b) => b.n - a.n);
  const nPagini = Math.max(1, Math.ceil(lista.length / PE_PAGINA));
  const out = [];
  for (let p = 1; p <= nPagini; p++) {
    const adr = adrPagina(cale, p), m = meta(p);
    const felie = lista.slice((p - 1) * PE_PAGINA, p * PE_PAGINA);
    const date = JSON.stringify({ mod, cat: catSlug, mag: magId, brand: brandId, sub: subId, tip: tipId, max: pasMax, pagina: p, pe: PE_PAGINA, total: lista.length, fin: Math.min(p * PE_PAGINA, lista.length), baza: cale, subRute }).replace(/</g, "\\u003c");
    const trasa = [...migaje, { nume: mod === "acasa" ? "Acasă" : m.h1 }];
    const miez = mod === "acasa" ? `<span>Acasă</span>` : migaje.map((x) => `<a href="${x.cale}">${esc(x.nume)}</a><span aria-hidden="true">/</span>`).join("") + `<span id="migaja-curenta">${esc(m.migaja)}</span>`;
    const schema = [];
    if (mod === "acasa" && p === 1) schema.push({ "@context": "https://schema.org", "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: BRAND, alternateName: SITE_NAME, inLanguage: "ro-RO", publisher: { "@id": `${SITE_URL}/#org` } },
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png`, email: OPERATOR.email },
    ] });
    if (mod !== "acasa" && mod !== "cauta" && mod !== "favorite") schema.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ name: "Acasă", cale: "/" }, ...migaje.slice(1).map((x) => ({ name: x.nume, cale: x.cale })), { name: m.migaja, cale: adr }].map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name ?? x.nume, item: abs(x.cale) })) });
    const corp = `<main data-lista='${date}'>
<nav class="migaje" aria-label="Navigare">${miez}</nav>
<div class="hero${mod === "acasa" ? " hero-acasa" : ""}"><div><h1 id="h1">${esc(m.h1)}</h1>${p === 1 && m.intro ? `<p class="intro" id="sub-titlu">${esc(m.intro)}</p>` : '<p class="intro" id="sub-titlu"></p>'}${actualizatText ? `<details class="actualizat info-pret"><summary><time datetime="${dataActualizarii.toISOString()}">${esc(actualizatText)}</time><span class="i" aria-hidden="true">i</span><span class="sr"> – detalii</span></summary><p>Prețurile se pot schimba în magazin; verifică prețul final pe pagina magazinului. <a href="${CALE_GHID}">Cum interpretăm reducerile</a></p></details>` : ""}</div>${ilustr ? ilustratie(ilustr) : mod === "acasa" ? statisticiHome() : ""}</div>
${chips ? `<div class="subcats" role="group" aria-label="Subcategorii">${chips}</div>` : '<div class="subcats-gol"></div>'}${extra}
<div class="cont">
<aside class="filtre" id="filtre" aria-label="Filtre"><button class="filtre-x" type="button" id="filtre-x" aria-label="Închide filtrele">${icoana("x")}</button>
<h2 class="filtre-cap">${icoana("filtre")}Filtre</h2>
${magId ? "" : `<details class="fsec" open><summary>Magazine ${icoana("sus")}</summary><div id="f-mag">${magazineLista.map((x) => `<label class="opt"><input type="checkbox" name="m" value="${esc(x.id)}"><span>${esc(x.nume)}</span><span class="nr">${x.n}</span></label>`).join("")}</div></details>`}
<details class="fsec" open><summary>Preț ${icoana("sus")}</summary><div class="pret-slider"><div class="pista"></div><div class="umplere" id="umplere"></div><input type="range" id="p-min-r" min="0" max="${pasMax}" step="1" value="0" aria-label="Preț minim"><input type="range" id="p-max-r" min="0" max="${pasMax}" step="1" value="${pasMax}" aria-label="Preț maxim"></div>
<div class="pret-in"><label><span>Min. (lei)</span><input type="number" id="p-min" min="0" max="${pasMax}" value="0" inputmode="numeric"></label><i>–</i><label><span>Max. (lei)</span><input type="number" id="p-max" min="0" max="${pasMax}" value="${pasMax}" inputmode="numeric"></label></div></details>
<details class="fsec" open><summary>Reducere ${icoana("sus")}</summary><div id="f-red"><label class="opt"><input type="radio" name="red" value="0" checked><span>Orice reducere</span></label>${[20, 30, 40, 50].map((x) => `<label class="opt"><input type="radio" name="red" value="${x}"><span>Minim ${x}%</span></label>`).join("")}</div></details>
<details class="fsec" open><summary>Condiție ${icoana("sus")}</summary><div><label class="opt"><input type="checkbox" name="nou" id="f-nou"><span>Doar produse noi (fără resigilate sau refurbished)</span></label></div></details>
<button class="reset" type="button" id="reset">${icoana("reset")}Resetează filtrele</button><button class="aplica" type="button" id="aplica">Vezi <span id="nr-aplica">${lista.length}</span> oferte</button></aside>
<section aria-live="polite"><div class="rez-cap"><h2>Oferte disponibile<small id="nr-rez">${lista.length} oferte</small></h2>
<div class="sort"><button class="btn-filtre" type="button" id="btn-filtre">${icoana("filtre")}Filtre<span class="cnt" id="cnt-filtre" hidden></span></button><label class="sort-et" for="sortare">Sortează după:</label><select id="sortare" aria-label="Sortează ofertele după"><option value="red">Reducere mare</option><option value="econ">Economie mare</option><option value="pret-cresc">Preț mic → mare</option><option value="pret-desc">Preț mare → mic</option></select></div></div>
<div class="active" id="active" aria-label="Filtre active" hidden></div>
<div class="grid" id="lista">${felie.map((o, i) => card(o, i)).join("")}</div>
<div class="rez-gol" id="rez-gol" ${lista.length ? "hidden" : ""}><b>Nu am găsit oferte</b>Încearcă alte filtre sau o altă căutare.</div>
<div id="compara" class="compara" hidden></div>
<button id="mai" type="button" hidden>Arată mai multe</button>${navPagini(cale, p, nPagini)}</section></div>${p === 1 ? dupa : ""}<div class="vala" id="vala" hidden></div></main>`;
    out.push({ cale: adr, index: indexabil, html: pagina({ titlu: m.titlu, descriere: p > 1 ? `${m.descriere} Pagina ${p} din ${nPagini}.` : m.descriere, cale: adr, corp, noindex: !indexabil, catActiva: catSlug, schema }) });
  }
  return out;
}

// pagina de utilitate (cautare / favorite): noindex, fara paginare (listele se construiesc in browser)
const utilitar = ({ mod, cale, titlu, h1, intro, descriere }) => listare({ mod, meta: () => ({ titlu, h1, intro, descriere, migaja: h1 }), cale, lista: [], indexabil: false, migaje: [{ nume: "Acasă", cale: "/" }] });

const pagini = []; // { cale, html, index }
const chipLink = (href, ic, nume, activ, extra = "") => `<a class="chip"${extra} href="${href}"${activ ? ' aria-current="page"' : ""}>${ic ? icoana(ic) : ""}${esc(nume)}</a>`;


// statistici afisate pe prima pagina: calculate din catalogul real (nimic inventat)
const statisticiHome = () => {
  const maxR = Math.max(0, ...sortate.map((o) => reducere(o)));
  const t = [[oferte.length.toLocaleString("ro-RO"), "oferte în catalog"], [String(magCuOferte.length), magCuOferte.length === 1 ? "magazin" : "magazine"], ...(maxR ? [[`-${maxR}%`, "cea mai mare reducere"]] : [])];
  return `<ul class="hero-stat" aria-label="Pretino în cifre">${t.map(([n, e]) => `<li><b>${esc(n)}</b><span>${esc(e)}</span></li>`).join("")}</ul>`;
};
// pagini publicate (aceleasi praguri ca la generare): subcategorie / tip de produs
const subPublicata = (cat, sub) => sortate.filter((o) => o.categorie === cat && o.sub === sub).length >= MIN_SUB_PAGINA;
const tipPublicat = (cat, sub, tip) => subPublicata(cat, sub) && sortate.filter((o) => o.categorie === cat && o.sub === sub && o.tip === tip).length >= MIN_TIP_PAGINA;
// acces compact din prima pagina spre categoriile comerciale principale (numai paginile care exista)
const ACCES_HOME = [["electronice/laptopuri", "Laptopuri la ofertă"], ["electronice/componente", "Componente PC la ofertă"], ["electronice/monitoare-tv/monitoare", "Monitoare la ofertă"], ["electronice/periferice", "Periferice la reducere"]];
const existaAcces = (c) => { const [cat, sub, tip] = c.split("/"); return tip ? tipPublicat(cat, sub, tip) : subPublicata(cat, sub); };
// ---- blocul „Descopera”: legaturi interne catre ghiduri, topuri si marci (home si categorii) ----
const linkuriDescopera = (cat = null) => {
  const g = GHIDURI.filter((x) => !cat || x.cat === cat || !x.cat);
  const t = cat ? [topDe(cat), ...topuri.filter((x) => x.cat.slug === cat && x.sub)].filter(Boolean).slice(0, 4) : topuri.filter((x) => !x.sub).slice(0, 5);
  const m = marciPagina.slice(0, cat ? 0 : 8);
  const grup = (eticheta, l) => (l.length ? `<span class="d-grup"><b>${eticheta}</b>${l.join("")}</span>` : "");
  return `<nav class="descopera" aria-label="Descoperă"><details open><summary>Descoperă mai mult</summary>${cat ? "" : grup("Descoperă oferte:", ACCES_HOME.filter(([c]) => existaAcces(c)).map(([c, n]) => `<a href="/categorie/${c}/">${esc(n)}</a>`).concat(magCuOferte.some((m) => magIndexabil(m.id)) ? [`<a class="mare" href="/magazine/">Magazine cu oferte</a>`] : []))}${grup("Top economii:", t.map((x) => `<a${x.sub || !cat ? "" : ' class="mare"'} href="${x.cale}">${esc(x.sub ? x.nume : cat ? "Toată categoria" : x.cat.nume)}</a>`))}${grup("Ghiduri:", g.slice(0, 3).map((x) => `<a href="/ghiduri/${x.slug}/">${esc(x.titlu)}</a>`).concat([`<a class="mare" href="/ghiduri/">Toate ghidurile</a>`]))}${grup("Branduri:", m.map((x) => `<a href="/brand/${x.id}/">${esc(x.nume)}</a>`).concat(m.length ? [`<a class="mare" href="/branduri/">Toate brandurile</a>`] : []))}</details></nav>`;
};
const dataRo = (iso) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const migajeHtml = (items) => `<nav class="migaje" aria-label="Navigare">${items.map((x, i) => (i < items.length - 1 ? `<a href="${x.cale}">${esc(x.nume)}</a><span aria-hidden="true">/</span>` : `<span id="migaja-curenta">${esc(x.nume)}</span>`)).join("")}</nav>`;
const schemaMigaje = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.nume, item: abs(x.cale) })) });
const gridCards = (l) => `<div class="grid">${l.map((o, i) => card(o, i)).join("")}</div>`;
function paginaEd({ cale, titlu, descriere, migaje, corp, schema = [], catActiva = null }) {
  pagini.push({ cale, index: true, html: pagina({ titlu, descriere, cale, catActiva, schema: [schemaMigaje(migaje), ...schema], corp: `<main class="continut">${migajeHtml(migaje)}${corp}</main>` }) });
}

// Acasa
pagini.push(...listare({ mod: "acasa", meta: (p) => ({ ...metaAcasa(p), migaja: "Acasă" }), cale: "/", lista: sortate, indexabil: oferte.length > 0, extra: linkuriDescopera() }));

// Categorii + subcategorii (pagini proprii pentru subcategoriile cu inventar suficient)
const TIP_GHID = { monitoare: "cum-alegi-un-monitor", mouse: "cum-alegi-un-mouse-sau-o-tastatura-gaming", tastaturi: "cum-alegi-un-mouse-sau-o-tastatura-gaming", ssd: "cum-alegi-un-ssd", aspiratoare: "cum-alegi-un-aspirator" };
const subPagini = []; // pentru sitemap / teste
const tipPagini = []; // pagini pe tip de produs (ex. /categorie/electronice/periferice/mouse/)
const numeSubDeMaiMulteOri = (() => { const c = {}; for (const cc of categorii) for (const s of subcategoriiDe(cc.slug)) if (sortate.filter((o) => o.categorie === cc.slug && o.sub === s.id).length >= MIN_SUB_PAGINA) c[s.nume] = (c[s.nume] ?? 0) + 1; return new Set(Object.keys(c).filter((k) => c[k] > 1)); })();
for (const c of categorii) {
  const l = sortate.filter((o) => o.categorie === c.slug);
  if (!l.length) continue;
  const cale = `/categorie/${c.slug}/`;
  const subs = subcategoriiDe(c.slug).map((s) => ({ ...s, lista: l.filter((o) => o.sub === s.id) })).filter((s) => s.lista.length > 0);
  const rutate = subs.filter((s) => s.lista.length >= MIN_SUB_PAGINA);
  const chipuriParinte = subs.length ? chipLink(cale, null, "Toate", true, ' data-sub=""') + subs.map((s) => (rutate.includes(s) ? chipLink(`${cale}${s.id}/`, s.icoana, s.nume, false) : chipLink(`${cale}?sub=${s.id}`, s.icoana, s.nume, false, ` data-sub="${s.id}" rel="nofollow"`))).join("") : "";
  pagini.push(...listare({ mod: "categorie", meta: (p) => ({ ...metaCategorie(c, nrMag(l), p), migaja: c.nume }), cale, catSlug: c.slug, lista: l, ilustr: c.slug, migaje: [{ nume: "Acasă", cale: "/" }], chips: chipuriParinte, subRute: rutate.map((s) => s.id), extra: linkuriDescopera(c.slug) }));
  for (const s of rutate) {
    const caleS = `${cale}${s.id}/`;
    const chipuriSub = chipLink(cale, null, "Toate", false) + rutate.map((x) => chipLink(`${cale}${x.id}/`, x.icoana, x.nume, x === s)).join("");
    subPagini.push(caleS);
    // tipuri de produs cu pagina proprie (doar cu inventar suficient); pagina subcategoriei ramane directorul cu toate ofertele
    const tipuri = tipuriDe(c.slug, s.id).map((t) => ({ ...t, lista: s.lista.filter((o) => o.tip === t.id) })).filter((t) => t.lista.length >= MIN_TIP_PAGINA);
    const extraTipuri = tipuri.length ? `<nav class="descopera" aria-label="Tipuri de produse"><details open><summary>Alege tipul de produs</summary><span class="d-grup"><b>Tipuri:</b>${tipuri.map((t) => `<a href="${caleS}${t.id}/">${esc(t.nume)} la ofertă</a>`).join("")}</span></details></nav>` : "";
    const metaSubFinal = (p) => (c.slug === "electronice" && s.id === "componente" && tipuri.length ? { ...metaSub(c, s, nrMag(s.lista), p), ...metaComponente(tipuri, p), migaja: s.nume } : { ...metaSub(c, s, nrMag(s.lista), p, numeSubDeMaiMulteOri.has(s.nume)), migaja: s.nume });
    pagini.push(...listare({ mod: "categorie", meta: metaSubFinal, cale: caleS, catSlug: c.slug, subId: s.id, lista: s.lista, ilustr: `scena-sub:${c.slug}:${s.id}`, migaje: [{ nume: "Acasă", cale: "/" }, { nume: c.nume, cale }], chips: chipuriSub, extra: extraTipuri }));
    const ghidTip = (id) => { const slug = TIP_GHID[id]; const g = slug && GHIDURI.find((x) => x.slug === slug); return g ? `<nav class="descopera" aria-label="Ghid"><details open><summary>Ghid de cumpărare</summary><span class="d-grup"><a href="/ghiduri/${g.slug}/">${esc(g.titlu)}</a></span></details></nav>` : ""; };
    for (const t of tipuri) {
      const caleT = `${caleS}${t.id}/`;
      tipPagini.push(caleT);
      const chipuriTip = chipLink(caleS, null, `Toate: ${s.nume}`, false) + tipuri.map((x) => chipLink(`${caleS}${x.id}/`, null, x.nume, x === t)).join("");
      pagini.push(...listare({ mod: "categorie", meta: (p) => metaTip(c, s, t, nrMag(t.lista), t.lista.length, p), cale: caleT, catSlug: c.slug, subId: s.id, tipId: t.id, lista: t.lista, migaje: [{ nume: "Acasă", cale: "/" }, { nume: c.nume, cale }, { nume: s.nume, cale: caleS }], chips: chipuriTip, extra: ghidTip(t.id) }));
    }
  }
}
// Magazine (pagina ramane accesibila si cu putine oferte, dar indexabila doar de la MIN_MAGAZIN_INDEX oferte)
for (const m of magazine) {
  const l = sortate.filter((o) => o.magazin === m.id);
  if (!l.length) continue;
  // legaturi catre categoriile si brandurile prezente la acest magazin (doar pagini publicate, fara pagini automate pentru intersectii)
  const subM = []; for (const cc of categorii) for (const ss of subcategoriiDe(cc.slug)) { const n = l.filter((o) => o.categorie === cc.slug && o.sub === ss.id).length; if (n >= 3 && subPublicata(cc.slug, ss.id)) subM.push({ cale: `/categorie/${cc.slug}/${ss.id}/`, nume: ss.nume, n }); }
  const brM = marciPagina.map((b) => ({ ...b, n: l.filter((o) => o.marca?.id === b.id).length })).filter((b) => b.n >= 3).sort((a, b) => b.n - a.n).slice(0, 6);
  const legM = [...subM.sort((a, b) => b.n - a.n).slice(0, 6).map((x) => `<a href="${x.cale}">${esc(x.nume)} la ofertă</a>`), ...brM.map((b) => `<a href="/brand/${b.id}/">Oferte ${esc(b.nume)}</a>`)];
  const cuponM = m.cupon ? `<section class="cupon-info" id="cod-reducere"><h2>Cod de reducere ${esc(m.nume)}: cum îl folosești</h2><p>Codul afișat pe cardurile ${esc(m.nume)} este <b>${esc(m.cupon.cod)}</b> (${esc(m.cupon.text)}). Se introduce în coș, la finalizarea comenzii; prețul afișat în Pretino nu îl include.</p><p>Codul este disponibil de verificat în coș: ${esc(m.nume)} stabilește produsele eligibile, excluderile și dacă se poate cumula cu alte reduceri, așa că verifică în coș dacă se aplică produsului tău. Pretino nu garantează aplicarea lui la toate produsele. Putem primi un comision pentru comenzile făcute cu acest cod; prețul pentru tine nu se schimbă.</p></section>` : "";
  const dupaM = `${legM.length ? `<nav class="descopera" aria-label="Categorii și branduri"><details open><summary>Ce găsești la ${esc(m.nume)}</summary><span class="d-grup">${legM.join("")}</span></details></nav>` : ""}${cuponM}`;
  pagini.push(...listare({ mod: "magazin", meta: (p) => ({ ...metaMagazin(m, l.length, p), migaja: m.nume }), cale: `/magazin/${m.id}/`, magId: m.id, lista: l, indexabil: l.length >= MIN_MAGAZIN_INDEX, migaje: [{ nume: "Acasă", cale: "/" }], dupa: dupaM }));
}

// Director magazine: doar magazinele cu pagina indexabila (politica de utilitate: sub MIN_MAGAZIN_INDEX oferte pagina ramane accesibila, dar nepromovata)
{ const mi = magCuOferte.filter((m) => magIndexabil(m.id));
  if (mi.length) paginaEd({ cale: "/magazine/", titlu: `Magazine cu oferte – reduceri din magazine online | ${BRAND}`, descriere: "Magazinele din care Pretino adună oferte: alege un magazin și vezi reducerile lui actuale. Prețul final se verifică în magazin.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Magazine", cale: "/magazine/" }],
    corp: `<h1>Magazine cu oferte</h1><p class="intro">Pretino nu vinde produse: adună oferte din magazinele de mai jos și te trimite în magazin, unde verifici prețul final și condițiile.</p><ul class="lista-linkuri">${mi.map((m) => `<li><a href="/magazin/${m.id}/">Oferte ${esc(m.nume)}</a> <span>${sortate.filter((o) => o.magazin === m.id).length} oferte</span></li>`).join("")}</ul>` }); }

// Marci: pagina proprie (cu filtre) pentru marcile cu destule oferte + pagina director
for (const b of marciPagina) pagini.push(...listare({ mod: "brand", brandId: b.id, meta: (p) => ({ ...metaMarca(b.nume, b.lista.length, nrMag(b.lista), p), migaja: b.nume }), cale: `/brand/${b.id}/`, lista: b.lista, migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Branduri", cale: "/branduri/" }] }));
if (marciPagina.length) paginaEd({ cale: "/branduri/", titlu: `Oferte pe branduri – reduceri la produse de marcă | ${BRAND}`, descriere: "Alege un brand și vezi ofertele curente din magazinele din România: reduceri la produse de la mărcile cele mai căutate.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Branduri", cale: "/branduri/" }],
  corp: `<h1>Oferte pe branduri</h1><p class="intro">Alege un brand ca să vezi ofertele lui din magazinele din România. Afișăm doar mărcile pentru care avem suficiente oferte în catalog.</p><ul class="lista-linkuri">${marciPagina.map((b) => `<li><a href="/brand/${b.id}/">${esc(b.nume)}</a> <span>${b.lista.length} oferte</span></li>`).join("")}</ul>` });

// Top economii: cele mai mari economii in lei pe categorie / subcategorie (alt criteriu decat lista implicita, care e dupa procent)
for (const t of topuri) {
  const m = metaTop(t.nume), l = sortEc(t.lista), top = l.slice(0, N_TOP);
  const medie = Math.round(t.lista.reduce((a, o) => a + reducere(o), 0) / t.lista.length);
  const caleLista = t.sub ? `/categorie/${t.cat.slug}/${t.sub.id}/` : `/categorie/${t.cat.slug}/`;
  const listaIndex = !t.sub || subPagini.includes(caleLista);
  const gh = GHIDURI.filter((g) => g.cat === t.cat.slug && (!t.sub || g.sub === t.sub.id));
  paginaEd({ cale: t.cale, titlu: m.titlu, descriere: m.descriere, catActiva: t.cat.slug, migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Top economii", cale: "/top-oferte/" }, { nume: t.nume, cale: t.cale }],
    corp: `<h1>${esc(m.h1)}</h1><p class="intro">Ofertele cu cea mai mare economie în lei la ${esc(t.nume)}, din ${nrMag(t.lista)} ${nrMag(t.lista) === 1 ? "magazin" : "magazine"}. Economia este diferența dintre prețul de referință și prețul afișat; verifică prețul final în magazin.</p>
${actualizatText ? `<p class="actualizat">${esc(actualizatText)}</p>` : ""}<p class="stat-linie"><b>${t.lista.length}</b> oferte în catalog · reducere medie <b>${medie}%</b> · cea mai mare economie <b>${lei(ec(top[0]))}</b></p>
${gridCards(top)}<p class="legaturi">${listaIndex ? `<a class="mare" href="${caleLista}">Vezi toate ofertele la ${esc(t.nume)}</a>` : `<a class="mare" href="/categorie/${t.cat.slug}/?sub=${t.sub.id}">Vezi toate ofertele la ${esc(t.nume)}</a>`}${gh.map((g) => `<a href="/ghiduri/${g.slug}/">${esc(g.titlu)}</a>`).join("")}<a href="${CALE_GHID}">Cum interpretăm reducerile</a></p>` });
}
if (topuri.length) paginaEd({ cale: "/top-oferte/", titlu: `Top economii – cele mai mari reduceri în lei | ${BRAND}`, descriere: "Topuri cu ofertele cu cea mai mare economie în lei, pe categorii: alege categoria și vezi diferențele dintre prețul de referință și prețul afișat.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Top economii", cale: "/top-oferte/" }],
  corp: `<h1>Top economii</h1><p class="intro">Alege o categorie ca să vezi ofertele cu cea mai mare economie în lei. Pentru lista completă, cu filtre după magazin, preț și reducere, intră în categoria respectivă.</p>${categorii.map((c) => ({ c, l: topuri.filter((t) => t.cat.slug === c.slug) })).filter((x) => x.l.length).map((x) => `<h2>${esc(x.c.nume)}</h2><ul class="lista-linkuri">${x.l.map((t) => `<li><a href="${t.cale}">${esc(t.sub ? t.nume : "Toată categoria")}</a> <span>${t.lista.length} oferte</span></li>`).join("")}</ul>`).join("")}` });

// Ghiduri de cumparare: material original; „oferte relevante” se iau live din catalog
const ofGhid = (g) => sortEc(g.sub ? sortate.filter((o) => o.categorie === g.cat && o.sub === g.sub && (g.slug !== "cum-alegi-un-monitor" || /monitor/i.test(o.titlu)) && (!g.tip || o.tip === g.tip)) : g.slug === "produse-resigilate-si-refurbished" ? sortate.filter((o) => conditie(o)) : []);
const slugH = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const minCitit = (g) => Math.max(1, Math.round((g.intro + " " + g.sectiuni.map((x) => x.h + " " + x.p.join(" ")).join(" ")).split(/\s+/).length / 200));
const CASETA = { tip: ["Sfat", "tip"], atentie: ["Atenție", "atentie"] };
const tabelGhid = (t) => `<div class="ghid-tabel"><table><caption>${esc(t.titlu)}</caption><thead><tr>${t.cap.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.randuri.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table>${t.nota ? `<p class="nota">${esc(t.nota)}</p>` : ""}</div>`;
const calculatorHtml = `<section class="ghid-calc" id="calculator" data-calc><h2>Calculator: cât economisești de fapt</h2><p class="intro">Introdu prețul de referință, prețul afișat și costul transportului. Vezi reducerea reală, cu tot cu livrare.</p><div class="calc-camp"><label>Preț de referință (lei)<input type="number" inputmode="decimal" min="0" step="any" data-c="vechi" placeholder="ex. 1000"></label><label>Preț afișat (lei)<input type="number" inputmode="decimal" min="0" step="any" data-c="nou" placeholder="ex. 800"></label><label>Transport (lei)<input type="number" inputmode="decimal" min="0" step="any" data-c="transp" placeholder="0"></label></div><div class="calc-rez" data-rez role="status" aria-live="polite">Completează cele două prețuri ca să vezi rezultatul.</div></section>`;
const checklistHtml = (c, slug) => `<section class="ghid-check" id="checklist" data-check="${esc(slug)}"><h2>${esc(c.titlu)}</h2><p class="check-prog" data-prog aria-live="polite">0 din ${c.pasi.length} bifate</p><ul>${c.pasi.map((x, i) => `<li><label><input type="checkbox" data-i="${i}"> <span>${esc(x)}</span></label></li>`).join("")}</ul></section>`;
const faqHtml = (f) => `<section class="ghid-faq" id="intrebari"><h2>Întrebări frecvente</h2>${f.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</section>`;
const LEG_GHID = { "cum-alegi-un-laptop-la-oferta": [["electronice/laptopuri", "Vezi laptopurile la ofertă"], ["electronice/componente/ssd", "SSD-uri la ofertă"]], "cum-alegi-un-monitor": [["electronice/monitoare-tv/monitoare", "Monitoare la ofertă"]], "cum-alegi-un-mouse-sau-o-tastatura-gaming": [["electronice/periferice/mouse", "Oferte la mouse-uri"], ["electronice/periferice/tastaturi", "Oferte la tastaturi"]] };
for (const g of GHIDURI) {
  const ex = GHID_EXTRA[g.slug] ?? {}, toate = ofGhid(g), cale = `/ghiduri/${g.slug}/`;
  const inline = ex.oferteDupa !== undefined ? toate.slice(0, 3) : [], rel = toate.slice(inline.length, inline.length + 4);
  const caleSub = g.tip && tipPublicat(g.cat, g.sub, g.tip) ? `/categorie/${g.cat}/${g.sub}/${g.tip}/` : g.sub ? (subPagini.includes(`/categorie/${g.cat}/${g.sub}/`) ? `/categorie/${g.cat}/${g.sub}/` : `/categorie/${g.cat}/`) : null;
  const t = g.sub ? topDe(g.cat, g.sub) : null;
  const ids = g.sectiuni.map((x) => slugH(x.h));
  const cuprins = [...g.sectiuni.map((x, i) => ({ id: ids[i], n: x.h })), ...(ex.calculator ? [{ id: "calculator", n: "Calculator reducere" }] : []), ...(ex.checklist ? [{ id: "checklist", n: ex.checklist.titlu }] : []), ...(ex.faq ? [{ id: "intrebari", n: "Întrebări frecvente" }] : []), ...(rel.length ? [{ id: "oferte-acum", n: "Oferte relevante acum" }] : [])];
  const surori = [...GHIDURI.filter((x) => x !== g && x.cat === g.cat && g.cat), ...GHIDURI.filter((x) => x !== g && !(x.cat === g.cat && g.cat))];
  const sectiuni = g.sectiuni.map((x, i) => `<section class="ghid-sec" id="${ids[i]}"><h2>${esc(x.h)}</h2>${x.p.map((tx) => `<p>${esc(tx)}</p>`).join("")}${(ex.casete?.[i] ?? []).map((c) => `<aside class="caseta ${CASETA[c.t][1]}"><b>${CASETA[c.t][0]}</b><p>${esc(c.x)}</p></aside>`).join("")}${ex.tabel && ex.tabel.dupa === i ? tabelGhid(ex.tabel) : ""}${inline.length && ex.oferteDupa === i ? `<div class="ghid-inline"><h3>Din catalog acum</h3>${gridCards(inline)}</div>` : ""}</section>`).join("");
  const faqSchema = ex.faq ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: ex.faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }] : [];
  paginaEd({ cale, titlu: `${g.titlu} | ${BRAND}`, descriere: g.descriere, catActiva: g.cat, migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Ghiduri", cale: "/ghiduri/" }, { nume: g.titlu, cale }],
    schema: [{ "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.descriere, inLanguage: "ro-RO", datePublished: g.data, dateModified: g.data, mainEntityOfPage: abs(cale), author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` }, publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } } }, ...faqSchema],
    corp: `<div class="hero ghid-hero"><div><h1>${esc(g.h1)}</h1><p class="intro">${esc(g.intro)}</p><p class="actualizat">Publicat pe ${dataRo(g.data)} · ${minCitit(g)} min de citit. Ghidul este informativ și nu înlocuiește specificațiile și condițiile din pagina magazinului.</p></div>${ilustratie(ex.icoana ?? g.cat ?? "cos")}</div>
${ex.verdict ? `<aside class="caseta verdict"><b>Pe scurt</b><p>${esc(ex.verdict)}</p></aside>` : ""}
<div class="ghid-lay"><nav class="cuprins" aria-label="Cuprins"><details open><summary>Cuprins</summary><ol>${cuprins.map((c) => `<li><a href="#${c.id}">${esc(c.n)}</a></li>`).join("")}</ol></details></nav>
<div class="ghid-corp"><article class="ghid">${sectiuni}</article>
${ex.calculator ? calculatorHtml : ""}${ex.checklist ? checklistHtml(ex.checklist, g.slug) : ""}${ex.faq ? faqHtml(ex.faq) : ""}
${rel.length ? `<section id="oferte-acum"><h2>Oferte relevante acum</h2><p class="intro">Cele mai mari economii în lei din catalog${g.sub ? "" : ", la produsele resigilate sau refurbished"}. Verifică întotdeauna prețul final și condițiile în magazin.</p>${gridCards(rel)}<p class="legaturi">${caleSub ? `<a class="mare" href="${caleSub}">Vezi toate ofertele</a>` : ""}${t ? `<a href="${t.cale}">Top economii la ${esc(t.nume)}</a>` : ""}</p></section>` : ""}
${(LEG_GHID[g.slug] ?? []).filter(([c]) => existaAcces(c)).length ? `<section><h2>Oferte pe tip de produs</h2>${g.slug === "cum-alegi-un-laptop-la-oferta" ? `<p>Dacă vrei să schimbi sau să adaugi stocare, verifică întâi ce tip de SSD acceptă laptopul tău (format și interfață); unele modele nu permit upgrade.</p>` : ""}<p class="legaturi">${LEG_GHID[g.slug].filter(([c]) => existaAcces(c)).map(([c, n]) => `<a class="mare" href="/categorie/${c}/">${esc(n)}</a>`).join("")}</p></section>` : ""}
<section><h2>Alte ghiduri</h2><div class="ghid-surori">${surori.map((x) => `<a${x.cat ? ` data-cat="${esc(x.cat)}"` : ""} href="/ghiduri/${x.slug}/"><b>${esc(x.titlu)}</b><span>${minCitit(x)} min de citit</span></a>`).join("")}<a href="${CALE_GHID}"><b>Cum interpretăm reducerile pe Pretino</b><span>De unde vin prețurile</span></a></div></section></div></div>${ex.calculator || ex.checklist ? `<script src="/ghid.js?v=${VER_ASSET}" defer></script>` : ""}` });
}
paginaEd({ cale: "/ghiduri/", titlu: `Ghiduri de cumpărare – cum alegi și cum verifici o ofertă | ${BRAND}`, descriere: "Ghiduri scurte pentru cumpărături online: cum verifici o reducere, cum alegi un laptop, un monitor sau periferice și ce înseamnă produsele resigilate.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Ghiduri", cale: "/ghiduri/" }],
  corp: `<h1>Ghiduri de cumpărare</h1><p class="intro">Ghiduri scurte și practice, scrise pentru a te ajuta să compari corect ofertele. Nu sunt recenzii de produse și nu înlocuiesc informațiile din magazin.</p><ul class="lista-ghiduri">${GHIDURI.map((g) => `<li><a href="/ghiduri/${g.slug}/">${esc(g.titlu)}</a><p>${esc(g.descriere)} <span class="timp">${minCitit(g)} min de citit</span></p></li>`).join("")}<li><a href="${CALE_GHID}">Cum interpretăm reducerile pe Pretino</a><p>De unde vin prețurile, ce înseamnă prețul tăiat și ce oferte nu afișăm.</p></li></ul>` });
pagini.push(...utilitar({ mod: "cauta", cale: "/cauta/", titlu: `Căutare | ${BRAND}`, h1: "Căutare", intro: "Pentru căutare este nevoie de JavaScript activat.", descriere: "Caută oferte în catalogul Pretino.ro." }));
pagini.push(...utilitar({ mod: "favorite", cale: "/favorite/", titlu: `Favorite | ${BRAND}`, h1: "Favorite", intro: "Ofertele pe care le-ai salvat în acest browser.", descriere: "Ofertele salvate de tine la favorite." }));
for (const p of PAGINI_LEGALE) pagini.push({ cale: p.cale, index: true, html: pagina({ titlu: `${p.titlu} | ${BRAND}`, descriere: p.descriere, cale: p.cale, corp: p.corp(), simplu: true }) });
{ const g = paginaGhid({ magazine, maxRed, pcgMax: PCG_MAX, pcgZile: PCG_ZILE, zileVechi: ZILE_DATE_VECHI, cupoane: magazine.filter((m) => m.cupon && sortate.some((o) => o.magazin === m.id)).map((m) => ({ magazin: m.nume, ...m.cupon })) });
  pagini.push({ cale: g.cale, index: true, html: pagina({ titlu: `${g.titlu} | ${BRAND}`, descriere: g.descriere, cale: g.cale, corp: g.corp(), simplu: true }) }); }

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
writeFileSync("dist/stil.css", CSS);
// index de cautare (citit de /cauta.js doar cand e nevoie): campuri scurte, ordinea = ordinea listelor din HTML
writeFileSync("dist/cauta-index.json", JSON.stringify({ m: Object.fromEntries(magazine.map((x) => [x.id, x.nume])), c: Object.fromEntries(categorii.map((x) => [x.slug, x.nume])), k: Object.fromEntries(magazine.filter((x) => x.cupon).map((x) => [x.id, x.cupon])), o: sortate.map((o) => ({ id: o.id, t: o.titlu, m: o.magazin, c: o.categorie, s: o.sub ?? "", g: o.tip ?? "", p: o.pret, v: o.pretVechi > o.pret ? o.pretVechi : 0, r: o.referintaMagazin ? 1 : 0, x: conditie(o), b: o.marca?.id ?? "", u: o.url, i: /^https:\/\//.test(o.imagine ?? "") ? o.imagine : "" })) }));
for (const p of pagini) {
  const dir = "dist" + p.cale;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", p.html);
}
writeFileSync("dist/404.html", pagina({ titlu: `Pagină negăsită | ${BRAND}`, descriere: "Pagina nu există.", cale: "/404.html", noindex: true, corp: `<h1>Pagina nu există</h1><p>Adresa nu mai există sau a fost scrisă greșit. Caută în caseta de sus sau alege una dintre variantele de mai jos.</p><p class="legaturi404"><a class="btn-link mare" href="/">Înapoi la oferte</a>${categorii.map((c) => `<a class="btn-link" href="/categorie/${c.slug}/">${esc(c.nume)}</a>`).join("")}<a class="btn-link" href="/ghiduri/">Ghiduri</a><a class="btn-link" href="/favorite/">Favorite</a></p>`, simplu: true }));
// sitemap: doar pagini indexabile, prima pagina a fiecarei liste + paginile informative; fara lastmod (nu avem o data de modificare reala pe pagina)
const nuPaginata = (p) => !/\/pagina-\d+\/$/.test(p.cale);
const indexabile = pagini.filter((p) => p.index && nuPaginata(p));
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexabile.map((p) => `<url><loc>${abs(p.cale)}</loc></url>`).join("\n")}\n</urlset>\n`);
// robots: in productie totul e permis (noindex se pune prin meta, nu prin Disallow, ca Google sa poata citi noindex); previzualizarea DEMO blocheaza tot
writeFileSync("dist/robots.txt", DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// stare publica a catalogului (citita de panoul de control; fara date sensibile)
{ const num = (k, nume) => Object.fromEntries(Object.entries(oferte.reduce((a, o) => ((a[nume(o)] = (a[nume(o)] ?? 0) + 1), a), {})).sort((p, q) => q[1] - p[1]));
  writeFileSync("dist/status.json", JSON.stringify({ generat: new Date().toISOString(), total: oferte.length, magazine: num("m", (o) => mag[o.magazin]?.nume ?? o.magazin), categorii: num("c", (o) => cat[o.categorie]?.nume ?? o.categorie), demo: DEMO }) + "\n"); }
let sha = "";
try { sha = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
writeFileSync("dist/version.json", JSON.stringify({ sha, built: new Date().toISOString(), demo: DEMO }) + "\n");
console.log(`Pretino build${DEMO ? " (DEMO)" : ""}: ${pagini.length} pagini, ${oferte.length} oferte → dist/`);
