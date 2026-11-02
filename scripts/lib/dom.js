// Parser HTML minimal, fara dependente (pentru modulul Campanii). Tolerant la HTML imperfect.
// parseHtml(html) -> nod radacina; qsa(nod, "div.card[data-x] a") ; qs ; text ; attr
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€", rsaquo: "›", lsaquo: "‹", raquo: "»", laquo: "«", hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", copy: "©", reg: "®", trade: "™", times: "×", middot: "·", bull: "•", deg: "°" };
export const decodeaza = (s) => String(s ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});

export function parseHtml(html) {
  const root = { tag: "#root", attrs: {}, children: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/gi;
  let last = 0, m;
  const addText = (t) => { if (t) cur.children.push({ tag: "#text", text: t, parent: cur }); };
  while ((m = re.exec(html))) {
    addText(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) { // inchidere
      const t = m[1].toLowerCase();
      let n = cur;
      while (n && n.tag !== t) n = n.parent;
      if (n && n.parent) cur = n.parent;
    } else if (m[2]) {
      const tag = m[2].toLowerCase(), attrs = {};
      for (const a of m[3].matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[a[1].toLowerCase()] = decodeaza(a[2] ?? a[3] ?? a[4] ?? "");
      const node = { tag, attrs, children: [], parent: cur };
      cur.children.push(node);
      if (RAW.has(tag) && !m[4]) {
        const end = html.toLowerCase().indexOf("</" + tag, last);
        const stop = end < 0 ? html.length : end;
        node.children.push({ tag: "#text", text: html.slice(last, stop), parent: node, raw: true });
        const close = html.indexOf(">", stop);
        last = re.lastIndex = close < 0 ? html.length : close + 1;
      } else if (!VOID.has(tag) && !m[4]) cur = node;
    }
  }
  addText(html.slice(last));
  return root;
}

export function text(n) {
  if (!n) return "";
  if (n.tag === "#text") return n.raw ? "" : decodeaza(n.text);
  if (n.tag === "script" || n.tag === "style") return "";
  return n.children.map(text).join(" ").replace(/\s+/g, " ").trim();
}
export const attr = (n, k) => (n && n.attrs ? n.attrs[k] : undefined);

function potrivesteSimplu(n, s) {
  if (n.tag.startsWith("#")) return false;
  const re = /^([a-zA-Z][\w-]*|\*)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/;
  const m = s.match(re);
  if (!m) return false;
  if (m[1] && m[1] !== "*" && m[1].toLowerCase() !== n.tag) return false;
  const cls = (n.attrs.class ?? "").split(/\s+/);
  for (const c of (m[2] ?? "").split(".").filter(Boolean)) if (!cls.includes(c)) return false;
  for (const a of (m[3] ?? "").matchAll(/\[([\w:-]+)(?:(\*=|\^=|\$=|=)["']?([^\]"']*)["']?)?\]/g)) {
    const v = n.attrs[a[1].toLowerCase()];
    if (v === undefined) return false;
    if (a[2] === "=" && v !== a[3]) return false;
    if (a[2] === "*=" && !v.includes(a[3])) return false;
    if (a[2] === "^=" && !v.startsWith(a[3])) return false;
    if (a[2] === "$=" && !v.endsWith(a[3])) return false;
  }
  return true;
}
function potriveste(n, parti) { // parti = lista compusa, ultimul element trebuie sa potriveasca n; stramosii in ordine
  if (!potrivesteSimplu(n, parti[parti.length - 1])) return false;
  let i = parti.length - 2, p = n.parent;
  while (i >= 0 && p) { if (potrivesteSimplu(p, parti[i])) i--; p = p.parent; }
  return i < 0;
}
export function qsa(root, selector) {
  const grupuri = selector.split(",").map((g) => g.trim().split(/\s+/).filter(Boolean)).filter((g) => g.length);
  const out = [];
  (function walk(n) {
    for (const c of n.children ?? []) {
      if (c.tag.startsWith("#")) continue;
      if (grupuri.some((g) => potriveste(c, g))) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}
export const qs = (root, selector) => qsa(root, selector)[0] ?? null;
