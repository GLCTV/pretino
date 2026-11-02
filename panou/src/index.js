// Worker „pretino-panou": (1) primeste emailurile de la contact@pretino.ro (Email Routing -> Worker), le salveaza in D1 si le redirectioneaza si
// pe adresa personala; (2) serveste panoul (inbox, trimise, scrie, stare site, statistici) DOAR dupa Cloudflare Access; (3) trimite emailuri prin Resend.
// Secret necesar: RESEND_API_KEY (wrangler secret put). Nimic secret in repo.
import PostalMime from "postal-mime";
import { verificaAccess, verificaParola, areAntetParola } from "./auth.js";
import { htmlInText, taie, valideazaTrimitere, corpResend, adresa } from "./mail.js";
import { pagina } from "./ui.js";
import { colecteaza, statistici } from "./stat.js";

const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const LIMITA_ORA = 30, LIMITA_10MIN = 20, ESECURI_MAX = 10, ZILE_PASTRARE = 180;
const IP = (r) => r.headers.get("CF-Connecting-IP") || "necunoscut";

// Acces: (1) Cloudflare Access, daca e configurat, sau (2) parola PANOU_KEY. Intoarce { ok } sau { raspuns } cu eroarea de trimis.
async function autentifica(request, env) {
  if (await verificaAccess(request, env)) return { ok: true };
  if (areAntetParola(request) && env.PANOU_KEY) {
    const ip = IP(request), acum = Date.now();
    const rata = await env.DB.prepare("SELECT COUNT(*) n FROM incercari WHERE ip=? AND t>?").bind(ip, acum - 600e3).first();
    if ((rata?.n ?? 0) >= ESECURI_MAX) return { raspuns: J({ eroare: "Prea multe incercari gresite. Reincearca peste 10 minute." }, 429) };
    if (await verificaParola(request, env)) return { ok: true };
    await env.DB.prepare("INSERT INTO incercari (ip,t) VALUES (?,?)").bind(ip, acum).run();
    await env.DB.prepare("DELETE FROM incercari WHERE t<?").bind(acum - 3600e3).run();
  }
  return { raspuns: J({ eroare: "Autentificare necesara.", login: true }, 401) };
}
const curata = (env) => env.DB.prepare("DELETE FROM messages WHERE date<?").bind(Date.now() - ZILE_PASTRARE * 864e5).run();

