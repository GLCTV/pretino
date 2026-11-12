// Generează site-ul static Pretino în dist/. `--demo` folosește data/demo-oferte.json (doar pentru preview, niciodată publicat).
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, OPERATOR } from "../src/config.js";
import { PAGINI_LEGALE } from "./lib/legal.js";
import { esc, reducere } from "./lib/html.js";
import { clasifica, subcategoriiDe, tipuriDe } from "./lib/clasificare.js";
import { icoana } from "./lib/iconite.js";
import { PE_PAGINA, MIN_SUB_PAGINA, MIN_TIP_PAGINA, MIN_MAGAZIN_INDEX, ZILE_DATE_VECHI, BRAND, BF_DATA, jos, metaAcasa, metaCategorie, metaSub, metaTip, metaComponente, metaMagazin, metaMarca, metaTop } from "../src/seo.js";
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
// magazinele oprite din program (data/magazine.json → activ: false) nu apar pe site; ofertele lor raman in catalog pentru repornire
const oprite = new Set(magazine.filter((m) => m.activ === false).map((m) => m.id));
const brut = citeste(DEMO ? "demo-oferte.json" : "oferte.json").filter((o) => o.pretVechi > o.pret && reala(o) && !oprite.has(o.magazin));
const ascunse_vechi = brut.filter(prea_veche).length;
const ascunseLista = DEMO ? [] : citeste("oferte.json").filter((o) => o.pretVechi > o.pret && (oprite.has(o.magazin) || prea_veche(o)));
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
// Istoricul preturilor (data/istoric-preturi.json): un punct pe zi (ultimul pret al zilei). Un id cu mai multe preturi diferite in aceeasi zi = istoric amestecat, ignorat.
const ISTORIC = (() => { try { return citeste("istoric-preturi.json"); } catch { return {}; } })();
const ULTIMA_ZI = Object.values(ISTORIC).flat().map((e) => e.d).sort().pop() ?? null;
const ZILE_ISTORIC = (() => { const z = Object.values(ISTORIC).flat().map((e) => e.d).sort(); return z.length ? Math.round((Date.parse(z[z.length - 1]) - Date.parse(z[0])) / 864e5) : 0; })();
const puncte = (o) => {
  if (DEMO) return [];
  const l = ISTORIC[o.id]; if (!l?.length) return [];
  const pe = new Map(); for (const e of l) { const s = pe.get(e.d) ?? new Set(); s.add(e.p); pe.set(e.d, s); }
  if ([...pe.values()].some((x) => x.size > 2)) return [];
  const zile = new Map(); for (const e of l) zile.set(e.d, e.p);
  return [...zile.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, p]) => ({ d, p }));
};
// „cel mai mic pret”: pretul actual = minimul din istoric, iar inainte a fost mai mare (scadere reala, nu doar o singura citire)
const eticScurt = ZILE_ISTORIC >= 30 ? "Minim 30 de zile" : "Preț minim urmărit";
const eticMinim = ZILE_ISTORIC >= 30 ? "Cel mai mic preț din ultimele 30 de zile" : "Cel mai mic preț urmărit de Pretino";
const minim = (o) => { const pt = puncte(o).filter((x) => ZILE_ISTORIC < 30 || Date.now() - Date.parse(x.d) <= 30 * 864e5); return pt.length >= 2 && Math.abs(pt[pt.length - 1].p - o.pret) < 0.01 && Math.min(...pt.map((x) => x.p)) >= o.pret - 0.01 && pt.some((x) => x.p > o.pret + 0.01); };
// scadere la ultima actualizare: ultimul punct e din ultima zi a istoricului si e mai mic decat precedentul
const scadere = (o) => { const pt = puncte(o); return pt.length >= 2 && pt[pt.length - 1].d === ULTIMA_ZI && pt[pt.length - 2].p > pt[pt.length - 1].p + 0.01 ? pt[pt.length - 2].p - pt[pt.length - 1].p : 0; };
// grafic mic al pretului (SVG), doar cand avem cel putin 2 zile diferite
const sparkSvg = (vals) => {
  if (vals.length < 2) return "";
  const mn = Math.min(...vals), mx = Math.max(...vals), w = 84, h = 22, dx = w / (vals.length - 1);
  const y = (v) => (mx === mn ? h / 2 : 3 + (1 - (v - mn) / (mx - mn)) * (h - 6));
  const pts = vals.map((v, i) => `${(i * dx).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const jos2 = vals[vals.length - 1] < vals[0];
  return `<svg class="spark${jos2 ? " jos" : ""}" viewBox="-2 0 ${w + 4} ${h}" width="${w + 4}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${((vals.length - 1) * dx).toFixed(1)}" cy="${y(vals[vals.length - 1]).toFixed(1)}" r="2.6" fill="currentColor"/></svg>`;
};
const lei = (n) => `${Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;

const CSS = readFileSync(new URL("../src/stil.css", import.meta.url), "utf8");
// versiune pentru fisierele statice (stil.css, cauta.js): se schimba cand se schimba continutul, ca browserele sa nu foloseasca varianta veche din cache
const VER_ASSET = createHash("sha1").update(readFileSync("public/logo-antet.svg", "utf8") + readFileSync("public/logo-dark-antet.svg", "utf8") + CSS + (existsSync("public/cauta.js") ? readFileSync("public/cauta.js", "utf8") : "") + (existsSync("public/ghid.js") ? readFileSync("public/ghid.js", "utf8") : "")).digest("hex").slice(0, 8);

// Script Profitshare „Linkuri automate" (cont Pretino, site validat): transforma linkurile catre magazinele partenere in linkuri de afiliere. Fara el, linkurile raman cele din catalog.
const PROFITSHARE_SCRIPT = `<!-- Start ProfitShare Zone --><script>(function(){var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="//l.profitshare.ro/files_shared/lps/js/AZC/NI.js?v=1793640493";(document.getElementsByTagName("head")[0]||document.getElementsByTagName("body")[0]).appendChild(s);})();</script><!-- End ProfitShare Zone -->`;
// tema: inchisa implicit (ca in design); alegerea utilizatorului se pastreaza local. Inline, ca sa nu apara „licarire” de tema.
const TEMA_INIT = `<script>try{var t=null;try{t=localStorage.getItem("pretino-tema")}catch(e){}if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute("content",t==="light"?"#ffffff":"#0a1916")}catch(e){}</script>`;

const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const abs = (cale) => `${SITE_URL}${cale}`;

// ---- liste si pagini derivate din catalog (ordine determinista: reducere desc, pret asc, id asc) ----
const sortate = [...oferte].sort((a, b) => reducere(b) - reducere(a) || a.pret - b.pret || String(a.id).localeCompare(String(b.id)));
const nrMag = (l) => new Set(l.map((o) => o.magazin)).size;
// Pagina proprie pentru fiecare oferta: /produs/<titlu>-<cod>/ (adresa stabila cat timp oferta e in catalog)
const caleProdus = new Map(), caleFol = new Set();
const caleNoua = (o) => {
  const baza = fara(o.titlu).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72).replace(/-[^-]*$/, "") || "produs";
  let c = `/produs/${baza}-${String(o.id).replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase()}/`, k = 2;
  while (caleFol.has(c)) c = c.replace(/\/$/, `-${k++}/`);
  caleFol.add(c); return c;
};
for (const o of sortate) caleProdus.set(o.id, caleNoua(o));
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
const BF_ON = sortate.length >= 20;
// Pagini pentru cautari populare (/oferte/<slug>/): pret maxim, marca, reducere mare si specificatii citite din titlu.
// Se publica doar cu minim MIN_ATERIZARE oferte, ca sa nu existe pagini subtiri.
const MIN_ATERIZARE = 10;
const slugSimplu = (t) => fara(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ATERIZARI = [];
{ const fol = new Set(), adauga = (x) => { if (x.lista.length < MIN_ATERIZARE) return; let sl = x.slug; if (fol.has(sl)) sl = `${x.cat.slug}-${sl}`; if (fol.has(sl)) return; fol.add(sl); ATERIZARI.push({ ...x, slug: sl, cale: `/oferte/${sl}/` }); };
  const PRAGURI = [100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000, 8000];
  const SPEC = [
    { t: (o) => /televizor|\btv\b/i.test(o.titlu), re: /(?<![\d.])(32|40|43|50|55|65|75|85)\s?(?:"|”|″|''|inch|inci)/i, k: (m) => m[1], nume: (k) => `Televizoare ${k} inch` },
    { t: (o) => /monitor/i.test(o.titlu), re: /\b(100|120|144|165|180|200|240|280|360)\s?hz\b/i, k: (m) => m[1], nume: (k) => `Monitoare ${k} Hz` },
    { t: (o) => /plac[aă] video|\bgpu\b|geforce|radeon/i.test(o.titlu), re: /\b(rtx)\s?(50|40|30)\d0|\b(rx)\s?([6-9])\d{3}/i, k: (m) => (m[1] ? `rtx-${m[2]}` : `radeon-rx-${m[4]}000`), nume: (k) => (k.startsWith("rtx") ? `Plăci video RTX ${k.slice(4)}` : `Plăci video Radeon RX ${k.slice(10)}`) },
    { t: (o) => /laptop/i.test(o.titlu), re: /\b(gaming|rtx)\b/i, k: () => "gaming", nume: () => "Laptopuri de gaming" },
    { t: (o) => /\bssd\b/i.test(o.titlu), re: /(?<![\d.])(1|2|4)\s?tb\b/i, k: (m) => `${m[1]}tb`, nume: (k) => `SSD ${k.toUpperCase().replace("TB", " TB")}` },
    { t: (o) => /c[aă][sș]ti/i.test(o.titlu), re: /wireless|bluetooth|true wireless|\btws\b/i, k: () => "wireless", nume: () => "Căști wireless" },
    { t: (o) => /mouse/i.test(o.titlu), re: /gaming/i, k: () => "gaming", nume: () => "Mouse-uri de gaming" },
    { t: (o) => /tastatur/i.test(o.titlu), re: /mecanic/i, k: () => "mecanice", nume: () => "Tastaturi mecanice" },
    { t: (o) => /trotinet/i.test(o.titlu), re: /electric/i, k: () => "electrice", nume: () => "Trotinete electrice" },
    { t: (o) => /smartwatch|ceas inteligent/i.test(o.titlu), re: /./, k: () => "smartwatch", nume: () => "Smartwatch-uri" },
  ];
  for (const r of SPEC) {
    const gr = new Map();
    for (const o of sortate) { if (!r.t(o)) continue; const m = o.titlu.match(r.re); if (!m) continue; const k = r.k(m); const g = gr.get(k) ?? []; g.push(o); gr.set(k, g); }
    for (const [k, l] of gr) { const nume = r.nume(k); adauga({ slug: slugSimplu(nume), nume, tip: "spec", cat: cat[l[0].categorie], sub: null, lista: l }); }
  }
  for (const c of categorii) for (const sb of subcategoriiDe(c.slug)) {
    const l = sortate.filter((o) => o.categorie === c.slug && o.sub === sb.id); if (l.length < MIN_ATERIZARE * 2) continue;
    const S = sb.nume;
    const pr = PRAGURI.map((t) => ({ t, l: l.filter((o) => o.pret <= t) })).filter((x) => x.l.length >= MIN_ATERIZARE && x.l.length <= l.length * 0.85);
    for (const x of [pr[0], pr[Math.floor(pr.length / 2)]].filter((v, i, a) => v && a.indexOf(v) === i)) adauga({ slug: slugSimplu(`${S} sub ${x.t} lei`), nume: `${S} sub ${x.t.toLocaleString("ro-RO")} lei`, tip: "pret", cat: c, sub: sb, lista: x.l, prag: x.t });
    const br = new Map(); for (const o of l) if (o.marca) { const e = br.get(o.marca.id) ?? { m: o.marca, l: [] }; e.l.push(o); br.set(o.marca.id, e); }
    for (const e of [...br.values()].sort((a, b) => b.l.length - a.l.length).slice(0, 4)) adauga({ slug: slugSimplu(`${S} ${e.m.nume}`), nume: `${S} ${e.m.nume}`, tip: "marca", cat: c, sub: sb, lista: e.l });
    adauga({ slug: slugSimplu(`${S} reducere 30`), nume: `${S} cu reducere de peste 30%`, tip: "reducere", cat: c, sub: sb, lista: l.filter((o) => reducere(o) >= 30) });
  }
  ATERIZARI.sort((a, b) => b.lista.length - a.lista.length);
} // pagina Black Friday exista doar cu un catalog real suficient

const FOOTER = () => `<footer><div class="f-marca"><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><img class="l-noapte" src="/logo-dark-antet.svg?v=${VER_ASSET}" alt="" width="190" height="35" loading="lazy"><img class="l-lumina" src="/logo-antet.svg?v=${VER_ASSET}" alt="" width="190" height="35" loading="lazy" aria-hidden="true"></a><p>Oferte și reduceri din magazinele din România, într-un singur loc.</p></div><nav class="legal" aria-label="Informații">${[...(BF_ON ? [{ cale: "/black-friday/", nume: "Black Friday 2026" }] : []), ...PAGINI_LEGALE.map((p) => ({ cale: p.cale, nume: p.nume })), { cale: CALE_GHID, nume: "Cum interpretăm reducerile" }, { cale: "/ghiduri/", nume: "Ghiduri" }, ...(topuri.length ? [{ cale: "/top-oferte/", nume: "Top economii" }] : []), ...(ATERIZARI.length ? [{ cale: "/oferte/", nume: "Căutări populare" }] : []), { cale: "/preturi-scazute-azi/", nume: "Prețuri scăzute azi" }, { cale: "/cadouri/", nume: "Idei de cadouri" }, ...(marciPagina.length ? [{ cale: "/branduri/", nume: "Branduri" }] : [])].map((p) => `<a href="${p.cale}">${esc(p.nume)}</a>`).join("")}</nav>
${magCuOferte.filter((m) => magIndexabil(m.id)).length ? `<nav class="magazine-f" aria-label="Magazine"><b>Magazine:</b>${magCuOferte.filter((m) => magIndexabil(m.id)).map((m) => `<a href="/magazin/${m.id}/">${esc(m.nume)}</a>`).join("")}<a href="/magazine/">Toate magazinele</a></nav>` : ""}<p class="f-legal">Pretino.ro afișează oferte din magazine partenere. Unele linkuri pot fi linkuri de afiliere (marcate sponsorizat), iar unele magazine ne oferă un cod de cupon pentru care putem primi comision; prețul pentru tine nu se schimbă. Unde apare „reducere afișată de magazin”, prețul vechi este cel de referință arătat de magazin, nu istoricul Pretino. Verifică mereu prețul final în magazin.</p></footer>`;

const antet = (catActiva) => `<header class="antet"><div class="antet-in">
<div class="rand1"><a class="logo" href="/" aria-label="${esc(SITE_NAME)} – prima pagină"><img class="l-noapte" src="/logo-dark-antet.svg?v=${VER_ASSET}" alt="${esc(SITE_NAME)}" width="190" height="35"><img class="l-lumina" src="/logo-antet.svg?v=${VER_ASSET}" alt="" width="190" height="35" aria-hidden="true"></a>
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

function pagina({ titlu, descriere, cale, corp, noindex = false, catActiva = null, simplu = false, schema = [], ogImg = null }) {
  const robots = noindex || DEMO ? '<meta name="robots" content="noindex">' : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="profitshareid" content="7dd842fc7074c28872c609438ead55e6"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${robots}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(SITE_NAME)}"><meta property="og:locale" content="ro_RO"><meta property="og:title" content="${esc(titlu)}"><meta property="og:description" content="${esc(descriere)}"><meta property="og:url" content="${abs(cale)}">${ogImg ? `<meta property="og:image" content="${esc(ogImg)}">` : `<meta property="og:image" content="${abs("/og.png")}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(SITE_NAME)} – oferte și reduceri din magazinele din România">`}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titlu)}"><meta name="twitter:description" content="${esc(descriere)}"><meta name="twitter:image" content="${ogImg ? esc(ogImg) : abs("/og.png")}">
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
const poza = (o, i, peste = "") => { const mare = imgMare(o.imagine); const fb = mare !== o.imagine; return `<a class="poza${areImg(o) ? "" : " fara"}" href="${caleProdus.get(o.id) ?? esc(o.url)}" tabindex="-1" aria-hidden="true">${areImg(o) ? `<img src="${esc(mare)}" alt="${esc(o.titlu)}" ${i < 4 ? (i === 0 ? 'fetchpriority="high" ' : "") : 'loading="lazy" '}decoding="async" referrerpolicy="no-referrer" width="275" height="206"${fb ? ` data-t="${esc(o.imagine)}"` : ""} onload="this.parentNode.classList.add('ok')" onerror="${fb ? "if(this.dataset.t){this.src=this.dataset.t;delete this.dataset.t;return}" : ""}this.parentNode.classList.add('fara')">` : ""}${peste}</a>`; };
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
const cuponMic = (c) => c ? `<div class="cupon" title="Introdu codul în coș. Prețul afișat nu îl include."><span class="cupon-et">Cupon <b>${esc(c.cod)}</b><small>${esc(c.text)} în coș</small></span><button type="button" class="copiaza" data-cod="${esc(c.cod)}">Copiază</button></div>` : "";
const card = (o, i = 99) => {
  const r = reducere(o), c = conditie(o), pp = caleProdus.get(o.id) ?? o.url;
  return `<article class="card">${poza(o, i, minim(o) ? `<span class="minim-poza" title="${esc(eticMinim)}">${icoana("jos-pret")}${esc(eticScurt)}</span>` : "")}<span class="badge">-${r}%</span><button class="fav" type="button" data-id="${esc(o.id)}" data-p="${o.pret}" aria-pressed="false" aria-label="Adaugă la favorite">${icoana("inima")}</button>
<a class="titlu" href="${esc(pp)}">${esc(o.titlu)}</a><span class="magazin"><a href="/magazin/${esc(o.magazin)}/">${esc(numeMag(o.magazin))}</a>${c ? `<span class="cond">${COND[c]}</span>` : ""}</span>
<div class="pretrand"><span class="pret">${lei(o.pret)}</span><span class="vechi"${o.referintaMagazin ? ' title="Preț de referință afișat de magazin"' : ""}>${lei(o.pretVechi)}</span></div><span class="econ-txt">Economisești ${lei(o.pretVechi - o.pret)}</span>
${cuponMic(mag[o.magazin]?.cupon)}<a class="btn" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" aria-label="Vezi oferta la ${esc(numeMag(o.magazin))} (se deschide în magazin, fereastră nouă)" title="Se deschide în magazin">Vezi la ${esc(numeMag(o.magazin))} ${icoana("extern")}</a></article>`;
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
function listare({ mod, meta, cale, catSlug = null, magId = null, subId = null, tipId = null, lista, indexabil = true, ilustr = null, migaje = [], chips = "", subRute = [], schemaAcasa = false, brandId = null, extra = "", extra1 = "", dupa = "", schemaExtra = [] }) {
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
    if (mod !== "cauta" && mod !== "favorite" && felie.length) schema.push({ "@context": "https://schema.org", "@type": "ItemList", itemListOrder: "https://schema.org/ItemListUnordered", numberOfItems: lista.length, itemListElement: felie.map((o, i) => ({ "@type": "ListItem", position: (p - 1) * PE_PAGINA + i + 1, url: abs(caleProdus.get(o.id)) })) });
    if (mod !== "acasa" && mod !== "cauta" && mod !== "favorite") schema.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ name: "Acasă", cale: "/" }, ...migaje.slice(1).map((x) => ({ name: x.nume, cale: x.cale })), { name: m.migaja, cale: adr }].map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name ?? x.nume, item: abs(x.cale) })) });
    if (p === 1) schema.push(...schemaExtra);
    const corp = `<main data-lista='${date}'>
<nav class="migaje" aria-label="Navigare">${miez}</nav>
<div class="hero${mod === "acasa" ? " hero-acasa" : ""}"><div><h1 id="h1">${esc(m.h1)}</h1>${p === 1 && m.intro ? `<p class="intro" id="sub-titlu">${esc(m.intro)}</p>` : '<p class="intro" id="sub-titlu"></p>'}${actualizatText ? `<details class="actualizat info-pret"><summary><time datetime="${dataActualizarii.toISOString()}">${esc(actualizatText)}</time><span class="i" aria-hidden="true">i</span><span class="sr"> – detalii</span></summary><p>Prețurile se pot schimba în magazin; verifică prețul final pe pagina magazinului. <a href="${CALE_GHID}">Cum interpretăm reducerile</a></p></details>` : ""}</div>${ilustr ? ilustratie(ilustr) : mod === "acasa" ? statisticiHome() : ""}</div>
${chips ? `<div class="subcats" role="group" aria-label="Subcategorii">${chips}</div>` : '<div class="subcats-gol"></div>'}${p === 1 ? extra1 : ""}${extra}
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
${mod !== "favorite" && (lista.length > 8 || mod === "cauta") ? (() => { const pm = [...lista].map((o) => o.pret).sort((a, b) => a - b)[Math.floor(lista.length / 2)] ?? 500; const prag = [100, 200, 300, 500, 1000, 2000, 3000, 5000].find((t) => t >= pm) ?? 5000; return `<div class="rapide" role="group" aria-label="Filtre rapide"><button type="button" data-rapid="max:${prag}" aria-pressed="false">Sub ${prag.toLocaleString("ro-RO")} lei</button><button type="button" data-rapid="red:30" aria-pressed="false">-30% sau mai mult</button><button type="button" data-rapid="red:50" aria-pressed="false">-50% sau mai mult</button><button type="button" data-rapid="nou" aria-pressed="false">Doar produse noi</button></div>`; })() : ""}<div class="active" id="active" aria-label="Filtre active" hidden></div>
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
  return `<nav class="descopera" aria-label="Descoperă"><details open><summary>Descoperă mai mult</summary>${cat ? "" : grup("Campanii:", [...(BF_ON ? [`<a class="mare" href="/black-friday/">Black Friday 2026</a>`] : []), `<a href="/cyber-monday/">Cyber Monday</a>`, `<a href="/cadouri/">Cadouri de Crăciun</a>`, `<a href="/preturi-scazute-azi/">Prețuri scăzute azi</a>`])}${cat ? "" : grup("Descoperă oferte:", ACCES_HOME.filter(([c]) => existaAcces(c)).map(([c, n]) => `<a href="/categorie/${c}/">${esc(n)}</a>`).concat(magCuOferte.some((m) => magIndexabil(m.id)) ? [`<a class="mare" href="/magazine/">Magazine cu oferte</a>`] : []))}${grup("Top economii:", t.map((x) => `<a${x.sub || !cat ? "" : ' class="mare"'} href="${x.cale}">${esc(x.sub ? x.nume : cat ? "Toată categoria" : x.cat.nume)}</a>`))}${grup("Ghiduri:", g.slice(0, 3).map((x) => `<a href="/ghiduri/${x.slug}/">${esc(x.titlu)}</a>`).concat([`<a class="mare" href="/ghiduri/">Toate ghidurile</a>`]))}${grup("Branduri:", m.map((x) => `<a href="/brand/${x.id}/">${esc(x.nume)}</a>`).concat(m.length ? [`<a class="mare" href="/branduri/">Toate brandurile</a>`] : []))}</details></nav>`;
};
const dataRo = (iso) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const migajeHtml = (items) => `<nav class="migaje" aria-label="Navigare">${items.map((x, i) => (i < items.length - 1 ? `<a href="${x.cale}">${esc(x.nume)}</a><span aria-hidden="true">/</span>` : `<span id="migaja-curenta">${esc(x.nume)}</span>`)).join("")}</nav>`;
const schemaMigaje = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.nume, item: abs(x.cale) })) });
const gridCards = (l) => `<div class="grid">${l.map((o, i) => card(o, i)).join("")}</div>`;
function paginaEd({ cale, titlu, descriere, migaje, corp, schema = [], catActiva = null, ogImg = null, noindex = false, sitemap = true }) {
  pagini.push({ cale, index: !noindex, sitemap, html: pagina({ titlu, descriere, cale, catActiva, ogImg, noindex, schema: [schemaMigaje(migaje), ...schema], corp: `<main class="continut">${migajeHtml(migaje)}${corp}</main>` }) });
}

// text de prezentare generat din catalogul real (cifre, magazine, cea mai mare economie), pus sub lista paginii 1
const textOferte = (nume, l, legaturi = "") => {
  if (!l.length) return "";
  const medie = Math.round(l.reduce((a, o) => a + reducere(o), 0) / l.length), mx = sortEc(l)[0];
  const mags = [...new Set(l.map((o) => o.magazin))].map((id) => ({ id, n: l.filter((o) => o.magazin === id).length })).sort((a, b) => b.n - a.n).slice(0, 4).map((x) => numeMag(x.id));
  return `<section class="text-seo"><h2>Despre ofertele la ${esc(nume)}</h2><p>În catalogul Pretino sunt acum <b>${l.length.toLocaleString("ro-RO")}</b> oferte la ${esc(nume)}, din ${nrMag(l)} ${nrMag(l) === 1 ? "magazin" : "magazine"}${mags.length ? ` (în special ${mags.map(esc).join(", ")})` : ""}. Reducerea medie este de ${medie}%, iar cea mai mare economie în lei este de ${lei(ec(mx))}, la „${esc(mx.titlu)}” de la ${esc(numeMag(mx.magazin))}.</p><p>Fiecare ofertă arată prețul de referință tăiat și prețul actual, ca să vezi diferența dintr-o privire. Prețul de referință vine de la magazin, nu din istoricul nostru, așa că verifică întotdeauna prețul final, stocul și costul livrării pe pagina magazinului înainte să comanzi. <a href="${CALE_GHID}">Cum interpretăm reducerile</a>.${legaturi}</p></section>`;
};
// Vitrina primei pagini: banner Black Friday cu numaratoare, carusel „Oferta zilei”, randuri orizontale (doar din catalogul real)
const BF_START = Date.parse("2026-11-27T00:00:00+02:00"), BF_STOP = Date.parse("2026-12-01T00:00:00+02:00");
const vitrina = (() => {
  if (!sortate.length) return "";
  const cuPoza = sortate.filter(areImg);
  const acum = Date.now();
  const zileBf = Math.max(0, Math.ceil((BF_START - acum) / 864e5));
  const banner = BF_ON && acum < BF_STOP ? `<a class="bf-banner" href="/black-friday/"><span class="bf-et">Black Friday 2026</span><b class="bf-tit">${acum < BF_START ? "Ofertele încep să apară. Fii pregătit." : "Black Friday a început!"}</b><span class="bf-num" data-bf="${new Date(BF_START).toISOString()}" data-stop="${new Date(BF_STOP).toISOString()}">${acum < BF_START ? `<span><b>${zileBf}</b>zile</span>` : "<span><b>LIVE</b>acum</span>"}</span><span class="bf-cta">Vezi ofertele →</span></a>` : "";
  const peMag = {}, zi = sortEc(cuPoza.filter((o) => o.pret >= 150 && reducere(o) >= 15)).filter((o) => (peMag[o.magazin] = (peMag[o.magazin] ?? 0) + 1) <= 2).slice(0, 8);
  const ziId = new Set(zi.map((o) => o.id)), utile = cuPoza.filter((o) => o.pret >= 40 && !ziId.has(o.id));
  const slide = (o) => { const r = reducere(o); return `<article class="zi-slide"><a class="zi-poza" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true"><img src="${esc(imgMare(o.imagine))}" alt="${esc(o.titlu)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="320" height="240" onerror="this.parentNode.classList.add('fara')"></a><div class="zi-info"><span class="zi-red">-${r}%</span><a class="zi-tit" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(o.titlu)}</a><span class="zi-mag">la ${esc(numeMag(o.magazin))}</span><span class="zi-pret"><b>${lei(o.pret)}</b><s>${lei(o.pretVechi)}</s></span><span class="zi-ec">Economisești ${lei(ec(o))}</span><a class="btn zi-btn" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">Vezi oferta ${icoana("extern")}</a></div></article>`; };
  const carusel = zi.length >= 3 ? `<section class="zi" aria-label="Ofertele zilei"><div class="rand-cap"><h2>Ofertele zilei</h2><span class="car-nav"><button type="button" class="car-b" data-dir="-1" aria-label="Înapoi">‹</button><button type="button" class="car-b" data-dir="1" aria-label="Înainte">›</button></span></div><div class="zi-sir" data-carusel>${zi.map(slide).join("")}</div></section>` : "";
  const rand = (titlu, l, link) => (l.length >= 4 ? `<section class="rand" aria-label="${esc(titlu)}"><div class="rand-cap"><h2>${esc(titlu)}</h2>${link ? `<a class="rand-tot" href="${link}">Vezi toate →</a>` : ""}</div><div class="rand-sir">${l.slice(0, 12).map((o) => card(o)).join("")}</div></section>` : "");
  const scaderi = utile.map((o) => ({ o, s: scadere(o) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.o);
  const lap = cuPoza.filter((o) => o.categorie === "electronice" && o.sub === "laptopuri"), comp = cuPoza.filter((o) => o.categorie === "electronice" && o.sub === "componente");
  return `<div class="vitrina">${banner}${carusel}${rand("Cele mai mari reduceri", utile, "/top-oferte/")}${rand("Prețuri scăzute la ultima actualizare", scaderi, "/preturi-scazute-azi/")}${rand("Laptopuri la ofertă", lap, subPublicata("electronice", "laptopuri") ? "/categorie/electronice/laptopuri/" : null)}${rand("Componente PC la ofertă", comp, subPublicata("electronice", "componente") ? "/categorie/electronice/componente/" : null)}<h2 class="vitrina-toate">Toate ofertele</h2></div>`;
})();
// bloc „Căutări populare și categorii înrudite” + intrebari frecvente din datele reale (categorie / subcategorie)
const inrudite = (catSlug, subId = null) => {
  const at = ATERIZARI.filter((a) => a.cat?.slug === catSlug && (!subId || !a.sub || a.sub.id === subId)).slice(0, 10);
  const frati = subcategoriiDe(catSlug).filter((x) => x.id !== subId && sortate.filter((o) => o.categorie === catSlug && o.sub === x.id).length >= MIN_SUB_PAGINA);
  const alte = categorii.filter((c) => c.slug !== catSlug && sortate.some((o) => o.categorie === c.slug));
  const grup = (e, l) => (l.length ? `<span class="d-grup"><b>${e}</b>${l.join("")}</span>` : "");
  return `<nav class="descopera inrudite" aria-label="Categorii înrudite"><details open><summary>Căutări populare și categorii înrudite</summary>${grup("Căutări populare:", at.map((a) => `<a href="${a.cale}">${esc(a.nume)}</a>`))}${grup(subId ? "Din aceeași categorie:" : "Subcategorii:", frati.map((x) => `<a href="/categorie/${catSlug}/${x.id}/">${esc(x.nume)}</a>`))}${grup("Alte categorii:", alte.map((c) => `<a href="/categorie/${c.slug}/">${esc(c.nume)}</a>`))}</details></nav>`;
};
const faqLista = (nume, l) => {
  if (l.length < 5) return { html: "", schema: [] };
  const mx = sortate.filter((o) => l.includes(o))[0], ief = [...l].sort((a, b) => a.pret - b.pret)[0], mags = [...new Set(l.map((o) => numeMag(o.magazin)))];
  const f = [
    { q: `Câte oferte la ${nume} sunt acum pe Pretino?`, a: `Acum sunt ${l.length} oferte la ${nume}, din ${mags.length} ${mags.length === 1 ? "magazin" : "magazine"}: ${mags.join(", ")}.${actualizatText ? " " + actualizatText + "." : ""}` },
    { q: `Care este cea mai mare reducere la ${nume}?`, a: `Cea mai mare reducere este de ${reducere(mx)}%, la „${mx.titlu}” (${lei(mx.pret)} la ${numeMag(mx.magazin)}, față de ${lei(mx.pretVechi)}).` },
    { q: `Care este cel mai ieftin produs la ofertă?`, a: `Cel mai mic preț este ${lei(ief.pret)}, la „${ief.titlu}” de la ${numeMag(ief.magazin)}.` },
    { q: `Sunt reducerile reale?`, a: "Afișăm doar produse cu preț redus față de prețul de referință al magazinului și ascundem reducerile suspect de mari. Verifică întotdeauna prețul final în magazin înainte de comandă." },
  ];
  return { html: `<section class="ghid-faq faq-lista"><h2>Întrebări frecvente</h2>${f.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</section>`, schema: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: f.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }] };
};
// Acasa
pagini.push(...listare({ mod: "acasa", meta: (p) => ({ ...metaAcasa(p), migaja: "Acasă" }), cale: "/", lista: sortate, indexabil: oferte.length > 0, extra: linkuriDescopera(), extra1: vitrina, dupa: textOferte("electronice, electrocasnice și alte categorii", sortate, BF_ON ? ` Pregătești cumpărăturile mari? Vezi <a href="/black-friday/">ofertele de Black Friday 2026</a>.` : "") }));

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
  const placa = (s) => { const o = s.lista.find(areImg), mx = Math.max(...s.lista.map(reducere)), rut = rutate.includes(s);
    return `<a class="chip tile" href="${rut ? `${cale}${s.id}/` : `${cale}?sub=${s.id}`}"${rut ? "" : ` data-sub="${s.id}" rel="nofollow"`}><span class="tile-img${o ? "" : " fara"}">${o ? `<img src="${esc(imgMare(o.imagine))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="96" height="72" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('fara')">` : ""}${icoana(s.icoana)}</span><span class="tile-t"><b>${esc(s.nume)}</b><small>${s.lista.length} ${s.lista.length === 1 ? "ofertă" : "oferte"} · până la -${mx}%</small></span></a>`; };
  const faqC = faqLista(jos(c.nume), l);
  const chipuriParinte = subs.length ? chipLink(cale, null, "Toate", true, ' data-sub=""') + [...subs].sort((a, b) => b.lista.length - a.lista.length).map(placa).join("") : "";
  pagini.push(...listare({ mod: "categorie", meta: (p) => ({ ...metaCategorie(c, nrMag(l), p), migaja: c.nume }), cale, catSlug: c.slug, lista: l, ilustr: c.slug, migaje: [{ nume: "Acasă", cale: "/" }], chips: chipuriParinte, subRute: rutate.map((s) => s.id), extra: linkuriDescopera(c.slug), dupa: faqC.html + inrudite(c.slug) + textOferte(jos(c.nume), l, topDe(c.slug) ? ` Pentru economii în lei, vezi și <a href="${topDe(c.slug).cale}">topul economiilor la ${esc(jos(c.nume))}</a>.` : "") , schemaExtra: faqC.schema}));
  for (const s of rutate) {
    const caleS = `${cale}${s.id}/`;
    const chipuriSub = chipLink(cale, null, "Toate", false) + rutate.map((x) => chipLink(`${cale}${x.id}/`, x.icoana, x.nume, x === s)).join("");
    subPagini.push(caleS);
    const faqS = faqLista(jos(s.nume), s.lista);
    // tipuri de produs cu pagina proprie (doar cu inventar suficient); pagina subcategoriei ramane directorul cu toate ofertele
    const tipuri = tipuriDe(c.slug, s.id).map((t) => ({ ...t, lista: s.lista.filter((o) => o.tip === t.id) })).filter((t) => t.lista.length >= MIN_TIP_PAGINA);
    const extraTipuri = tipuri.length ? `<nav class="descopera" aria-label="Tipuri de produse"><details open><summary>Alege tipul de produs</summary><span class="d-grup"><b>Tipuri:</b>${tipuri.map((t) => `<a href="${caleS}${t.id}/">${esc(t.nume)} la ofertă</a>`).join("")}</span></details></nav>` : "";
    const metaSubFinal = (p) => (c.slug === "electronice" && s.id === "componente" && tipuri.length ? { ...metaSub(c, s, nrMag(s.lista), p), ...metaComponente(tipuri, p), migaja: s.nume } : { ...metaSub(c, s, nrMag(s.lista), p, numeSubDeMaiMulteOri.has(s.nume)), migaja: s.nume });
    pagini.push(...listare({ mod: "categorie", meta: metaSubFinal, cale: caleS, catSlug: c.slug, subId: s.id, lista: s.lista, ilustr: `scena-sub:${c.slug}:${s.id}`, migaje: [{ nume: "Acasă", cale: "/" }, { nume: c.nume, cale }], chips: chipuriSub, extra: extraTipuri, dupa: faqS.html + inrudite(c.slug, s.id) + textOferte(jos(s.nume), s.lista), schemaExtra: faqS.schema }));
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

// Pagini de produs: poza mare, pret, istoricul pretului, acelasi produs la alte magazine, oferte similare, partajare.
// Fara schema Product/Offer (Pretino nu e vanzator); doar BreadcrumbList.
const dataScurta = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "UTC" });
const graficPret = (pt, pretAcum) => {
  const v = pt.map((x) => x.p); if (v.length < 2) return "";
  const W = 640, H = 200, L = 70, R = 16, T = 16, B = 34, mn = Math.min(...v), mx = Math.max(...v), span = mx - mn || 1;
  const x = (i) => L + (i * (W - L - R)) / (v.length - 1), y = (p) => T + (1 - (p - mn) / span) * (H - T - B);
  const linie = v.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const arie = `${L},${H - B} ${linie} ${x(v.length - 1).toFixed(1)},${H - B}`;
  return `<svg class="grafic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evoluția prețului: ${pt.map((e) => `${dataScurta(e.d)} ${lei(e.p)}`).join(", ")}"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
<line x1="${L}" y1="${y(mx)}" x2="${W - R}" y2="${y(mx)}" class="g-ax"/><line x1="${L}" y1="${y(mn)}" x2="${W - R}" y2="${y(mn)}" class="g-ax"/><text x="${L - 8}" y="${y(mx) + 4}" text-anchor="end">${esc(lei(mx))}</text>${mx !== mn ? `<text x="${L - 8}" y="${y(mn) + 4}" text-anchor="end">${esc(lei(mn))}</text>` : ""}
<polygon points="${arie}" fill="url(#ga)"/><polyline points="${linie}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${v.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="${i === v.length - 1 ? 6 : 3.5}" fill="currentColor"/>`).join("")}
<text x="${L}" y="${H - 10}">${esc(dataScurta(pt[0].d))}</text><text x="${W - R}" y="${H - 10}" text-anchor="end">${esc(dataScurta(pt[pt.length - 1].d))}</text></svg>`;
};
// acelasi produs la alte magazine: cod de model comun (cuvant cu litere si cifre, minim 5 caractere), aceeasi categorie
const coduri = (t) => new Set((String(t).toUpperCase().match(/[A-Z0-9][A-Z0-9-]{4,}/g) ?? []).filter((w) => /\d/.test(w) && /[A-Z]/.test(w) && !/^\d+(GB|TB|MHZ|GHZ|HZ|MM|CM|W|MAH|MP)$/.test(w)));
const dupaCod = new Map();
for (const o of sortate) for (const c of coduri(o.titlu)) { const l = dupaCod.get(c) ?? []; l.push(o); dupaCod.set(c, l); }
const altele = (o) => { const r = new Map(); for (const c of coduri(o.titlu)) for (const x of dupaCod.get(c) ?? []) if (x.magazin !== o.magazin && x.categorie === o.categorie && !r.has(x.id)) r.set(x.id, x); return [...r.values()].sort((a, b) => a.pret - b.pret).slice(0, 6); };
const titluriProdus = new Set();
const share = (url, text) => { const u = encodeURIComponent(url), t = encodeURIComponent(text); return `<div class="share" aria-label="Distribuie"><span>Trimite unui prieten:</span><a href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a><a href="https://t.me/share/url?url=${u}&amp;text=${t}" target="_blank" rel="noopener">Telegram</a><a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a><button type="button" class="copiaza-link" data-url="${esc(url)}">Copiază linkul</button></div>`; };
for (const o of sortate) {
  const cale = caleProdus.get(o.id), r = reducere(o), m = mag[o.magazin], pt = puncte(o), mi = minim(o), c = cat[o.categorie];
  const subO = o.sub ? subcategoriiDe(o.categorie).find((x) => x.id === o.sub) : null, caleCat = `/categorie/${o.categorie}/`, caleSub = subO && subPagini.includes(`${caleCat}${subO.id}/`) ? `${caleCat}${subO.id}/` : null;
  const migaje = [{ nume: "Acasă", cale: "/" }, ...(c ? [{ nume: c.nume, cale: caleCat }] : []), ...(caleSub ? [{ nume: subO.nume, cale: caleSub }] : []), { nume: o.titlu.length > 60 ? o.titlu.slice(0, 57).trimEnd() + "…" : o.titlu, cale }];
  const taie = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,.(–-]+\S*$/, "") + "…");
  const coada = ` – ${lei(o.pret)} la ${numeMag(o.magazin)} | ${BRAND}`, sf = ` | ${BRAND}`, cod = String(o.id).replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  const variante = [taie(o.titlu, 75 - coada.length) + coada, taie(o.titlu, 75 - sf.length) + sf, "…" + o.titlu.slice(-(75 - sf.length - 1)).replace(/^\S*\s/, "") + sf, taie(o.titlu, 75 - sf.length - 9) + ` (#${cod})` + sf];
  const titlu = variante.find((t) => !titluriProdus.has(t)) ?? variante[3];
  titluriProdus.add(titlu);
  const descriere = `${o.titlu.length > 110 ? o.titlu.slice(0, 107).trimEnd() + "…" : o.titlu}: ${lei(o.pret)} la ${numeMag(o.magazin)}, cu ${r}% sub prețul de referință de ${lei(o.pretVechi)}. Vezi istoricul prețului și alte magazine.`;
  const alt = altele(o), sim = sortate.filter((x) => x.id !== o.id && x.categorie === o.categorie && (o.sub ? x.sub === o.sub : true) && (o.tip ? x.tip === o.tip : true)).sort((a, b) => Math.abs(a.pret - o.pret) - Math.abs(b.pret - o.pret)).slice(0, 8);
  const btn = (cls) => `<a class="btn ${cls}" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" title="Se deschide în magazin">Vezi oferta la ${esc(numeMag(o.magazin))} ${icoana("extern")}</a>`;
  const vMin = pt.length ? Math.min(...pt.map((x) => x.p)) : o.pret, vMax = pt.length ? Math.max(...pt.map((x) => x.p)) : o.pret;
  const corp = `<div class="prod">
<div class="prod-poza${areImg(o) ? "" : " fara"}">${areImg(o) ? `<img src="${esc(imgMare(o.imagine))}" alt="${esc(o.titlu)}" fetchpriority="high" decoding="async" referrerpolicy="no-referrer" width="560" height="420"${imgMare(o.imagine) !== o.imagine ? ` data-t="${esc(o.imagine)}"` : ""} onload="this.parentNode.classList.add('ok')" onerror="${imgMare(o.imagine) !== o.imagine ? "if(this.dataset.t){this.src=this.dataset.t;delete this.dataset.t;return}" : ""}this.parentNode.classList.add('fara')">` : ""}<span class="badge">-${r}%</span></div>
<div class="prod-info"><h1>${esc(o.titlu)}</h1><p class="prod-mag">Ofertă la <a href="/magazin/${esc(o.magazin)}/">${esc(numeMag(o.magazin))}</a>${conditie(o) ? ` · <span class="cond">${COND[conditie(o)]}</span>` : ""}${o.marca && marciPagina.some((b) => b.id === o.marca.id) ? ` · <a href="/brand/${esc(o.marca.id)}/">${esc(o.marca.nume)}</a>` : ""}</p>
<div class="prod-pret"><b>${lei(o.pret)}</b><s${o.referintaMagazin ? ' title="Preț de referință afișat de magazin"' : ""}>${lei(o.pretVechi)}</s></div>
<p class="prod-ec">Economisești <b>${lei(o.pretVechi - o.pret)}</b> (${r}%)</p>
${mi ? `<p class="minim"><span>${icoana("jos-pret")}${esc(eticMinim)}</span></p>` : ""}
${cuponMic(m?.cupon)}${btn("prod-btn")}
${actualizatText ? `<p class="prod-nota">${esc(actualizatText)}. Prețul se poate schimba; verifică prețul final, stocul și livrarea în magazin.</p>` : ""}
${share(abs(cale), `${o.titlu.slice(0, 80)} – ${lei(o.pret)} (-${r}%)`)}</div></div>
<section class="prod-sec"><h2>Istoricul prețului</h2>${pt.length >= 2 ? `<div class="grafic-w">${graficPret(pt, o.pret)}</div><p>Pretino urmărește prețul acestui produs din ${dataRo(pt[0].d + "T12:00:00Z")}. Cel mai mic preț văzut: <b>${lei(vMin)}</b>, cel mai mare: <b>${lei(vMax)}</b>.${mi ? " Prețul de acum este cel mai mic din istoricul nostru." : ""}</p>` : `<p>Urmărim prețul acestui produs${pt[0] ? ` din ${dataRo(pt[0].d + "T12:00:00Z")}` : ""} și încă nu s-a schimbat. Graficul apare după prima modificare de preț. Adaugă produsul la favorite (inima) ca să vezi pe Pretino când scade.</p>`}</section>
${alt.length ? `<section class="prod-sec"><h2>Produse asemănătoare la alte magazine</h2><p class="intro">Am găsit produse cu același cod de model în alte magazine. Verifică specificațiile: varianta poate diferi.</p><div class="compara-tab">${alt.map((x) => `<div class="cmp-r"><a href="${caleProdus.get(x.id)}">${esc(x.titlu)}</a><span>${esc(numeMag(x.magazin))}</span><b>${lei(x.pret)}</b>${x.pret < o.pret ? `<i class="mai-ieftin">cu ${lei(o.pret - x.pret)} mai ieftin</i>` : "<i></i>"}<a class="btn" href="${esc(x.url)}" rel="sponsored nofollow noopener" target="_blank">Vezi ${icoana("extern")}</a></div>`).join("")}</div></section>` : ""}
<section class="prod-sec text-seo"><h2>Despre această ofertă</h2><p>${esc(o.titlu)} costă acum ${lei(o.pret)} la ${esc(numeMag(o.magazin))}, cu ${r}% (${lei(o.pretVechi - o.pret)}) mai puțin decât prețul de referință de ${lei(o.pretVechi)} afișat de magazin. Pretino nu vinde produsul: butonul te duce în pagina magazinului, unde vezi stocul, livrarea, garanția și condițiile de retur.${m?.cupon ? ` La ${esc(numeMag(o.magazin))} poți folosi și codul ${esc(m.cupon.cod)} în coș (${esc(m.cupon.text)}).` : ""} <a href="${CALE_GHID}">Cum interpretăm reducerile</a>.</p></section>
${sim.length ? `<section class="prod-sec"><h2>Oferte similare</h2>${gridCards(sim)}<p class="legaturi">${caleSub ? `<a class="mare" href="${caleSub}">Toate ofertele la ${esc(jos(subO.nume))}</a>` : ""}${c ? `<a href="${caleCat}">Oferte ${esc(jos(c.nume))}</a>` : ""}</p></section>` : ""}
<div class="bara-cumpara"><span><b>${lei(o.pret)}</b><s>${lei(o.pretVechi)}</s></span>${btn("")}</div>`;
  paginaEd({ cale, titlu, descriere, migaje, catActiva: o.categorie, corp, ogImg: areImg(o) ? imgMare(o.imagine) : null });
}

