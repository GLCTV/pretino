// Teste SEO Pretino: ruleaza pe site-ul generat (dist/, build normal, nu demo). Verifica sabloane, paginare, subcategorii, sitemap, linkuri interne, date structurate, afiliere.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../src/config.js";
import { PE_PAGINA, MIN_SUB_PAGINA } from "../src/seo.js";

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const cale = (f) => "/" + f.replace(/^dist\//, "").replace(/index\.html$/, "");
const m1 = (h, re) => (h.match(re) ?? [])[1] ?? "";
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function testeSeo(ok) {
  if (!existsSync("dist/index.html")) { ok(false, "seo: lipseste dist/ (build)"); return; }
  const fisiere = walk("dist").filter((f) => f.endsWith("index.html"));
  const P = new Map(); // cale -> { html, noindex, titlu, descr, h1, canon }
  for (const f of fisiere) {
    const html = readFileSync(f, "utf8");
    P.set(cale(f), { html, noindex: /<meta name="robots" content="noindex/.test(html), titlu: dec(m1(html, /<title>([^<]*)<\/title>/)), descr: dec(m1(html, /<meta name="description" content="([^"]*)"/)), h1s: (html.match(/<h1[ >]/g) ?? []).length, canon: m1(html, /<link rel="canonical" href="([^"]*)"/) });
  }
  const indexabile = [...P].filter(([, v]) => !v.noindex);

  // 1. sabloane: title, description, H1, canonical propriu
  const rele = indexabile.filter(([c, v]) => !v.titlu || v.titlu.length > 75 || v.descr.length < 40 || v.descr.length > 260 || v.h1s !== 1 || v.canon !== SITE_URL + c).map(([c]) => c);
  ok(rele.length === 0, `seo: title (<=75), description, un singur H1 si canonical propriu pe toate paginile indexabile ${rele.slice(0, 3).join(" ")}`);
  const titluri = indexabile.map(([, v]) => v.titlu);
  ok(new Set(titluri).size === titluri.length, "seo: titluri unice pe paginile indexabile (inclusiv paginile de lista 2+)");
  const home = P.get("/");
  ok(home.titlu === "Oferte și reduceri online din România | Pretino" && /<h1 id="h1">Oferte și reduceri din magazinele din România<\/h1>/.test(home.html), "seo: titlul si H1 pentru pagina principala conform hartii de intentii");
  ok(indexabile.every(([, v]) => !/name="keywords"/.test(v.html)), "seo: fara meta keywords");
  ok(![...P.values()].some((v) => /oferte actuale la /i.test(v.titlu + v.descr)), "seo: fara formularea nenaturala „oferte actuale la ...”");

  // 2. sitemap: doar pagini existente, indexabile, canonical propriu, fara duplicate, fara utilitare
  const sm = readFileSync("dist/sitemap.xml", "utf8"), urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  const rau = urls.filter((u) => { const c = u.replace(SITE_URL, ""); const v = P.get(c); return !u.startsWith(SITE_URL) || !v || v.noindex || v.canon !== u || /\/(cauta|favorite)\//.test(c) || /\/pagina-\d+\//.test(c); });
  ok(urls.length > 5 && rau.length === 0 && new Set(urls).size === urls.length, `seo: sitemap fara URL-uri inexistente, noindex, utilitare, paginate sau duplicate ${rau.slice(0, 2).join(" ")}`);
  ok(!/<lastmod>/.test(sm), "seo: sitemap fara lastmod inventat");
  ok(["/", "/despre/", "/cum-interpretam-reducerile/"].every((c) => urls.includes(SITE_URL + c)), "seo: sitemap include homepage si paginile informative");

  // 3. politica de indexare: utilitare noindex (fara Disallow), productie fara Disallow global
  ok(P.get("/cauta/").noindex && P.get("/favorite/").noindex, "seo: cautarea si favoritele sunt noindex");
  const robots = readFileSync("dist/robots.txt", "utf8");
  ok(/Allow: \//.test(robots) && !/Disallow: ?\S/.test(robots) && /Sitemap: https:\/\/pretino\.ro\/sitemap\.xml/.test(robots), "seo: robots.txt de productie permite accesul si indica sitemap-ul (fara Disallow + noindex combinate)");
  ok(existsSync("dist/404.html") && /noindex/.test(readFileSync("dist/404.html", "utf8")), "seo: pagina 404 exista si e noindex");

  // 4. liste: paginare (URL propriu, produse in HTML, linkuri <a href>, canonical propriu, 404 peste limita, fara dubluri)
  const baze = [...P].filter(([c]) => !/\/pagina-\d+\/$/.test(c) && /data-lista=/.test(P.get(c).html) && !/"total":0,/.test(P.get(c).html)).map(([c]) => c);
  let totalOk = true, linkOk = true, depasit = false, detalii = "";
  for (const b of baze) {
    const d = JSON.parse(dec(m1(P.get(b).html, /data-lista='([^']*)'/)));
    const n = Math.max(1, Math.ceil(d.total / PE_PAGINA)), ids = [];
    for (let p = 1; p <= n; p++) {
      const c = p === 1 ? b : `${b}pagina-${p}/`, v = P.get(c);
      if (!v) { totalOk = false; detalii = `lipseste ${c}`; break; }
      const idp = [...v.html.matchAll(/class="fav" type="button" data-id="([^"]*)"/g)].map((x) => x[1]);
      ids.push(...idp);
      if (idp.length > PE_PAGINA || (p < n && idp.length !== PE_PAGINA)) { totalOk = false; detalii = `${c} are ${idp.length} produse`; }
      if (p < n && !v.html.includes(`<a rel="next" href="${b}pagina-${p + 1}/"`)) { linkOk = false; detalii = `${c} fara link catre pagina ${p + 1}`; }
      if (p > 1 && !v.html.includes(`<a rel="prev" href="${p === 2 ? b : `${b}pagina-${p - 1}/`}"`)) { linkOk = false; detalii = `${c} fara link inapoi`; }
      if (v.canon !== SITE_URL + c) { linkOk = false; detalii = `${c} canonical gresit`; }
    }
    if (ids.length !== d.total || new Set(ids).size !== ids.length) { totalOk = false; detalii = `${b}: ${ids.length} produse in pagini, ${d.total} asteptate, ${new Set(ids).size} unice`; }
    if (P.has(`${b}pagina-${n + 1}/`) || P.has(`${b}pagina-1/`)) depasit = true;
  }
  ok(baze.length > 3 && totalOk, `seo: fiecare pagina de lista are produsele ei in HTML, fara dubluri sau salturi ${detalii}`);
  ok(linkOk, `seo: linkuri HTML catre pagina anterioara/urmatoare si canonical propriu pe paginile 2+ ${detalii}`);
  ok(!depasit, "seo: nu exista pagini peste limita reala (acestea raspund 404) si nici /pagina-1/");

  // 5. subcategorii: pagini proprii cu inventar suficient, linkuri din parinte si breadcrumb inapoi
  const subs = [...P].filter(([c]) => /^\/categorie\/[^/]+\/[^/]+\/$/.test(c) && !/\/pagina-\d+\/$/.test(c)).map(([c]) => c);
  ok(subs.length >= 3, `seo: exista pagini de subcategorii (${subs.length})`);
  const subRau = subs.filter((c) => { const v = P.get(c), parinte = c.replace(/[^/]+\/$/, ""), d = JSON.parse(dec(m1(v.html, /data-lista='([^']*)'/)));
    return d.total < MIN_SUB_PAGINA || !P.get(parinte).html.includes(`href="${c}"`) || !v.html.includes(`<a href="${parinte}">`) || !/<script type="application\/ld\+json">[^<]*BreadcrumbList/.test(v.html); });
  ok(subRau.length === 0, `seo: subcategoriile au inventar >= ${MIN_SUB_PAGINA}, link din categoria parinte, breadcrumb cu link si BreadcrumbList ${subRau.slice(0, 2).join(" ")}`);

  // 6. linkuri interne valide + fara pagini orfane (parcurgere de la homepage)
  const gasite = new Set(["/"]), coada = ["/"], rupte = new Set();
  while (coada.length) {
    const c = coada.pop(), v = P.get(c); if (!v) continue;
    for (const h of v.html.matchAll(/<a [^>]*href="(\/[^"#?]*)"/g)) {
      const t = h[1]; if (/\.[a-z0-9]+$/i.test(t) && !t.endsWith("/")) continue; // fisiere statice
      if (!P.has(t)) { rupte.add(`${c} -> ${t}`); continue; }
      if (!gasite.has(t)) { gasite.add(t); coada.push(t); }
    }
  }
  ok(rupte.size === 0, `seo: linkuri interne valide ${[...rupte].slice(0, 3).join(" ")}`);
  const orfane = [...P.keys()].filter((c) => !gasite.has(c) && c !== "/cauta/"); // /cauta/ e pagina utilitara, deschisa prin formularul de cautare din antet
  ok(orfane.length === 0, `seo: nicio pagina orfana (toate sunt accesibile prin linkuri HTML) ${orfane.slice(0, 3).join(" ")}`);
  const mag = [...P.keys()].filter((c) => /^\/magazin\/[^/]+\/$/.test(c));
  ok(mag.length > 0 && mag.filter((c) => !P.get(c).noindex).every((c) => home.html.includes(`href="${c}"`)), "seo: paginile magazinelor indexabile sunt legate din navigarea paginii principale (subsol)");

  // 7. date structurate: JSON valid, WebSite + Organization pe homepage, BreadcrumbList coerent cu breadcrumb-ul vizibil, fara Product/Offer
  let jsonOk = true, bcOk = true, produs = false;
  for (const [c, v] of P) {
    for (const x of v.html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
      let o; try { o = JSON.parse(x[1]); } catch { jsonOk = false; continue; }
      if (/"@type":"(Product|Offer|AggregateOffer)"/.test(x[1])) produs = true;
      if (o["@type"] === "BreadcrumbList") {
        const vizibil = [...m1(v.html, /<nav class="migaje"[^>]*>(.*?)<\/nav>/s).matchAll(/<(?:a href="([^"]*)"|span id="migaja-curenta")[^>]*>([^<]*)</g)].map((y) => dec(y[2]));
        const nume = o.itemListElement.map((i) => i.name);
        if (nume[nume.length - 1] !== vizibil[vizibil.length - 1] || nume[0] !== "Acasă" || o.itemListElement.some((i, k) => i.position !== k + 1 || !i.item.startsWith(SITE_URL))) bcOk = false;
      }
    }
  }
  ok(jsonOk && /"@type":"WebSite"/.test(home.html) && /"@type":"Organization"/.test(home.html), "seo: JSON-LD valid; WebSite si Organization pe pagina principala");
  ok(bcOk, "seo: BreadcrumbList coerent cu breadcrumb-ul vizibil");
  ok(!produs, "seo: fara Product/Offer pe paginile de lista (Pretino nu e vanzator)");

  // 8. afiliere: linkurile comerciale pastrate neschimbate, cu rel sponsored
  const oferte = JSON.parse(readFileSync("data/oferte.json", "utf8")), urlOf = new Set(oferte.map((o) => o.url));
  const linkuri = [...home.html.matchAll(/<a class="btn" href="([^"]*)" rel="([^"]*)"/g)];
  ok(linkuri.length > 0 && linkuri.every((l) => l[2] === "sponsored nofollow noopener" && urlOf.has(dec(l[1]))), "seo: butoanele „Vezi oferta” pastreaza linkul de afiliere din catalog si rel=\"sponsored nofollow noopener\"");
  ok(/rel="sponsored nofollow noopener"/.test(home.html) && home.html.includes("l.profitshare.ro"), "seo: scriptul Profitshare ramane pe pagini");

  // 9. transparenta ofertelor
  ok(/class="actualizat"/.test(home.html) && P.has("/cum-interpretam-reducerile/") && home.html.includes('href="/cum-interpretam-reducerile/"'), "seo: data verificarii + material „Cum interpretam reducerile” legat din liste");
  const ghid = P.get("/cum-interpretam-reducerile/").html;
  ok(!/cel mai mic pre[tț] din ultimele 30 de zile[^.]*\.\s*(Pretino|Acesta este)/.test(ghid) && /nu înseamnă automat cel mai mic preț din ultimele 30 de zile/.test(ghid), "seo: pretul de referinta nu e prezentat drept „cel mai mic pret din 30 de zile”");
  ok(fisiere.every((f) => !/GVYDBDQ9<\/b>\) în coș/.test(readFileSync(f, "utf8")) || /prețul afișat nu îl include/.test(readFileSync(f, "utf8"))), "seo: cuponul e prezentat cu diferenta fata de pretul afisat");
}
