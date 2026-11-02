// Statistici anonime Pretino. Site-ul trimite (cauta.js) doar: pagina (fara parametri), sursa (doar domeniul) si secundele cat pagina a fost vizibila.
// Fara cookie-uri si fara stocare in browser. Adresa IP NU se salveaza: vizitatorul e un cod ireversibil care se schimba zilnic (hash cu sare), deci
// nu poate fi urmarit de la o zi la alta. De aceea „vizitatori” pe mai multe zile = suma vizitatorilor unici din fiecare zi.
export const ZILE_PASTRARE = 400, PAUZA_VIZITA_MS = 30 * 60e3, SEC_MAX = 1800, MAX_PE_ZI = 300;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|monitor|uptime|curl|wget|python|node-fetch|axios|go-http|java\//i;
export const esteBot = (ua) => !ua || BOT.test(ua);
export const curataCale = (c) => { if (typeof c !== "string") return null; const s = c.split(/[?#]/)[0]; return !s.startsWith("//") && /^\/[A-Za-z0-9\-._~/%]{0,198}$/.test(s) ? s : null; };
export const curataSursa = (r) => { const s = String(r ?? "").toLowerCase().replace(/^www\./, ""); return /^[a-z0-9.-]{3,80}$/.test(s) && s.includes(".") ? s : ""; };
export const ziRO = (t) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });
export async function codVizitator(zi, ip, ua, sare) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${zi}|${sare}|${ip}|${ua}`));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const dispozitiv = (ua) => (/ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "t" : /mobi|iphone|android/i.test(ua) ? "m" : "d");
const R204 = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

// POST /_s/c (public, doar de pe site-ul propriu). Raspunde mereu 204: nu oferim informatii celor care incearca sa o abuzeze.
export async function colecteaza(request, env, acum = Date.now()) {
  try {
    if (request.method !== "POST") return R204();
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) return R204();
    const ua = request.headers.get("User-Agent") ?? "";
    if (esteBot(ua)) return R204();
    const txt = await request.text();
    if (txt.length > 500) return R204();
    const d = JSON.parse(txt), pid = String(d?.p ?? "");
    if (d?.e !== "c" && !/^[a-f0-9]{16}$/.test(pid)) return R204();
    const zi = ziRO(acum), ip = request.headers.get("CF-Connecting-IP") ?? "", v = await codVizitator(zi, ip, ua, env.STATS_SALT || env.PANOU_KEY || "pretino");
    if (d.e === "v") {
      const cale = curataCale(d.c);
      if (!cale) return R204();
      const n = await env.DB.prepare("SELECT COUNT(*) n FROM vizite WHERE zi=? AND v=?").bind(zi, v).first();
      if ((n?.n ?? 0) >= MAX_PE_ZI) return R204();
      await env.DB.prepare("INSERT OR IGNORE INTO vizite (pid,zi,t,v,cale,sec,ref,dev) VALUES (?,?,?,?,?,0,?,?)").bind(pid, zi, acum, v, cale, curataSursa(d.r), dispozitiv(ua)).run();
      if (Math.random() < 0.01) await env.DB.prepare("DELETE FROM vizite WHERE t<?").bind(acum - ZILE_PASTRARE * 864e5).run();
    } else if (d.e === "c") {
      const mag = String(d.m ?? ""), cale = curataCale(d.c);
      if (!/^[a-z0-9-]{2,40}$/.test(mag) || !cale) return R204();
      const n = await env.DB.prepare("SELECT COUNT(*) n FROM clickuri WHERE zi=? AND v=?").bind(zi, v).first();
      if ((n?.n ?? 0) >= MAX_PE_ZI) return R204();
      await env.DB.prepare("INSERT INTO clickuri (zi,t,v,cale,mag) VALUES (?,?,?,?,?)").bind(zi, acum, v, cale, mag).run();
    } else if (d.e === "t") {
      const s = Math.max(0, Math.min(SEC_MAX, Math.round(Number(d.s) || 0)));
      await env.DB.prepare("UPDATE vizite SET sec=MAX(sec,?) WHERE pid=? AND v=?").bind(s, pid, v).run();
    }
  } catch (e) { if (!(e instanceof SyntaxError)) console.error("statistici:", e?.message); }
  return R204();
}

// Rezumat pe ultimele `zile` zile (calendar Romania). O „vizita” = pagini vizualizate de acelasi vizitator, cu pauze de cel mult 30 de minute intre ele.
export async function statistici(env, zile, acum = Date.now()) {
  zile = Math.max(1, Math.min(365, Math.round(Number(zile)) || 30));
  const start = ziRO(acum - (zile - 1) * 864e5);
  const [pz, pg, sr, ck, dv, ac, ct] = await Promise.all([
    env.DB.prepare(`WITH x AS (SELECT zi, v, sec, CASE WHEN LAG(t) OVER (PARTITION BY zi, v ORDER BY t) IS NULL OR t - LAG(t) OVER (PARTITION BY zi, v ORDER BY t) > ? THEN 1 ELSE 0 END nou FROM vizite WHERE zi>=?)
      SELECT zi, COUNT(*) vizualizari, SUM(nou) vizite, COUNT(DISTINCT v) vizitatori, SUM(sec) sec FROM x GROUP BY zi`).bind(PAUZA_VIZITA_MS, start).all(),
    env.DB.prepare("SELECT cale, COUNT(*) n, AVG(CASE WHEN sec>0 THEN sec END) medie FROM vizite WHERE zi>=? GROUP BY cale ORDER BY n DESC LIMIT 15").bind(start).all(),
    env.DB.prepare("SELECT ref, COUNT(*) n FROM vizite WHERE zi>=? AND ref!='' GROUP BY ref ORDER BY n DESC LIMIT 10").bind(start).all(),
    env.DB.prepare("SELECT mag, COUNT(*) n, COUNT(DISTINCT v||zi) persoane FROM clickuri WHERE zi>=? GROUP BY mag ORDER BY n DESC LIMIT 20").bind(start).all(),
    env.DB.prepare("SELECT dev, COUNT(*) n FROM vizite WHERE zi>=? GROUP BY dev").bind(start).all(),
    env.DB.prepare("SELECT COUNT(DISTINCT v) n FROM vizite WHERE t>?").bind(acum - 5 * 60e3).first(),
    env.DB.prepare("SELECT COUNT(*) n FROM clickuri WHERE zi>=?").bind(start).first(),
  ]);
  const dupa = new Map(pz.results.map((r) => [r.zi, r]));
  const pe_zi = [];
  for (let i = zile - 1; i >= 0; i--) {
    const zi = ziRO(acum - i * 864e5), r = dupa.get(zi) ?? {};
    pe_zi.push({ zi, vizualizari: r.vizualizari ?? 0, vizite: r.vizite ?? 0, vizitatori: r.vizitatori ?? 0, sec: r.sec ?? 0 });
  }
  const suma = (a) => a.reduce((t, r) => ({ vizualizari: t.vizualizari + r.vizualizari, vizite: t.vizite + r.vizite, vizitatori: t.vizitatori + r.vizitatori, sec: t.sec + r.sec }), { vizualizari: 0, vizite: 0, vizitatori: 0, sec: 0 });
  return { zile, start, total: suma(pe_zi), azi: pe_zi[pe_zi.length - 1], pe_zi, pagini: pg.results.map((r) => ({ cale: r.cale, n: r.n, medie: r.medie == null ? null : Math.round(r.medie) })), surse: sr.results, clickuri: ck.results, clickuri_total: ct?.n ?? 0, dispozitive: Object.fromEntries(dv.results.map((r) => [r.dev, r.n])), acum: ac?.n ?? 0 };
}
