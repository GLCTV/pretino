// Modul „Campanii si oferte” Pretino: citeste paginile publice eMAG / PC Garage si salveaza campaniile si produsele din ele.
// Independent de orice alt proiect. Nu publica nimic pe site. Nu ocoleste CAPTCHA/anti-bot (raporteaza „blocat”).
//
//   bun scripts/campanii.js --campanii [--magazin emag|pcgarage|toate]     descopera campanii si le citeste metadatele
//   bun scripts/campanii.js --complet  [--magazin ...] [--reia]             + toate produsele din liste (cu paginare)
//   bun scripts/campanii.js --surse | --sursa-adauga <magazin> <url> [titlu] | --sursa-activeaza|--sursa-dezactiveaza|--sursa-sterge <id>
//   bun scripts/campanii.js --campanie-manuala <magazin> <url> <titlu>       introducere manuala (cand accesul e blocat)
//   Oprire: creeaza .pretino-local/opreste-campanii.flag (butonul „Opreste” din program).
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { creeazaClient } from "./lib/http.js";
import { lanseazaBrowser, fetchDinBrowser } from "./lib/browser.js";
import { parseHtml } from "./lib/dom.js";
import { observa, scadereIstoric } from "./lib/istoric-campanii.js";
import { metaCampanie } from "./campanii/generic.js";
import * as emag from "./campanii/emag.js";
import * as pcgarage from "./campanii/pcgarage.js";

export const ADAPTORI = { emag, pcgarage };
const hash = (s) => createHash("sha1").update(String(s)).digest("hex").slice(0, 12);
const citeste = (f, impl) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return impl; } };
const scrie = (f, o) => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + "\n"); };

export function cai(dir = ".") {
  return {
    surse: join(dir, "data", "campanii-surse.json"), campanii: join(dir, "data", "campanii.json"), produse: join(dir, "data", "produse-campanii.json"),
    istoric: join(dir, "data", "istoric-campanii.json"), progres: join(dir, "logs", "campanii-progres.json"), raport: join(dir, "rapoarte", "ultimul-raport-campanii.txt"),
    stop: join(dir, ".pretino-local", "opreste-campanii.flag"), stare: join(dir, ".pretino-local", "campanii-rulare.json"), backup: join(dir, ".pretino-local", "backup-campanii"),
  };
}
// Configuratia surselor e locala (gitignored); la prima rulare se creeaza din data/campanii-surse.default.json
export function incarcaCfg(P) {
  if (!existsSync(P.surse)) {
    const implicit = join(P.surse, "..", "campanii-surse.default.json");
    if (existsSync(implicit)) copyFileSync(implicit, P.surse);
  }
  return citeste(P.surse, { limite: {}, magazine: {}, surse: [] });
}
const LIMITE_IMPLICITE = { concurentaPerMagazin: 2, pauzaMs: 700, maxPaginiListaPerSursa: 15, maxSurseDescoperite: 25, adancimeDescoperire: 1, timeoutMs: 25000, reincercari: 3 };

// ---------- surse (adaugare / editare / dezactivare) ----------
export function domeniuPermis(magazin, url) {
  try { const h = new URL(url).hostname.replace(/^www\./, ""); return (ADAPTORI[magazin]?.DOMENII ?? []).some((d) => h === d || h.endsWith("." + d)); } catch { return false; }
}
export function gestioneazaSurse(cfg, actiune, arg = {}) {
  cfg.surse ??= [];
  if (actiune === "adauga") {
    if (!ADAPTORI[arg.magazin]) throw new Error(`magazin necunoscut: ${arg.magazin}`);
    if (!domeniuPermis(arg.magazin, arg.url)) throw new Error(`URL in afara domeniului aprobat pentru ${arg.magazin}`);
    const url = arg.url.split("#")[0];
    const ex = cfg.surse.find((s) => s.url === url);
    if (ex) { ex.activ = true; return ex; }
    const s = { id: `${arg.magazin}-${hash(url)}`, magazin: arg.magazin, url, titlu: arg.titlu ?? null, activ: true, origine: "manual", adaugata: new Date().toISOString() };
    cfg.surse.push(s); return s;
  }
  const s = cfg.surse.find((x) => x.id === arg.id);
  if (!s) throw new Error(`sursa inexistenta: ${arg.id}`);
  if (actiune === "activeaza") s.activ = true;
  else if (actiune === "dezactiveaza") s.activ = false;
  else if (actiune === "editeaza") { if (!domeniuPermis(s.magazin, arg.url)) throw new Error("URL in afara domeniului aprobat"); s.url = arg.url; if (arg.titlu !== undefined) s.titlu = arg.titlu; }
  else if (actiune === "sterge") cfg.surse = cfg.surse.filter((x) => x.id !== arg.id);
  return s;
}

