// Normalizare oferte Pretino: preț, id stabil, stoc, categorie, reducere reală.
import { createHash } from "node:crypto";

export function parsePret(v) {
  let s = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
export const idOferta = (sursa, url) => sursa + "-" + createHash("sha1").update(String(url)).digest("hex").slice(0, 12);
export const inStoc = (s) => !/(^|\b)(0|false|no|nu)$|out|epuizat|indisponibil|nu este|precomand|stoc_epuizat/i.test(String(s ?? "").trim());

// Categorii Pretino (data/categorii.json) din textul categoriei din feed
const REGULI = [
  ["electrocasnice", /frigider|aspirator|masin[aă] de sp[aă]lat|cuptor|plit[aă]|microunde|aer conditionat|aparat de cafea|espressor|fier de calcat|uscator|electrocasnic/i],
  ["electronice", /laptop|telefon|tablet|televizor|\btv\b|monitor|placi? video|procesor|memorie|ssd|hdd|casti|imprimant|router|gaming|calculator|desktop|smartwatch|camera|it\b|electronic/i],
  ["casa-si-gradina", /gradin|mobil|decor|bricolaj|scule|iluminat|saltea|casa/i],
  ["moda", /imbracaminte|incaltaminte|ghete|pantofi|geac|ceas|moda|fashion|accesorii/i],
  ["auto", /auto|anvelop|cauciuc|motor|moto/i],
  ["sport", /sport|fitness|bicicl|camping|trotinet|turism/i],
  ["copii", /copii|jucari|bebe|pu[eé]ricultur/i],
  ["supermarket", /aliment|supermarket|bauturi|cosmetic|ingrijire|curatenie|animale/i],
];
const fara = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export function mapCategorie(text) {
  const t = fara(text);
  for (const [slug, re] of REGULI) if (re.test(t)) return slug;
  return null;
}
// Oferta e „reală” doar cu preț vechi mai mare decât cel nou (minim 5%).
export const areReducereReala = (o, min = 5) => o.pretVechi > o.pret && (1 - o.pret / o.pretVechi) * 100 >= min;
