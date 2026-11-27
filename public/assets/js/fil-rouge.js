// @ts-check
/*
 * Page « Le fil rouge » (/fil-rouge) : les six fiches en « dossier de preuve ».
 *
 * - À partir de 1024 px : vue partagée. À gauche, un filtre par famille et la liste des six
 *   questions (onglets) ; à droite, le panneau de la fiche active, collant en haut de l'écran.
 *   Clic, flèches haut et bas, Début et Fin ; les liens #fiche-… de la page ouvrent la fiche.
 * - En dessous : accordéon manuel, première fiche ouverte, sans défilement automatique.
 * - Sans JavaScript : les six fiches restent ouvertes, l'une sous l'autre.
 * Changement de fiche : fondu léger (opacité et 6 px), 220 ms, coupé si « réduire les animations ».
 * Schémas : la classe is-inview, posée à l'entrée à l'écran, déclenche le tracé (fil-rouge.css).
 *
 * Vérification des types : npm run typecheck (TypeScript en mode checkJs, sans compilation).
 */
(() => {
  "use strict";

  const SPLIT_QUERY = "(min-width: 1024px)";

  const dossierEl = document.querySelector("[data-dossier]");
  const navEl = dossierEl?.querySelector(".fr-dossier__nav");
  const tablist = dossierEl?.querySelector('[role="tablist"]');
  if (!(dossierEl instanceof HTMLElement) || !(navEl instanceof HTMLElement) || !tablist) return;
  /** @type {HTMLElement} */
  const dossier = dossierEl;
  /** @type {HTMLElement} */
  const nav = navEl;

  /** @type {HTMLButtonElement[]} */
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  /** @type {HTMLButtonElement[]} */
  const filters = Array.from(nav.querySelectorAll("[data-filter]"));
  /** @type {HTMLElement[]} */
  const fiches = Array.from(dossier.querySelectorAll(".fr-fiche"));
  if (tabs.length === 0 || tabs.length !== fiches.length) return;

  /**
   * @typedef {object} Entry
   * @property {string} id
   * @property {string} famille
   * @property {HTMLButtonElement} tab
   * @property {HTMLElement} fiche
   * @property {HTMLButtonElement} toggle
   * @property {HTMLElement} body
   */

  /** @type {Entry[]} */
  const entries = [];
  for (const tab of tabs) {
    const id = tab.dataset.project ?? "";
    /** @type {HTMLElement | null} */
    const fiche = dossier.querySelector(`#fiche-${CSS.escape(id)}`);
    /** @type {HTMLButtonElement | null | undefined} */
    const toggle = fiche?.querySelector(".fr-fiche__toggle");
    /** @type {HTMLElement | null | undefined} */
    const body = fiche?.querySelector(".fr-fiche__body");
    if (!fiche || !toggle || !body) return;
    entries.push({ id, famille: tab.dataset.famille ?? "", tab, fiche, toggle, body });
  }

  const split = window.matchMedia(SPLIT_QUERY);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /** Fiche active de la vue partagée. */
  let active = entries[0];
  /** @type {"split" | "accordion" | null} */
  let mode = null;

  /* ---------- Vue partagée ---------- */

  /** @param {Entry} entry */
  const isListed = (entry) => !entry.tab.hidden;

  /**
   * Affiche la fiche demandée dans le panneau.
   * @param {Entry} entry
   * @param {{ focus?: boolean, animate?: boolean }} [options]
   */
  function select(entry, { focus = false, animate = true } = {}) {
    const previous = active;
    active = entry;
    for (const e of entries) {
      const on = e === entry;
      e.tab.setAttribute("aria-selected", String(on));
      e.tab.tabIndex = on ? 0 : -1;
      e.fiche.hidden = !on;
    }
    if (focus) entry.tab.focus();
    if (animate && previous !== entry && !reduceMotion.matches) {
      entry.fiche.classList.add("is-entering");
      void entry.fiche.offsetWidth; // fixe l'état de départ avant la transition
      entry.fiche.classList.remove("is-entering");
    }
  }

  /** @param {string} key */
  function applyFilter(key) {
    for (const button of filters) button.setAttribute("aria-pressed", String(button.dataset.filter === key));
    for (const e of entries) e.tab.hidden = key !== "tous" && e.famille !== key;
    if (!isListed(active)) {
      const first = entries.find(isListed);
      if (first) select(first);
    }
  }

  /** @param {KeyboardEvent} event */
  function onTabKey(event) {
    const listed = entries.filter(isListed);
    const index = listed.indexOf(active);
    /** @type {Entry | undefined} */
    let next;
    if (event.key === "ArrowDown") next = listed[(index + 1) % listed.length];
    else if (event.key === "ArrowUp") next = listed[(index - 1 + listed.length) % listed.length];
    else if (event.key === "Home") next = listed[0];
    else if (event.key === "End") next = listed[listed.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next, { focus: true });
  }

  /* ---------- Accordéon ---------- */

  /**
   * @param {Entry} entry
   * @param {boolean} open
   */
  function setOpen(entry, open) {
    entry.toggle.setAttribute("aria-expanded", String(open));
    entry.body.hidden = !open;
  }

  /* ---------- Passage d'un mode à l'autre ---------- */

  function enterSplit() {
    mode = "split";
    dossier.classList.remove("is-accordion");
    dossier.classList.add("is-split");
    nav.hidden = false;
    for (const e of entries) {
      e.fiche.setAttribute("role", "tabpanel");
      e.fiche.setAttribute("aria-labelledby", e.tab.id);
      e.body.hidden = false;
      e.toggle.tabIndex = -1;
    }
    select(isListed(active) ? active : entries[0], { animate: false });
  }

  function enterAccordion() {
    mode = "accordion";
    dossier.classList.remove("is-split");
    dossier.classList.add("is-accordion");
    nav.hidden = true;
    for (const e of entries) {
      e.fiche.removeAttribute("role");
      e.fiche.removeAttribute("aria-labelledby");
      e.fiche.hidden = false;
      e.toggle.removeAttribute("tabindex");
      setOpen(e, e === active);
    }
  }

  function applyMode() {
    const wanted = split.matches ? "split" : "accordion";
    if (wanted === mode) return;
    if (wanted === "split") enterSplit();
    else enterAccordion();
  }

  /* ---------- Événements ---------- */

  for (const e of entries) {
    e.tab.addEventListener("click", () => select(e));
    e.tab.addEventListener("keydown", onTabKey);
    e.toggle.addEventListener("click", () => {
      if (mode !== "accordion") return;
      const open = e.toggle.getAttribute("aria-expanded") !== "true";
      setOpen(e, open);
      if (open) active = e;
    });
  }

  for (const button of filters) {
    button.addEventListener("click", () => applyFilter(button.dataset.filter ?? "tous"));
  }

  /**
   * Liens internes vers une fiche (#fiche-…) : ouvre la fiche au lieu de sauter vers un panneau masqué.
   * @param {string} hash
   * @returns {boolean} vrai si le lien visait une fiche
   */
  function openFromHash(hash) {
    const entry = entries.find((e) => `#${e.fiche.id}` === hash);
    if (!entry) return false;
    if (mode === "split") {
      if (!isListed(entry)) applyFilter("tous");
      select(entry);
      dossier.scrollIntoView({ block: "start", behavior: reduceMotion.matches ? "auto" : "smooth" });
    } else {
      setOpen(entry, true);
      active = entry;
      entry.fiche.scrollIntoView({ block: "start", behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    return true;
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    /** @type {HTMLAnchorElement | null} */
    const link = target.closest('a[href^="#fiche-"]');
    if (link && openFromHash(link.hash)) {
      event.preventDefault();
      history.replaceState(null, "", link.hash);
    }
  });

  /* ---------- Schémas : tracé à l'entrée à l'écran ---------- */

  /** @type {HTMLElement[]} */
  const blueprints = Array.from(dossier.querySelectorAll(".fr-blueprint"));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          record.target.classList.add("is-inview");
          observer.unobserve(record.target);
        }
      },
      { threshold: 0.35 },
    );
    for (const blueprint of blueprints) observer.observe(blueprint);
  } else {
    for (const blueprint of blueprints) blueprint.classList.add("is-inview");
  }

  split.addEventListener("change", applyMode);
  applyMode();
  if (location.hash) openFromHash(location.hash);
})();
