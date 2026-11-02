// Teste pentru modulul Campanii si oferte (fara retea: fisiere de proba si fetch simulat). Rulat din scripts/test.js.
import { readFileSync, writeFileSync as wf, mkdirSync as mk, existsSync as ex, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function testeCampanii(ok) {
  const { parseHtml, qsa, text } = await import("./lib/dom.js");
  const text0 = (r) => text(r);
  const gen = await import("./campanii/generic.js");
  const pg = await import("./campanii/pcgarage.js");
  const http = await import("./lib/http.js");
  const ist = await import("./lib/istoric-campanii.js");
  const camp = await import("./campanii.js");
  const fx = (n) => readFileSync("tests/fixtures/" + n, "utf8");
  const rf = (f) => readFileSync(f, "utf8");

  const root = parseHtml(fx("pcgarage-campanie.html"));
  const URL_C = "https://www.pcgarage.ro/oferte/laptopuri/";
  ok(qsa(root, ".product_box").length === 4 && qsa(root, "div.product_box[data-pid='p1'] .bfp_new").length === 1, "dom: selectori de clasa/atribut/descendent");
  const l = pg.parseListare(root, URL_C);
  ok(l.produse.length === 2, "pcgarage: produse fara pret si duplicate sunt omise");
  const p0 = l.produse[0];
  ok(p0.idMagazin === "laptop-test-15" && p0.pret === 3399.99 && p0.pretReferinta === 3499.99 && p0.reducereAfisata === "-100 RON" && p0.disponibilitate === "in_stoc", "pcgarage: pret, pret afisat taiat, reducere afisata, stoc");
  ok(p0.url === "https://www.pcgarage.ro/laptop-test-15/", "pcgarage: URL fara parametri");
  ok(l.produse[1].pretReferinta === null && l.produse[1].disponibilitate === "in_stoc", "pcgarage: fara pret de referinta inventat");
  ok(l.urmatoarea === "https://www.pcgarage.ro/oferte/laptopuri/pagina2/", "pcgarage: pagina urmatoare");
  const dsc = pg.descopera(root, URL_C).map((x) => x.url);
  ok(dsc.length === 3 && dsc.every((u) => /pcgarage\.ro\/(oferte|campanii)/.test(u)), "pcgarage: descoperire doar pagini de campanie de pe domeniul PC Garage (fara cos, produse, domenii externe)");
  const mc = gen.metaCampanie(root, URL_C);
  ok(mc.reducereAnuntata === "pana la 30%" && mc.codPromotional === "TOAMNA25" && mc.sfarsit === "2026-11-10" && mc.conditii.length >= 2, "campanie: reducere exacta, cod explicit, data sfarsit, conditii");
  ok(gen.extrageCod("Reducere mare pentru tine, comanda acum") === null && gen.extrageDate("fara date").sfarsit === null, "campanie: nu inventeaza cod sau date");
  ok(gen.extrageDate("01.11.2026 - 10.11.2026").sfarsit === "2026-11-10" && gen.extrageDate("1 noiembrie - 10 noiembrie 2026").inceput === "2026-11-01", "campanie: formate de date");
  ok(camp.stareCampanie({ sfarsit: "2026-11-01" }, "2026-11-02", true, true) === "expirata_confirmata" && camp.stareCampanie({ inceput: "2026-12-01" }, "2026-11-02", true, true) === "programata" && camp.stareCampanie({}, "2026-11-02", false, false) === "necunoscuta" && camp.stareCampanie({}, "2026-11-02", true, true) === "activa_confirmata", "campanie: stari activa/programata/expirata/necunoscuta");
  const sp = pg.parseListare(parseHtml(fx("pcgarage-produse.html")), "https://www.pcgarage.ro/oferte/");
  ok(sp.produse.length === 1 && sp.produse[0].pret === 2499.99 && sp.produse[0].idMagazin === "PG1", "pcgarage: produse din date structurate JSON-LD");
  const pl = pg.parseListare(parseHtml(fx("pcgarage-listare.html")), "https://www.pcgarage.ro/notebook-laptop/");
  ok(pl.produse.length === 5 && pl.produse[0].pret === 87.49 && pl.produse[0].pretReferinta === 102.93 && pl.produse[0].reducereAfisata === "-15%" && pl.produse[0].idMagazin === "everki-advance", "pcgarage: lista de campanie (bf_*) citita");
  ok(pl.produse[1].pret === 1648.99 && pl.produse[1].pretReferinta === 1899.99 && pl.produse[1].disponibilitate === "in_stoc" && pl.produse[1].imagine === "https://img.pcgarage.ro/l1.jpg" && pl.produse[2].disponibilitate === "indisponibil", "pcgarage: lista de categorie, pret vechi, stoc, imagine din srcset");
  ok(pl.produse[3].titlu === "Laptop DELL 16'' Pro Max 16" && pl.produse[3].pret === 11939.01 && pl.produse[3].pretReferinta === 12998.99 && pl.produse[3].reducereAfisata === "-1.059 RON", "pcgarage: varianta cu titlu in .bf_ptitle a, pret vechi si reducere in RON");
  ok(pl.produse[4].reducereAfisata === "3% reducere in cos" && pl.produse[4].pretReferinta === null && pl.produse[4].etichete.includes("3% reducere in cos"), "pcgarage: „X% reducere in cos” pastrata exact, fara pret vechi inventat");
  ok(pg.parseListare(parseHtml(fx("pcgarage-listare.html")), "https://www.pcgarage.ro/promotie-laptop-desigilate/").produse[0].conditie === "desigilat", "pcgarage: conditie desigilat");
  ok(pl.urmatoarea === "https://www.pcgarage.ro/notebook-laptop/pagina2/" && pg.parseListare(parseHtml(fx("pcgarage-listare.html")), "https://www.pcgarage.ro/notebook-laptop/pagina2/").urmatoarea === "https://www.pcgarage.ro/notebook-laptop/pagina3/", "pcgarage: paginare /paginaN/");
  ok(parseHtml("<p>&rsaquo; % Desigilate &amp; &#259;</p>").children[0].children[0].text.includes("&rsaquo;") && text0(parseHtml("<p>&rsaquo; % Desigilate</p>")) === "› % Desigilate", "dom: entitati HTML decodate");
  ok(http.esteBlocare("https://www.pcgarage.ro/validare-acces/", 200, fx("pcgarage-validare.html")) && !http.esteBlocare("https://www.pcgarage.ro/", 200, fx("pcgarage-campanie.html")), "http: pagina de validare anti-bot e detectata ca blocare");

  ok(http.esteBlocare("https://www.pcgarage.ro/oferte/", 511, "") === "HTTP 511", "http: HTTP 511 (autentificare de retea / anti-bot) tratat ca blocare, nu ca eroare de server");
  const h = {};
  ist.observa(h, "a", 100, "2026-10-01"); ist.observa(h, "a", 100, "2026-10-10");
  ok(ist.scadereIstoric(h, "a", 80, "2026-10-12") === null, "istoric campanii: observatii insuficiente => fara scadere");
  ist.observa(h, "a", 90, "2026-10-20");
  const sc = ist.scadereIstoric(h, "a", 80, "2026-10-22");
  ok(sc && sc.pretMaximObservat === 100 && sc.procent === 20 && sc.perioadaZile === 21, "istoric campanii: scadere cu perioada indicata");

  const cfg0 = { surse: [] };
  const s1 = camp.gestioneazaSurse(cfg0, "adauga", { magazin: "pcgarage", url: "https://www.pcgarage.ro/oferte/x" });
  let respins = false; try { camp.gestioneazaSurse(cfg0, "adauga", { magazin: "pcgarage", url: "https://alt-site.ro/x" }); } catch { respins = true; }
  camp.gestioneazaSurse(cfg0, "dezactiveaza", { id: s1.id });
  ok(respins && cfg0.surse[0].activ === false, "surse: URL in afara domeniului respins; dezactivare");

  const pagini = { "https://www.pcgarage.ro/oferte/laptopuri/": fx("pcgarage-campanie.html"), "https://www.pcgarage.ro/oferte/laptopuri/pagina2/": fx("pcgarage-campanie-p2.html") };
  const raspuns = (url, c) => (c === undefined ? { ok: false, status: 404, url, text: async () => "", headers: new Map() } : { ok: true, status: 200, url, text: async () => c, headers: new Map() });
  const fetchSim = async (url) => raspuns(url, pagini[url.split("?")[0]]);
  const dir = mkdtempSync(join(tmpdir(), "pretino-camp-"));
  mk(join(dir, "data"), { recursive: true });
  wf(join(dir, "data", "campanii-surse.json"), JSON.stringify({ limite: { maxPaginiListaPerSursa: 5, adancimeDescoperire: 0 }, magazine: { pcgarage: { activ: true } }, surse: [{ id: "e1", magazin: "pcgarage", url: "https://www.pcgarage.ro/oferte/laptopuri/", titlu: "Oferte", activ: true, origine: "manual" }] }));
  const tacut = () => {};
  const rul = (o) => camp.ruleaza({ dir, mod: "complet", magazin: "pcgarage", pauzaMs: 0, log: tacut, ...o });
  const r1 = await rul({ fetchFn: fetchSim });
  const C = Object.values(JSON.parse(rf(join(dir, "data", "campanii.json"))));
  const PR = JSON.parse(rf(join(dir, "data", "produse-campanii.json")));
  ok(Object.keys(PR).length === 3 && r1.st.contoare.produseCitite === 3, "rulare: toate paginile citite (paginare), fara duplicate");
  ok(C[0].stare === "activa_confirmata" && C[0].produse.length === 3 && C[0].aprobarePublicare === false && C[0].eligibilAfiliere === "necunoscut", "rulare: campanie activa confirmata; aprobare publicare si eligibilitate afiliere separate, nepublicate");
  ok(PR["pcgarage-laptop-test-15"].campanii.length === 1 && PR["pcgarage-laptop-test-17"].reducereAfisata === "-8%" && PR["pcgarage-laptop-test-17"].scadereIstoric === null, "rulare: reducerea afisata separata de istoric (fara istoric => null)");
  ok(r1.complet && ex(join(dir, ".pretino-local", "backup-campanii")), "rulare: raport complet si backup inainte de aplicare");
  const r2 = await rul({ fetchFn: fetchSim });
  ok(Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3 && r2.st.contoare.campaniiActualizate === 1 && r2.st.contoare.campaniiNoi === 0, "rulare repetata: fara duplicate, campanie actualizata");
  const r3 = await rul({ fetchFn: async (u) => raspuns("https://www.pcgarage.ro/validare-acces/", fx("pcgarage-validare.html")) });
  const C3 = Object.values(JSON.parse(rf(join(dir, "data", "campanii.json"))))[0];
  ok(!r3.complet && r3.st.erori[0].blocat && C3.neverificata === true && C3.stare === "activa_confirmata" && Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3, "blocare: raportata, nu sterge date, starea ramane, marcata neverificata");
  const gol = { ...pagini, "https://www.pcgarage.ro/oferte/laptopuri/": "<html><body></body></html>" };
  const r4 = await rul({ fetchFn: async (u) => raspuns(u, gol[u.split("?")[0]]) });
  ok(!r4.complet && Object.keys(JSON.parse(rf(join(dir, "data", "produse-campanii.json")))).length === 3, "pagina fara produse: eroare raportata, date pastrate");

  const dir2 = mkdtempSync(join(tmpdir(), "pretino-camp2-")); mk(join(dir2, "data"), { recursive: true });
  wf(join(dir2, "data", "campanii-surse.json"), JSON.stringify({ limite: { adancimeDescoperire: 0 }, magazine: { pcgarage: { activ: true } }, surse: [{ id: "e1", magazin: "pcgarage", url: "https://www.pcgarage.ro/oferte/laptopuri/", activ: true }] }));
  let n = 0;
  const fetchOpreste = async (url) => { n++; if (n === 1) { mk(join(dir2, ".pretino-local"), { recursive: true }); wf(join(dir2, ".pretino-local", "opreste-campanii.flag"), "1"); } return fetchSim(url); };
  const o1 = await camp.ruleaza({ dir: dir2, mod: "complet", magazin: "pcgarage", fetchFn: fetchOpreste, pauzaMs: 0, log: tacut });
  ok(o1.oprit && !o1.complet && JSON.parse(rf(join(dir2, ".pretino-local", "campanii-rulare.json"))).terminat === false, "oprire: progres salvat, rulare marcata neterminata");
  const o2 = await camp.ruleaza({ dir: dir2, mod: "complet", magazin: "pcgarage", reia: true, fetchFn: fetchSim, pauzaMs: 0, log: tacut });
  ok(!o2.oprit && o2.complet && Object.keys(JSON.parse(rf(join(dir2, "data", "produse-campanii.json")))).length === 3, "reluare: continua si termina");
  // anti-bot: trece in browser, notifica utilizatorul, asteapta verificarea manuala, apoi continua
  const dir3 = mkdtempSync(join(tmpdir(), "pretino-camp3-")); mk(join(dir3, "data"), { recursive: true });
  wf(join(dir3, "data", "campanii-surse.json"), JSON.stringify({ limite: { adancimeDescoperire: 0, pauzaVerificareMs: 5, timeoutVerificareMs: 3000 }, magazine: { pcgarage: { activ: true } }, surse: [{ id: "e1", magazin: "pcgarage", url: "https://www.pcgarage.ro/oferte/laptopuri/", activ: true }] }));
  let polls = 0, notificat = 0, inchis = false;
  const browserFals = async () => ({
    navigheaza: async () => { polls = 0; },
    stare: async () => (++polls < 4 ? { url: "https://www.pcgarage.ro/validare-acces/", html: fx("pcgarage-validare.html"), status: 200 } : { url: "https://www.pcgarage.ro/oferte/laptopuri/", html: pagini["https://www.pcgarage.ro/oferte/laptopuri/"], status: 200 }),
    adaInFata: async () => { notificat++; }, inchide: async () => { inchis = true; },
  });
  const b1 = await camp.ruleaza({ dir: dir3, mod: "campanii", magazin: "pcgarage", fetchFn: async (u) => raspuns("https://www.pcgarage.ro/validare-acces/", fx("pcgarage-validare.html")), fabricaBrowser: browserFals, pauzaMs: 0, log: tacut });
  ok(b1.complet && notificat === 1 && inchis && Object.keys(JSON.parse(rf(join(dir3, "data", "campanii.json")))).length === 1, "anti-bot: browser vizibil, utilizatorul anuntat, asteptare verificare manuala, apoi continuare");
  const rulari = rf(join(dir3, "logs", "campanii-progres.json"));
  ok(!/asteapta_utilizator/.test(rulari), "anti-bot: dupa verificare starea revine la normal");
  const bl = await import("./lib/browser.js");
  ok(bl.blocatInBrowser({ url: "https://www.pcgarage.ro/oferte/laptopuri/", status: 511, html: "x".repeat(60000) }) === null && bl.blocatInBrowser({ url: "https://www.pcgarage.ro/oferte/laptopuri/", status: 511, html: "" }) === "HTTP 511" && bl.blocatInBrowser({ url: "https://www.pcgarage.ro/validare-acces/", status: 200, html: "" }), "browser: pagina reala mare nu mai e blocata chiar daca statusul ramas e 511; pagina goala 511 ramane blocata");
  // verificare necompletata la timp => blocat, fara stergere de date
  let p2 = 0;
  const browserBlocat = async () => ({ navigheaza: async () => {}, stare: async () => ({ url: "https://www.pcgarage.ro/validare-acces/", html: fx("pcgarage-validare.html"), status: 200 }), adaInFata: async () => {}, inchide: async () => {} });
  const b2 = await camp.ruleaza({ dir: dir3, mod: "campanii", magazin: "pcgarage", fetchFn: async (u) => raspuns("https://www.pcgarage.ro/validare-acces/", fx("pcgarage-validare.html")), fabricaBrowser: browserBlocat, pauzaMs: 0, log: tacut });
  ok(!b2.complet && b2.st.erori[0].blocat && Object.values(JSON.parse(rf(join(dir3, "data", "campanii.json"))))[0].neverificata === true, "anti-bot necompletat: raportat blocat, campania ramane neverificata");
  rmSync(dir3, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true }); rmSync(dir2, { recursive: true, force: true });
}
