// Utilitare email pure (testabile): text din HTML, validare, limite, antete de raspuns.
export const LIMITA_TEXT = 200_000;
export const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

const ENT = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
export function htmlInText(h) {
  return String(h ?? "")
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENT[m] ?? m)
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
export const taie = (s, n = LIMITA_TEXT) => (String(s ?? "").length > n ? String(s).slice(0, n) + "\n[…taiat]" : String(s ?? ""));

// Valideaza o cerere de trimitere; intoarce { eroare } sau { ok: {...} }
export function valideazaTrimitere(b) {
  const to = String(b?.to ?? "").trim(), subject = String(b?.subject ?? "").replace(/[\r\n]+/g, " ").trim(), text = String(b?.text ?? "");
  if (!EMAIL_RE.test(to)) return { eroare: "Adresa destinatarului nu e valida." };
  if (!subject || subject.length > 200) return { eroare: "Subiectul e obligatoriu (maxim 200 de caractere)." };
  if (!text.trim() || text.length > 20000) return { eroare: "Mesajul e gol sau prea lung (maxim 20.000 de caractere)." };
  const inReplyTo = b?.inReplyTo && /^[^\s<>]{3,300}$/.test(String(b.inReplyTo).replace(/^<|>$/g, "")) ? String(b.inReplyTo).replace(/^<|>$/g, "") : null;
  return { ok: { to, subject, text, inReplyTo } };
}
export function corpResend({ to, subject, text, inReplyTo }, from) {
  const o = { from, to: [to], subject, text };
  if (inReplyTo) o.headers = { "In-Reply-To": `<${inReplyTo}>`, References: `<${inReplyTo}>` };
  return o;
}
// Doar adresa dintr-un camp „Nume <adresa>”
export const adresa = (s) => (String(s ?? "").match(/<([^>]+)>/)?.[1] ?? String(s ?? "")).trim().toLowerCase();
