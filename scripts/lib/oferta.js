// Normalizare oferte Pretino: preț, id stabil, stoc, categorie, reducere reală.
import { createHash } from "node:crypto";

export function parsePret(v) {
  let s = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
export const idOferta = (sursa, url) => sursa + "-" + createHash("sha1").update(String(url)).digest("hex").slice(0, 12);
export const inStoc = (s) => !/(^|\b)(0|false|no|nu)$|out|epuizat|indisponibil|nu este|precomand|stoc_epuizat/i.test(String(s ?? "").trim());

// Categorii Pretino (data/categorii.json) din textul categoriei din feed
const REGULI = [
  [null, /refurbished|second hand|resigilat/],
  ["sport", /trotinet|bicicl|fitness|alergat|gantere|sporturi|camping|turism|benzi de alergat/],
  ["copii", /scaune auto copii|ghiozdane ?&|ghiozdane$|penare|copii|bebe|jucari|papusi|figuri|masinute|puzzle|lego|jocuri de societate|jocuri educative|jocuri de constructii|carucioare|premergatoare|suzete|biberoane|sterilizatoare|balansoare|loc de joaca|cadite|pompe de san|patut|hranire|instrumente de scris/],
  ["electronice", /laptop|notebook|telefo|smartphone|smartwatch|table|televizo|\btv\b|monito|placi? video|placi de baza|proceso|memori|\bssd|solid-state|hdd|hard disk|casti|box|soundbar|sisteme audio|imprimant|multifunction|cartuse|tonere|toner|consumabile imprimante|router|switch|access point|puncte de acces|extendere|adaptoare wireless|placi retea|retea|retelist|network|\bnas\b|mouse|tastatur|gaming|consol|gamepad|joystick|controller|jocuri video|jocuri consola|calculator|desktop|barebone|carcas|surs|cooler|cooler|ups\b|usb|stick|card|incarcato|acumulato|baterii|cabluri|hdmi|camere? (web|video|supraveghere)|supraveghere|videoproiecto|proiecto(?! cu led)|ebook|e-?book|epaper|stylus|scanne|etichete|docking|riser|antivirus|licenta software|software|periferice|pc modding|modding|hub|player multimedia|multimedia|ochelari vr|drone|rame foto|foto|ceas.*smart|curea smartwatch|casa inteligenta|statii meteo|antene|voip|teleconferinta|sisteme|mousepad|mouse pad|huse|folii|genti\/huse|suport telefo|suport auto pentru telefo|car kit|distrugatoare|hartii|statii radio|cititoare|medii optice|decodor|accesorii tablee|accesorii monitoare|echipamente dj|instrumente muzicale|viori|efecte lumini/],
  ["auto", /\bauto\b|vehicul|anvelop|xenon|tpms|senzori de parcare|volane(?! pc)|transpondere|lishi|obd|baterie auto|redresoare|motor(?!oc|pomp)|led-uri auto|kit-uri cu led|bare si proiectoare|scule si unelte reparatie|piese de schimb|cutii de scule|cd-dvd mp3/],
  ["electrocasnice", /frigider|combine frigorifice|congelato|lazi frigorifice|side-by-side|vitrine frigorifice|racitoare|aspirato|masini? de spalat|uscatoare de rufe|cupto|plit[ae]|hot[ae]\b|microunde|aer conditionat|tratare aer|climatiz|ventilato|aeroter|radiato|calorife|dezumidificato|umidificato|purificato|aparate? de (cafea|tuns|ras|barbierit|incalzit|curatat|gatit|vidat|facut)|espressor|expressor|cafetier|rasnit|fier(e|bato)|fiare de calcat|statii de calcat|calcat|storcato|blender|mixer|robot.* de bucatarie|roboti|tocato|procesor alimente|feliato|friteuz|gratar|prajito|sandwich|multicooker|deshidrator|aragaz|boile|centrale termice|periute de dinti|periuta de dinti|irigato|epilato|uscatoare de par|ondulato|placi de indreptat|placi de par|perii rotative|ingrijire personala|masini de tuns|perii de par|incalzito|masaj|tensiometre|canta (corporale|de baie)|aparate medicale|electrocasnic|masini de cusut|aparate pentru desert|deshidratoare|filtrare|rezerve|statie de calcat|ustensile electrice|abur|geamuri|sisteme de incalzire/],
  ["casa-si-gradina", /gradin|iluminat|plafoniere|becuri|bec\b|spot|led|panouri|lampi|lanterne|aplic|veioz|benzi led|instalatii de craciun|mobil|scaune|birouri|decor|bricolaj|scule|unelte|polizo|burghi|drujb|motocos|motocoas|motosap|motocultoa|compreso|pompe|hidrofoare|motopompe|fierastra|masina de gaurit|masini de gaurit|tuns iarba|piscin|gratare|oale|cratite|tigai|tavi|vase de gatit|cutite|tacamuri|ustensile|bucatarie|prize|prelungitoare|intrerupator|priza|videointerfon|interfon|senzori|detectoare|canta|instrumente de masura|aparate de sudura|bioactivator|apei|apa|atomizoare|suport tv|suporturi tv|recipiente|ingrijirea copacilor|echipamente protectie|geanta scule|casa|baterii ups|panouri fotovoltaice|solare|cafea|vase|tavite|filtre/],
  ["supermarket", /aliment|supermarket|bauturi|cosmetic|ingrijire|curatenie|detergent|sampon|animal|litiere|periute|igiena|hartie|accesorii ingrijire/],
  ["moda", /imbracaminte|incaltaminte|ghete|pantofi|geanta|genti|ceasuri|ceas|ochelari|bijuterii|moda|fashion/],
];
const fara = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export function mapCategorie(text) {
  const t = fara(text).toLowerCase();
  for (const [slug, re] of REGULI) if (re.test(t)) return slug;
  return null;
}
// Oferta e „reală” doar cu preț vechi mai mare decât cel nou (minim 5%).
export const areReducereReala = (o, min = 5) => o.pretVechi > o.pret && (1 - o.pret / o.pretVechi) * 100 >= min;
