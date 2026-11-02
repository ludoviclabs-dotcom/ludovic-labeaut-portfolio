/*
 * Édition écran des notes « Lignes de force » (voir /assets/css/note.css).
 *
 * - Sommaire construit à partir des titres de section (h2), qui suit la lecture ;
 *   repliable en tête d'article quand l'écran n'a pas la place sur le côté.
 * - Barre de progression de lecture sous la barre du haut.
 * - Parcours de la série (1 → 8) repris dans l'en-tête, pour les articles de série.
 * - Tableaux défilants sur petit écran ; niveaux de preuve (A–D, P, PP, BI) en pastilles.
 * Le texte vient de la page elle-même : la version anglaise n'a rien de plus à traduire.
 */
(() => {
  "use strict";

  const page = document.querySelector(".lf-page");
  const note = document.querySelector(".lf-note");
  const hero = document.querySelector(".lf-hero");
  if (!page || !note) return;

  const en = document.documentElement.lang.toLowerCase().startsWith("en");
  const t = en
    ? { toc: "Contents", read: "Reading time", pdf: "Save as PDF", serie: "Articles in the series", article: "Article" }
    : { toc: "Sommaire", read: "Lecture", pdf: "Enregistrer en PDF", serie: "Articles de la série", article: "Article" };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  // ---------- Sommaire ----------
  const heads = [...note.querySelectorAll("h2")].filter((h) => !h.closest(".encadre, .sources, .serie-nav"));
  heads.forEach((h, i) => {
    if (!h.id) h.id = `section-${String(i + 1).padStart(2, "0")}`;
  });
  const items = heads.map((h) => {
    const n = h.querySelector(".n")?.textContent.trim() ?? "";
    const label = [...h.childNodes].filter((c) => !(c.nodeType === 1 && c.classList.contains("n"))).map((c) => c.textContent).join("").trim();
    return { id: h.id, n, label };
  });
  const list = (withNumbers) => {
    const ol = el("ol");
    for (const it of items) {
      const a = el("a");
      a.href = `#${it.id}`;
      if (withNumbers) a.append(el("span", "n", it.n), el("span", "", it.label));
      else a.textContent = it.label;
      const li = el("li");
      li.append(a);
      ol.append(li);
    }
    return ol;
  };

  if (items.length >= 2) {
    const toc = el("nav", "lf-toc");
    toc.setAttribute("aria-label", t.toc);
    toc.append(el("p", "lf-toc__title", t.toc), list(true));
    const reading = [...document.querySelectorAll(".byline span")].map((s) => s.textContent).find((s) => /\d+\s*min/.test(s));
    const meta = el("div", "lf-toc__meta");
    if (reading) meta.append(el("div", "", reading.trim()));
    const pdf = el("button", "", t.pdf);
    pdf.type = "button";
    pdf.addEventListener("click", () => window.print());
    meta.append(pdf);
    toc.append(meta);
    page.prepend(toc);

    const folded = el("details", "lf-toc-m");
    folded.append(el("summary", "", t.toc), list(false));
    (hero ?? note.firstElementChild).after(folded);

    // Le sommaire latéral commence sous l'en-tête sombre.
    const align = () => {
      if (hero) page.style.setProperty("--lf-hero-h", `${hero.getBoundingClientRect().height}px`);
    };
    align();
    window.addEventListener("resize", align);
    document.fonts?.ready.then(align);

    // Section en cours : la dernière dont le titre est passé sous le premier tiers de l'écran.
    const links = [...toc.querySelectorAll("a")];
    let ticking = false;
    const mark = () => {
      ticking = false;
      const limit = window.innerHeight * 0.33;
      let current = -1;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top < limit) current = i;
      });
      links.forEach((a, i) => (i === current ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    };
    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(mark);
      }
    }, { passive: true });
    mark();
  }

  // ---------- Progression de lecture ----------
  const bar = el("div", "lf-progress");
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);
  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  // ---------- Parcours de la série dans l'en-tête ----------
  const serie = [...document.querySelectorAll(".serie-nav__list a")];
  if (hero && serie.length) {
    const track = el("ol", "lf-track");
    track.setAttribute("aria-label", t.serie);
    serie.forEach((src, i) => {
      const a = el("a", "", String(i + 1));
      a.href = src.getAttribute("href");
      a.setAttribute("aria-label", `${t.article} ${i + 1}${en ? ":" : " :"} ${src.textContent}`);
      if (src.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
      const li = el("li");
      li.append(a);
      track.append(li);
    });
    (hero.querySelector(".kicker") ?? hero.lastElementChild).after(track);
  }

  // ---------- Tableaux défilants et niveaux de preuve ----------
  note.querySelectorAll("table.data").forEach((table) => {
    if (table.parentElement.classList.contains("lf-scroll")) return;
    const wrap = el("div", "lf-scroll");
    table.before(wrap);
    wrap.append(table);
  });
  // Seulement dans les colonnes de niveau de preuve ou de fiabilité, repérées par leur en-tête.
  const CODE = /^(PP|BI|[ABCDP])(?=$|[\s—–(/,;.])/;
  const EVIDENCE = /preuve|fiabilit|niveau|evidence|reliab|level/i;
  note.querySelectorAll("table.data").forEach((table) => {
    const cols = [...table.querySelectorAll("thead th")].map((th, i) => (EVIDENCE.test(th.textContent) ? i : -1)).filter((i) => i >= 0);
    if (!cols.length) return;
    table.querySelectorAll("tbody tr").forEach((tr) => {
      cols.forEach((i) => {
        const td = tr.children[i];
        const first = td?.firstChild;
        if (!first || first.nodeType !== Node.TEXT_NODE) return;
        const text = first.textContent.replace(/^\s+/, "");
        const m = text.match(CODE);
        if (!m) return;
        first.textContent = text.slice(m[1].length);
        td.insertBefore(el("span", `lf-badge lf-badge--${m[1].toLowerCase()}`, m[1]), first);
      });
    });
  });
})();
