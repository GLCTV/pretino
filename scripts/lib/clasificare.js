// Clasificare la afisare: categorie + subcategorie din titlul ofertei (categoria din feed nu se pastreaza in catalog).
// Regulile corecteaza si incadrari gresite (ex. „Cheie Volvo” apartine categoriei Auto). Se aplica doar la generarea site-ului.
const fara = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Subcategoriile fiecarei categorii, in ordinea afisarii (slug, nume, icoana, reguli in ordinea prioritatii).
export const SUBCATEGORII = {
  electronice: [
    ["laptopuri", "Laptopuri", "laptop", /laptop|notebook|ultrabook|macbook/],
    // accesoriile de telefon/tableta (huse, folii, curele, baterii externe) sunt separate de dispozitive
    ["accesorii", "Accesorii", "stecher", /\bhusa\b|\bhuse\b|folie (de )?(sticla |protectie)|folie sticla|bratara de schimb|curea (de schimb )?pentru|acumulator extern|baterie externa|power ?bank|incarcator|cablu|adaptor|hub\b|suport|docking|hdmi|display ?port|memorie usb|usb flash|flash drive|stick (usb|memorie)|usb stick|card de memorie|carduri de memorie|card memorie|microsd|\bsdxc?\b|cititor (de )?card/, "cap"],
    ["smartwatch", "Smartwatch-uri", "ceas", /smartwatch|bratara fitness|smart band|ceas inteligent/],
    ["telefoane", "Telefoane și tablete", "telefon", /telefon|smartphone|iphone|tableta|\btab\b|ipad|e-?book/],
    ["retelistica", "Rețelistică", "wifi", /^(router|switch|access point|extender|repetor|modem|powerline|nas\b|sistem mesh)/, "cap"],
    ["imprimante", "Imprimante și consumabile", "imprimanta", /imprimant|toner|cartus|scanner|\bmfp\b|multifunctional(a)? (laser|inkjet|ink jet|color|monocrom|cerneala)|consumabil/],
    ["componente", "Componente PC", "cip", /placa video|procesor|\bssd\b|\bhdd\b|hard ?disk|memorie (ram|g\.?skill|ddr)|\bddr[345]\b|\bram\b|placa de baza|\bsursa\b|carcasa(?! (cheie|telecomanda|pentru (telefon|ceas|smartwatch|cheie)))|\btower\b|cooler|ventilator pc|pasta termo|desktop|mini pc|unitate|nvme|ups\b/],
    ["monitoare-tv", "Monitoare și TV", "monitor", /monitor|televizor|\btv\b|videoproiector|proiector|soundbar/],
    ["periferice", "Periferice", "mouse", /mouse|tastatur|casti|webcam|camera web|boxe|microfon|gamepad|joystick|volan|controller|mousepad|difuzor/],
    ["retelistica", "Rețelistică", "wifi", /router|switch|access point|retea|powerline|extender|repetor|wi-?fi|modem|\bnas\b/],
  ],
  electrocasnice: [
    ["bucatarie", "Bucătărie", "cafea", /cafea|espresor|expresor|blender|mixer|friteuz|cuptor|plita|microunde|storcator|fierbator|prajitor|aragaz|hota|robot de bucatarie|tocator|gratar|vidat|multicooker|cappuccino|aparat de facut|sandwich/],
    ["masini-de-spalat", "Mașini de spălat și uscătoare", "frigider", /^(?!kit |set |accesori)(mini )?(masina|masini) de spalat|^(?!kit )uscator (de )?rufe(?! de calorifer)/, "cap"],
    ["frigidere", "Frigidere și congelatoare", "frigider", /frigider|congelator|combina frigorifica|lada frigorifica|side-by-side/],
    ["curatenie", "Curățenie", "aspirator", /aspirator|mop|curatat|abur|robot aspirator|perii rotative/],
    ["ingrijire", "Îngrijire personală", "uscator-par", /epilator|uscator de par|aparat de ras|trimmer|periuta|placa de par|placa de indreptat|ondulator|aparat de tuns|masaj|cantar|tensiometru|barbierit|ingrijire/],
    ["climatizare", "Climatizare", "ventilator", /aer conditionat|ventilator|radiator|aeroterma|dezumidific|umidific|purificator|convector|calorifer|incalzitor|aparat de incalzit/],
    ["calcat", "Călcat", "fier", /fier de calcat|statie de calcat|calcat|fiare de calcat/],
  ],
  "casa-si-gradina": [
    ["casa-inteligenta", "Casă inteligentă", "casa-inteligenta", /inteligent|smart|zigbee|wi-?fi|switchbot|sonoff|alarma|detector|videointerfon|interfon|senzor|camera de supraveghere|camera supraveghere|termostat/],
    ["scule", "Scule", "cheie-fixa", /scul|burghiu|bormasin|polizor|surubelni|cheie |ciocan|clesti|flex\b|fierastr|multimetru|masina de gaurit|rindea|menghin|trusa|nivela|ruleta|dalta|compresor|motopomp|pompa|aparat de sudura|invertor sudura|generator/],
    ["gradina", "Grădină", "frunza", /gradin|iarba|sapa|foarfec|stropit|furtun|drujb|motocos|motocoa|cutit cu 4|tufis|vegeta|pamant|ghiveci|irigat|gazon|tuns|crengi|piscin|barbecue|gratar|suflant|motosap|cositoare|gard|insecte|ulei ruris|g-tronic|ulei pentru/],
    ["bucatarie", "Bucătărie", "cos", /bucatari|cratit|tigai|oale|oala|cutit|tacam|ustensil|vase|pahar|sticla|paie|caserol|tava |tavi|platou|termos|recipient|borcan|razatoare|tocator|cana |cani|farfurii/],
    ["iluminat", "Iluminat", "lampa", /lamp|veioz|bec\b|becuri|led\b|plafonier|spot\b|aplic|lanterna|neon|banda led|proiector|iluminat|luminit/],
    ["decoratiuni", "Decorațiuni", "tablou", /decor|tablou|vaza|oglinda|rama\b|figurin|cadou|lumanar|perna|perdea|covor|brad|craciun|ornament/],
  ],
  moda: [
    ["incaltaminte", "Încălțăminte", "pantof", /pantof|incaltaminte|ghete|bocanci|adidas|sandale|papuci|cizme/],
    ["genti", "Genți și rucsacuri", "geanta", /geanta|rucsac|portofel|ghiozdan/],
    ["ceasuri", "Ceasuri și bijuterii", "ceas", /ceas|bratara|colier|inel|bijuter|cercei/],
    ["imbracaminte", "Îmbrăcăminte", "tricou", /tricou|bluza|pantalon|jacheta|geaca|hanorac|camasa|rochie|fusta|sosete|esarfa|caciula|manusi|imbracaminte/],
  ],
  auto: [
    ["chei", "Chei și telecomenzi", "cheie", /cheie|telecomanda|lishi|transponder|carcasa cheie/],
    ["electronice-auto", "Electronice auto", "camera-auto", /camera auto|dvr|camera video auto|carplay|android auto|invertor|incarcator auto|tester|obd|tpms|senzor|parcare|radio auto|player auto|difuzor auto|alarma auto|navigatie|gps|diagnoza|baterie auto|redresor/],
    ["intretinere", "Piese și întreținere", "ulei", /ulei|anvelop|filtru|stergator|lichid|aditiv|odorizant|ceara|polish|solutie|bec auto|becuri auto|xenon|lampa auto/],
    ["accesorii-auto", "Accesorii auto", "volan", /husa|covoras|suport|organizator|portbagaj|volan|scaun|parasolar|cablu de pornire|compresor auto|cric|trusa|sufa/],
  ],
  sport: [
    ["trotinete", "Piese și accesorii pentru trotinete", "cheie-fixa", /(pentru|de) (trotinet|scuter)|(trotinet|scuter)[a-z]* (electric[a-z]* )?(\w+ )?(piese|accesori)|\b(mansoane|furca|aparatoare|aripa|bascula|janta|anvelopa|cablaj|capac|levier|mecanism|arc amortizor|brat|surub)\b/],
    ["trotinete-electrice", "Trotinete electrice", "trotineta", /trotinet|scuter/],
    ["biciclete", "Biciclete", "bicicleta", /bicicl|casca|ghidon|pedale|lant|sa pentru/],
    ["fitness", "Fitness", "gantera", /gantere|gantera|fitness|banda de alergare|saltea|yoga|bara|elastic|mingea|kettlebell|aparat de/],
    ["camping", "Camping și drumeții", "cort", /camping|cort|sac de dormit|rucsac|lanterna frontala|termos|drumet|turism|picnic/],
  ],
  copii: [
    ["jucarii", "Jucării", "jucarii", /jucari|lego|papusa|puzzle|figur|joc|masinuta|plus\b|constructii|trotineta copii/],
    ["scoala", "Școală", "scoala", /ghiozdan|penar|rechizite|caiet|instrumente de scris|creion|stilou|pix\b|marker|acuarele/],
    ["bebelusi", "Bebeluși", "bebe", /bebe|biberon|carucior|scutec|suzeta|patut|scaun auto copii|premergator|balansoar|sterilizator|pompa de san|hranire|cadita/],
  ],
  supermarket: [
    ["animale", "Animale", "lab", /animal|hranitor|pisic|caine|caini|litiera|hrana pentru/],
    ["ingrijire", "Îngrijire personală", "picatura", /balsam|fixativ|spray bifazic|tratament par|ceara pentru par|spuma pentru par|brici|curbator|apa de gura|sampon|gel|crema|parfum|deodorant|periuta|pasta de dinti|sapun|cosmetic|igiena/],
    ["curatenie", "Curățenie", "burete", /detergent|dezinfectant|burete|hartie|prosop|solutie|curatenie|dezinfect|sac\b|saci/],
    ["alimente", "Alimente și băuturi", "sticla", /aliment|bautur|cafea|ceai|ciocolata|biscuit|paste (alimentar|fainoas)|ulei|miere|suc\b|apa\b/],
  ],
};