// ---------- stare campanie ----------
export function stareCampanie(c, azi, verificataAcum, aveaProduse) {
  if (c.sfarsit && c.sfarsit < azi) return "expirata_confirmata";
  if (c.inceput && c.inceput > azi) return "programata";
  if (verificataAcum && ((c.sfarsit && c.sfarsit >= azi) || aveaProduse)) return "activa_confirmata";
  return "necunoscuta";
}

// ---------- rulare ----------
export async function ruleaza({ dir = ".", mod = "campanii", magazin = "toate", reia = false, fetchFn = fetch, browserMod = "auto", fabricaBrowser = lanseazaBrowser, azi = new Date().toISOString().slice(0, 10), pauzaMs, log = console.log, backup = true } = {}) {
  const P = cai(dir);
  const cfg = incarcaCfg(P);
  const lim = { ...LIMITE_IMPLICITE, ...(cfg.limite ?? {}) };
  if (pauzaMs !== undefined) lim.pauzaMs = pauzaMs;
  const oprit = () => existsSync(P.stop);
  if (existsSync(P.stop)) unlinkSync(P.stop);
  const magazineActive = Object.keys(ADAPTORI).filter((m) => (magazin === "toate" || magazin === m) && cfg.magazine?.[m]?.activ !== false);

  let st = reia ? citeste(P.stare, null) : null;
  if (!st || st.terminat || st.mod !== mod) st = null;
  st ??= { id: new Date().toISOString(), mod, magazin, inceput: new Date().toISOString(), terminat: false, oprit: false, gata: [], urmatoare: {}, campanii: {}, produse: {}, erori: [], neverificate: [], contoare: { paginiCitite: 0, campaniiNoi: 0, campaniiActualizate: 0, produseCitite: 0, erori: 0, surseNoi: 0 } };
  st.oprit = false;
  const k = st.contoare;
  const progres = { stare: "ruleaza", mod, magazine: {}, contoare: k, inceput: st.inceput, actualizat: null };
  const salveazaProgres = (extra = {}) => { Object.assign(progres, extra, { actualizat: new Date().toISOString() }); try { scrie(P.progres, progres); } catch {} };
  const salveazaStare = () => scrie(P.stare, st);

  const clienti = {}, inBrowser = {};
  let browser = null, fetchBrowser = null;
  const clientNou = (m, f) => creeazaClient({ concurenta: inBrowser[m] ? 1 : lim.concurentaPerMagazin, pauzaMs: lim.pauzaMs, timeoutMs: lim.timeoutMs, reincercari: inBrowser[m] ? 0 : lim.reincercari, fetchFn: f, oprit });
  const client = (m) => (clienti[m] ??= clientNou(m, inBrowser[m] ? fetchBrowser : fetchFn));
  // trecere la browserul vizibil (utilizatorul completeaza verificarea anti-bot; programul nu o completeaza)
  const treciInBrowser = async (m) => {
    if (!browser) {
      browser = await fabricaBrowser({ profil: join(dir, ".pretino-local", "browser-profil") });
      fetchBrowser = fetchDinBrowser(browser, {
        oprit, pauzaVerificareMs: lim.pauzaVerificareMs, timeoutUtilizatorMs: lim.timeoutVerificareMs,
        onAsteapta: (x) => { progres.asteapta = { id: Date.now(), magazin: progres.curent ?? null, url: x.url, mesaj: x.mesaj }; salveazaProgres({ stare: "asteapta_utilizator" }); log(`  >> ASTEPT UTILIZATORUL: ${x.mesaj} (${x.url})`); },
        onReluat: () => { progres.asteapta = null; salveazaProgres({ stare: "ruleaza" }); },
      });
    }
    inBrowser[m] = true; delete clienti[m];
  };
  const erori = (m, sursa, motiv, blocat = false) => { k.erori++; st.erori.push({ magazin: m, sursa, motiv, blocat }); log(`  EROARE [${m}] ${sursa}: ${motiv}`); };

  for (const m of magazineActive) {
    const ad = ADAPTORI[m];
    const baza = cfg.surse.filter((s) => s.magazin === m && s.activ !== false && !s.descoperita);
    // sursele descoperite anterior participa la citire; cele noi (descoperite in rulare) se adauga in coada
    const coada = [...cfg.surse.filter((s) => s.magazin === m && s.activ !== false)];
    const incercate = new Set();
    let blocat = false;
    progres.magazine[m] = { stare: "ruleaza", surse: coada.length, sursaCurenta: null, pagini: 0 };
    progres.curent = m;
    if (browserMod === "da") await treciInBrowser(m);
    salveazaProgres();
    for (let i = 0; i < coada.length; i++) {
      const s = coada[i];
      if (st.gata.includes(s.id) || incercate.has(s.url)) continue;
      incercate.add(s.url);
      if (blocat) { st.neverificate.push({ magazin: m, sursa: s.url, motiv: "neverificata: accesul la magazin e blocat" }); continue; }
      if (oprit()) { st.oprit = true; break; }
      progres.magazine[m].sursaCurenta = s.url;
      log(`[${m}] ${s.url}`);
      let url = st.urmatoare[s.id] ?? s.url, pagina = 0;
      const vazute = new Set();
      try {
        while (url && !vazute.has(url)) {
          if (oprit()) { st.oprit = true; st.urmatoare[s.id] = url; break; }
          vazute.add(url);
          if (!domeniuPermis(m, url)) { erori(m, s.url, `pagina in afara domeniului aprobat: ${url}`); break; }
          const r = await client(m).ia(url);
          k.paginiCitite++; progres.magazine[m].pagini++; pagina++;
          if (r.lipsa) { erori(m, s.url, `pagina inexistenta (HTTP ${r.status}); starea ramane neverificata`); break; }
          const root = parseHtml(r.corp);
          const cid = `c-${hash(s.url)}`;
          if (pagina === 1 && !st.urmatoare[s.id]) {
            const meta = metaCampanie(root, s.url, r.url);
            st.campanii[cid] = { id: cid, magazin: m, sursaId: s.id, ...meta, titlu: s.titlu ?? meta.titlu, urlOrigine: s.origine && s.origine !== "manual" ? s.origine : null, produse: [], verificat: true };
            // descoperire (doar din sursele configurate, adancime 1, cu limite)
            if (!s.descoperita && lim.adancimeDescoperire >= 1) {
              for (const d of ad.descopera(root, r.url)) {
                if (cfg.surse.some((x) => x.url === d.url) || cfg.surse.filter((x) => x.magazin === m && x.descoperita).length >= lim.maxSurseDescoperite) continue;
                const nou = { id: `${m}-${hash(d.url)}`, magazin: m, url: d.url, titlu: d.titlu, activ: true, descoperita: true, origine: s.url, adaugata: new Date().toISOString() };
                cfg.surse.push(nou); coada.push(nou); k.surseNoi++;
              }
            }
          }
          if (mod === "complet") {
            const { produse, urmatoarea } = ad.parseListare(root, r.url);
            if (!produse.length && pagina === 1) erori(m, s.url, "nicio listare de produse recunoscuta pe pagina (posibil continut incarcat prin JavaScript sau pagina fara produse)");
            for (const p of produse) {
              const pid = `${m}-${p.idMagazin ?? hash(p.url)}`;
              const ex = st.produse[pid];
              st.produse[pid] = { ...(ex ?? {}), ...p, id: pid, magazin: m, campanii: [...new Set([...(ex?.campanii ?? []), cid])] };
              if (st.campanii[cid] && !st.campanii[cid].produse.includes(pid)) st.campanii[cid].produse.push(pid);
              if (!ex) k.produseCitite++;
            }
            st.urmatoare[s.id] = urmatoarea && pagina < lim.maxPaginiListaPerSursa ? urmatoarea : undefined;
            if (urmatoarea && pagina >= lim.maxPaginiListaPerSursa) { st.neverificate.push({ magazin: m, sursa: s.url, motiv: `oprit la limita de ${lim.maxPaginiListaPerSursa} pagini` }); }
            url = st.urmatoare[s.id];
          } else url = null;
          salveazaStare(); salveazaProgres();
        }
        if (!st.oprit) { st.gata.push(s.id); delete st.urmatoare[s.id]; }
      } catch (e) {
        if (e.message === "oprit de utilizator") { st.oprit = true; }
        else if (e.blocat && browserMod !== "nu" && !inBrowser[m]) {
          log(`  acces blocat (${e.motiv}) - trec la browserul vizibil pentru verificare manuala`);
          try { await treciInBrowser(m); incercate.delete(s.url); i--; delete st.urmatoare[s.id]; continue; }
          catch (e2) { erori(m, s.url, `blocat si browserul nu a putut porni: ${e2.message}`, true); blocat = true; progres.magazine[m].stare = "blocat"; }
        }
        else if (e.blocat) { erori(m, s.url, e.message, true); blocat = true; progres.magazine[m].stare = "blocat"; if (st.campanii[`c-${hash(s.url)}`]) st.campanii[`c-${hash(s.url)}`].verificat = false; }
        else { erori(m, s.url, e.message); if (st.campanii[`c-${hash(s.url)}`]) st.campanii[`c-${hash(s.url)}`].verificat = false; }
      }
      salveazaStare(); salveazaProgres();
      if (st.oprit) break;
    }
    if (progres.magazine[m].stare === "ruleaza") progres.magazine[m].stare = st.oprit ? "oprit" : "terminat";
    if (st.oprit) break;
  }

  if (browser) await browser.inchide();
  scrie(P.surse, cfg);
  if (st.oprit) {
    salveazaStare(); salveazaProgres({ stare: "oprit" });
    log("Oprit de utilizator. Progresul e salvat; foloseste „Reia” pentru a continua.");
    scrieRaport(P, st, azi, cfg, false);
    return { oprit: true, complet: false, st };
  }
  // aplicare: backup, apoi combinare fara a sterge date existente
  if (backup) faBackup(P);
  aplica(P, st, azi, k, mod);
  st.terminat = true; salveazaStare();
  const complet = st.erori.length === 0 && st.neverificate.length === 0;
  scrieRaport(P, st, azi, cfg, complet);
  salveazaProgres({ stare: complet ? "complet" : "incomplet" });
  return { oprit: false, complet, st };
}