export default {
  // ---- primire email ----
  async email(message, env) {
    try {
      const raw = await new Response(message.raw).arrayBuffer();
      if (raw.byteLength <= 5_000_000) {
        const m = await PostalMime.parse(raw);
        const body = taie(m.text?.trim() || htmlInText(m.html) || "");
        await env.DB.prepare("INSERT OR IGNORE INTO messages (folder,message_id,in_reply_to,from_addr,from_name,to_addr,subject,body,date,attachments) VALUES ('inbox',?,?,?,?,?,?,?,?,?)")
          .bind(m.messageId ?? null, m.inReplyTo ?? null, adresa(m.from?.address ?? message.from), m.from?.name ?? "", adresa(message.to), (m.subject ?? "(fara subiect)").slice(0, 300), body, Date.now(), (m.attachments ?? []).length).run();
        await curata(env);
      }
    } catch (e) { console.error("salvare email esuata", e?.message); }
    // copie pe adresa personala, chiar daca salvarea a esuat
    if (env.FORWARD_TO) { try { await message.forward(env.FORWARD_TO); } catch (e) { console.error("redirectionare esuata", e?.message); } }
  },

  // ---- panou + API ----
  async fetch(request, env) {
    const url = new URL(request.url), { pathname: p } = url;
    // Pe domeniul site-ului (rutele pretino.ro/_s/* si www.pretino.ro/_s/*) se serveste DOAR colectarea anonima de statistici, niciodata panoul.
    const gazdaSite = new URL(env.SITE_URL).hostname;
    if (url.hostname === gazdaSite || url.hostname === "www." + gazdaSite) return p === "/_s/c" ? colecteaza(request, env) : J({ eroare: "Negasit." }, 404);
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) return J({ eroare: "Origine nepermisa." }, 403);
      if (!(request.headers.get("content-type") ?? "").includes("application/json")) return J({ eroare: "Cerere invalida." }, 415);
    }
    if (p !== "/") { const a = await autentifica(request, env); if (!a.ok) return a.raspuns; }
    try {
      if (p === "/") { const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))); return pagina(nonce); }
      if (p === "/api/ping") return J({ ok: true });

      if (p === "/api/messages" && request.method === "GET") {
        const folder = url.searchParams.get("folder") === "sent" ? "sent" : "inbox";
        const { results } = await env.DB.prepare("SELECT id,folder,from_addr,from_name,to_addr,subject,date,read,attachments FROM messages WHERE folder=? ORDER BY date DESC LIMIT 100").bind(folder).all();
        const nec = await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE folder='inbox' AND read=0").first();
        return J({ mesaje: results, necitite: nec?.n ?? 0 });
      }
      let m = p.match(/^\/api\/messages\/(\d+)$/);
      if (m && request.method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM messages WHERE id=?").bind(Number(m[1])).first();
        if (!r) return J({ eroare: "Mesaj negasit." }, 404);
        if (!r.read) await env.DB.prepare("UPDATE messages SET read=1 WHERE id=?").bind(r.id).run();
        return J({ mesaj: r });
      }
      if (m && request.method === "DELETE") { await env.DB.prepare("DELETE FROM messages WHERE id=?").bind(Number(m[1])).run(); return J({ ok: true }); }

      if (p === "/api/send" && request.method === "POST") {
        if (!env.RESEND_API_KEY) return J({ eroare: "Trimiterea nu e configurata (lipseste secretul RESEND_API_KEY)." }, 503);
        const v = valideazaTrimitere(await request.json().catch(() => null));
        if (v.eroare) return J({ eroare: v.eroare }, 400);
        const [h1, h2] = await Promise.all([env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE folder='sent' AND date>?").bind(Date.now() - 3600e3).first(), env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE folder='sent' AND date>?").bind(Date.now() - 600e3).first()]);
        if ((h1?.n ?? 0) >= LIMITA_ORA || (h2?.n ?? 0) >= LIMITA_10MIN) return J({ eroare: `Limita de trimitere atinsa (${LIMITA_10MIN} emailuri / 10 minute, ${LIMITA_ORA} / ora).` }, 429);
        const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(corpResend(v.ok, env.FROM)) });
        const rj = await r.json().catch(() => ({}));
        if (!r.ok) return J({ eroare: `Trimiterea a esuat: ${rj.message ?? r.status}` }, 502);
        await env.DB.prepare("INSERT INTO messages (folder,message_id,in_reply_to,from_addr,to_addr,subject,body,date,read,provider_id) VALUES ('sent',?,?,?,?,?,?,?,1,?)")
          .bind(rj.id ?? null, v.ok.inReplyTo, adresa(env.FROM), v.ok.to.join(", "), v.ok.subject, taie(v.ok.text), Date.now(), rj.id ?? null).run();
        await curata(env);
        return J({ ok: true, id: rj.id });
      }

      if (p === "/api/stats" && request.method === "GET") return J(await statistici(env, url.searchParams.get("zile")));

      if (p === "/api/status" && request.method === "GET") {
        const get = async (f) => { try { const r = await fetch(`${env.SITE_URL}/${f}?x=${Date.now()}`, { cf: { cacheTtl: 0 } }); return r.ok ? await r.json() : null; } catch { return null; } };
        const [status, versiune] = await Promise.all([get("status.json"), get("version.json")]);
        return J({ status, versiune });
      }
      return J({ eroare: "Negasit." }, 404);
    } catch (e) { console.error(e?.message); return J({ eroare: "Eroare interna." }, 500); }
  },
};