// Corectii de categorie pe baza titlului (inainte de subcategorii). Primele potriviri castiga.
// „auto” generic conteaza doar in numele produsului (primele ~50 caractere) si nu ca functie („Auto-curatare”, „Semi-Auto”)
const AUTO_TOKEN = /(?<![\w-])auto(?![\w-])|automobil/;
const AUTO_SPECIFIC = /\bvolvo\b|\bbmw\b|\baudi\b|mercedes|volkswagen|\bvw\b|\bopel\b|\brenault\b|\bdacia\b|\btoyota\b|\bskoda\b|\bseat\b|\bpeugeot\b|citroen|\bhyundai\b|\bkia\b|\bmazda\b|\bnissan\b|\bfiat\b|\bford\b|\bobd2?\b|\btpms\b|anvelop|senzori? de parcare|stergator(e)? parbriz|\bxenon\b|odorizant masina|\bcric\b/;
const REGULI_CATEGORIE = [
  ["sport", /trotinet/],
  ["casa-si-gradina", /robot de curatat piscina|robot piscina|uscator (de )?rufe de calorifer|uscator (de )?rufe (metalic|pliabil)/],
  ["casa-si-gradina", /perna ortoped|perne ortoped|suporto|pernuta ergonomic|suport lombar/],
  ["copii", /scaun(e)? auto (pentru )?copii|scaun auto copii/],
  ["auto", { test: (t) => AUTO_TOKEN.test(t.slice(0, 50)) || AUTO_SPECIFIC.test(t.slice(0, 90)) }],
];

