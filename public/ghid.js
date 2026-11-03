// Interactivitate pentru ghiduri: calculator de reducere si checklist bifabil (fara dependente, fara date trimise).
(function () {
  "use strict";
  var fmt = function (n) { return n.toLocaleString("ro-RO", { maximumFractionDigits: 2 }); };

  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var inp = function (k) { return calc.querySelector('[data-c="' + k + '"]'); };
    var rez = calc.querySelector("[data-rez]");
    var val = function (k) { var v = parseFloat(String(inp(k).value).replace(",", ".")); return isFinite(v) && v >= 0 ? v : null; };
    var rand = function () {
      var vechi = val("vechi"), nou = val("nou"), tr = val("transp") || 0;
      rez.textContent = "";
      if (vechi === null || nou === null || vechi === 0) { rez.textContent = "Completează cele două prețuri ca să vezi rezultatul."; return; }
      var total = nou + tr, afisata = (vechi - nou) / vechi * 100, reala = (vechi - total) / vechi * 100;
      var linii = [["Reducere afișată", fmt(Math.round(afisata * 10) / 10) + "%"], ["Economie afișată", fmt(vechi - nou) + " lei"], ["Cost total cu transport", fmt(total) + " lei"], ["Reducere cu transport inclus", fmt(Math.round(reala * 10) / 10) + "%"]];
      var dl = document.createElement("dl");
      linii.forEach(function (r) { var d = document.createElement("div"), t = document.createElement("dt"), v = document.createElement("dd"); t.textContent = r[0]; v.textContent = r[1]; d.appendChild(t); d.appendChild(v); dl.appendChild(d); });
      rez.appendChild(dl);
      var p = document.createElement("p");
      p.textContent = nou > vechi ? "Prețul afișat este mai mare decât cel de referință: nu este o reducere." : reala <= 0 ? "Cu transportul inclus, nu mai rămâne nicio economie față de prețul de referință." : "Compară și cu alte magazine: prețul de referință poate fi ales de magazin.";
      rez.appendChild(p);
    };
    ["vechi", "nou", "transp"].forEach(function (k) { inp(k).addEventListener("input", rand); });
  }

  var ch = document.querySelector("[data-check]");
  if (ch) {
    var cheie = "pretino-check-" + ch.getAttribute("data-check");
    var boxes = ch.querySelectorAll('input[type="checkbox"]');
    var prog = ch.querySelector("[data-prog]");
    var salvate = [];
    try { salvate = JSON.parse(localStorage.getItem(cheie) || "[]") || []; } catch (e) { salvate = []; }
    var actualizeaza = function (salveaza) {
      var bifate = [];
      boxes.forEach(function (b, i) { if (b.checked) bifate.push(i); b.closest("li").classList.toggle("gata", b.checked); });
      prog.textContent = bifate.length + " din " + boxes.length + " bifate" + (bifate.length === boxes.length ? " · gata!" : "");
      if (salveaza) { try { localStorage.setItem(cheie, JSON.stringify(bifate)); } catch (e) { /* stocarea poate lipsi */ } }
    };
    boxes.forEach(function (b, i) { b.checked = salvate.indexOf(i) >= 0; b.addEventListener("change", function () { actualizeaza(true); }); });
    actualizeaza(false);
  }
})();
