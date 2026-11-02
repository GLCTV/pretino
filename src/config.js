// Configurația proprie Pretino.ro. NU conține chei sau tokenuri (acestea stau în %LOCALAPPDATA%\Pretino\secrete.env).
export const SITE_URL = "https://pretino.ro";
export const SITE_NAME = "Pretino.ro";
export const SITE_TAGLINE = "Oferte actuale din magazinele din România";
export const CF_PAGES_PROJECT = "pretino"; // proiectul Cloudflare Pages dedicat (nu cel al altui site)
export const GITHUB_REPO = "glctv/pretino";
export const PREVIEW_PORT = 3100;
// Date despre operatorul site-ului, afisate in paginile legale. COMPLETEAZA-LE inainte de publicare (publicarea LIVE se opreste cat timp raman marcaje „[COMPLETEAZĂ”).
export const OPERATOR = {
  nume: "",    // ex. numele tau complet sau denumirea firmei (PFA / SRL)
  email: "contact@pretino.ro",   // adresa de contact publica (redirectionata prin Cloudflare Email Routing)
  cui: "",     // optional: CUI / CIF, daca ai firma sau PFA
};