// Pagini de produs pentru oferte încheiate (arhiva) sau ascunse temporar (magazin oprit / date vechi): fără 404, cu istoric și oferte similare
{ const arhiva = DEMO ? {} : (() => { try { return citeste("produse-arhiva.json"); } catch { return {}; } })();
  const vazute = new Set(caleProdus.keys()), inactive = [];
  for (const x of [...ascunseLista.map((o) => ({ ...o, ascuns: true })), ...Object.values(arhiva)]) if (!vazute.has(x.id)) { vazute.add(x.id); inactive.push({ ...x, ...clasifica(x), marca: marcaOfertei(x.titlu) }); }
  const listaInactive = [];
  for (const o of inactive) {
    const cale = caleNoua(o); listaInactive.push({ o, cale });
    const m = mag[o.magazin], c = cat[o.categorie], pt = puncte(o), oprit = oprite.has(o.magazin);
    const vechime = o.incheiat ? (Date.now() - Date.parse(o.incheiat)) / 864e5 : 0;
    const coada = o.ascuns ? ` – indisponibil momentan | ${BRAND}` : ` – ofertă încheiată | ${BRAND}`, sf = ` | ${BRAND}`;
    const taie = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,.(–-]+\S*$/, "") + "…");
    const titlu = [taie(o.titlu, 75 - coada.length) + coada, taie(o.titlu, 75 - sf.length - 9) + ` (#${String(o.id).replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()})` + sf].find((t) => !titluriProdus.has(t)) ?? `${taie(o.titlu, 55)} (${cale.slice(-7, -1)}) | ${BRAND}`;
    titluriProdus.add(titlu);
    const alt = altele(o), sim = sortate.filter((x) => x.categorie === o.categorie && (o.sub ? x.sub === o.sub : true) && (o.tip ? x.tip === o.tip : true)).sort((a, b) => Math.abs(a.pret - o.pret) - Math.abs(b.pret - o.pret)).slice(0, 8);
    const subO = o.sub ? subcategoriiDe(o.categorie).find((x) => x.id === o.sub) : null, caleCat = `/categorie/${o.categorie}/`, caleSub = subO && subPagini.includes(`${caleCat}${subO.id}/`) ? `${caleCat}${subO.id}/` : null;
    const stare = o.ascuns ? (oprit ? `Momentan nu afișăm ofertele ${numeMag(o.magazin)}.` : "Oferta nu a mai putut fi verificată recent, așa că nu o mai afișăm până la următoarea verificare.") : `Oferta s-a încheiat${o.incheiat ? ` (ultima dată văzută pe ${dataRo(o.incheiat + "T12:00:00Z")})` : ""}: produsul nu mai are reducere în catalogul Pretino.`;
    paginaEd({ cale, titlu, descriere: `${o.titlu.length > 110 ? o.titlu.slice(0, 107).trimEnd() + "…" : o.titlu}: ${o.ascuns ? "momentan indisponibil" : "oferta s-a încheiat"}. Ultimul preț văzut: ${lei(o.pret)}. Vezi istoricul prețului și oferte similare actuale.`,
      migaje: [{ nume: "Acasă", cale: "/" }, ...(c ? [{ nume: c.nume, cale: caleCat }] : []), ...(caleSub ? [{ nume: subO.nume, cale: caleSub }] : []), { nume: o.titlu.length > 60 ? o.titlu.slice(0, 57).trimEnd() + "…" : o.titlu, cale }],
      catActiva: o.categorie, noindex: vechime > 30, sitemap: false, ogImg: areImg(o) ? imgMare(o.imagine) : null,
      corp: `<div class="prod prod-inactiv"><div class="prod-poza${areImg(o) ? "" : " fara"}">${areImg(o) ? `<img src="${esc(imgMare(o.imagine))}" alt="${esc(o.titlu)}" decoding="async" referrerpolicy="no-referrer" width="560" height="420" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('fara')">` : ""}<span class="badge badge-gri">${o.ascuns ? "Indisponibil" : "Încheiată"}</span></div>
<div class="prod-info"><h1>${esc(o.titlu)}</h1><p class="prod-mag">${esc(numeMag(o.magazin))}${o.marca && marciPagina.some((b) => b.id === o.marca.id) ? ` · <a href="/brand/${esc(o.marca.id)}/">${esc(o.marca.nume)}</a>` : ""}</p>
<div class="stare-inactiv"><b>${o.ascuns ? "Momentan indisponibil" : "Ofertă încheiată"}</b><p>${esc(stare)}</p></div>
<div class="prod-pret pret-vechi-inactiv"><span>Ultimul preț văzut</span><b>${lei(o.pret)}</b><s>${lei(o.pretVechi)}</s></div>
${!oprit && /^https?:/.test(o.url ?? "") ? `<a class="btn prod-btn btn-sec" href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">Verifică prețul actual la ${esc(numeMag(o.magazin))} ${icoana("extern")}</a>` : ""}
<p class="legaturi">${caleSub ? `<a class="mare" href="${caleSub}">Oferte actuale la ${esc(jos(subO.nume))}</a>` : c ? `<a class="mare" href="${caleCat}">Oferte actuale la ${esc(jos(c.nume))}</a>` : ""}<a href="/cauta/?q=${encodeURIComponent(o.titlu.split(/\s+/).slice(0, 4).join(" "))}">Caută produse asemănătoare</a></p></div></div>
${pt.length >= 2 ? `<section class="prod-sec"><h2>Istoricul prețului</h2><div class="grafic-w">${graficPret(pt, o.pret)}</div></section>` : ""}
${alt.length ? `<section class="prod-sec"><h2>Același model la alte magazine, acum</h2><div class="compara-tab">${alt.map((x) => `<div class="cmp-r"><a href="${caleProdus.get(x.id)}">${esc(x.titlu)}</a><span>${esc(numeMag(x.magazin))}</span><b>${lei(x.pret)}</b><i></i><a class="btn" href="${esc(x.url)}" rel="sponsored nofollow noopener" target="_blank">Vezi ${icoana("extern")}</a></div>`).join("")}</div></section>` : ""}
${sim.length ? `<section class="prod-sec"><h2>Oferte similare acum</h2>${gridCards(sim)}</section>` : ""}` });
  }
  if (listaInactive.length) paginaEd({ cale: "/oferte-incheiate/", titlu: `Oferte încheiate recent | ${BRAND}`, descriere: "Produse care au avut reducere pe Pretino în ultimele săptămâni, dar a căror ofertă s-a încheiat sau nu mai e afișată momentan. Vezi istoricul prețului și alternative actuale.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Oferte încheiate", cale: "/oferte-incheiate/" }], noindex: true, sitemap: false,
    corp: `<h1>Oferte încheiate recent</h1><p class="intro">Aceste produse au avut reducere pe Pretino, dar oferta s-a încheiat sau nu o mai afișăm momentan. Pe pagina fiecăruia găsești istoricul prețului și alternative actuale.</p><ul class="lista-linkuri">${listaInactive.map((x) => `<li><a href="${x.cale}">${esc(x.o.titlu)}</a></li>`).join("")}</ul>` });
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
// Black Friday: pagina de campanie construita din catalogul real (fara oferte sau preturi inventate)
if (BF_ON) {
  const cale = "/black-friday/", maxR = Math.max(...sortate.map(reducere)), topEc = sortEc(sortate), medieBf = Math.round(sortate.reduce((a, o) => a + reducere(o), 0) / sortate.length);
  const mBf = magCuOferte.filter((m) => magIndexabil(m.id)).map((m) => ({ m, n: sortate.filter((o) => o.magazin === m.id).length })).sort((a, b) => b.n - a.n);
  const faqBf = [
    { q: "Când este Black Friday 2026?", a: `Black Friday 2026 este vineri, ${BF_DATA}. Multe magazine încep însă campaniile cu zile sau chiar săptămâni înainte, așa că ofertele apar de obicei mai devreme.` },
    { q: "Cum știu dacă reducerea de Black Friday este reală?", a: "Compară prețul afișat cu prețul de dinainte de campanie, nu doar cu prețul tăiat din pagină. Pe Pretino vezi prețul de referință al magazinului și, unde avem istoric, evoluția prețului. Reducerile foarte mari (peste 50–60%) merită verificate cu atenție în magazin." },
    { q: "Pretino vinde produse?", a: "Nu. Pretino adună ofertele magazinelor din România și te trimite în magazin, unde verifici prețul final, stocul și condițiile de livrare și retur." },
    { q: "Cât de des se actualizează ofertele?", a: `Catalogul este reactualizat periodic din magazinele partenere. ${actualizatText ? actualizatText + "." : "Data ultimei actualizări apare în partea de sus a paginilor cu oferte."} Prețurile se pot schimba rapid în campanii, deci verifică prețul în magazin înainte de comandă.` },
  ];
  const sfaturi = ["Fă-ți o listă cu produsele dorite și prețul la care le-ai cumpăra, înainte de începerea campaniilor.", "Compară același produs în mai multe magazine: reducerea cea mai mare nu înseamnă mereu prețul cel mai mic.", "Adaugă în calcul transportul, comisioanele și termenul de retur; un preț mic cu livrare scumpă poate ieși mai prost.", "Verifică garanția și vânzătorul, mai ales la produsele resigilate sau refurbished (le marcăm clar pe card).", "Nu te grăbi la stocuri limitate fără să compari; ofertele serioase se repetă adesea pe parcursul campaniei."];
  paginaEd({ cale, titlu: `Black Friday 2026 – oferte și reduceri din magazinele din România | ${BRAND}`, descriere: `Ofertele de Black Friday ${BF_DATA.split(" ").pop()} din ${nrMag(sortate)} magazine din România: ${sortate.length.toLocaleString("ro-RO")} produse cu reducere, cele mai mari economii și sfaturi ca să verifici o ofertă reală.`, migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Black Friday 2026", cale }],
    schema: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqBf.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }],
    corp: `<h1>Black Friday 2026: oferte și reduceri</h1><p class="intro">Black Friday 2026 este pe ${esc(BF_DATA)}. Aici găsești produsele cu cele mai mari reduceri din magazinele pe care le urmărim, ca să compari înainte să cumperi. Pretino nu vinde produse: te trimite în magazin, unde verifici prețul final.</p>
${actualizatText ? `<p class="actualizat">${esc(actualizatText)}</p>` : ""}<p class="stat-linie"><b>${sortate.length.toLocaleString("ro-RO")}</b> oferte din <b>${nrMag(sortate)}</b> magazine · reducere medie <b>${medieBf}%</b> · cea mai mare reducere <b>-${maxR}%</b> · cea mai mare economie <b>${lei(ec(topEc[0]))}</b></p>
<h2>Cele mai mari reduceri (în procente)</h2>${gridCards(sortate.slice(0, 24))}
<h2>Cele mai mari economii (în lei)</h2><p class="intro">Reducerea în procente poate păcăli la produsele ieftine; aici sunt ofertele la care economisești cel mai mult în bani.</p>${gridCards(topEc.slice(0, 12))}
${mBf.length ? `<h2>Oferte pe magazine</h2><ul class="lista-linkuri">${mBf.map((x) => `<li><a href="/magazin/${x.m.id}/">Oferte ${esc(x.m.nume)}</a> <span>${x.n} oferte</span></li>`).join("")}</ul>` : ""}
${topuri.filter((t) => !t.sub).length ? `<h2>Top economii pe categorii</h2><ul class="lista-linkuri">${topuri.filter((t) => !t.sub).map((t) => `<li><a href="${t.cale}">Top ${esc(t.nume)}</a> <span>${t.lista.length} oferte</span></li>`).join("")}</ul>` : ""}
<section class="text-seo"><h2>Cum verifici o ofertă de Black Friday</h2><ul>${sfaturi.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p>Citește și <a href="${CALE_GHID}">cum interpretăm reducerile pe Pretino</a> și <a href="/ghiduri/">ghidurile de cumpărare</a>.</p></section>
${faqHtml(faqBf)}` });
}
// Pagini de sezon (cadouri, Cyber Monday) și „Prețuri scăzute azi”, toate din catalogul real
const colectie = ({ cale, nume, h1, intro, lista, n = 48, faq = [], legaturi = "" }) => {
  if (!lista.length) return false;
  const l = lista.slice(0, n), medie = Math.round(lista.reduce((x, o) => x + reducere(o), 0) / lista.length), mags = [...new Set(lista.map((o) => numeMag(o.magazin)))];
  const titlu = [`${nume} | ${BRAND}`].find((t) => t.length <= 75) ?? `${nume.slice(0, 64)}… | ${BRAND}`;
  paginaEd({ cale, titlu, descriere: `${intro.slice(0, 150).replace(/\s+\S*$/, "")}… ${lista.length} oferte din ${mags.length} ${mags.length === 1 ? "magazin" : "magazine"}, reducere medie ${medie}%.`, migaje: [{ nume: "Acasă", cale: "/" }, { nume: h1, cale }],
    schema: faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }] : [],
    corp: `<h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p>${actualizatText ? `<p class="actualizat">${esc(actualizatText)}</p>` : ""}<p class="stat-linie"><b>${lista.length}</b> oferte · din <b>${mags.length}</b> ${mags.length === 1 ? "magazin" : "magazine"} · reducere medie <b>${medie}%</b></p>${gridCards(l)}${legaturi}${faq.length ? `<section class="ghid-faq faq-lista"><h2>Întrebări frecvente</h2>${faq.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</section>` : ""}` });
  return true;
};
const EXCL_CADOU = /cablu|adaptor|patchcord|cartu[sș]|toner|\bhus[aă]\b|folie|cheie|transponder|membran|filtru|garnitur|[sș]urub|consumabil|ulei|lam[aă]|carcas[aă]|suport|piese|pies[aă]|rezerv|baterie/i;
const SUB_FARA = new Set(["accesorii", "imprimante", "retelistica", "chei", "accesorii-auto", "electronice-auto", "scule", "trotinete"]);
const cadouri = sortate.filter((o) => areImg(o) && o.pret >= 30 && !conditie(o) && ["electronice", "electrocasnice", "copii", "moda", "sport", "casa-si-gradina"].includes(o.categorie) && !SUB_FARA.has(o.sub) && !EXCL_CADOU.test(o.titlu));
const PAG_CADOU = [];
for (const [prag, sl] of [[100, "sub-100-lei"], [200, "sub-200-lei"], [500, "sub-500-lei"]]) PAG_CADOU.push({ cale: `/cadouri/craciun-${sl}/`, nume: `Cadouri de Crăciun sub ${prag} lei – idei la reducere`, h1: `Cadouri de Crăciun sub ${prag} lei`, lista: cadouri.filter((o) => o.pret <= prag), intro: `Idei de cadouri de Crăciun 2026 până în ${prag} lei, la reducere acum în magazinele din România: gadgeturi, electrocasnice mici, jucării și accesorii. Comandă din timp, ca să ajungă înainte de sărbători.` });
PAG_CADOU.push({ cale: "/cadouri/pentru-gameri/", nume: "Cadouri pentru gameri – periferice și gadgeturi la reducere", h1: "Cadouri pentru gameri", lista: sortate.filter((o) => areImg(o) && !EXCL_CADOU.test(o.titlu) && /gaming|gamer|\brtx\b|radeon|playstation|\bps5\b|xbox|nintendo|controller|gamepad|joystick|consol[aă]/i.test(o.titlu)), intro: "Cadouri pentru gameri la reducere: mouse-uri, tastaturi și căști de gaming, controllere, componente și accesorii, din magazinele din România." });
PAG_CADOU.push({ cale: "/cadouri/pentru-copii/", nume: "Cadouri pentru copii la reducere – jucării și idei", h1: "Cadouri pentru copii", lista: sortate.filter((o) => areImg(o) && !EXCL_CADOU.test(o.titlu) && (o.categorie === "copii" || /juc[aă]ri|lego|pentru copii|copii\b|bebe/i.test(o.titlu))), intro: "Cadouri pentru copii la reducere, de Moș Nicolae și de Crăciun: jucării, jocuri, articole pentru școală și gadgeturi potrivite pentru cei mici." });
const cadouriOk = PAG_CADOU.filter((x) => x.lista.length >= 8);
const faqCadou = [{ q: "Până când comand cadourile de Crăciun ca să ajungă la timp?", a: "Majoritatea magazinelor livrează în 1–3 zile lucrătoare, dar în decembrie curierii au întârzieri. Comandă până în jur de 15–18 decembrie și verifică termenul afișat în magazin." }, { q: "Pot returna un cadou?", a: "Pentru cumpărăturile online ai, în general, 14 zile pentru retur. Multe magazine prelungesc perioada de retur în sezonul sărbătorilor; verifică politica magazinului înainte de comandă." }];
for (const x of cadouriOk) colectie({ ...x, faq: faqCadou, legaturi: `<nav class="descopera inrudite" aria-label="Alte idei de cadouri"><details open><summary>Alte idei de cadouri</summary><span class="d-grup">${cadouriOk.filter((y) => y !== x).map((y) => `<a href="${y.cale}">${esc(y.h1)}</a>`).join("")}<a class="mare" href="/cadouri/">Toate ideile de cadouri</a></span></details></nav>` });
if (cadouriOk.length) paginaEd({ cale: "/cadouri/", titlu: `Idei de cadouri la reducere – Crăciun 2026 | ${BRAND}`, descriere: "Idei de cadouri la reducere pentru Crăciun și Moș Nicolae: pe buget (sub 100, 200, 500 lei), pentru gameri și pentru copii, din ofertele actuale ale magazinelor din România.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Cadouri", cale: "/cadouri/" }],
  corp: `<h1>Idei de cadouri la reducere</h1><p class="intro">Liste de cadouri construite din ofertele actuale: alege bugetul sau persoana și vezi produsele cu reducere. Se actualizează la fiecare verificare a prețurilor.</p><ul class="lista-ghiduri">${cadouriOk.map((x) => `<li><a href="${x.cale}">${esc(x.h1)}</a><p>${x.lista.length} oferte acum</p></li>`).join("")}</ul>` });
const CM_DATA = "30 noiembrie 2026";
const cmLista = sortate.filter((o) => o.categorie === "electronice" && !EXCL_CADOU.test(o.titlu) && o.pret >= 50);
const CM_ON = colectie({ cale: "/cyber-monday/", nume: "Cyber Monday 2026 – oferte la electronice și IT", h1: "Cyber Monday 2026", lista: cmLista, intro: `Cyber Monday 2026 este luni, ${CM_DATA}, imediat după Black Friday, și se concentrează pe electronice și IT. Aici sunt cele mai mari reduceri actuale la laptopuri, telefoane, monitoare, componente și periferice.`, faq: [{ q: "Când este Cyber Monday 2026?", a: `Cyber Monday 2026 este luni, ${CM_DATA}. În România multe magazine prelungesc ofertele de Black Friday până atunci sau lansează reduceri noi la electronice.` }, { q: "Care e diferența dintre Black Friday și Cyber Monday?", a: "Black Friday acoperă toate categoriile, iar Cyber Monday e axat pe electronice și produse IT. Merită comparate prețurile din ambele zile." }], legaturi: BF_ON ? `<p class="legaturi"><a class="mare" href="/black-friday/">Vezi și ofertele de Black Friday 2026</a></p>` : "" });
// Prețuri scăzute azi: produse ieftinite la ultima actualizare + produse noi la reducere
{ const sc = sortate.map((o) => ({ o, d: scadere(o) })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d).map((x) => x.o);
  const noi = sortate.filter((o) => { const pt = puncte(o); return pt.length === 1 && pt[0].d === ULTIMA_ZI; }).slice(0, 24);
  const ziua = ULTIMA_ZI ? dataRo(ULTIMA_ZI + "T12:00:00Z") : "";
  if (sc.length || noi.length) paginaEd({ cale: "/preturi-scazute-azi/", titlu: `Prețuri scăzute azi – produse care s-au ieftinit | ${BRAND}`, descriere: `Produsele care s-au ieftinit la ultima verificare Pretino${ziua ? ` (${ziua})` : ""}: ${sc.length} scăderi de preț și ${noi.length} produse noi la reducere. Pagina se actualizează la fiecare verificare.`, migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Prețuri scăzute azi", cale: "/preturi-scazute-azi/" }],
    corp: `<h1>Prețuri scăzute azi</h1><p class="intro">Produsele care s-au ieftinit la ultima verificare a prețurilor${ziua ? `, din ${esc(ziua)}` : ""}, ordonate după cât a scăzut prețul. Revino zilnic: lista se schimbă la fiecare actualizare.</p>${actualizatText ? `<p class="actualizat">${esc(actualizatText)}</p>` : ""}
${sc.length ? `<h2>S-au ieftinit (${sc.length})</h2><div class="grid">${sc.slice(0, 48).map((o, i) => card(o, i).replace('<span class="econ-txt">', `<span class="scazut">↓ cu ${lei(scadere(o))} față de verificarea anterioară</span><span class="econ-txt">`)).join("")}</div>` : `<p class="intro">Nicio scădere de preț la ultima verificare.</p>`}
${noi.length ? `<h2>Noi la reducere</h2>${gridCards(noi)}` : ""}<p class="legaturi"><a class="mare" href="/">Toate ofertele</a>${BF_ON ? `<a href="/black-friday/">Black Friday 2026</a>` : ""}<a href="/oferte-incheiate/">Oferte încheiate recent</a></p>` });
}

// Pagini pentru cautari populare
for (const a of ATERIZARI) {
  const l = a.lista, medie = Math.round(l.reduce((x, o) => x + reducere(o), 0) / l.length), ief = Math.min(...l.map((o) => o.pret)), mags = [...new Set(l.map((o) => numeMag(o.magazin)))];
  const caleLista = a.sub && subPagini.includes(`/categorie/${a.cat.slug}/${a.sub.id}/`) ? `/categorie/${a.cat.slug}/${a.sub.id}/` : a.cat ? `/categorie/${a.cat.slug}/` : "/";
  const surori = ATERIZARI.filter((x) => x !== a && x.cat?.slug === a.cat?.slug).slice(0, 10);
  const descriere = `${a.nume} la reducere: ${l.length} oferte din ${mags.length} ${mags.length === 1 ? "magazin" : "magazine"}, de la ${lei(ief)}, cu reducere medie de ${medie}%. Compară și verifică prețul în magazin.`;
  const fq = faqLista(a.nume.charAt(0).toLowerCase() + a.nume.slice(1), l);
  paginaEd({ cale: a.cale, titlu: [`${a.nume} – oferte și reduceri | ${BRAND}`, `${a.nume} la reducere | ${BRAND}`, `${a.nume} | ${BRAND}`].find((t) => t.length <= 75) ?? `${a.nume.slice(0, 62).replace(/\s+\S*$/, "")}… | ${BRAND}`, descriere, catActiva: a.cat?.slug ?? null,
    migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Căutări populare", cale: "/oferte/" }, { nume: a.nume, cale: a.cale }], schema: fq.schema,
    corp: `<h1>${esc(a.nume)} la reducere</h1><p class="intro">Am adunat ${l.length} oferte la ${esc(a.nume.toLowerCase())} din ${mags.map(esc).join(", ")}${a.tip === "pret" ? `, toate cu prețul de cel mult ${lei(a.prag)}` : a.tip === "reducere" ? ", toate cu cel puțin 30% sub prețul de referință" : ""}. Le-am ordonat după reducere; prețul final îl verifici în magazin.</p>
${actualizatText ? `<p class="actualizat">${esc(actualizatText)}</p>` : ""}<p class="stat-linie"><b>${l.length}</b> oferte · de la <b>${lei(ief)}</b> · reducere medie <b>${medie}%</b> · cea mai mare economie <b>${lei(ec(sortEc(l)[0]))}</b></p>
${gridCards(l.slice(0, 48))}<p class="legaturi"><a class="mare" href="${caleLista}">Vezi toate ofertele${a.sub ? ` la ${esc(jos(a.sub.nume))}` : a.cat ? ` la ${esc(jos(a.cat.nume))}` : ""}, cu filtre</a></p>
${fq.html}${surori.length ? `<nav class="descopera inrudite" aria-label="Căutări înrudite"><details open><summary>Căutări înrudite</summary><span class="d-grup">${surori.map((x) => `<a href="${x.cale}">${esc(x.nume)}</a>`).join("")}<a class="mare" href="/oferte/">Toate căutările populare</a></span></details></nav>` : ""}` });
}
if (ATERIZARI.length) paginaEd({ cale: "/oferte/", titlu: `Căutări populare – oferte pe preț, marcă și tip | ${BRAND}`, descriere: "Cele mai căutate tipuri de oferte: produse sub un anumit preț, pe mărci, cu reduceri mari sau după specificații (diagonală, Hz, serie). Toate din catalogul actual Pretino.", migaje: [{ nume: "Acasă", cale: "/" }, { nume: "Căutări populare", cale: "/oferte/" }],
  corp: `<h1>Căutări populare</h1><p class="intro">Liste gata făcute cu ofertele cele mai căutate. Le actualizăm automat din catalog; apar doar când avem suficiente oferte.</p>${categorii.map((c) => ({ c, l: ATERIZARI.filter((a) => a.cat?.slug === c.slug) })).filter((x) => x.l.length).map((x) => `<h2>${esc(x.c.nume)}</h2><ul class="lista-linkuri">${x.l.map((a) => `<li><a href="${a.cale}">${esc(a.nume)}</a> <span>${a.lista.length} oferte</span></li>`).join("")}</ul>`).join("")}` });

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
// mega-meniu: un singur fragment HTML, incarcat de cauta.js doar la prima trecere cu mouse-ul peste categorii
writeFileSync("dist/mega-meniu.txt", categorii.map((c) => {
  const l = sortate.filter((o) => o.categorie === c.slug); if (!l.length) return "";
  const subs = subcategoriiDe(c.slug).map((x) => ({ ...x, n: l.filter((o) => o.sub === x.id).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const at = ATERIZARI.filter((a) => a.cat?.slug === c.slug).slice(0, 6), top = l.filter(areImg).slice(0, 3), t = topDe(c.slug);
  return `<div class="mega" data-cat="${c.slug}"><div class="mega-col"><b class="mega-tit">${icoana(c.slug)}${esc(c.nume)}</b><div class="mega-subs">${subs.map((x) => `<a href="${subPagini.includes(`/categorie/${c.slug}/${x.id}/`) ? `/categorie/${c.slug}/${x.id}/` : `/categorie/${c.slug}/?sub=${x.id}`}">${icoana(x.icoana)}<span>${esc(x.nume)}</span><small>${x.n}</small></a>`).join("")}</div><p class="mega-jos"><a class="mare" href="/categorie/${c.slug}/">Toate ofertele (${l.length})</a>${t ? `<a href="${t.cale}">Top economii</a>` : ""}</p></div>${at.length ? `<div class="mega-col mega-pop"><b class="mega-tit">Căutări populare</b>${at.map((a) => `<a href="${a.cale}">${esc(a.nume)}</a>`).join("")}</div>` : ""}<div class="mega-col mega-top"><b class="mega-tit">Cele mai mari reduceri</b>${top.map((o) => `<a class="mega-of" href="${caleProdus.get(o.id)}"><span class="mo-img"><img src="${esc(imgMare(o.imagine))}" alt="" loading="lazy" referrerpolicy="no-referrer" width="64" height="48"></span><span class="mo-t">${esc(o.titlu)}</span><span class="mo-p"><b>${lei(o.pret)}</b><i>-${reducere(o)}%</i></span></a>`).join("")}</div></div>`;
}).join(""));
// index de cautare (citit de /cauta.js doar cand e nevoie): campuri scurte, ordinea = ordinea listelor din HTML
writeFileSync("dist/cauta-index.json", JSON.stringify({ m: Object.fromEntries(magazine.map((x) => [x.id, x.nume])), c: Object.fromEntries(categorii.map((x) => [x.slug, x.nume])), k: Object.fromEntries(magazine.filter((x) => x.cupon).map((x) => [x.id, x.cupon])), o: sortate.map((o) => ({ id: o.id, t: o.titlu, m: o.magazin, c: o.categorie, s: o.sub ?? "", g: o.tip ?? "", p: o.pret, v: o.pretVechi > o.pret ? o.pretVechi : 0, r: o.referintaMagazin ? 1 : 0, x: conditie(o), b: o.marca?.id ?? "", u: o.url, i: /^https:\/\//.test(o.imagine ?? "") ? o.imagine : "", l: caleProdus.get(o.id), ...(minim(o) ? { n: 1 } : {}) })), en: eticMinim, es: eticScurt, pop: ATERIZARI.slice(0, 8).map((a) => ({ n: a.nume, u: a.cale })) }));
for (const p of pagini) {
  const dir = "dist" + p.cale;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", p.html);
}
writeFileSync("dist/404.html", pagina({ titlu: `Pagină negăsită | ${BRAND}`, descriere: "Pagina nu există.", cale: "/404.html", noindex: true, corp: `<h1>Pagina nu există</h1><p>Adresa nu mai există sau a fost scrisă greșit. Caută în caseta de sus sau alege una dintre variantele de mai jos.</p><p class="legaturi404"><a class="btn-link mare" href="/">Înapoi la oferte</a>${categorii.map((c) => `<a class="btn-link" href="/categorie/${c.slug}/">${esc(c.nume)}</a>`).join("")}<a class="btn-link" href="/ghiduri/">Ghiduri</a><a class="btn-link" href="/favorite/">Favorite</a></p>`, simplu: true }));
// sitemap: doar pagini indexabile, prima pagina a fiecarei liste + paginile informative; fara lastmod (nu avem o data de modificare reala pe pagina)
const nuPaginata = (p) => !/\/pagina-\d+\/$/.test(p.cale);
const indexabile = pagini.filter((p) => p.index && p.sitemap !== false && nuPaginata(p));
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
