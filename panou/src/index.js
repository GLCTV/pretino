// Worker „pretino-panou": (1) primeste emailurile de la contact@pretino.ro (Email Routing -> Worker), le salveaza in D1 si le redirectioneaza si
// pe adresa personala; (2) serveste panoul (inbox, trimise, scrie, stare site) DOAR dupa Cloudflare Access; (3) trimite emailuri prin Resend.
// Secret necesar: RESEND_API_KEY (wrangler secret put). Nimic secret in repo.
import PostalMime from "postal-mime";
import { verificaAccess } from "./auth.js";
import { htmlInText, taie, valideazaTrimitere, corpResend, adresa } from "./mail.js";
import { pagina } from "./ui.js";

const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const LIMITA_ORA = 30;

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
      }
    } catch (e) { console.error("salvare email esuata", e?.message); }
    // copie pe adresa personala, chiar daca salvarea a esuat
    if (env.FORWARD_TO) { try { await message.forward(env.FORWARD_TO); } catch (e) { console.error("redirectionare esuata", e?.message); } }
  },

  // ---- panou + API ----
  async fetch(request, env) {
    const email = await verificaAccess(request, env);
    if (!email) return new Response("Acces interzis. Panoul se deschide doar prin Cloudflare Access.", { status: 403, headers: { "cache-control": "no-store" } });
    const url = new URL(request.url), { pathname: p } = url;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) return J({ eroare: "Origine nepermisa." }, 403);
      if (!(request.headers.get("content-type") ?? "").includes("application/json")) return J({ eroare: "Cerere invalida." }, 415);
    }
    try {
      if (p === "/") { const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))); return pagina(nonce, email); }

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
        const recent = await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE folder='sent' AND date>?").bind(Date.now() - 3600e3).first();
        if ((recent?.n ?? 0) >= LIMITA_ORA) return J({ eroare: `Limita de ${LIMITA_ORA} emailuri pe ora a fost atinsa.` }, 429);
        const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(corpResend(v.ok, env.FROM)) });
        const rj = await r.json().catch(() => ({}));
        if (!r.ok) return J({ eroare: `Trimiterea a esuat: ${rj.message ?? r.status}` }, 502);
        await env.DB.prepare("INSERT INTO messages (folder,message_id,in_reply_to,from_addr,to_addr,subject,body,date,read,provider_id) VALUES ('sent',?,?,?,?,?,?,?,1,?)")
          .bind(rj.id ?? null, v.ok.inReplyTo, adresa(env.FROM), v.ok.to, v.ok.subject, taie(v.ok.text), Date.now(), rj.id ?? null).run();
        return J({ ok: true, id: rj.id });
      }

      if (p === "/api/status" && request.method === "GET") {
        const get = async (f) => { try { const r = await fetch(`${env.SITE_URL}/${f}?x=${Date.now()}`, { cf: { cacheTtl: 0 } }); return r.ok ? await r.json() : null; } catch { return null; } };
        const [status, versiune] = await Promise.all([get("status.json"), get("version.json")]);
        return J({ status, versiune });
      }
      return J({ eroare: "Negasit." }, 404);
    } catch (e) { console.error(e?.message); return J({ eroare: "Eroare interna." }, 500); }
  },
};
