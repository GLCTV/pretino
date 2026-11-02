// Teste pentru modulul Campanii si oferte (fara retea: fisiere de proba si fetch simulat). Rulat din scripts/test.js.
import { readFileSync, writeFileSync as wf, mkdirSync as mk, existsSync as ex, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function testeCampanii(ok) {
  const { parseHtml, qsa } = await import("./lib/dom.js");
  const gen = await import("./campanii/generic.js");
  const em = await import("./campanii/emag.js");
  const pg = await import("./campanii/pcgarage.js");
  const http = await import("./lib/http.js");
  const ist = await import("./lib/istoric-campanii.js");
  const camp = await import("./campanii.js");
  const fx = (n) => readFileSync("tests/fixtures/" + n, "utf8");
  const rf = (f) => readFileSync(f, "utf8");

  const root = parseHtml(fx("emag-listare.html"));
  ok(qsa(root, ".card-item").length === 4 && qsa(root, "div.card-item[data-offer-id='9001'] .product-new-price").length === 2, "dom: selectori de clasa/atribut/descendent");
  const l = em.parseListare(root, "https://www.emag.ro/laptopuri/c");
  ok(l.produse.length === 2, "emag: produse fara pret si duplicate sunt omise");
  const p0 = l.produse[0];
  ok(p0.idMagazin === "111" && p0.idOferta === "9001" && p0.pret === 3399.99 && p0.pretReferinta === 3499.99 && p0.reducereAfisata === "-100 Lei" && p0.disponibilitate === "in_stoc", "emag: pret, pret afisat taiat, reducere afisata, stoc");
  ok(p0.url === "https://www.emag.ro/laptop-test-15/pd/DAAA111/" && p0.vandut === "Necunoscut", "emag: URL fara parametri; vanzator necunoscut cand nu apare");
  ok(l.produse[1].imagine === "https://s.emag/img/222.jpg" && l.produse[1].pretReferinta === null && l.produse[1].disponibilitate === "limited_stock", "emag: imagine din data-src, fara pret de referinta inventat");
  ok(l.urmatoarea === "https://www.emag.ro/laptopuri/p2/c", "emag: pagina urmatoare");
  const dsc = em.descopera(root, "https://www.emag.ro/nav/deals").map((x) => x.url);
  ok(dsc.length === 2 && dsc.every((u) => /emag\.ro\/(lps|guide)/.test(u)), "emag: descoperire doar pagini de campanie de pe domeniul eMAG (fara cos, produse, domenii externe)");
  const mc = gen.metaCampanie(root, "https://www.emag.ro/nav/deals");
  ok(mc.reducereAnuntata === "pana la 30%" && mc.codPromotional === "TOAMNA25" && mc.sfarsit === "2026-11-10" && mc.conditii.length >= 2, "campanie: reducere exacta, cod explicit, data sfarsit, conditii");
  ok(gen.extrageCod("Reducere mare pentru tine, comanda acum") === null && gen.extrageDate("fara date").sfarsit === null, "campanie: nu inventeaza cod sau date");
  ok(gen.extrageDate("01.11.2026 - 10.11.2026").sfarsit === "2026-11-10" && gen.extrageDate("1 noiembrie - 10 noiembrie 2026").inceput === "2026-11-01", "campanie: formate de date");
  ok(camp.stareCampanie({ sfarsit: "2026-11-01" }, "2026-11-02", true, true) === "expirata_confirmata" && camp.stareCampanie({ inceput: "2026-12-01" }, "2026-11-02", true, true) === "programata" && camp.stareCampanie({}, "2026-11-02", false, false) === "necunoscuta" && camp.stareCampanie({}, "2026-11-02", true, true) === "activa_confirmata", "campanie: stari activa/programata/expirata/necunoscuta");
  const sp = pg.parseListare(parseHtml(fx("pcgarage-produse.html")), "https://www.pcgarage.ro/oferte/");
  ok(sp.produse.length === 1 && sp.produse[0].pret === 2499.99 && sp.produse[0].idMagazin === "PG1", "pcgarage: produse din date structurate JSON-LD");
  ok(http.esteBlocare("https://www.pcgarage.ro/validare-acces/", 200, fx("pcgarage-validare.html")) && !http.esteBlocare("https://www.emag.ro/", 200, fx("emag-listare.html")), "http: pagina de validare anti-bot e detectata ca blocare");

  const h = {};
  ist.observa(h, "a", 100, "2026-10-01"); ist.observa(h, "a", 100, "2026-10-10");
  ok(ist.scadereIstoric(h, "a", 80, "2026-10-12") === null, "istoric campanii: observatii insuficiente => fara scadere");
  ist.observa(h, "a", 90, "2026-10-20");
  const sc = ist.scadereIstoric(h, "a", 80, "2026-10-22");
  ok(sc && sc.pretMaximObservat === 100 && sc.procent === 20 && sc.perioadaZile === 21, "istoric campanii: scadere cu perioada indicata");

  const cfg0 = { surse: [] };
  const s1 = camp.gestioneazaSurse(cfg0, "adauga", { magazin: "emag", url: "https://www.emag.ro/lps/x" });
  let respins = false; try { camp.gestioneazaSurse(cfg0, "adauga", { magazin: "emag", url: "https://alt-site.ro/x" }); } catch { respins = true; }
  camp.gestioneazaSurse(cfg0, "dezactiveaza", { id: s1.id });
  ok(respins && cfg0.surse[0].activ === false, "surse: URL in afara domeniului respins; dezactivare");

  const pagini = { "https://www.emag.ro/nav/deals": fx("emag-listare.html"), "https://www.emag.ro/laptopuri/p2/c": fx("emag-listare-p2.html") };
  const raspuns = (url, c) => (c === undefined ? { ok: false, status: 404, url, text: async () => "", headers: new Map() } : { ok: true, status: 200, url, text: async () => c, headers: new Map() });
  const fetchSim = async (url) => raspuns(url, pagini[url.split("?")[0]]);
  const dir = mkdtempSync(join(tmpdir(), "pretino-camp-"));
  mk(join(dir, "data"), { recursive: true });
  wf(join(dir, "data", "campanii-surse.json"), JSON.stringify({ limite: { maxPaginiListaPerSursa: 5, adancimeDescoperire: 0 }, magazine: { emag: { activ: true } }, surse: [{ id: "e1", magazin: "emag", url: "https://www.emag.ro/nav/deals", titlu: "Oferte", activ: true, origine: "manual" }] }));
  const tacut = () => {};
  const rul = (o) => camp.ruleaza({ dir, mod: "complet", magazin: "emag", pauzaMs: 0, log: tacut, ...o });
  const r1 = await rul({ fetchFn: fetchSim });
  const C = Object.values(JSON.parse(rf(join(dir, "data", "campanii.json"))));
  const PR = JSON.parse(rf(join(dir, "data", "produse-campanii.json")));
  ok(Object.keys(PR).length === 3 && r1.st.contoare.produseCitite === 3, "rulare: toate paginile citite (paginare), fara duplicate");
  ok(C[0].stare === "activa_confirmata" && C[0].produse.length === 3 && C[0].aprobarePublicare === false && C[0].eligibilAfiliere === "necunoscut", "rulare: campanie activa confirmata; aprobare publicare si eligibilitate afiliere separate, nepublicate");
  ok(PR["emag-111"].campanii.length === 1 && PR["emag-444"].reducereAfisata === "-8%" && PR["emag-444"].scadereIstoric === null, "rulare: reducerea afisata separata de istoric (fara istoric => null)");
  ok(r1.complet && ex(join(dir, ".pretino-local", "backup-campanii")), "rulare: raport complet si backup inainte de aplicare");
  const r2 = await rul({ fetchFn: fetchSim });
  ok(Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3 && r2.st.contoare.campaniiActualizate === 1 && r2.st.contoare.campaniiNoi === 0, "rulare repetata: fara duplicate, campanie actualizata");
  const r3 = await rul({ fetchFn: async (u) => raspuns("https://www.emag.ro/validare-acces/", fx("pcgarage-validare.html")) });
  const C3 = Object.values(JSON.parse(rf(join(dir, "data", "campanii.json"))))[0];
  ok(!r3.complet && r3.st.erori[0].blocat && C3.neverificata === true && C3.stare === "activa_confirmata" && Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3, "blocare: raportata, nu sterge date, starea ramane, marcata neverificata");
  const gol = { ...pagini, "https://www.emag.ro/nav/deals": "<html><body></body></html>" };
  const r4 = await rul({ fetchFn: async (u) => raspuns(u, gol[u.split("?")[0]]) });
  ok(!r4.complet && Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3, "pagina fara produse: eroare raportata, date pastrate");

  const dir2 = mkdtempSync(join(tmpdir(), "pretino-camp2-")); mk(join(dir2, "data"), { recursive: true });
  wf(join(dir2, "data", "campanii-surse.json"), JSON.stringify({ limite: { adancimeDescoperire: 0 }, magazine: { emag: { activ: true } }, surse: [{ id: "e1", magazin: "emag", url: "https://www.emag.ro/nav/deals", activ: true }] }));
  let n = 0;
  const fetchOpreste = async (url) => { n++; if (n === 1) { mk(join(dir2, ".pretino-local"), { recursive: true }); wf(join(dir2, ".pretino-local", "opreste-campanii.flag"), "1"); } return fetchSim(url); };
  const o1 = await camp.ruleaza({ dir: dir2, mod: "complet", magazin: "emag", fetchFn: fetchOpreste, pauzaMs: 0, log: tacut });
  ok(o1.oprit && !o1.complet && JSON.parse(rf(join(dir2, ".pretino-local", "campanii-rulare.json"))).terminat === false, "oprire: progres salvat, rulare marcata neterminata");
  const o2 = await camp.ruleaza({ dir: dir2, mod: "complet", magazin: "emag", reia: true, fetchFn: fetchSim, pauzaMs: 0, log: tacut });
  ok(!o2.oprit && o2.complet && Object.keys(JSON.parse(rf(join(dir2, "data", "produse-campanii.json")))).length === 3, "reluare: continua si termina");
  rmSync(dir, { recursive: true, force: true }); rmSync(dir2, { recursive: true, force: true });
}
