// Browser vizibil pentru citirea paginilor cand magazinul cere verificare anti-bot (CAPTCHA / Turnstile).
// Programul NU rezolva si NU ocoleste verificarea: o deschide intr-o fereastra de browser, anunta utilizatorul,
// asteapta ca TU sa o completezi si apoi continua citirea. Profil dedicat Pretino (fara conturile tale), local, pe 127.0.0.1.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { esteBlocare, BlocatError } from "./http.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function gasesteBrowser(env = process.env) {
  const c = [env.PRETINO_BROWSER,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  return c.find((x) => existsSync(x)) ?? null;
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

export async function lanseazaBrowser({ exe = gasesteBrowser(), profil, port = 9333, headless = false } = {}) {
  if (!exe) throw new Error("nu am gasit Chrome sau Edge pe acest PC (poti seta PRETINO_BROWSER)");
  mkdirSync(profil, { recursive: true });
  const proc = spawn(exe, [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check", ...(headless ? ["--headless=new", "--no-sandbox"] : []), "about:blank"], { stdio: "ignore" });
  let tinta = null;
  for (let i = 0; i < 80 && !tinta; i++) {
    try { tinta = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
    if (!tinta) await sleep(500);
  }
  if (!tinta) { proc.kill(); throw new Error("browserul nu a pornit"); }
  const ws = new WebSocket(tinta.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error("conexiune CDP esuata")); });
  const cdp = new Cdp(ws);
  await cdp.trimite("Page.enable"); await cdp.trimite("Network.enable");
  let status = 200;
  cdp.ascultatori.push((m) => { if (m.method === "Network.responseReceived" && m.params.type === "Document") status = m.params.response.status; });
  const ev = async (expr) => (await cdp.trimite("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.value;
  return {
    async navigheaza(url, timeoutMs = 45000) {
      status = 200;
      await cdp.trimite("Page.navigate", { url });
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) { if ((await ev("document.readyState").catch(() => null)) === "complete") break; await sleep(400); }
      await sleep(900);
    },
    stare: async () => ({ url: await ev("location.href"), html: await ev("document.documentElement.outerHTML"), status }),
    adaInFata: () => cdp.trimite("Page.bringToFront").catch(() => {}),
    async inchide() { try { await cdp.trimite("Browser.close"); } catch {} try { ws.close(); } catch {} try { proc.kill(); } catch {} },
  };
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
      if (esteBlocare(s.url, s.status, s.html ?? "")) {
        await browser.adaInFata();
        onAsteapta({ url, mesaj: "Magazinul cere verificare anti-bot. Completeaz-o in fereastra de browser deschisa; programul continua singur dupa aceea." });
        const t0 = Date.now();
        while (esteBlocare(s.url, s.status, s.html ?? "")) {
          if (oprit()) throw new Error("oprit de utilizator");
          if (Date.now() - t0 > timeoutUtilizatorMs) { onReluat(); throw new BlocatError(`verificarea anti-bot nu a fost completata la timp (${url})`, "verificare necompletata"); }
          await sleep(pauzaVerificareMs);
          s = await browser.stare();
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
