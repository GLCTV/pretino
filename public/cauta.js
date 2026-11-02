// Căutare în catalog, în browser (fără server): încarcă /cauta-index.json la prima utilizare.
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest(".copiaza");
  if (!b) return;
  var cod = b.getAttribute("data-cod"), ok = function () { b.textContent = "Copiat!"; setTimeout(function () { b.textContent = "Copiază"; }, 2000); };
  if (navigator.clipboard) navigator.clipboard.writeText(cod).then(ok, function () {}); 
});
(function () {
  var form = document.getElementById("cautare");
  if (!form) return;
  var inp = form.querySelector("input"), box = document.getElementById("sugestii"), data = null, loading = null, timer = null;
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var lei = function (n) { return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); };
  function load() {
    if (!loading) loading = fetch("/cauta-index.json").then(function (r) { return r.json(); }).then(function (j) {
      j.o.forEach(function (o) { o.k = norm(o.t + " " + (j.m[o.m] || "") + " " + (j.c[o.c] || "")); });
      data = j; return j;
    });
    return loading;
  }
  function gaseste(q) {
    var t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    var r = data.o.filter(function (o) { return t.every(function (x) { return o.k.indexOf(x) > -1; }); });
    // relevanta: cuvintele din cautare apar mai devreme in titlu => primele; la egalitate ramane ordinea dupa reducere
    var sc = function (o) { var n = norm(o.t), s = 0; t.forEach(function (x) { var i = n.indexOf(x); s += i < 0 ? 200 : i; }); return s; };
    return r.map(function (o, i) { return { o: o, s: sc(o), i: i }; }).sort(function (a, b) { return a.s - b.s || a.i - b.i; }).map(function (x) { return x.o; });
  }
  function inchide() { box.hidden = true; box.innerHTML = ""; }
  function sugestii() {
    var q = inp.value.trim();
    if (q.length < 2) return inchide();
    load().then(function () {
      if (inp.value.trim() !== q) return;
      var r = gaseste(q), seen = {}, top = [];
      for (var i = 0; i < r.length && top.length < 6; i++) { if (!seen[r[i].t]) { seen[r[i].t] = 1; top.push(r[i]); } }
      if (!r.length) { box.innerHTML = '<div class="sug-gol">Niciun rezultat pentru „' + esc(q) + '”</div>'; box.hidden = false; return; }
      box.innerHTML = top.map(function (o) { return '<a href="/cauta/?q=' + encodeURIComponent(o.t) + '"><span>' + esc(o.t) + '</span><small>' + esc(data.m[o.m] || o.m) + ' · ' + lei(o.p) + '</small></a>'; }).join("") +
        '<a class="sug-toate" href="/cauta/?q=' + encodeURIComponent(q) + '">Vezi toate rezultatele (' + r.length + ')</a>';
      box.hidden = false;
    });
  }
  inp.addEventListener("focus", load);
  inp.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(sugestii, 120); });
  document.addEventListener("click", function (e) { if (!form.contains(e.target)) inchide(); });
  inp.addEventListener("keydown", function (e) { if (e.key === "Escape") inchide(); });

  // pagina /cauta/: rezultate complete
  var lista = document.getElementById("lista");
  if (!lista) return;
  var q = new URLSearchParams(location.search).get("q") || "";
  inp.value = q;
  var stare = document.getElementById("stare"), mai = document.getElementById("mai"), shown = 0, rez = [], PAS = 48;
  function card(o) {
    var r = o.v > o.p ? Math.round((1 - o.p / o.v) * 100) : 0;
    var poza = o.i ? '<a class="poza" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true"><img src="' + esc(o.i) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="300" height="225" onerror="this.parentNode.classList.add(\'fara\')"></a>' : "";
    return '<article class="card">' + poza + (r ? '<span class="badge">-' + r + '%</span>' : "") + "<strong>" + esc(o.t) + "</strong>" +
      '<span class="mut">' + esc(data.m[o.m] || o.m) + " · " + esc(data.c[o.c] || o.c) + "</span>" +
      '<div><span class="pret">' + lei(o.p) + "</span>" + (r ? '<span class="vechi"' + (o.r ? ' title="Preț de referință afișat de magazin"' : "") + ">" + lei(o.v) + "</span>" : "") + "</div>" +
      (o.r && r ? '<span class="mut">reducere afișată de magazin</span>' : "") +
      (data.k && data.k[o.m] ? '<div class="cupon"><span>Cupon <b>' + esc(data.k[o.m].cod) + "</b> (" + esc(data.k[o.m].text) + ") – introdu-l în coș</span>" + '<button type="button" class="copiaza" data-cod="' + esc(data.k[o.m].cod) + '">Copiază</button></div>' : "") +
      '<a class="btn" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">Vezi oferta</a></article>';
  }
  function mai_multe() {
    var next = rez.slice(shown, shown + PAS);
    lista.insertAdjacentHTML("beforeend", next.map(card).join(""));
    shown += next.length; mai.hidden = shown >= rez.length;
  }
  if (!q.trim()) { stare.textContent = "Scrie în căsuța de căutare ce produs cauți."; return; }
  stare.textContent = "Se caută…";
  load().then(function () {
    rez = gaseste(q);
    stare.textContent = rez.length ? rez.length + (rez.length === 1 ? " rezultat" : " rezultate") + " pentru „" + q + "”" : "Niciun rezultat pentru „" + q + "”. Încearcă alt cuvânt.";
    mai_multe();
  }).catch(function () { stare.textContent = "Căutarea nu a putut fi încărcată. Încearcă din nou."; });
  mai.addEventListener("click", mai_multe);
})();
