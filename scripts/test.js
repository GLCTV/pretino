// Teste Pretino: build, independență față de alte proiecte, secrete, versiune program, istoric.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { actualizeazaIstoric } from "./lib/istoric.js";

let esecuri = 0;
const ok = (c, m) => { console.log((c ? "OK   " : "EȘEC ") + m); if (!c) esecuri++; };

function fisiere(d, acc = []) {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git", ".pretino-local", "logs", "rapoarte"].includes(n)) continue;
    const p = join(d, n);
    statSync(p).isDirectory() ? fisiere(p, acc) : acc.push(p);
  }
  return acc;
}
const toate = fisiere(".").map((f) => f.replace(/\\/g, "/")); // căi cu / și pe Windows
const DATE_GENERATE = /(^|\/)data\/(oferte|istoric-preturi)\.json$/; // catalog generat din feed-urile magazinelor (linkurile de afiliere ale contului de afiliat apar legitim in el)
const cod = toate.filter((f) => /\.(js|ps1|bat|yml|json|html|css)$/.test(f) && !f.endsWith("scripts/test.js") && !DATE_GENERATE.test(f));

// 1. Independență: codul nu citește/folosește resurse ale altui proiect
const interzise = /configuratiepc|pc-potrivit|ConfiguratiePC|PROFITSHARE_API|aff_code=647099a0b|GVYDBDQ9/i;
ok(!cod.some((f) => interzise.test(readFileSync(f, "utf8"))), "nicio referință la resursele ConfigurațiePC în cod/config");
ok(!toate.filter((f) => DATE_GENERATE.test(f)).some((f) => /configuratiepc|pc-potrivit/i.test(readFileSync(f, "utf8"))), "catalogul nu contine nimic din ConfigurațiePC");
// 2. Secrete
const secret = /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|CLOUDFLARE_API_TOKEN\s*=\s*\S{10,})/;
ok(!toate.filter((f) => !f.endsWith("scripts/test.js")).some((f) => secret.test(readFileSync(f, "utf8"))), "niciun token/secret în fișiere");
ok(!toate.some((f) => f.endsWith(".env")), "niciun fișier .env în proiect");
// 3. Workflow-uri: doar manual
const wf = toate.filter((f) => f.includes(".github/workflows"));
ok(wf.every((f) => !/^\s*(push|schedule|pull_request):/m.test(readFileSync(f, "utf8"))), "workflow-urile nu pornesc la push/programat (doar workflow_dispatch)");
// 4. Versiune program
const v = readFileSync("versiune-program.txt", "utf8").trim();
ok(/^\d+\.\d+$/.test(v), `versiune program validă (${v})`);
// 5. Build real și demo
execSync("bun scripts/build.js", { stdio: "pipe" });
ok(JSON.parse(readFileSync("dist/version.json", "utf8")).demo === false, "build normal nu e demo");
ok(!/DEMO/.test(readFileSync("dist/index.html", "utf8")), "build normal fără conținut DEMO");
execSync("bun scripts/build.js --demo", { stdio: "pipe" });
ok(/DEMO/.test(readFileSync("dist/index.html", "utf8")) && /Disallow: \//.test(readFileSync("dist/robots.txt", "utf8")), "build demo marcat și blocat pentru Google");
execSync("bun scripts/build.js", { stdio: "pipe" }); // lasă dist curat (non-demo)
// 6. Istoric prețuri
let i = actualizeazaIstoric({}, [{ id: "x", pret: 10 }], "2026-11-02");
i = actualizeazaIstoric(i, [{ id: "x", pret: 10 }], "2026-11-03");
ok(i.x.length === 1, "istoric: preț neschimbat nu adaugă intrare");
i = actualizeazaIstoric(i, [{ id: "x", pret: 8 }], "2026-11-04");
ok(i.x.length === 2 && i.x[1].p === 8, "istoric: preț schimbat adaugă intrare");

// 7. Adaptori de surse (cu fișiere de probă, fără rețea)
{
  const { parseCsv } = await import("./lib/csv.js");
  const { parsePret, areReducereReala } = await import("./lib/oferta.js");
  const ps = await import("./surse/profitshare.js");
  const tp = await import("./surse/2performant.js");
  const magazine = JSON.parse(readFileSync("data/magazine.json", "utf8"));
  ok(parsePret("1.299,99") === 1299.99 && parsePret("799.99") === 799.99 && parsePret("1,299.50") === 1299.5, "pret: formate RO si EN");
  const rows = parseCsv(readFileSync("tests/fixtures/profitshare.csv", "utf8"));
  const r = rows.map((x) => ps.dinRand(x, magazine));
  ok(r[0].oferta && r[0].oferta.pret === 3999 && r[0].oferta.pretVechi === 4999 && r[0].oferta.magazin === "itgalaxy" && r[0].oferta.categorie === "electronice", "profitshare: oferta cu reducere citita corect");
  ok(r[0].oferta.url === "https://l.profitshare.ro/l/1", "profitshare: foloseste linkul de afiliere");
  ok(r[1].oferta && !areReducereReala(r[1].oferta), "profitshare: fara pret redus nu e reducere reala");
  ok(r[2].omis === "fara stoc", "profitshare: produs epuizat omis");
  ok(/magazin necunoscut/.test(r[3].omis), "profitshare: magazin necunoscut omis");
  const t = parseCsv(readFileSync("tests/fixtures/2performant.csv", "utf8")).map((x) => tp.dinRand(x, magazine, "AFF"));
  ok(t[0].oferta && t[0].oferta.pretVechi === 999.99 && t[0].oferta.magazin === "evomag", "2performant: oferta citita corect");
  let eroare = false; try { await ps.citeste(magazine, {}); } catch { eroare = true; }
  ok(eroare, "profitshare: fara feed in secrete.env da eroare clara");
}
ok(existsSync("CLAUDE.md") && existsSync("README.md") && existsSync("PROGRES.md"), "CLAUDE.md, README.md, PROGRES.md există");
{ const { PAGINI_LEGALE } = await import("./lib/legal.js");
  ok(PAGINI_LEGALE.length === 5 && PAGINI_LEGALE.every((p) => p.corp().includes("<h1>")), "pagini legale: despre, contact, confidentialitate, cookies, termeni");
  const { OPERATOR } = await import("../src/config.js");
  const completat = OPERATOR.nume && OPERATOR.email;
  ok(PAGINI_LEGALE.every((p) => p.corp().includes("[COMPLETEAZĂ") === !completat), "pagini legale: operatorul completat -> fara marcaje; necompletat -> marcate (publicarea se opreste)");
  ok(!completat || PAGINI_LEGALE.find((p) => p.cale === "/contact/").corp().includes(OPERATOR.email), "pagini legale: emailul de contact apare pe pagina Contact"); }
{ const { dinProdus } = await import("./surse/campanii.js");
  const mg = [{ id: "pcgarage", nume: "PC Garage" }], acum = Date.parse("2026-11-02T15:00:00Z"), v = "2026-11-02T14:00:00Z";
  const base = { magazin: "pcgarage", titlu: "Laptop X", url: "https://www.pcgarage.ro/x/pd/A/", pret: 1000, pretReferinta: 1500, disponibilitate: "in_stoc", ultimaVerificare: v, campanii: ["c1"] };
  const camp = { c1: { sursaId: "pcgarage-laptopuri", categoriePretino: "electronice" } };
  const o = dinProdus(base, mg, camp, acum).oferta;
  ok(o && o.pretVechi === 1500 && o.referintaMagazin === true && o.afiliat === false && o.categorie === "electronice", "campanii->catalog: oferta cu reducere afisata de magazin, fara afiliere");
  ok(dinProdus(base, mg, { c1: { sursaId: "pcgarage-frigidere", categoriePretino: "electrocasnice" } }, acum).oferta?.categorie === "electrocasnice", "campanii->catalog: categoria vine din lista sursa");
  ok(dinProdus({ ...base, pretReferinta: null }, mg, camp, acum).omis, "campanii->catalog: fara pret de referinta nu intra");
  ok(dinProdus({ ...base, disponibilitate: "out_of_stock" }, mg, camp, acum).omis, "campanii->catalog: fara stoc nu intra");
  ok(dinProdus({ ...base, ultimaVerificare: "2026-10-20T10:00:00Z" }, mg, camp, acum).omis, "campanii->catalog: date vechi nu intra");
  ok(dinProdus({ ...base, titlu: "Laptop Resigilat" }, mg, camp, acum).omis, "campanii->catalog: resigilat nu intra");
  ok(dinProdus({ ...base, pretReferinta: 20000 }, mg, camp, acum).omis, "campanii->catalog: reducere suspecta >60% nu intra"); }
{ const { readdirSync } = await import("node:fs");
  const SCR = "l.profitshare.ro/files_shared/lps/js/AZC/NI.js";
  const html = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? html(d + "/" + e.name) : e.name.endsWith(".html") ? [d + "/" + e.name] : []));
  const pag = existsSync("dist") ? html("dist") : [];
  ok(pag.length === 0 || pag.every((f) => readFileSync(f, "utf8").includes(SCR)), "profitshare: scriptul de linkuri automate e pe toate paginile generate");
  const idx = existsSync("dist/cauta-index.json") ? JSON.parse(readFileSync("dist/cauta-index.json", "utf8")) : null;
  ok(!idx || (idx.o.length > 0 && idx.o.every((o) => o.t && o.u && o.p > 0)), "cautare: indexul de oferte e valid");
  ok(pag.length === 0 || (pag.every((f) => /id="cautare"/.test(readFileSync(f, "utf8"))) && /noindex/.test(readFileSync("dist/cauta/index.html", "utf8")) && !/cauta\//.test(readFileSync("dist/sitemap.xml", "utf8"))), "cautare: casuta de cautare pe toate paginile; pagina /cauta/ noindex si fara sitemap");
  ok(pag.length === 0 || pag.every((f) => /\/stil\.css\?v=[0-9a-f]{8}"/.test(readFileSync(f, "utf8"))), "cache: stil.css si cauta.js au versiune in URL (browserul nu foloseste varianta veche)");
  ok(pag.every((f) => !/emag\.ro/i.test(readFileSync(f, "utf8"))), "eMAG interzis (regula Profitshare): niciun link emag.ro in paginile generate"); }
{ const { testePanou } = await import("./test-panou.js"); await testePanou(ok); }
{ const { testeCampanii } = await import("./test-campanii.js"); await testeCampanii(ok); }
console.log(esecuri ? `\n${esecuri} teste eșuate` : "\nToate testele au trecut");
process.exit(esecuri ? 1 : 0);
