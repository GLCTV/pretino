// Pretino.ro – interfata din browser: tema, favorite, copiere cupon, cautare cu sugestii, filtre/sortare pe liste.
// Catalogul se incarca o singura data din /cauta-index.json (campuri: id,t,m,c,s,p,v,r,u,i). Fara server, fara cookie-uri; favoritele si tema raman doar in acest browser.
(function () {
  "use strict";
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var lei = function (n) { return Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " lei"; };
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorat */ } }
  };

  /* ---------- tema ---------- */
  var tema = $("tema");
  if (tema) tema.addEventListener("click", function () {
    var root = document.documentElement, acum = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", acum); store.set("pretino-tema", acum);
  });

  /* ---------- favorite ---------- */
  var favorite = [];
  try { favorite = JSON.parse(store.get("pretino-fav") || "[]"); if (!Array.isArray(favorite)) favorite = []; } catch (e) { favorite = []; }
  var onFav = null;
  function marcheazaFav() {
    var nr = $("fav-nr");
    if (nr) { nr.textContent = favorite.length; nr.hidden = favorite.length === 0; }
    var btns = document.querySelectorAll(".fav");
    for (var i = 0; i < btns.length; i++) {
      var on = favorite.indexOf(btns[i].getAttribute("data-id")) >= 0;
      btns[i].setAttribute("aria-pressed", on ? "true" : "false");
      btns[i].setAttribute("aria-label", on ? "Scoate de la favorite" : "Adaugă la favorite");
    }
  }
  document.addEventListener("click", function (e) {
    var f = e.target.closest && e.target.closest(".fav");
    if (f) {
      var id = f.getAttribute("data-id"), p = favorite.indexOf(id);
      if (p >= 0) favorite.splice(p, 1); else favorite.push(id);
      store.set("pretino-fav", JSON.stringify(favorite));
      marcheazaFav(); if (onFav) onFav();
      return;
    }
    var b = e.target.closest && e.target.closest(".copiaza");
    if (b) {
      var cod = b.getAttribute("data-cod"), ok = function () { b.textContent = "Copiat!"; setTimeout(function () { b.textContent = "Copiază"; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(cod).then(ok, function () {});
    }
  });
  marcheazaFav();

  /* ---------- catalog ---------- */
  var data = null, loading = null;
  function load() {
    if (!loading) loading = fetch("/cauta-index.json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function (j) {
      j.o.forEach(function (o) { o.k = norm(o.t + " " + (j.m[o.m] || "") + " " + (j.c[o.c] || "")); o.r2 = o.v > o.p ? Math.round((1 - o.p / o.v) * 100) : 0; });
      data = j; return j;
    });
    return loading;
  }
  function cauta(q) {
    var t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return data.o.filter(function (o) { return t.every(function (x) { return o.k.indexOf(x) >= 0; }); });
  }
  function card(o) {
    var poza = '<a class="poza' + (o.i ? "" : " fara") + '" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true">' +
      (o.i ? '<img src="' + esc(o.i) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="275" height="167" onerror="this.parentNode.classList.add(\'fara\')">' : "") + "</a>";
    var k = data.k && data.k[o.m];
    var cupon = k ? '<div class="cupon"><span>Cupon <b>' + esc(k.cod) + "</b> (" + esc(k.text) + ') – introdu-l în coș</span><button type="button" class="copiaza" data-cod="' + esc(k.cod) + '">Copiază</button></div>' : "";
    return '<article class="card">' + poza + '<span class="badge">-' + o.r2 + '%</span>' +
      '<button class="fav" type="button" data-id="' + esc(o.id) + '" aria-pressed="false" aria-label="Adaugă la favorite">' + ICON_INIMA + "</button>" +
      '<a class="titlu" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(o.t) + "</a>" +
      '<span class="magazin">' + esc(data.m[o.m] || o.m) + "</span>" +
      '<div class="pretrand"><span class="pret">' + lei(o.p) + '</span><span class="vechi"' + (o.r ? ' title="Preț de referință afișat de magazin"' : "") + ">" + lei(o.v) + '</span><span class="econ">Economisești<b>' + lei(o.v - o.p) + "</b></span></div>" +
      cupon + '<a class="btn" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">Vezi oferta ' + ICON_EXTERN + "</a></article>";
  }
  var svg = function (p) { return '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + "</svg>"; };
  var ICON_INIMA = svg('<path d="M12 20.500s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.500a4.300 4.300 0 0 1 7.500 2.800c0 5.600-7.500 10.200-7.500 10.200Z"/>');
  var ICON_EXTERN = svg('<path d="M7 17 17 7M9 7h8v8"/>');

  /* ---------- cautare cu sugestii (antet) ---------- */
  var form = $("cautare");
  if (form) {
    var inp = form.querySelector("input"), box = $("sugestii"), timer = null;
    var qUrl = new URLSearchParams(location.search).get("q");
    if (qUrl && location.pathname.indexOf("/cauta/") === 0) inp.value = qUrl;
    var inchide = function () { box.hidden = true; box.innerHTML = ""; };
    var sugestii = function () {
      var q = inp.value.trim();
      if (q.length < 2) return inchide();
      load().then(function () {
        if (inp.value.trim() !== q) return;
        var l = cauta(q).slice(0, 6);
        box.innerHTML = l.length
          ? l.map(function (o) { return '<a href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank"><span>' + esc(o.t) + "</span><small>" + lei(o.p) + "</small></a>"; }).join("") + '<a class="sug-toate" href="/cauta/?q=' + encodeURIComponent(q) + '">Vezi toate rezultatele</a>'
          : '<div class="sug-gol">Nicio ofertă pentru „' + esc(q) + "”</div>";
        box.hidden = false;
      }).catch(inchide);
    };
    inp.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(sugestii, 120); });
    inp.addEventListener("focus", function () { load().catch(function () {}); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Escape") inchide(); });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) inchide(); });
  }

  /* ---------- liste: filtre, sortare ---------- */
  var main = document.querySelector("main[data-lista]");
  if (!main) return;
  var cfg = JSON.parse(main.getAttribute("data-lista"));
  var lista = $("lista"), mai = $("mai"), gol = $("rez-gol"), nrRez = $("nr-rez"), PAS = 48;
  var elMin = $("p-min"), elMax = $("p-max"), rMin = $("p-min-r"), rMax = $("p-max-r"), umplere = $("umplere"), sortSel = $("sortare");
  var state = { sub: "", mags: [], min: 0, max: cfg.max, red: 0, sort: "red" };
  var baza = [], rez = [], shown = 0, maxScope = cfg.max;
  var params = new URLSearchParams(location.search);

  function citesteUrl() {
    state.sub = params.get("sub") || "";
    state.mags = (params.get("m") || "").split(",").filter(Boolean);
    state.red = Number(params.get("red")) || 0;
    state.sort = params.get("sort") || "red";
    state.min = Number(params.get("min")) || 0;
    state.max = params.get("max") ? Number(params.get("max")) : null;
  }
  function scrieUrl() {
    var p = new URLSearchParams();
    if (cfg.mod === "cauta" && params.get("q")) p.set("q", params.get("q"));
    if (state.sub) p.set("sub", state.sub);
    if (state.mags.length) p.set("m", state.mags.join(","));
    if (state.min > 0) p.set("min", state.min);
    if (state.max !== null && state.max < maxScope) p.set("max", state.max);
    if (state.red) p.set("red", state.red);
    if (state.sort !== "red") p.set("sort", state.sort);
    var s = p.toString();
    try { history.replaceState(null, "", location.pathname + (s ? "?" + s : "")); } catch (e) { /* ignorat */ }
  }
  var SORT = {
    red: function (a, b) { return b.r2 - a.r2 || a.p - b.p; },
    econ: function (a, b) { return (b.v - b.p) - (a.v - a.p) || a.p - b.p; },
    "pret-cresc": function (a, b) { return a.p - b.p; },
    "pret-desc": function (a, b) { return b.p - a.p; }
  };
  function aplica() {
    var mn = state.min, mx = state.max === null ? Infinity : state.max;
    rez = baza.filter(function (o) {
      return (!state.sub || o.s === state.sub) && (!state.mags.length || state.mags.indexOf(o.m) >= 0) && o.p >= mn && o.p <= mx && o.r2 >= state.red;
    }).sort(SORT[state.sort] || SORT.red);
    shown = 0; lista.innerHTML = ""; randeaza(); scrieUrl();
    nrRez.textContent = rez.length + (rez.length === 1 ? " ofertă" : " oferte");
    gol.hidden = rez.length > 0;
  }
  function randeaza() {
    var next = rez.slice(shown, shown + PAS);
    lista.insertAdjacentHTML("beforeend", next.map(card).join(""));
    shown += next.length; mai.hidden = shown >= rez.length; marcheazaFav();
  }
  mai.addEventListener("click", randeaza);

  function sincronizeazaPret(sursa) {
    var a, b;
    if (sursa === "rmin" || sursa === "rmax") { a = Number(rMin.value); b = Number(rMax.value); }
    else { a = Number(elMin.value) || 0; b = elMax.value === "" ? maxScope : Number(elMax.value); }
    if (a > b) { if (sursa === "max" || sursa === "rmax") a = b; else b = a; }
    a = Math.max(0, a); b = Math.min(maxScope, b);
    if (sursa !== "min" || document.activeElement !== elMin) elMin.value = a;
    if (sursa !== "max" || document.activeElement !== elMax) elMax.value = b;
    rMin.value = a; rMax.value = b;
    umplere.style.left = (a / maxScope * 100) + "%"; umplere.style.right = (100 - b / maxScope * 100) + "%";
    state.min = a; state.max = b >= maxScope ? null : b;
  }
  function seteazaControale() {
    elMin.value = state.min; elMax.value = state.max === null ? maxScope : state.max;
    sincronizeazaPret("max");
    var radios = document.querySelectorAll('input[name="red"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = Number(radios[i].value) === state.red;
    var cbs = document.querySelectorAll('#f-mag input');
    for (var j = 0; j < cbs.length; j++) cbs[j].checked = state.mags.indexOf(cbs[j].value) >= 0;
    var chips = document.querySelectorAll(".subcats .chip");
    for (var k = 0; k < chips.length; k++) chips[k].setAttribute("aria-pressed", chips[k].getAttribute("data-sub") === state.sub ? "true" : "false");
    sortSel.value = state.sort;
  }
  function construiesteMagazine() {
    var f = $("f-mag"); if (!f) return;
    var c = {}; baza.forEach(function (o) { c[o.m] = (c[o.m] || 0) + 1; });
    f.innerHTML = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (m) {
      return '<label class="opt"><input type="checkbox" name="m" value="' + esc(m) + '"><span>' + esc(data.m[m] || m) + '</span><span class="nr">' + c[m] + "</span></label>";
    }).join("");
  }
  function pregatesteScope() {
    var q = params.get("q") || "";
    if (cfg.mod === "categorie") baza = data.o.filter(function (o) { return o.c === cfg.cat; });
    else if (cfg.mod === "magazin") baza = data.o.filter(function (o) { return o.m === cfg.mag; });
    else if (cfg.mod === "cauta") baza = cauta(q);
    else if (cfg.mod === "favorite") baza = data.o.filter(function (o) { return favorite.indexOf(o.id) >= 0; });
    else baza = data.o.slice();
    var mx = 10; baza.forEach(function (o) { if (o.p > mx) mx = o.p; });
    maxScope = mx <= 500 ? Math.ceil(mx / 10) * 10 : mx <= 5000 ? Math.ceil(mx / 100) * 100 : Math.ceil(mx / 1000) * 1000;
    [elMin, elMax, rMin, rMax].forEach(function (e) { e.max = maxScope; });
    if (cfg.mod === "cauta") {
      $("h1").textContent = q ? "Rezultate pentru „" + q + "”" : "Căutare";
      $("sub-titlu").textContent = q ? "Oferte care conțin toți termenii căutați." : "Scrie ce cauți în caseta de sus.";
      var mg = $("migaja-curenta"); if (mg) mg.textContent = "Căutare";
      document.title = (q ? "„" + q + "” – " : "") + "Căutare – Pretino.ro";
    }
    if (cfg.mod === "favorite") { var s = $("sub-titlu"); if (s) s.textContent = baza.length ? "Ofertele pe care le-ai salvat în acest browser." : "Nu ai salvat nicio ofertă. Apasă pe inimă la o ofertă ca să o găsești aici."; }
  }
  function reseteaza() { state.sub = ""; state.mags = []; state.min = 0; state.max = null; state.red = 0; state.sort = "red"; seteazaControale(); aplica(); }

  // evenimente
  var ft = $("filtre");
  ft.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "m") state.mags = Array.prototype.map.call(document.querySelectorAll('#f-mag input:checked'), function (x) { return x.value; });
    else if (t.name === "red") state.red = Number(t.value);
    else return;
    aplica();
  });
  var pretTimer = null, pretAplica = function () { clearTimeout(pretTimer); pretTimer = setTimeout(aplica, 120); };
  elMin.addEventListener("input", function () { sincronizeazaPret("min"); pretAplica(); });
  elMax.addEventListener("input", function () { sincronizeazaPret("max"); pretAplica(); });
  rMin.addEventListener("input", function () { sincronizeazaPret("rmin"); pretAplica(); });
  rMax.addEventListener("input", function () { sincronizeazaPret("rmax"); pretAplica(); });
  $("reset").addEventListener("click", reseteaza);
  sortSel.addEventListener("change", function () { state.sort = sortSel.value; aplica(); });
  document.addEventListener("click", function (e) {
    var c = e.target.closest && e.target.closest(".subcats .chip");
    if (!c) return;
    e.preventDefault(); state.sub = c.getAttribute("data-sub") || ""; seteazaControale(); aplica();
  });
  onFav = function () { if (cfg.mod === "favorite" && data) { pregatesteScope(); aplica(); } };

  // panou de filtre pe ecrane mici
  var vala = $("vala"), btnF = $("btn-filtre");
  var deschide = function (da) { ft.classList.toggle("deschis", da); vala.hidden = !da; if (da) $("filtre-x").focus(); else btnF.focus(); };
  btnF.addEventListener("click", function () { deschide(true); });
  $("filtre-x").addEventListener("click", function () { deschide(false); });
  vala.addEventListener("click", function () { deschide(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ft.classList.contains("deschis")) deschide(false); });

  // pornire
  citesteUrl();
  if (cfg.mod === "cauta" || cfg.mod === "favorite") lista.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  load().then(function () {
    pregatesteScope(); construiesteMagazine();
    if (state.max === null || state.max > maxScope) state.max = null;
    seteazaControale(); aplica();
  }).catch(function () {
    if (cfg.mod === "cauta" || cfg.mod === "favorite") { lista.innerHTML = ""; gol.hidden = false; gol.innerHTML = "<b>Nu am putut încărca ofertele</b>Verifică conexiunea și reîncarcă pagina."; }
  });
})();
