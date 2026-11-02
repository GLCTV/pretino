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

// Lista de adrese separate prin virgula / punct si virgula / spatiu. Intoarce { lista } sau { eroare }.
export function listaAdrese(v) {
  const lista = [...new Set(String(v ?? "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))];
  const rau = lista.find((x) => !EMAIL_RE.test(x));
  return rau ? { eroare: `Adresa nu e valida: ${rau.slice(0, 80)}` } : { lista };
}
export const MAX_DESTINATARI = 40;
// Valideaza o cerere de trimitere; intoarce { eroare } sau { ok: {...} }
export function valideazaTrimitere(b) {
  const subject = String(b?.subject ?? "").replace(/[\r\n]+/g, " ").trim(), text = String(b?.text ?? "");
  const to = listaAdrese(b?.to), cc = listaAdrese(b?.cc), bcc = listaAdrese(b?.bcc);
  if (to.eroare || cc.eroare || bcc.eroare) return { eroare: to.eroare || cc.eroare || bcc.eroare };
  if (!to.lista.length) return { eroare: "Adauga cel putin un destinatar." };
  if (to.lista.length + cc.lista.length + bcc.lista.length > MAX_DESTINATARI) return { eroare: `Maximum ${MAX_DESTINATARI} de destinatari.` };
  if (!subject || subject.length > 200) return { eroare: "Subiectul e obligatoriu (maxim 200 de caractere)." };
  if (!text.trim() || text.length > 20000) return { eroare: "Mesajul e gol sau prea lung (maxim 20.000 de caractere)." };
  const id = String(b?.inReplyTo ?? "").replace(/^<|>$/g, "");
  return { ok: { to: to.lista, cc: cc.lista, bcc: bcc.lista, subject, text, inReplyTo: /^[^\s<>]{3,300}$/.test(id) ? id : null } };
}
export function corpResend({ to, cc = [], bcc = [], subject, text, inReplyTo }, from) {
  const o = { from, to: [].concat(to), subject, text };
  if (cc.length) o.cc = cc;
  if (bcc.length) o.bcc = bcc;
  if (inReplyTo) o.headers = { "In-Reply-To": `<${inReplyTo}>`, References: `<${inReplyTo}>` };
  return o;
}
// Doar adresa dintr-un camp „Nume <adresa>”
export const adresa = (s) => (String(s ?? "").match(/<([^>]+)>/)?.[1] ?? String(s ?? "")).trim().toLowerCase();
