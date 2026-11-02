/*
 * Moteur minimal du dossier interactif, hors de Claude.
 *
 * Le dossier a été conçu comme un tableau de bord Claude : sa page appelle un objet « dash »
 * (dash.data, dash.calc, dash.onData…). Ce fichier fournit cet objet sur le site :
 * - il charge les jeux de données JSON de ./donnees/ (liste DATASETS) ;
 * - il recalcule les calculs déclarés par la page (dash.calc) quand leurs données sont prêtes ;
 * - il redessine la page à l'arrivée des données et quand la largeur change ;
 * - il marque l'état des chiffres (chargement, valeur vide) pour la feuille de style.
 * Chargé dans <head> : le téléchargement des données commence avant que la page soit en place.
 */
(() => {
  "use strict";

  const BASE = "/dossiers/robotique-humanoide/donnees/";
  const DATASETS = [
    "marche", "projections", "oem", "bom", "goulots", "couches", "blocs", "alliances",
    "acteurs", "theses", "enjeux", "faits", "valorisations", "sources_valo",
  ];
  // Huit couleurs de séries, lisibles sur fond sombre et accordées à l'or du portfolio.
  const COLORS = ["#e2c27d", "#d9826a", "#6fbfa8", "#7fa7d4", "#a99ad8", "#a7bf6e", "#d98fb0", "#93a3b4"];

  const sources = new Map(DATASETS.map((id) => [id, { status: "loading", data: [], message: "" }]));
  const calcs = new Map();
  const listeners = [];
  let version = 0;

  const columnsOf = (rows) => (Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0]) : []);
  const view = (status, data, message = "") => ({ status, data, rows: data, value: data, columns: columnsOf(data), message, refreshing: false, meta: [] });

  function data(id) {
    if (sources.has(id)) {
      const s = sources.get(id);
      return view(s.status, s.data, s.message);
    }
    const c = calcs.get(id);
    if (!c) return view("missing", [], `Source inconnue : ${id}`);
    const inputs = c.inputs.map(data);
    if (inputs.some((d) => d.status === "error" || d.status === "missing")) return view("error", [], "Une donnée d'entrée manque.");
    if (inputs.some((d) => d.status !== "ok")) return view("loading", []);
    if (c.version !== version) {
      c.version = version;
      try {
        c.value = c.fn(...inputs.map((d) => d.data));
        c.status = "ok";
      } catch (err) {
        console.error(`Calcul « ${id} » :`, err);
        c.value = [];
        c.status = "error";
      }
    }
    return view(c.status, c.value);
  }

  /** Marque l'état des chiffres : « loading » avant les données, « empty » pour une valeur absente. */
  function stamp() {
    document.querySelectorAll("#dash-root [data-source][data-field][data-where]").forEach((el) => {
      const status = data(el.dataset.source).status;
      const state = status === "loading" ? "loading" : status === "ok" && el.textContent.trim() === "—" ? "empty" : null;
      if (state) el.setAttribute("data-dash-source-state", state);
      else el.removeAttribute("data-dash-source-state");
    });
  }

  function emit() {
    for (const fn of listeners) {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
    stamp();
  }

  async function load(id) {
    const s = sources.get(id);
    try {
      const res = await fetch(BASE + id + ".json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      s.data = Array.isArray(json) ? json : json.rows ?? json.data ?? json.results ?? [];
      s.status = "ok";
    } catch (err) {
      console.error(`Jeu de données « ${id} » :`, err);
      s.status = "error";
      s.message = String(err.message ?? err);
    }
  }

  window.dash = {
    colors: COLORS,
    data,
    calc(id, def) {
      calcs.set(id, { inputs: def.inputs ?? [], fn: def.fn, version: -1, value: [], status: "loading" });
    },
    loader() {},
    onData(fn) {
      listeners.push(fn);
      fn();
      stamp();
    },
    params: () => ({}),
    setParams() {},
    resetParams() {},
    refresh() {},
    setLink(name) {
      if (name && location.hash.slice(1) !== name) history.replaceState(null, "", `#${name}`);
    },
  };

  Promise.all(DATASETS.map(load)).then(() => {
    version += 1;
    emit();
  });

  // Redessin à chaque changement de largeur (les graphiques se calent sur leur conteneur).
  let width = 0;
  let pending = false;
  const watch = () => {
    const root = document.getElementById("dash-root");
    if (!root || !("ResizeObserver" in window)) return;
    new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w === width) return;
      const first = width === 0;
      width = w;
      if (first || pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        emit();
      });
    }).observe(root);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
})();