function faBackup(P) {
  const d = join(P.backup, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(d, { recursive: true });
  for (const f of [P.surse, P.campanii, P.produse, P.istoric]) if (existsSync(f)) copyFileSync(f, join(d, f.split(/[\\/]/).pop()));
  const toate = readdirSync(P.backup).sort();
  for (const x of toate.slice(0, Math.max(0, toate.length - 5))) rmSync(join(P.backup, x), { recursive: true, force: true });
}

function aplica(P, st, azi, k, mod) {
  const campanii = citeste(P.campanii, {}), produse = citeste(P.produse, {}), istoric = citeste(P.istoric, {});
  const acum = new Date().toISOString();
  const esuate = new Set(st.erori.map((e) => e.sursa));
  for (const [id, c] of Object.entries(st.campanii)) {
    const ex = campanii[id];
    const verificata = c.verificat && !esuate.has(c.url);
    const pastreaza = (a, b) => (a ?? null) ?? (b ?? null);
    const nou = {
      ...(ex ?? {}), id, magazin: c.magazin, sursaId: c.sursaId, url: c.url,
      titlu: pastreaza(c.titlu, ex?.titlu), descriere: pastreaza(c.descriere, ex?.descriere), imagine: pastreaza(c.imagine, ex?.imagine), imagineSursa: pastreaza(c.imagineSursa, ex?.imagineSursa),
      inceput: pastreaza(c.inceput, ex?.inceput), sfarsit: pastreaza(c.sfarsit, ex?.sfarsit),
      reducereAnuntata: pastreaza(c.reducereAnuntata, ex?.reducereAnuntata), codPromotional: pastreaza(c.codPromotional, ex?.codPromotional),
      conditii: c.conditii?.length ? c.conditii : ex?.conditii ?? [],
      categorii: [...new Set([...(ex?.categorii ?? []), ...c.produse.map((p) => st.produse[p]?.categorie).filter(Boolean)])],
      produse: [...new Set([...(ex?.produse ?? []), ...c.produse])],
      urlOrigine: c.urlOrigine ?? ex?.urlOrigine ?? null,
      descoperitaLa: ex?.descoperitaLa ?? acum, ultimaVerificareReusita: verificata ? acum : ex?.ultimaVerificareReusita ?? null,
      neverificata: !verificata, ultimaEroare: verificata ? null : (st.erori.find((e) => e.sursa === c.url)?.motiv ?? "neverificata in aceasta rulare"),
      aprobarePublicare: ex?.aprobarePublicare ?? false, eligibilAfiliere: ex?.eligibilAfiliere ?? "necunoscut",
    };
    nou.stare = verificata ? stareCampanie(nou, azi, true, nou.produse.length > 0) : ex?.stare ?? "necunoscuta";
    ex ? k.campaniiActualizate++ : k.campaniiNoi++;
    campanii[id] = nou;
  }
  for (const [id, p] of Object.entries(st.produse)) {
    const ex = produse[id];
    observa(istoric, id, p.pret, azi);
    produse[id] = { ...(ex ?? {}), ...p, campanii: [...new Set([...(ex?.campanii ?? []), ...p.campanii])], descoperitLa: ex?.descoperitLa ?? acum, ultimaVerificare: acum,
      scadereIstoric: scadereIstoric(istoric, id, p.pret, azi) };
  }
  // sursele esuate / neverificate: campaniile existente raman, dar sunt marcate neverificate (dispariția nu dovedește expirarea)
  const probleme = new Map([...st.erori.map((e) => [e.sursa, e.motiv]), ...st.neverificate.map((e) => [e.sursa, e.motiv])]);
  for (const c of Object.values(campanii)) {
    if (probleme.has(c.url) && !(st.campanii[c.id]?.verificat && !esuate.has(c.url))) { c.neverificata = true; c.ultimaEroare = probleme.get(c.url); }
  }
  scrie(P.campanii, campanii); scrie(P.produse, produse); scrie(P.istoric, istoric);
}

function scrieRaport(P, st, azi, cfg, complet) {
  const k = st.contoare;
  const l = [`Raport Campanii si oferte Pretino ${new Date().toISOString()} (mod: ${st.mod})`, st.oprit ? "STARE: OPRIT de utilizator - progres salvat, poate fi reluat." : complet ? "STARE: COMPLET - toate sursele au fost verificate." : "STARE: INCOMPLET - vezi ce a ramas neverificat."];
  l.push(`Pagini citite: ${k.paginiCitite}; campanii noi: ${k.campaniiNoi}; campanii actualizate: ${k.campaniiActualizate}; produse citite: ${k.produseCitite}; surse noi descoperite: ${k.surseNoi}; erori: ${k.erori}`);
  const verificate = cfg.surse.filter((s) => st.gata.includes(s.id));
  l.push("", `Verificate complet (${verificate.length}):`, ...verificate.map((s) => `  + ${s.url}`));
  if (st.erori.length) l.push("", "Erori / acces blocat:", ...st.erori.map((e) => `  ! [${e.magazin}] ${e.sursa}: ${e.motiv}${e.blocat ? "  -> blocat: reincearca mai tarziu sau introdu manual campania" : ""}`));
  if (st.neverificate.length) l.push("", "Neverificate:", ...st.neverificate.map((e) => `  ? [${e.magazin}] ${e.sursa}: ${e.motiv}`));
  l.push("", "Datele existente nu au fost sterse. Campaniile cu verificare esuata sunt marcate „neverificata”.");
  mkdirSync(join(P.raport, ".."), { recursive: true });
  writeFileSync(P.raport, l.join("\n") + "\n");
}

// ---------- CLI ----------
if (import.meta.main) {
  const a = process.argv.slice(2);
  const P = cai(".");
  const val = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  const cfg = () => incarcaCfg(P);
  const sf = (c) => scrie(P.surse, c);
  try {
    const gest = (act) => { const c = cfg(); const s = gestioneazaSurse(c, act, act === "adauga" ? { magazin: a[1], url: a[2], titlu: a[3] } : { id: a[1], url: a[2], titlu: a[3] }); sf(c); console.log(JSON.stringify(s)); };
    if (a.includes("--surse")) console.log(JSON.stringify(cfg().surse, null, 2));
    else if (a[0] === "--sursa-adauga") gest("adauga");
    else if (a[0] === "--sursa-activeaza") gest("activeaza");
    else if (a[0] === "--sursa-dezactiveaza") gest("dezactiveaza");
    else if (a[0] === "--sursa-editeaza") gest("editeaza");
    else if (a[0] === "--sursa-sterge") gest("sterge");
    else if (a[0] === "--campanie-manuala") {
      const [, m, url, ...t] = a;
      if (!ADAPTORI[m] || !domeniuPermis(m, url)) throw new Error("magazin sau URL invalid");
      const campanii = citeste(P.campanii, {}); const id = `c-${hash(url)}`;
      campanii[id] = { ...(campanii[id] ?? {}), id, magazin: m, url, titlu: t.join(" ") || null, manual: true, stare: "necunoscuta", neverificata: true, produse: campanii[id]?.produse ?? [], conditii: [], descoperitaLa: campanii[id]?.descoperitaLa ?? new Date().toISOString(), aprobarePublicare: false, eligibilAfiliere: "necunoscut" };
      scrie(P.campanii, campanii); console.log("Campanie introdusa manual: " + url);
    } else {
      const mod = a.includes("--complet") ? "complet" : "campanii";
      const r = await ruleaza({ mod, magazin: val("--magazin") ?? "toate", reia: a.includes("--reia"), browserMod: val("--browser") ?? "auto" });
      console.log(readFileSync(P.raport, "utf8"));
      process.exit(r.oprit ? 0 : 0);
    }
  } catch (e) { console.error("EROARE: " + e.message); process.exit(1); }
}
