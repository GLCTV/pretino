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
    var mt = document.querySelector("meta[name=theme-color]"); if (mt) mt.setAttribute("content", acum === "light" ? "#ffffff" : "#0a1916");
  });

  /* ---------- favorite ---------- */
  var favorite = [];
  try { favorite = JSON.parse(store.get("pretino-fav") || "[]"); if (!Array.isArray(favorite)) favorite = []; } catch (e) { favorite = []; }
  var onFav = null;
  // pretul la salvare si pretul vazut ultima data (doar in acest browser): „alerta de pret” fara cont si fara server
  var jsonStore = function (k) { try { var v = JSON.parse(store.get(k) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };
  var pretSalvat = jsonStore("pretino-fav-pret"), pretVazut = jsonStore("pretino-fav-vazut");
  function marcheazaFav() {
    var nr = $("fav-nr"), sc = Number(store.get("pretino-fav-sc") || 0);
    if (!favorite.length) sc = 0;
    if (nr) { nr.textContent = favorite.length; nr.hidden = favorite.length === 0; nr.classList.toggle("scazut", sc > 0); }
    var fl = $("fav-link"); if (fl) fl.setAttribute("aria-label", sc > 0 ? "Favorite: " + sc + (sc === 1 ? " ofertă a scăzut" : " oferte au scăzut") + " în preț" : "Favorite"), fl.title = sc > 0 ? sc + (sc === 1 ? " ofertă salvată a scăzut" : " oferte salvate au scăzut") + " în preț de la ultima vizită" : "";
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
      if (p >= 0) { favorite.splice(p, 1); delete pretSalvat[id]; delete pretVazut[id]; }
      else { favorite.push(id); var pr = Number(f.getAttribute("data-p")); if (pr > 0) { pretSalvat[id] = pr; pretVazut[id] = pr; } }
      store.set("pretino-fav", JSON.stringify(favorite)); store.set("pretino-fav-pret", JSON.stringify(pretSalvat)); store.set("pretino-fav-vazut", JSON.stringify(pretVazut));
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
  // potrivire pe toti termenii; scor: inceput de cuvant (ex. „lap” in „laptop”) conteaza mai mult decat o bucata din mijlocul unui cuvant (ex. „claps”)
  function cauta(q) {
    var t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    var rx = t.map(function (x) { return new RegExp("(^|[^a-z0-9])" + x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); });
    var r = [];
    data.o.forEach(function (o) {
      var sc = 0;
      for (var i = 0; i < t.length; i++) {
        if (o.k.indexOf(t[i]) < 0) return;
        sc += rx[i].test(o.k) ? 2 : 1;
        if (i === 0 && o.k.indexOf(t[0]) === 0) sc += 2;
      }
      o.sc = sc; r.push(o);
    });
    return r;
  }
  function dupaRelevanta(l) { return l.slice().sort(function (a, b) { return b.sc - a.sc || b.r2 - a.r2 || a.p - b.p; }); }
  // specificatii citite literal din titlu (diagonala, memorie / stocare), doar la electronice
  function specuri(t, c) {
    if (c !== "electronice") return [];
    var r = [], d = t.match(/(?<![\d.,])(\d{2}(?:[.,]\d)?)\s?(?:"|”|″|''|inch|inci)/i), m, re = /(?<![\d.,])(\d{1,4})\s?(GB|TB)\b/gi;
    if (d) r.push(d[1].replace(",", ".") + '"');
    while ((m = re.exec(t))) { var x = m[1] + " " + m[2].toUpperCase(); if (r.indexOf(x) < 0) r.push(x); }
    return r.slice(0, 3);
  }
  var COND = { 1: "Resigilat", 2: "Refurbished" };
  // PC Garage: miniatura -> varianta mare (cu revenire la miniatura daca nu exista)
  function imgMare(u) { return /^https:\/\/\d\.grgs\.ro\/images\/products\/.+\/thumbnails\//.test(u) ? u.replace("/thumbnails/", "/") : u; }
  function card(o, i) {
    var poza = '<a class="poza' + (o.i ? "" : " fara") + '" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank" tabindex="-1" aria-hidden="true">' +
      (o.i ? '<img src="' + esc(imgMare(o.i)) + '" alt="' + esc(o.t) + '" ' + (i < 4 ? "" : 'loading="lazy" ') + 'decoding="async" referrerpolicy="no-referrer" width="275" height="167"' + (imgMare(o.i) !== o.i ? ' data-t="' + esc(o.i) + '"' : "") + ' onerror="' + (imgMare(o.i) !== o.i ? "if(this.dataset.t){this.src=this.dataset.t;delete this.dataset.t;return}" : "") + 'this.parentNode.classList.add(\'fara\')">' : "") + "</a>";
    var k = data.k && data.k[o.m], sp = specuri(o.t, o.c), mn = data.m[o.m] || o.m;
    var cupon = k ? '<div class="cupon"><span>Cupon <b>' + esc(k.cod) + "</b> (" + esc(k.text) + ') în coș · prețul afișat nu îl include</span><button type="button" class="copiaza" data-cod="' + esc(k.cod) + '">Copiază</button></div>' : "";
    return '<article class="card">' + poza + '<span class="badge ' + (o.r2 >= 50 ? "t3" : o.r2 >= 30 ? "t2" : "t1") + '">-' + o.r2 + '%</span>' +
      '<button class="fav" type="button" data-id="' + esc(o.id) + '" data-p="' + o.p + '" aria-pressed="false" aria-label="Adaugă la favorite">' + ICON_INIMA + "</button>" +
      '<a class="titlu" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(o.t) + "</a>" + (sp.length ? '<span class="specs">' + sp.map(function (x) { return "<i>" + esc(x) + "</i>"; }).join("") + "</span>" : "") +
      '<span class="magazin"><a href="/magazin/' + esc(o.m) + '/">' + esc(data.m[o.m] || o.m) + "</a>" + (o.x ? '<span class="cond">' + COND[o.x] + "</span>" : "") + "</span>" +
      '<div class="pretrand"><span class="pret">' + lei(o.p) + '</span><span class="vechi"' + (o.r ? ' title="Preț de referință afișat de magazin"' : "") + ">" + lei(o.v) + '</span><span class="econ">Economisești<b>' + lei(o.v - o.p) + "</b></span></div>" +
      cupon + '<a class="btn" href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank" aria-label="Vezi oferta la ' + esc(mn) + ' (se deschide în magazin, fereastră nouă)" title="Se deschide în magazin">Vezi la ' + esc(mn) + " " + ICON_EXTERN + "</a></article>";
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
        var l = dupaRelevanta(cauta(q)).slice(0, 6);
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

  /* ---------- semnalare scaderi de pret la favorite (cel mult o data la 6 ore, doar daca ai favorite; nimic nu pleaca din browser) ---------- */
  function verificaScaderi() {
    if (!favorite.length || /^\/favorite\//.test(location.pathname)) return;
    if (Date.now() - Number(store.get("pretino-fav-t") || 0) < 6 * 3600 * 1000) return;
    (window.requestIdleCallback || function (f) { setTimeout(f, 2500); })(function () {
      load().then(function () {
        var n = 0, vaz = jsonStore("pretino-fav-vazut");
        favorite.forEach(function (id) { var o = data.o.filter(function (x) { return x.id === id; })[0]; if (!o) return; if (vaz[id] === undefined) vaz[id] = o.p; else if (o.p < vaz[id] - 0.009) n++; });
        store.set("pretino-fav-vazut", JSON.stringify(vaz)); store.set("pretino-fav-sc", String(n)); store.set("pretino-fav-t", String(Date.now())); marcheazaFav();
      }).catch(function () {});
    });
  }
  verificaScaderi();

  /* ---------- confort pe mobil: indicii de derulare, categoria activa vizibila, blocul „Descopera” strans, „Inapoi sus” ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".cats, .subcats"), function (el) {
    var act = el.querySelector("[aria-current]");
    if (act && el.scrollWidth > el.clientWidth) el.scrollLeft += act.getBoundingClientRect().left - el.getBoundingClientRect().left - (el.clientWidth - act.offsetWidth) / 2;
    var u = function () { el.classList.toggle("poate-st", el.scrollLeft > 4); el.classList.toggle("poate-dr", el.scrollLeft + el.clientWidth < el.scrollWidth - 4); };
    el.addEventListener("scroll", u, { passive: true }); addEventListener("resize", u); u();
  });
  if (window.matchMedia && matchMedia("(max-width: 760px)").matches) { var dd = document.querySelector(".descopera details"); if (dd) dd.removeAttribute("open"); }
  var sus = document.createElement("button");
  sus.type = "button"; sus.className = "sus"; sus.hidden = true; sus.setAttribute("aria-label", "Înapoi sus"); sus.innerHTML = svg('<path d="M6 14.500 12 8.500l6 6"/>');
  sus.addEventListener("click", function () { var redus = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; window.scrollTo({ top: 0, behavior: redus ? "auto" : "smooth" }); });
  document.body.appendChild(sus);
  var susT = null;
  addEventListener("scroll", function () { if (susT) return; susT = setTimeout(function () { susT = null; sus.hidden = window.scrollY < 700; }, 120); }, { passive: true });

  /* ---------- liste: filtre, sortare, „Arata mai multe” ---------- */
  var main = document.querySelector("main[data-lista]");
  if (!main) return;
  var cfg = JSON.parse(main.getAttribute("data-lista"));
  var lista = $("lista"), mai = $("mai"), gol = $("rez-gol"), nrRez = $("nr-rez"), PAS = cfg.pe || 48;
  var elMin = $("p-min"), elMax = $("p-max"), rMin = $("p-min-r"), rMax = $("p-max-r"), umplere = $("umplere"), sortSel = $("sortare");
  var IMPL = cfg.mod === "cauta" ? "rel" : "red";   // la cautare lista porneste de la relevanta
  var state = { sub: "", mags: [], min: 0, max: cfg.max, red: 0, sort: IMPL, nou: false };
  if (cfg.mod === "cauta") { var oRel = document.createElement("option"); oRel.value = "rel"; oRel.textContent = "Relevanță"; $("sortare").insertBefore(oRel, $("sortare").firstChild); }
  var baza = [], rez = [], shown = 0, maxScope = cfg.max;
  var params = new URLSearchParams(location.search);
  var pregatit = false, client = false;   // client = lista e (re)construita din catalog in browser; altfel ramane HTML-ul primit
  var SORT = {
    rel: function (a, b) { return (b.sc || 0) - (a.sc || 0) || b.r2 - a.r2 || a.p - b.p; },
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
    state.sort = SORT[sort] && (sort !== "rel" || cfg.mod === "cauta") ? sort : IMPL;
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
    if (state.sort !== IMPL) p.set("sort", state.sort);
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
    var na = $("nr-aplica"); if (na) na.textContent = rez.length;
    if (!rez.length) stareGoala();
    main.classList.toggle("fav-gol", cfg.mod === "favorite" && !favorite.length);
    afiseazaActive(); decoreazaCarduri();
  }
  // ---- filtre active (etichete care se pot sterge) si contorul de pe butonul „Filtre” ----
  function filtreActive() {
    var l = [];
    if (state.sub) { var c = document.querySelector('.subcats .chip[data-sub="' + state.sub + '"]'); l.push({ k: "sub", t: c ? c.textContent.trim() : state.sub }); }
    state.mags.forEach(function (m) { l.push({ k: "m:" + m, t: data.m[m] || m }); });
    if (state.min > 0 || state.max !== null) l.push({ k: "pret", t: "Preț: " + state.min + (state.max === null ? "+" : "–" + state.max) + " lei" });
    if (state.red) l.push({ k: "red", t: "Reducere min. " + state.red + "%" });
    if (state.nou) l.push({ k: "nou", t: "Doar produse noi" });
    return l;
  }
  function afiseazaActive() {
    var l = filtreActive(), box = $("active"), cnt = $("cnt-filtre");
    if (cnt) { cnt.textContent = l.length; cnt.hidden = !l.length; }
    if (!box) return;
    box.hidden = !l.length;
    box.innerHTML = l.length ? l.map(function (x) { return '<button type="button" class="ach" data-k="' + esc(x.k) + '" aria-label="Scoate filtrul ' + esc(x.t) + '">' + esc(x.t) + ' <span aria-hidden="true">✕</span></button>'; }).join("") + '<button type="button" class="ach tot" data-k="*">Șterge toate</button>' : "";
  }
  function scoateFiltru(k) {
    if (k === "*") return reseteaza();
    if (k === "sub") state.sub = ""; else if (k === "pret") { state.min = 0; state.max = null; } else if (k === "red") state.red = 0; else if (k === "nou") state.nou = false;
    else if (k.indexOf("m:") === 0) state.mags = state.mags.filter(function (m) { return m !== k.slice(2); });
    seteazaControale(); cuDate(aplica);
  }
  // ---- stari goale utile ----
  var catLinks = function () { return Array.prototype.map.call(document.querySelectorAll(".cats a"), function (a) { return '<a class="btn-link" href="' + esc(a.getAttribute("href")) + '">' + esc(a.textContent.trim()) + "</a>"; }).join(""); };
  function stareGoala() {
    var q = (params.get("q") || "").trim();
    if (cfg.mod === "favorite" && !favorite.length) {
      gol.innerHTML = '<div class="gol-ic" aria-hidden="true">' + ICON_INIMA + '</div><b>Nu ai salvat nicio ofertă</b>Apasă pe inimă la o ofertă ca s-o găsești aici, cu prețul de la salvare și cu semnalarea scăderilor de preț.<div class="gol-acte"><a class="btn-link mare" href="/">Vezi ofertele</a><a class="btn-link" href="/top-oferte/">Top economii</a></div>';
    } else if (cfg.mod === "cauta") {
      var h = q ? "<b>Nicio ofertă pentru „" + esc(q) + "”</b>Verifică ortografia sau încearcă mai puține cuvinte, mai generale." : "<b>Ce cauți?</b>Scrie în caseta de sus numele produsului sau al magazinului.", cuv = q.split(/\s+/).filter(Boolean);
      for (var n = cuv.length - 1; n >= 1; n--) { var q2 = cuv.slice(0, n).join(" "); if (cauta(q2).length) { h += '<p>Încearcă: <a href="/cauta/?q=' + encodeURIComponent(q2) + '">' + esc(q2) + "</a></p>"; break; } }
      gol.innerHTML = h + '<p class="gol-et">Sau alege o categorie:</p><div class="gol-acte">' + catLinks() + "</div>";
    } else {
      gol.innerHTML = "<b>Nicio ofertă cu filtrele alese</b>Poți scoate un filtru sau le poți șterge pe toate." + (filtreActive().length ? '<div class="gol-acte"><button type="button" class="btn-link mare reset-gol">Resetează filtrele</button></div>' : "");
    }
  }
  // ---- carduri: pret la salvare (favorite) si bifa „Compară” ----
  var cmpSel = [];
  function decoreazaCarduri() {
    if (cfg.mod !== "favorite") return;
    Array.prototype.forEach.call(lista.querySelectorAll(".card"), function (c) {
      if (c.querySelector(".cmp")) return;
      var f = c.querySelector(".fav"), id = f && f.getAttribute("data-id"), o = data.o.filter(function (x) { return x.id === id; })[0];
      if (!o) return;
      var sv = pretSalvat[id];
      if (!sv) { sv = pretSalvat[id] = o.p; store.set("pretino-fav-pret", JSON.stringify(pretSalvat)); }
      var diff = Math.round((sv - o.p) * 100) / 100;
      if (Math.abs(diff) >= 0.01) {
        var pr = c.querySelector(".pretrand"), n = document.createElement("span");
        n.className = "pret-salvat " + (diff > 0 ? "scazut" : "crescut");
        n.textContent = "La salvare: " + lei(sv) + " · " + (diff > 0 ? "a scăzut cu " + lei(diff) : "a crescut cu " + lei(-diff));
        c.insertBefore(n, pr);
      }
      var lb = document.createElement("label"); lb.className = "cmp";
      lb.innerHTML = '<input type="checkbox" data-cmp="' + esc(id) + '"' + (cmpSel.indexOf(id) >= 0 ? " checked" : "") + "> Compară";
      c.appendChild(lb);
    });
    // bifele peste limita de 3 se dezactiveaza
    var bife = lista.querySelectorAll("[data-cmp]");
    Array.prototype.forEach.call(bife, function (b) { b.disabled = cmpSel.length >= 3 && !b.checked; });
    randeazaComparare();
    // preturile vazute acum devin referinta pentru semnalarea din antet
    if (data) { var nou = {}; favorite.forEach(function (id) { var o = data.o.filter(function (x) { return x.id === id; })[0]; if (o) nou[id] = o.p; }); pretVazut = nou; store.set("pretino-fav-vazut", JSON.stringify(nou)); store.set("pretino-fav-sc", "0"); store.set("pretino-fav-t", String(Date.now())); marcheazaFav(); }
  }
  function randeazaComparare() {
    var box = $("compara"); if (!box) return;
    if (lista.previousElementSibling !== box) lista.parentNode.insertBefore(box, lista);
    if (cmpSel.length < 2) { box.hidden = cmpSel.length === 0; box.innerHTML = cmpSel.length ? '<p class="cmp-ind">Alege încă o ofertă pentru comparare (maximum 3).</p>' : ""; return; }
    var of = cmpSel.map(function (id) { return data.o.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    var minP = Math.min.apply(null, of.map(function (o) { return o.p; }));
    var rand = function (et, f, cls) { return "<tr><th scope=\"row\">" + et + "</th>" + of.map(function (o) { return "<td" + (cls && cls(o) ? ' class="' + cls(o) + '"' : "") + ">" + f(o) + "</td>"; }).join("") + "</tr>"; };
    box.hidden = false;
    box.innerHTML = '<div class="cmp-cap"><h3>Comparare (' + of.length + ')</h3><button type="button" class="ach tot" data-cmp-gol="1">Închide comparația</button></div><div class="cmp-tabel"><table><caption class="sr">Comparare oferte salvate</caption><thead><tr><th scope="col"><span class="sr">Caracteristică</span></th>' + of.map(function (o) { return '<th scope="col">' + esc(o.t) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rand("Magazin", function (o) { return esc(data.m[o.m] || o.m); }) +
      rand("Preț", function (o) { return "<b>" + lei(o.p) + "</b>" + (o.p === minP && of.length > 1 ? " · cel mai mic" : ""); }, function (o) { return o.p === minP ? "cel-mai-bun" : ""; }) +
      rand("Preț de referință", function (o) { return lei(o.v); }) +
      rand("Reducere", function (o) { return "-" + o.r2 + "%"; }) +
      rand("Economie", function (o) { return lei(o.v - o.p); }) +
      rand("Condiție", function (o) { return o.x ? COND[o.x] : "Nou"; }) +
      rand("Specificații din titlu", function (o) { var sp = specuri(o.t, o.c); return sp.length ? esc(sp.join(" · ")) : "–"; }) +
      rand("Oferta", function (o) { return '<a href="' + esc(o.u) + '" rel="sponsored nofollow noopener" target="_blank">Vezi la ' + esc(data.m[o.m] || o.m) + "</a>"; }) +
      "</tbody></table></div>";
  }
  function randeaza() {
    var next = rez.slice(shown, shown + PAS);
    lista.insertAdjacentHTML("beforeend", next.map(function (o, i) { return card(o, shown + i); }).join(""));
    shown += next.length; mai.hidden = shown >= rez.length; marcheazaFav(); if (cfg.mod === "favorite") decoreazaCarduri();
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
    if (cfg.mod === "categorie") baza = data.o.filter(function (o) { return o.c === cfg.cat && (!cfg.sub || o.s === cfg.sub) && (!cfg.tip || o.g === cfg.tip); });
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
    if (cfg.mod === "favorite") { var s = $("sub-titlu"); if (s) s.textContent = baza.length ? "Ofertele pe care le-ai salvat în acest browser. Poți compara până la 3 și vezi cum s-a schimbat prețul de la salvare." : "Salvează oferte cu inima de pe carduri și le găsești aici."; }
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
  function reseteaza() { state.sub = ""; state.mags = []; state.min = 0; state.max = null; state.red = 0; state.sort = IMPL; state.nou = false; seteazaControale(); if (client) cuDate(aplica); }

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
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("button");
    if (!t) return;
    if (t.classList.contains("ach") && t.hasAttribute("data-k")) scoateFiltru(t.getAttribute("data-k"));
    else if (t.classList.contains("reset-gol")) reseteaza();
    else if (t.hasAttribute("data-cmp-gol")) { cmpSel = []; Array.prototype.forEach.call(lista.querySelectorAll("[data-cmp]"), function (b) { b.checked = false; b.disabled = false; }); randeazaComparare(); }
  });
  lista.addEventListener("change", function (e) {
    var b = e.target; if (!b.hasAttribute || !b.hasAttribute("data-cmp")) return;
    var id = b.getAttribute("data-cmp"), i = cmpSel.indexOf(id);
    if (b.checked && i < 0 && cmpSel.length < 3) cmpSel.push(id); else if (!b.checked && i >= 0) cmpSel.splice(i, 1);
    Array.prototype.forEach.call(lista.querySelectorAll("[data-cmp]"), function (x) { x.disabled = cmpSel.length >= 3 && !x.checked; });
    randeazaComparare();
  });
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
  onFav = function () { cmpSel = cmpSel.filter(function (id) { return favorite.indexOf(id) >= 0; }); if (cfg.mod === "favorite" && pregatit) { pregatesteScope(); aplica(); } };
  // pregatire discreta a catalogului cand utilizatorul se apropie de controale (fara cost la incarcarea paginii)
  [ft, document.querySelector(".sort"), mai, $("btn-filtre")].forEach(function (el) {
    if (el) ["pointerover", "focusin", "touchstart"].forEach(function (ev) { el.addEventListener(ev, function () { load().catch(function () {}); }, { once: true, passive: true }); });
  });

  // panou de filtre pe ecrane mici
  var vala = $("vala"), btnF = $("btn-filtre");
  var deschide = function (da) { ft.classList.toggle("deschis", da); vala.hidden = !da; if (da) $("filtre-x").focus(); else btnF.focus(); };
  btnF.addEventListener("click", function () { deschide(true); });
  $("filtre-x").addEventListener("click", function () { deschide(false); });
  $("aplica").addEventListener("click", function () { deschide(false); });
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
