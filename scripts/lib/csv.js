// CSV simplu: ghilimele, separator , ; sau tab, rânduri pe mai multe linii. Returnează [{coloana: valoare}] cu coloane lowercase.
export function parseCsv(text) {
  const nl = text.indexOf("\n");
  const head = nl < 0 ? text : text.slice(0, nl);
  const count = (c) => (head.match(new RegExp(c === "\t" ? "\t" : `\\${c}`, "g")) ?? []).length;
  const sep = count(";") > count(",") ? ";" : count("\t") > count(",") ? "\t" : ",";
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const keys = (rows.shift() ?? []).map((k) => k.trim().replace(/^﻿/, "").toLowerCase().replace(/[\s-]+/g, "_"));
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
