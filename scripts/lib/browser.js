// Browser vizibil pentru citirea paginilor cand magazinul cere verificare anti-bot (CAPTCHA / Turnstile).
// Programul NU rezolva si NU ocoleste verificarea: o deschide intr-o fereastra de browser, anunta utilizatorul,
// asteapta ca TU sa o completezi si apoi continua citirea. Profil dedicat Pretino (fara conturile tale), local, pe 127.0.0.1.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { esteBlocare, BlocatError } from "./http.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// In browser, un status 403/511 cu o pagina mare, fara marcaje de verificare, inseamna ca verificarea automata a trecut (continutul real bate statusul)
export function blocatInBrowser(s) {
  const html = s.html ?? "";
  const marcaje = esteBlocare(s.url ?? "", 200, html);
  if (marcaje) return marcaje;
  return html.length < 5000 && esteBlocare(s.url ?? "", s.status, "") ? `HTTP ${s.status}` : null;
}

export function gasesteBrowsere(env = process.env) {
  const c = [env.PRETINO_BROWSER,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  return [...new Set(c.filter((x) => existsSync(x)))];
}
export const gasesteBrowser = (env) => gasesteBrowsere(env)[0] ?? null;

// Inchide instantele ramase din rulari anterioare care folosesc profilul dedicat Pretino (altfel o instanta noua s-ar „lipi” de ele si nu ar porni cu depanare)
export function curataProfil(profil) {
  if (process.platform === "win32") {
    try { spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*browser-profil*' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { stdio: "ignore", timeout: 20000 }); } catch {}
  }
  for (const f of ["DevToolsActivePort", "SingletonLock", "SingletonCookie", "SingletonSocket", "lockfile"]) { try { rmSync(join(profil, f), { force: true }); } catch {} }
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.cereri = new Map(); this.ascultatori = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
      if (m.id && this.cereri.has(m.id)) { const { ok, ko } = this.cereri.get(m.id); this.cereri.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); }
      else if (m.method) this.ascultatori.forEach((f) => f(m));
    };
  }
  trimite(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, ko) => { this.cereri.set(id, { ok, ko }); this.ws.send(JSON.stringify({ id, method, params })); setTimeout(() => this.cereri.has(id) && (this.cereri.delete(id), ko(new Error("timeout CDP " + method))), 30000); });
  }
}

