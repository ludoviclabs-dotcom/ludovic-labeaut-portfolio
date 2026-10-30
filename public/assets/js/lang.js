/*
 * Sélecteur de langue FR / EN.
 *
 * - Un clic sur « FR » ou « EN » enregistre la langue choisie (localStorage).
 * - Une page ouverte dans l'autre langue bascule vers sa version dans la langue enregistrée,
 *   indiquée par <link rel="alternate" hreflang="…"> dans l'en-tête.
 * - Sans choix enregistré, rien ne change : la page s'affiche dans la langue de son adresse.
 * Chargé dans <head> sans « defer » pour basculer avant l'affichage.
 */
(() => {
  "use strict";

  const KEY = "ll-lang";
  const current = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "fr";

  let wanted = null;
  try {
    wanted = localStorage.getItem(KEY);
  } catch {
    // Stockage indisponible (navigation privée stricte) : la page reste dans sa langue.
  }

  if ((wanted === "fr" || wanted === "en") && wanted !== current) {
    const target = document.querySelector(`link[rel="alternate"][hreflang="${wanted}"]`)?.getAttribute("href");
    if (target && target !== location.pathname) {
      location.replace(target + location.hash);
      return;
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.(".lang-switch a[hreflang]");
    if (!link) return;
    try {
      localStorage.setItem(KEY, link.getAttribute("hreflang"));
    } catch {
      // Sans stockage, le lien fonctionne quand même ; le choix n'est simplement pas retenu.
    }
  });
})();
