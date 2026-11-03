// SEO Pretino: praguri editoriale + titluri/descrieri. Folosit de scripts/build.js, deci supravietuieste oricarei actualizari de catalog.
// Pragurile de mai jos sunt decizii editoriale ale proiectului, NU reguli Google.
export const PE_PAGINA = 48;          // produse HTML pe o pagina de lista (si pasul „Arata mai multe”)
export const MIN_SUB_PAGINA = 15;     // o subcategorie primeste pagina proprie (URL stabil, indexabila) doar cu cel putin atatea oferte
export const MIN_MAGAZIN_INDEX = 5;   // pagina unui magazin cu mai putine oferte ramane accesibila, dar noindex si fara intrare in sitemap
export const ZILE_DATE_VECHI = 7;     // ofertele unei surse neverificate cu succes de mai mult de atatea zile nu se mai afiseaza (politica „date prea vechi”)
export const BRAND = "Pretino";

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
