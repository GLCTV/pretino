export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const lei = (n) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const reducere = (o) => (o.pretVechi && o.pretVechi > o.pret ? Math.round((1 - o.pret / o.pretVechi) * 100) : 0);
