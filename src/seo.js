// SEO Pretino: praguri editoriale + titluri/descrieri. Folosit de scripts/build.js, deci supravietuieste oricarei actualizari de catalog.
// Pragurile de mai jos sunt decizii editoriale ale proiectului, NU reguli Google.
export const PE_PAGINA = 48;          // produse HTML pe o pagina de lista (si pasul „Arata mai multe”)
export const MIN_SUB_PAGINA = 15;     // o subcategorie primeste pagina proprie (URL stabil, indexabila) doar cu cel putin atatea oferte
export const MIN_TIP_PAGINA = 15;     // un tip de produs (ex. Mouse-uri in Periferice) primeste pagina proprie doar cu cel putin atatea oferte; parintele ramane director
export const MIN_MAGAZIN_INDEX = 5;   // pagina unui magazin cu mai putine oferte ramane accesibila, dar noindex si fara intrare in sitemap
export const ZILE_DATE_VECHI = 7;     // ofertele unei surse neverificate cu succes de mai mult de atatea zile nu se mai afiseaza (politica „date prea vechi”)
export const BRAND = "Pretino";
export const BF_DATA = "27 noiembrie 2026"; // Black Friday 2026 = a patra vineri din noiembrie

// text de nume cu majuscule corecte pentru siglele din limba romana (Electronice si IT, Componente PC, Monitoare si TV)
export const jos = (nume) => String(nume).toLowerCase().replace(/\bpc\b/g, "PC").replace(/\btv\b/g, "TV").replace(/\bit\b/g, "IT");
const sufix = ` | ${BRAND}`;
const pag = (b, p) => (p > 1 ? `${b} – pagina ${p}` : b);

export const metaAcasa = (p = 1) => ({
  titlu: pag("Oferte și reduceri online din România", p) + sufix,
  h1: "Oferte și reduceri din magazinele din România",
  descriere: "Descoperă oferte la electronice, electrocasnice, casă și grădină. Filtrează după magazin, preț și reducere și verifică oferta în magazin.",
  intro: "Pretino adună reduceri din magazine online din România. Nu vindem produse: te trimitem în magazin, unde verifici prețul final.",
});

export const metaCategorie = (c, nMagazine, p = 1) => {
  const nume = jos(c.nume);
  return {
    titlu: pag(`Oferte ${nume} – reduceri online`, p) + sufix,
    h1: `Oferte pentru ${nume}`,
    descriere: `Descoperă oferte la ${nume} din mai multe magazine din România. Filtrează după magazin, preț și reducere și verifică oferta în magazin.`,
    intro: `Reduceri la ${nume} din ${nMagazine} ${nMagazine === 1 ? "magazin" : "magazine"} din România. Compară prețul cu cel de referință și verifică oferta în magazin.`,
  };
};

// texte dedicate pentru subcategoriile cu intentie clara de cautare; restul folosesc sablonul
const SUB_TEXTE = {
  "electronice/laptopuri": { titlu: "Laptopuri la ofertă – reduceri laptopuri", h1: "Laptopuri la ofertă", descriere: "Reduceri la laptopuri din magazine din România: compară oferte, filtrează după magazin, preț și reducere și verifică oferta în magazin.", intro: "Laptopuri cu preț redus din mai multe magazine. Compară prețul cu cel de referință și verifică oferta în magazin." },
  "electronice/componente": { titlu: "Oferte componente PC – reduceri", h1: "Oferte componente PC", descriere: "Oferte la componente PC din magazine din România: procesoare, memorii, SSD-uri și altele. Filtrează după magazin, preț și reducere.", intro: "Componente PC cu preț redus din mai multe magazine. Verifică mereu compatibilitatea și prețul final în magazin." },
};
// ambigua = acelasi nume de subcategorie exista in mai multe categorii (ex. Bucatarie): se adauga categoria parinte in titlu/H1/descriere
export const metaSub = (c, s, nMagazine, p = 1, ambigua = false) => {
  const t = SUB_TEXTE[`${c.slug}/${s.id}`];
  const nume = jos(s.nume), parinte = jos(c.nume);
  const m = t ?? {
    titlu: `Oferte ${nume} – reduceri`,
    h1: `Oferte pentru ${nume}`,
    descriere: `Oferte la ${nume} din magazine din România. Filtrează după magazin, preț și reducere și verifică oferta în magazin.`,
    intro: `Reduceri la ${nume} din ${nMagazine} ${nMagazine === 1 ? "magazin" : "magazine"}. Compară prețul cu cel de referință și verifică oferta în magazin.`,
  };
  if (ambigua && !t) return { titlu: pag(`Oferte ${nume} – ${parinte}`, p) + sufix, h1: `Oferte pentru ${nume} (${parinte})`, descriere: `Oferte la ${nume} din categoria ${parinte}, din magazine din România. Filtrează după magazin, preț și reducere și verifică oferta în magazin.`, intro: m.intro };
  return { ...m, titlu: pag(m.titlu, p) + sufix };
};

