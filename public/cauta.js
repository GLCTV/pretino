// Pretino.ro – interfata din browser: tema, favorite, copiere cupon, cautare cu sugestii, filtre/sortare pe liste.
// Catalogul (/cauta-index.json; campuri: id,t,m,c,s,p,v,r,x,u,i) se incarca DOAR cand e nevoie: cautare, filtre/sortare, „Arata mai multe”, favorite.
// Paginile de lista au deja produsele in HTML (cu linkuri de paginare), deci pornirea nu mai randeaza din nou lista. Fara cookie-uri; favoritele si tema raman doar in acest browser; statistici anonime la sfarsitul fisierului.
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
  var COND = { 1: "Resigilat", 2: "Refurbished" };
  function card(o, i) {
    var poza = '<a class="poza' + (o.i ? "" : " fara") + '" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true">' +
      (o.i ? '<img src="' + esc(o.i) + '" alt="' + esc(o.t) + '" ' + (i < 4 ? "" : 'loading="lazy" ') + 'decoding="async" referrerpolicy="no-referrer" width="275" height="167" onerror="this.parentNode.classList.add(\'fara\')">' : "") + "</a>";
    var k = data.k && data.k[o.m];
    var cupon = k ? '<div class="cupon"><span>Cupon <b>' + esc(k.cod) + "</b> (" + esc(k.text) + ') în coș · prețul afișat nu îl include</span><button type="button" class="copiaza" data-cod="' + esc(k.cod) + '">Copiază</button></div>' : "";
    return '<article class="card">' + poza + '<span class="badge ' + (o.r2 >= 50 ? "t3" : o.r2 >= 30 ? "t2" : "t1") + '">-' + o.r2 + '%</span>' +
      '<button class="fav" type="button" data-id="' + esc(o.id) + '" aria-pressed="false" aria-label="Adaugă la favorite">' + ICON_INIMA + "</button>" +
      '<a class="titlu" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(o.t) + "</a>" +
      '<span class="magazin"><a href="/magazin/' + esc(o.m) + '/">' + esc(data.m[o.m] || o.m) + "</a>" + (o.x ? '<span class="cond">' + COND[o.x] + "</span>" : "") + "</span>" +
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

  /* ---------- liste: filtre, sortare, „Arata mai multe” ---------- */
  var main = document.querySelector("main[data-lista]");
  if (!main) return;
  var cfg = JSON.parse(main.getAttribute("data-lista"));
  var lista = $("lista"), mai = $("mai"), gol = $("rez-gol"), nrRez = $("nr-rez"), PAS = cfg.pe || 48;
  var elMin = $("p-min"), elMax = $("p-max"), rMin = $("p-min-r"), rMax = $("p-max-r"), umplere = $("umplere"), sortSel = $("sortare");
  var state = { sub: "", mags: [], min: 0, max: cfg.max, red: 0, sort: "red", nou: false };
  var baza = [], rez = [], shown = 0, maxScope = cfg.max;
  var params = new URLSearchParams(location.search);
  var pregatit = false, client = false;   // client = lista e (re)construita din catalog in browser; altfel ramane HTML-ul primit
  var SORT = {
    red: function (a, b) { return b.r2 - a.r2 || a.p - b.p || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); },
    econ: function (a, b) { return (b.v - b.p) - (a.v - a.p) || a.p - b.p; },
    "pret-cresc": function (a, b) { return a.p - b.p; },
    "pret-desc": function (a, b) { return b.p - a.p; }
  };
  var PARAMETRI = ["sub", "m", "min", "max", "red", "sort", "nou"];
  var areParametri = PARAMETRI.some(function (k) { return params.has(k); });
  var numar = function (v) { var n = Number(v); return isFinite(n) && n >= 0 ? n : null; };

  // parametri din URL: valorile invalide sunt ignorate (nu produc liste goale sau erori)
  function citesteUrl() {
    var sub = params.get("sub") || "";
    state.sub = /^[a-z0-9-]+$/.test(sub) ? sub : "";
    state.mags = (params.get("m") || "").split(",").filter(function (x) { return /^[a-z0-9-]+$/.test(x); });
    var red = Number(params.get("red"));
    state.red = [20, 30, 40, 50].indexOf(red) >= 0 ? red : 0;
    var sort = params.get("sort");
    state.sort = SORT[sort] ? sort : "red";
    state.nou = params.get("nou") === "1";
    state.min = numar(params.get("min")) || 0;
    state.max = params.get("max") === null ? null : numar(params.get("max"));
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
    if (state.nou) p.set("nou", "1");
    var s = p.toString();
    // dupa filtrare in browser lista porneste de la inceput: adresa revine la prima pagina a listei (cfg.baza)
    try { history.replaceState(null, "", (cfg.baza || location.pathname) + (s ? "?" + s : "")); } catch (e) { /* ignorat */ }
  }
  function ascundePagini() { var n = document.querySelector(".pagini"); if (n) n.hidden = true; }
  function aplica() {
    client = true; ascundePagini();
    var mn = state.min, mx = state.max === null ? Infinity : state.max;
    rez = baza.filter(function (o) {
      return (!state.sub || o.s === state.sub) && (!state.mags.length || state.mags.indexOf(o.m) >= 0) && o.p >= mn && o.p <= mx && o.r2 >= state.red && (!state.nou || !o.x);
    }).sort(SORT[state.sort] || SORT.red);
    shown = 0; lista.innerHTML = ""; randeaza(); scrieUrl();
    nrRez.textContent = rez.length + (rez.length === 1 ? " ofertă" : " oferte");
    gol.hidden = rez.length > 0;
  }
  function randeaza() {
    var next = rez.slice(shown, shown + PAS);
    lista.insertAdjacentHTML("beforeend", next.map(function (o, i) { return card(o, shown + i); }).join(""));
    shown += next.length; mai.hidden = shown >= rez.length; marcheazaFav();
  }
  // „Arata mai multe” pe lista primita in HTML: continua de unde se termina pagina curenta (aceeasi ordine ca in HTML, fara dubluri sau salturi)
  function maiMulte() {
    cuDate(function () {
      if (client) return randeaza();
      if (!shown) { rez = baza; shown = cfg.fin; }
      randeaza(); ascundePagini();
    });
  }
  mai.addEventListener("click", maiMulte);

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
    var nn = $("f-nou"); if (nn) nn.checked = state.nou;
    var cbs = document.querySelectorAll('#f-mag input');
    for (var j = 0; j < cbs.length; j++) cbs[j].checked = state.mags.indexOf(cbs[j].value) >= 0;
    var chips = document.querySelectorAll(".subcats .chip[data-sub]");
    for (var k = 0; k < chips.length; k++) { if (chips[k].getAttribute("data-sub") === state.sub) chips[k].setAttribute("aria-current", "page"); else chips[k].removeAttribute("aria-current"); }
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
    if (cfg.mod === "categorie") baza = data.o.filter(function (o) { return o.c === cfg.cat && (!cfg.sub || o.s === cfg.sub); });
    else if (cfg.mod === "brand") baza = data.o.filter(function (o) { return o.b === cfg.brand; });
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
      document.title = (q ? "„" + q + "” – " : "") + "Căutare | Pretino";
    }
    if (cfg.mod === "favorite") { var s = $("sub-titlu"); if (s) s.textContent = baza.length ? "Ofertele pe care le-ai salvat în acest browser." : "Nu ai salvat nicio ofertă. Apasă pe inimă la o ofertă ca să o găsești aici."; }
  }
  function pregateste() {
    pregatit = true; pregatesteScope();
    if (cfg.mod === "cauta" || cfg.mod === "favorite") construiesteMagazine();
    // valori invalide din URL fata de catalogul real: magazine / subcategorii inexistente se ignora
    state.mags = state.mags.filter(function (m) { return !!data.m[m]; });
    if (state.sub && !baza.some(function (o) { return o.s === state.sub; })) state.sub = "";
    if (state.max !== null && state.max > maxScope) state.max = null;
    seteazaControale();
  }
  // ruleaza fn dupa incarcarea catalogului (o singura data, doar la prima interactiune)
  function cuDate(fn) {
    if (pregatit) return fn();
    load().then(function () { if (!pregatit) pregateste(); fn(); }).catch(function () { /* fara catalog ramane lista din HTML */ });
  }
  function reseteaza() { state.sub = ""; state.mags = []; state.min = 0; state.max = null; state.red = 0; state.sort = "red"; state.nou = false; seteazaControale(); if (client) cuDate(aplica); }

  // evenimente
  var ft = $("filtre");
  ft.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "m") state.mags = Array.prototype.map.call(document.querySelectorAll('#f-mag input:checked'), function (x) { return x.value; });
    else if (t.name === "red") state.red = Number(t.value);
    else if (t.name === "nou") state.nou = t.checked;
    else return;
    cuDate(aplica);
  });
  var pretTimer = null, pretAplica = function () { clearTimeout(pretTimer); pretTimer = setTimeout(function () { cuDate(aplica); }, 120); };
  elMin.addEventListener("input", function () { sincronizeazaPret("min"); pretAplica(); });
  elMax.addEventListener("input", function () { sincronizeazaPret("max"); pretAplica(); });
  rMin.addEventListener("input", function () { sincronizeazaPret("rmin"); pretAplica(); });
  rMax.addEventListener("input", function () { sincronizeazaPret("rmax"); pretAplica(); });
  $("reset").addEventListener("click", reseteaza);
  sortSel.addEventListener("change", function () { state.sort = sortSel.value; cuDate(aplica); });
  // chipurile cu data-sub sunt filtre in browser (subcategorii fara pagina proprie); celelalte sunt linkuri normale catre pagini
  document.addEventListener("click", function (e) {
    var c = e.target.closest && e.target.closest(".subcats .chip[data-sub]");
    if (!c) return;
    e.preventDefault();
    var nou = c.getAttribute("data-sub") || "";
    if (nou === state.sub && !client) return;   // deja afisata
    state.sub = nou; seteazaControale(); cuDate(aplica);
  });
  onFav = function () { if (cfg.mod === "favorite" && pregatit) { pregatesteScope(); aplica(); } };
  // pregatire discreta a catalogului cand utilizatorul se apropie de controale (fara cost la incarcarea paginii)
  [ft, document.querySelector(".sort"), mai, $("btn-filtre")].forEach(function (el) {
    if (el) ["pointerover", "focusin", "touchstart"].forEach(function (ev) { el.addEventListener(ev, function () { load().catch(function () {}); }, { once: true, passive: true }); });
  });

  // panou de filtre pe ecrane mici
  var vala = $("vala"), btnF = $("btn-filtre");
  var deschide = function (da) { ft.classList.toggle("deschis", da); vala.hidden = !da; if (da) $("filtre-x").focus(); else btnF.focus(); };
  btnF.addEventListener("click", function () { deschide(true); });
  $("filtre-x").addEventListener("click", function () { deschide(false); });
  vala.addEventListener("click", function () { deschide(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ft.classList.contains("deschis")) deschide(false); });

  // pornire
  citesteUrl();
  // adresa veche ?sub=<subcategorie> -> pagina proprie a subcategoriei (acelasi continut), pastrand ceilalti parametri
  if (cfg.mod === "categorie" && !cfg.sub && state.sub && (cfg.subRute || []).indexOf(state.sub) >= 0) {
    params.delete("sub"); var rest = params.toString();
    location.replace("/categorie/" + cfg.cat + "/" + state.sub + "/" + (rest ? "?" + rest : "")); return;
  }
  if (cfg.mod === "cauta" || cfg.mod === "favorite" || areParametri) {
    // lista se construieste in browser (cautare, favorite sau filtre din adresa); pentru cautare/favorite HTML-ul nu are produse
    if (cfg.mod === "cauta" || cfg.mod === "favorite") lista.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    load().then(function () { pregateste(); aplica(); }).catch(function () {
      if (cfg.mod === "cauta" || cfg.mod === "favorite") { lista.innerHTML = ""; gol.hidden = false; gol.innerHTML = "<b>Nu am putut încărca ofertele</b>Verifică conexiunea și reîncarcă pagina."; }
    });
  } else {
    mai.hidden = cfg.fin >= cfg.total;   // lista din HTML ramane neschimbata; „Arata mai multe” continua dupa ultimul produs al paginii
  }
})();

