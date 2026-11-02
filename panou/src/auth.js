// Autentificare: panoul se deschide DOAR printr-o aplicatie Cloudflare Access. Worker-ul verifica singur jetonul (JWT RS256) din antetul
// Cf-Access-Jwt-Assertion: semnatura (cheile publice ale echipei), expirarea, aud (aplicatia) si adresa de email permisa. Lipsa configuratiei = acces refuzat.
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const json = (s) => JSON.parse(new TextDecoder().decode(b64(s)));
let cacheChei = { t: 0, chei: null, gazda: "" };

async function chei(gazda, fetchFn) {
  if (cacheChei.chei && cacheChei.gazda === gazda && Date.now() - cacheChei.t < 3600e3) return cacheChei.chei;
  const r = await fetchFn(`https://${gazda}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("certificate Access indisponibile");
  const j = await r.json();
  cacheChei = { t: Date.now(), chei: j.keys ?? [], gazda };
  return cacheChei.chei;
}
export const reseteazaCache = () => { cacheChei = { t: 0, chei: null, gazda: "" }; };

// Intoarce adresa de email autentificata sau null.
export async function verificaAccess(request, env, { fetchFn = fetch, acum = Date.now() } = {}) {
  try {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ALLOWED_EMAIL) return null;
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    const p = (jwt ?? "").split(".");
    if (p.length !== 3) return null;
    const antet = json(p[0]), payload = json(p[1]);
    if (antet.alg !== "RS256") return null;
    const cheie = (await chei(env.ACCESS_TEAM_DOMAIN, fetchFn)).find((k) => k.kid === antet.kid);
    if (!cheie) return null;
    const key = await crypto.subtle.importKey("jwk", cheie, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64(p[2]), new TextEncoder().encode(`${p[0]}.${p[1]}`));
    if (!ok) return null;
    const sec = Math.floor(acum / 1000);
    if (!payload.exp || payload.exp < sec || (payload.nbf && payload.nbf > sec + 60)) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    const email = String(payload.email ?? "").toLowerCase();
    return email && email === String(env.ALLOWED_EMAIL).toLowerCase() ? email : null;
  } catch { return null; }
}
