/**
 * Adresse publique du site (domaine de production Vercel).
 *
 * Utilisée pour les liens <link rel="alternate" hreflang> des pages : les moteurs de recherche
 * exigent des adresses complètes. Les autres liens du site restent relatifs, pour fonctionner
 * aussi sur les prévisualisations Vercel et en local.
 * Si le domaine change : modifier cette ligne, puis remplacer l'ancienne adresse dans public/
 * (pages écrites à la main) et relancer npm run fil-rouge et npm run en.
 */
export const SITE_URL = "https://l-labs-portfolio.vercel.app";
