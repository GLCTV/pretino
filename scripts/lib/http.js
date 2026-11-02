// Citire HTTP pentru modulul Campanii: concurenta limitata per magazin, timeout, retry cu pauze progresive,
// Retry-After, deduplicare in rulare. NU ocoleste CAPTCHA, autentificare sau protectii anti-bot: le raporteaza ca „blocat”.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class BlocatError extends Error { constructor(msg, motiv) { super(msg); this.blocat = true; this.motiv = motiv; } }

// Pagini de validare/verificare anti-bot (nu se completeaza si nu se ocolesc)
export function esteBlocare(url, status, corp = "") {
  if (status === 403 || status === 401 || status === 429 || status === 511) return `HTTP ${status}`;
  if (/validare-acces|captcha|challenge|access-denied/i.test(url)) return "pagina de validare acces";
  const t = corp.slice(0, 6000);
  if (/cf-turnstile|g-recaptcha|hcaptcha|Validare acces|Just a moment|verificare de securitate|Access Denied/i.test(t)) return "verificare anti-bot in pagina";
  return null;
}

export function creeazaClient({ concurenta = 2, pauzaMs = 700, timeoutMs = 25000, reincercari = 3, userAgent = "Mozilla/5.0 (compatible; PretinoBot/1.0; +https://pretino.ro)", fetchFn = fetch, oprit = () => false } = {}) {
  const cache = new Map();
  let active = 0;
  const asteapta = [];
  const luminita = async () => { if (active >= concurenta) await new Promise((r) => asteapta.push(r)); active++; };
  const elibereaza = () => { active--; asteapta.shift()?.(); };

  async function descarca(url) {
    let ultima;
    for (let i = 0; i <= reincercari; i++) {
      if (oprit()) throw new Error("oprit de utilizator");
      await luminita();
      try {
        await sleep(pauzaMs);
        const res = await fetchFn(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml", "accept-language": "ro-RO,ro;q=0.9" } });
        const corp = await res.text();
        const finalUrl = res.url || url;
        if (res.status === 429) {
          const ra = Number(res.headers?.get?.("retry-after"));
          await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 5000 * 2 ** i, 60000));
          ultima = new BlocatError(`acces limitat (HTTP 429) la ${url}`, "HTTP 429");
          continue;
        }
        const blocat = esteBlocare(finalUrl, res.status, corp);
        if (blocat) throw new BlocatError(`acces blocat (${blocat}) la ${url}`, blocat);
        if (res.status === 404 || res.status === 410) return { status: res.status, corp: "", url: finalUrl, lipsa: true };
        if (res.status >= 500 || res.status === 408) { ultima = new Error(`HTTP ${res.status}`); }
        else if (!res.ok) throw new Error(`HTTP ${res.status}`);
        else return { status: res.status, corp, url: finalUrl };
      } catch (e) {
        if (e.blocat) throw e;
        ultima = e;
      } finally { elibereaza(); }
      await sleep(1500 * 2 ** i);
    }
    throw ultima ?? new Error("esec necunoscut");
  }
  return {
    // o singura cerere pe URL in cadrul unei rulari
    ia(url) { if (!cache.has(url)) cache.set(url, descarca(url)); return cache.get(url); },
    cereri: () => cache.size,
  };
}
