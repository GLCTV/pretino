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
  ok(/class="actualizat[ "]/.test(home.html) && P.has("/cum-interpretam-reducerile/") && home.html.includes('href="/cum-interpretam-reducerile/"'), "seo: data verificarii + material „Cum interpretam reducerile” legat din liste");
  const ghid = P.get("/cum-interpretam-reducerile/").html;
  ok(!/cel mai mic pre[tț] din ultimele 30 de zile[^.]*\.\s*(Pretino|Acesta este)/.test(ghid) && /nu înseamnă automat cel mai mic preț din ultimele 30 de zile/.test(ghid), "seo: pretul de referinta nu e prezentat drept „cel mai mic pret din 30 de zile”");
  ok(fisiere.every((f) => !/GVYDBDQ9<\/b>\) în coș/.test(readFileSync(f, "utf8")) || /prețul afișat nu îl include/.test(readFileSync(f, "utf8"))), "seo: cuponul e prezentat cu diferenta fata de pretul afisat");

  // 10. pagini editoriale: ghiduri, topuri de economii, branduri
  const cai = [...P.keys()], sitemap = readFileSync("dist/sitemap.xml", "utf8");
  const ghiduri = cai.filter((c) => /^\/ghiduri\/[^/]+\/$/.test(c));
  ok(ghiduri.length >= 4 && ghiduri.every((c) => /"@type":"Article"/.test(P.get(c).html) && /"datePublished":"\d{4}-\d{2}-\d{2}"/.test(P.get(c).html) && sitemap.includes(`<loc>${SITE_URL}${c}</loc>`)), "seo: ghidurile au Article + data publicarii reala si sunt in sitemap");
  ok(P.has("/ghiduri/") && sitemap.includes(`${SITE_URL}/ghiduri/`) && home.html.includes('href="/ghiduri/"'), "seo: pagina Ghiduri exista, e in sitemap si legata din site");
  const topuri = cai.filter((c) => /^\/top-oferte\/[^/]+\/(?:[^/]+\/)?$/.test(c));
  const ec = (h) => [...h.matchAll(/<span class="econ">Economisești<b>([\d.,]+) lei<\/b>/g)].map((x) => Number(x[1].replace(/\./g, "").replace(",", ".")));
  ok(topuri.length >= 3 && topuri.every((c) => { const e = ec(P.get(c).html); return e.length >= 8 && e.length <= 24 && e.every((x, i) => !i || e[i - 1] >= x); }), `seo: topurile de economii au 8-24 oferte ordonate dupa economia in lei (${topuri.length} pagini)`);
  ok(P.has("/top-oferte/") && home.html.includes('href="/top-oferte/"'), "seo: pagina Top economii exista si e legata din site");
  const marci = cai.filter((c) => /^\/brand\/[^/]+\/$/.test(c));
  const indexMarci = JSON.parse(readFileSync("dist/cauta-index.json", "utf8")).o;
  ok(marci.length >= 3 && marci.every((c) => { const id = c.split("/")[2], l = indexMarci.filter((o) => o.b === id); return l.length >= 15 && sitemap.includes(`<loc>${SITE_URL}${c}</loc>`); }), `seo: paginile de brand au minimum 15 oferte si sunt in sitemap (${marci.length} marci)`);
  ok(marci.every((c) => { const id = c.split("/")[2], h = P.get(c).html; const titluri = [...h.matchAll(/<a class="titlu"[^>]*>([^<]*)</g)].map((x) => dec(x[1]).toLowerCase().replace(/[^a-z0-9+ -]/g, " ")); return titluri.length > 0 && titluri.every((t) => t.replace(/[- ]+/g, "").includes(id.replace(/-/g, ""))); }), "seo: ofertele de pe pagina unui brand contin numele brandului in titlu");
  ok(!/oferte relevante acum/i.test(P.get("/ghiduri/cum-verifici-o-reducere-reala/").html) && /Oferte relevante acum/.test(P.get("/ghiduri/produse-resigilate-si-refurbished/").html) === ec(P.get("/ghiduri/produse-resigilate-si-refurbished/").html).length > 0, "seo: ofertele relevante apar in ghid doar cand exista in catalog");
  // UX: linie de actualizare compacta, butoane cu numele magazinului, tinte tactile, filtre active, comparare, stari goale
  const cs = readFileSync("public/cauta.js", "utf8"), css = readFileSync("src/stil.css", "utf8");
  ok(/<details class="actualizat info-pret">/.test(home.html) && /<time datetime=/.test(home.html), "ux: linia „Prețuri actualizate” este compactă (detalii la cerere), cu <time>");
  ok(/<a class="btn" href="[^"]*" rel="[^"]*" target="_blank" aria-label="Vezi oferta la [^"]+ \(se deschide în magazin/.test(home.html) && />Vezi la [^<]+ <svg/.test(home.html), "ux: butonul de pe card numește magazinul și anunță că se deschide în magazin");
  ok(/class="fav"[^>]*data-p="[\d.]+"/.test(home.html) && /\.fav\{[^}]*width:40px;height:40px/.test(css), "ux: inima de favorite are preț (pentru alerta de scădere) și țintă tactilă de 40px");
  ok(/<option value="red">Reducere mare<\/option>/.test(home.html) && !/descrescătoare/.test(home.html), "ux: etichetele de sortare sunt scurte");
  ok(/id="active"/.test(home.html) && /id="cnt-filtre"/.test(home.html) && /id="aplica"/.test(home.html), "ux: filtre active, contor pe „Filtre” și buton „Vezi N oferte” în panou");
  ok(/<nav class="descopera"[^>]*><details open>/.test(home.html), "ux: blocul Descoperă este pliabil");
  ok(/prefers-color-scheme: light/.test(home.html) && /name="color-scheme"/.test(home.html), "ux: tema respectă setarea sistemului când nu există alegere");
  ok(/dupaRelevanta/.test(cs) && /rel: function/.test(cs) && /pretino-fav-pret/.test(cs) && /data-cmp/.test(cs) && /class="sus"|"sus"/.test(cs) && /poate-dr/.test(cs), "ux: relevanță la căutare, preț la salvare, comparare, „Înapoi sus” și indicii de derulare există în cauta.js");
  ok(/Încearcă: /.test(cs) && /Nu ai salvat nicio ofertă/.test(cs) && /Nicio ofertă cu filtrele alese/.test(cs), "ux: stări goale utile (căutare, favorite, filtre)");
  const f404 = readFileSync("dist/404.html", "utf8");
  ok(/href="\/categorie\/electronice\/"/.test(f404) && /name="q"/.test(f404), "ux: pagina 404 are căutare și categorii");
  // grafica: imagine Open Graph, carduri sociale, statistici reale pe prima pagina, ilustratie in culoarea categoriei
  ok(/property="og:image" content="https:\/\/[^"]+\/og\.png"/.test(home.html) && /name="twitter:card" content="summary_large_image"/.test(home.html) && /property="og:title"/.test(home.html) && existsSync("dist/og.png") && statSync("dist/og.png").size > 5000, "grafica: Open Graph + Twitter Card cu imagine 1200x630 existentă");
  const st = home.html.match(/<ul class="hero-stat"[\s\S]*?<\/ul>/);
  ok(!!st && /<b>[\d.]+<\/b>/.test(st[0]), "grafica: prima pagină are statistici din catalog (număr de oferte, magazine)");
  ok(/var\(--c,#61e2c5\)/.test(P.get("/categorie/electronice/").html), "grafica: ilustrația din hero folosește culoarea categoriei");
  ok(/<footer><div class="f-marca">/.test(home.html) && /class="f-legal"/.test(home.html), "grafica: subsolul are marca și textul legal în blocuri proprii");
  const imgs = [...home.html.matchAll(/<img src="https:[^"]*" alt="([^"]*)"/g)];
  ok(imgs.length > 0 && imgs.every((x) => x[1].trim().length > 3), "seo: imaginile produselor au text alternativ (titlul produsului)");
  // ghiduri imbogatite: cuprins cu ancore valide, casete, tabele accesibile, FAQ cu schema, calculator/checklist, oferte reale in text
  for (const c of ghiduri) {
    const h = P.get(c).html, ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
    const ancore = [...h.matchAll(/<nav class="cuprins"[\s\S]*?<\/nav>/g)].flatMap((n) => [...n[0].matchAll(/href="#([^"]+)"/g)].map((x) => x[1]));
    ok(ancore.length >= 4 && ancore.every((a) => ids.has(a)), `seo: ${c} are cuprins cu ancore care exista in pagina`);
    ok(/class="caseta verdict"/.test(h) && /class="caseta (tip|atentie)"/.test(h) && /\d+ min de citit/.test(h) && /class="hero ghid-hero"/.test(h), `seo: ${c} are verdict, casete, timp de citit si ilustratie`);
    ok(/<details><summary>/.test(h) && /"@type":"FAQPage"/.test(h) && /data-check=/.test(h), `seo: ${c} are FAQ (cu schema) si checklist`);
    ok(/<table>/.test(h) ? /<caption>/.test(h) && /scope="col"/.test(h) && /scope="row"/.test(h) : true, `seo: tabelele din ${c} sunt accesibile (caption, scope)`);
    ok(!/<script[^>]*ghid\.js/.test(h) || existsSync("dist/ghid.js"), `seo: ${c} incarca ghid.js existent`);
  }
  ok(/data-calc/.test(P.get("/ghiduri/cum-verifici-o-reducere-reala/").html), "seo: ghidul despre reduceri are calculator");
  ok(ghiduri.filter((c) => /class="ghid-inline"/.test(P.get(c).html)).every((c) => ec(P.get(c).html).length >= 3), "seo: ofertele din interiorul ghidurilor sunt carduri reale din catalog");
  ok(home.html.includes('id="f-nou"') && /f-nou/.test(readFileSync("public/cauta.js", "utf8")), "seo: filtrul „Doar produse noi” este prezent in HTML si in cauta.js");
}