const CAP = 45; // „cap” = primele caractere ale titlului (numele produsului), nu specificatiile
const CAT_IMPLICIT = (slug) => SUBCATEGORII[slug] ?? [];

export function clasifica(o) {
  const t = fara(`${o.titlu ?? ""}`);
  let categorie = o.categorie;
  for (const [slug, re] of REGULI_CATEGORIE) if (re.test(t)) { categorie = slug; break; }
  const sub = CAT_IMPLICIT(categorie).find(([, , , re, mod]) => re.test(mod === "cap" ? t.slice(0, CAP) : t));
  const tipDef = sub ? (TIPURI[`${categorie}/${sub[0]}`] ?? []).find(([, , re]) => re.test(t)) : null;
  return { categorie, sub: sub ? sub[0] : null, tip: tipDef ? tipDef[0] : null, motivClasificare: sub ? `${categorie}/${sub[0]}: ${sub[3].source.slice(0, 40)}` : `${categorie}: fara subcategorie` };
}

// Tipuri de produs in interiorul unei subcategorii (pagina proprie doar cu inventar suficient; parintele ramane director cu toate ofertele).
// Regulile se aplica pe numele produsului (primele caractere), nu pe specificatii: „Mini PC ... 1TB SSD” nu e SSD.
// slug, nume la singular-plural pentru H1, regex pe cap de titlu
export const TIPURI = {
  "electronice/componente": [
    ["placi-video", "Plăci video", /^(placa|placi) video/],
    ["procesoare", "Procesoare", /^(procesor|procesoare|cpu\b)/],
    ["ssd", "SSD-uri", /^(ssd|unitate ssd|disc ssd|kit ssd)\b/],
    ["memorii-ram", "Memorii RAM", /^((set|kit) )?(\d+ )?(memorie|memorii|ram)\b(?!.*(usb|card|microsd|flash|stick))/],
  ],
  "electronice/monitoare-tv": [
    ["monitoare", "Monitoare", /^monitor/],
    ["televizoare", "Televizoare", /^(televizor|tv\b)/],
  ],
  "electronice/periferice": [
    ["tastaturi", "Tastaturi", /^(tastatur|kit tastatur|set tastatur)/],
    ["mouse", "Mouse-uri", /^(mouse(?!pad)|kit mouse|set mouse)/],
    ["casti", "Căști", /^(casti|set casti)/],
  ],
  "electrocasnice/curatenie": [
    ["aspiratoare", "Aspiratoare", /^(aspirator|robot aspirator)/],
  ],
  "electrocasnice/bucatarie": [
    ["espressoare", "Espressoare", /^(espressor|espresor|expresor|aparat de cafea|automat de cafea)/],
    ["friteuze-aer-cald", "Friteuze cu aer cald", /^friteuz/],
  ],
};
export const tipuriDe = (cat, sub) => (TIPURI[`${cat}/${sub}`] ?? []).map(([id, nume]) => ({ id, nume }));

// ordinea chipurilor de pe pagina (altfel decat prioritatea regulilor)
const ORDINE = { "casa-si-gradina": ["bucatarie", "gradina", "iluminat", "scule", "decoratiuni", "casa-inteligenta"] };
export const subcategoriiDe = (slug) => {
  // un id poate avea mai multe reguli (ex. rețelistică: regulă pe „cap” + regulă generală); în listă apare o singură dată
  const l = CAT_IMPLICIT(slug).map(([id, nume, icoana]) => ({ id, nume, icoana })).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  const o = ORDINE[slug];
  return o ? [...l].sort((a, b) => o.indexOf(a.id) - o.indexOf(b.id)) : l;
};
