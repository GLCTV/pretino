// Potrivește un nume/domeniu din feed cu un magazin din data/magazine.json
const n = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
export function gasesteMagazin(magazine, { nume, link }) {
  let host = "";
  try { host = new URL(link).hostname.replace(/^www\./, ""); } catch {}
  return magazine.find((m) => (host && host === m.domeniu) || (nume && n(nume) && (n(nume) === n(m.nume) || n(nume).includes(n(m.nume)) || n(m.nume).includes(n(nume))))) ?? null;
}