/* ---------- statistici anonime (fara cookie-uri, fara stocare in browser, fara IP) ----------
   Trimite catre /_s/c (acelasi domeniu): pagina fara parametri, domeniul sursei si secundele cat pagina a fost vizibila. Nu se trimit pe previzualizare locala,
   pe pagini DEMO, la „Do Not Track”/Global Privacy Control, la browsere automate sau pe dispozitivele excluse cu ?fara-statistici=1 (se anuleaza cu ?cu-statistici=1). */
(function () {
  "use strict";
  try {
    if (!/(^|\.)pretino\.ro$/.test(location.hostname) || document.querySelector(".demo")) return;
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl || navigator.webdriver) return;
    var CHEIE = "pretino-fara-stat";
    if (/[?&]fara-statistici=1/.test(location.search)) localStorage.setItem(CHEIE, "1");
    if (/[?&]cu-statistici=1/.test(location.search)) localStorage.removeItem(CHEIE);
    if (localStorage.getItem(CHEIE) === "1") return;
  } catch (e) { /* stocarea indisponibila: se masoara normal */ }
  var trimite = function (o) {
    try { fetch("/_s/c", { method: "POST", body: JSON.stringify(o), keepalive: true, credentials: "omit" }).catch(function () {}); } catch (e) { /* ignorat */ }
  };
  var pid = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(8)), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  var sursa = "";
  try { var h = new URL(document.referrer).hostname; if (h && h !== location.hostname && h !== "www." + location.hostname) sursa = h; } catch (e) { /* fara sursa */ }
  var acum = function () { return Date.now(); }, vizibil = document.visibilityState === "visible", start = acum(), total = 0;
  trimite({ e: "v", p: pid, c: location.pathname, r: sursa });
  var opreste = function () {
    if (vizibil) { total += acum() - start; vizibil = false; }
    trimite({ e: "t", p: pid, s: Math.round(total / 1000) });
  };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") opreste(); else if (!vizibil) { vizibil = true; start = acum(); }
  });
  addEventListener("pagehide", opreste);
  // click pe „Vezi oferta”/titlu/poza: se trimite doar magazinul (din cardul produsului), nu produsul si nu o identitate
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[rel~=sponsored]") : null, card = a && a.closest("article"), m = card && card.querySelector(".magazin a");
    var slug = m && (m.getAttribute("href") || "").match(/^\/magazin\/([a-z0-9-]+)\/$/);
    if (slug) trimite({ e: "c", c: location.pathname, m: slug[1] });
  }, true);
})();