async function lanseazaCu(exe, { profil: profilRel, headless }) {
  const profil = resolve(profilRel); // cale absoluta: Edge/Chrome rezolva caile relative fata de folderul lor, nu al programului
  curataProfil(profil);
  mkdirSync(profil, { recursive: true });
  const args = ["--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check", "--start-maximized", "--disable-popup-blocking", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", ...(headless ? ["--headless=new", "--no-sandbox"] : []), "about:blank"];
  const proc = spawn(exe, args, { stdio: ["ignore", "ignore", "pipe"] });
  let iesit = null, err = "";
  proc.on("exit", (cod) => { iesit = cod ?? -1; });
  proc.stderr?.on("data", (d) => { if (err.length < 400) err += String(d); });
  let port = null, tinta = null;
  for (let i = 0; i < 100 && !tinta; i++) {
    if (!port) { try { port = Number(readFileSync(join(profil, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]) || null; } catch {} }
    if (port) { try { tinta = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {} }
    if (!tinta) { if (iesit !== null && i > 6) break; await sleep(500); }
  }
  if (!tinta) {
    try { proc.kill(); } catch {}
    throw new Error(iesit !== null ? `s-a inchis imediat (cod ${iesit}; probabil a „fuzionat” cu o instanta deja deschisa) ${err.trim().slice(0, 150)}` : `nu raspunde la depanare ${err.trim().slice(0, 150)}`);
  }
  const ws = new WebSocket(tinta.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error("conexiune CDP esuata")); });
  const cdp = new Cdp(ws);
  await cdp.trimite("Page.enable"); await cdp.trimite("Network.enable");
  let status = 200;
  cdp.ascultatori.push((m) => { if (m.method === "Network.responseReceived" && m.params.type === "Document") status = m.params.response.status; });
  await cdp.trimite("Page.bringToFront").catch(() => {});
  const ev = async (expr) => (await cdp.trimite("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.value;
  return {
    async navigheaza(url, timeoutMs = 45000) {
      status = 200;
      await cdp.trimite("Page.bringToFront").catch(() => {});
      await cdp.trimite("Page.navigate", { url });
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) { if ((await ev("document.readyState").catch(() => null)) === "complete") break; await sleep(400); }
      await sleep(900);
      // continut incarcat cu JavaScript / lazy-load: deruleaza pagina si asteapta pana se stabilizeaza (max ~10 s)
      let ultim = -1, stabil = 0;
      for (let i = 0; i < 12 && stabil < 2; i++) {
        const n = await ev("window.scrollTo(0, document.body.scrollHeight); document.getElementsByTagName('*').length").catch(() => -1);
        stabil = n === ultim ? stabil + 1 : 0; ultim = n;
        await sleep(800);
      }
      await ev("window.scrollTo(0, 0)").catch(() => {});
    },
    stare: async () => ({ url: await ev("location.href"), html: await ev("document.documentElement.outerHTML"), status }),
    adaInFata: () => cdp.trimite("Page.bringToFront").catch(() => {}),
    async inchide() { try { await cdp.trimite("Browser.close"); } catch {} try { ws.close(); } catch {} try { proc.kill(); } catch {} await sleep(500); curataProfil(profil); },
  };
}

// Incearca pe rand Chrome, apoi Edge (sau PRETINO_BROWSER / exe dat)
export async function lanseazaBrowser({ exe, profil, headless = false } = {}) {
  const lista = exe ? [exe] : gasesteBrowsere();
  if (!lista.length) throw new Error("nu am gasit Chrome sau Edge pe acest PC (poti seta PRETINO_BROWSER)");
  const erori = [];
  for (const e of lista) {
    try { return await lanseazaCu(e, { profil, headless }); } catch (x) { erori.push(`${e.split(/[\\/]/).pop()}: ${x.message}`); }
  }
  throw new Error(erori.join(" | "));
}

// fetch compatibil cu clientul HTTP; cand apare verificare anti-bot, anunta si asteapta utilizatorul
export function fetchDinBrowser(browser, opt = {}) {
  const { onAsteapta = () => {}, onReluat = () => {}, oprit = () => false } = opt;
  const timeoutUtilizatorMs = opt.timeoutUtilizatorMs ?? 10 * 60 * 1000, pauzaVerificareMs = opt.pauzaVerificareMs ?? 2000;
  let lant = Promise.resolve();
  const raspuns = (url, html, status) => ({ ok: status >= 200 && status < 300, status, url, text: async () => html, headers: new Map() });
  return (url) => {
    const rez = lant.then(async () => {
      await browser.navigheaza(url);
      let s = await browser.stare();
      if (blocatInBrowser(s)) {
        await browser.adaInFata();
        onAsteapta({ url, mesaj: "Magazinul cere verificare anti-bot. Completeaz-o in fereastra de browser deschisa; programul continua singur dupa aceea." });
        const t0 = Date.now();
        let tick = 0, incalzit = false;
        while (blocatInBrowser(s)) {
          if (oprit()) throw new Error("oprit de utilizator");
          if (Date.now() - t0 > timeoutUtilizatorMs) { onReluat(); throw new BlocatError(`verificarea anti-bot nu a fost completata la timp (${url})`, "verificare necompletata"); }
          await sleep(pauzaVerificareMs);
          s = await browser.stare();
          // pagina goala prea mult timp: incarca pagina principala a magazinului (verificarea apare uneori acolo); verificarea ramane a utilizatorului
          if (!incalzit && ++tick >= 8 && (s.html ?? "").length < 2000) { incalzit = true; try { await browser.navigheaza(new URL(url).origin + "/"); s = await browser.stare(); } catch {} }
          if (tick % 5 === 0) opt.onDiag?.({ url: s.url, status: s.status, lungime: (s.html ?? "").length, titlu: ((s.html ?? "").match(/<title[^>]*>([^<]*)/i) ?? [])[1] ?? null });
        }
        onReluat();
        // dupa verificare, daca pagina nu e cea dorita, o cerem din nou
        if (s.url.split("?")[0] !== url.split("?")[0]) { await browser.navigheaza(url); s = await browser.stare(); }
      }
      return raspuns(url, s.html ?? "", s.status);
    });
    lant = rez.catch(() => {});
    return rez;
  };
}