export const metaMagazin = (m, n, p = 1) => ({
  titlu: pag(`Oferte ${m.nume} – reduceri online`, p) + sufix,
  h1: `Oferte ${m.nume}`,
  descriere: `Reduceri la produse de la ${m.nume}, adunate în Pretino: filtrează după preț și reducere și verifică oferta direct în magazin.`,
  intro: `${n} ${n === 1 ? "ofertă" : "oferte"} cu preț redus de la ${m.nume}. Prețul final se verifică în magazin.`,
});

// pagini noi: marci, topuri de economii, ghiduri
export const metaMarca = (nume, n, nMag, p = 1) => ({
  titlu: pag(`Oferte ${nume} – reduceri la produse ${nume}`, p) + sufix,
  h1: `Oferte ${nume}`,
  descriere: `Reduceri la produse ${nume} din magazine din România. Compară prețul cu cel de referință, filtrează după magazin și verifică oferta în magazin.`,
  intro: `${n} ${n === 1 ? "ofertă" : "oferte"} la produse ${nume}, din ${nMag} ${nMag === 1 ? "magazin" : "magazine"}. Compară prețul cu cel de referință și verifică oferta în magazin.`,
});
export const metaTop = (nume) => ({
  titlu: (`Top economii la ${nume} – cele mai mari reduceri în lei${sufix}`.length <= 72 ? `Top economii la ${nume} – cele mai mari reduceri în lei${sufix}` : `Top economii la ${nume}${sufix}`),
  h1: `Top economii la ${nume}`,
  descriere: `Ofertele cu cea mai mare economie în lei la ${nume}, din magazine din România. Verifică prețul final în magazin.`,
});

// Tipuri de produs (pagina in interiorul unei subcategorii). Descrierile cer verificarea specificatiilor relevante, fara promisiuni de pret/pozitie.
const TIP_TEXTE = {
  "monitoare": { titlu: "Monitoare la ofertă – prețuri și reduceri", h1: "Monitoare la ofertă", descriere: "Descoperă oferte la monitoare pentru lucru și gaming. Verifică diagonala, rezoluția, rata de reîmprospătare și prețul final la magazin." },
  "televizoare": { titlu: "Televizoare la ofertă – prețuri și reduceri", h1: "Televizoare la ofertă", descriere: "Oferte la televizoare din magazine din România. Verifică diagonala, rezoluția, tipul panoului și prețul final la magazin." },
  "tastaturi": { titlu: "Tastaturi la ofertă – prețuri și reduceri", h1: "Tastaturi la ofertă", descriere: "Găsește tastaturi la reducere din magazinele urmărite de Pretino. Verifică layout-ul, conexiunea și tipul switch-urilor înainte să alegi." },
  "mouse": { titlu: "Mouse-uri la ofertă – prețuri și reduceri", h1: "Mouse-uri la ofertă", descriere: "Găsește mouse-uri la reducere din magazinele urmărite de Pretino. Verifică senzorul, conexiunea, greutatea și prețul final la magazin." },
  "casti": { titlu: "Căști la ofertă – prețuri și reduceri", h1: "Căști la ofertă", descriere: "Oferte la căști din magazine din România. Verifică tipul (cu fir sau wireless), microfonul, autonomia și prețul final la magazin." },
  "placi-video": { titlu: "Plăci video la ofertă – prețuri și reduceri", h1: "Plăci video la ofertă", descriere: "Oferte la plăci video din magazine din România. Verifică modelul, memoria, sursa recomandată și compatibilitatea cu carcasa înainte să alegi." },
  "procesoare": { titlu: "Procesoare la ofertă – prețuri și reduceri", h1: "Procesoare la ofertă", descriere: "Oferte la procesoare din magazine din România. Verifică socket-ul, compatibilitatea cu placa de bază și dacă produsul vine cu cooler (box) sau fără (tray)." },
  "ssd": { titlu: "SSD-uri la ofertă – prețuri și reduceri", h1: "SSD-uri la ofertă", descriere: "Oferte la SSD-uri din magazine din România. Verifică capacitatea, interfața (SATA sau NVMe), formatul și compatibilitatea cu dispozitivul tău." },
  "memorii-ram": { titlu: "Memorii RAM la ofertă – prețuri și reduceri", h1: "Memorii RAM la ofertă", descriere: "Oferte la memorii RAM din magazine din România. Verifică tipul (DDR4 sau DDR5), frecvența, capacitatea și compatibilitatea cu placa de bază." },
  "aspiratoare": { titlu: "Aspiratoare la ofertă – prețuri și reduceri", h1: "Aspiratoare la ofertă", descriere: "Oferte la aspiratoare din magazine din România: verticale, cu sac, robot. Verifică puterea, autonomia, filtrarea și prețul final la magazin." },
  "espressoare": { titlu: "Espressoare la ofertă – prețuri și reduceri", h1: "Espressoare la ofertă", descriere: "Oferte la espressoare din magazine din România. Verifică presiunea, tipul (automat sau manual) și prețul final la magazin." },
  "friteuze-aer-cald": { titlu: "Friteuze cu aer cald la ofertă – prețuri și reduceri", h1: "Friteuze cu aer cald la ofertă", descriere: "Oferte la friteuze cu aer cald din magazine din România. Verifică capacitatea, puterea și prețul final la magazin." },
};
export const metaTip = (c, s, t, nMagazine, nOferte, p = 1) => {
  const x = TIP_TEXTE[t.id];
  const m = x ?? { titlu: `${t.nume} la ofertă – prețuri și reduceri`, h1: `${t.nume} la ofertă`, descriere: `Oferte la ${jos(t.nume)} din magazine din România. Verifică specificațiile și prețul final la magazin.` };
  return { ...m, titlu: pag(m.titlu, p) + sufix, intro: `${nOferte} ${nOferte === 1 ? "ofertă" : "oferte"} la ${jos(t.nume)} din ${nMagazine} ${nMagazine === 1 ? "magazin" : "magazine"}. Compară prețul cu cel de referință și verifică oferta în magazin.`, migaja: t.nume };
};
// Componente PC: titlul enumera doar tipurile care au pagina publicata
export const metaComponente = (tipuri, p = 1) => {
  const nume = { "procesoare": "procesoare", "ssd": "SSD", "memorii-ram": "RAM", "placi-video": "plăci video" };
  const l = ["procesoare", "placi-video", "ssd", "memorii-ram"].filter((id) => tipuri.some((t) => t.id === id)).map((id) => nume[id]);
  const enum_ = l.length ? `: ${l.length > 1 ? l.slice(0, -1).join(", ") + " și " + l[l.length - 1] : l[0]}` : "";
  return { titlu: pag(`Componente PC la ofertă${enum_}`, p) + sufix, h1: "Componente PC la ofertă", descriere: "Găsește componente PC cu preț redus din magazinele urmărite de Pretino. Alege tipul componentei și verifică modelul, compatibilitatea și prețul final în magazin.", intro: "Găsește componente PC cu preț redus din magazinele urmărite de Pretino. Alege tipul componentei și verifică modelul, compatibilitatea și prețul final în magazin." };
};
