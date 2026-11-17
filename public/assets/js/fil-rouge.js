/*
 * Page « Le fil rouge » (/fil-rouge).
 *
 * - Titre révélé mot à mot ; sections qui entrent au défilement.
 * - Six questions repliables, une seule ouverte à la fois. Elles s'ouvrent l'une après
 *   l'autre (7 s, barre de progression) tant que personne n'y touche : le défilement
 *   s'arrête au premier clic ou dès que le clavier entre dans la liste, se met en pause
 *   hors écran et au survol, et le bouton Pause / Reprendre le contrôle.
 * - « Réduire les animations » : ni entrée animée, ni défilement automatique.
 * - Sans JavaScript, tout est visible et toutes les réponses sont ouvertes.
 */
(() => {
  "use strict";

  window.filRougeReady = true;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Titre mot à mot ---------- */

  const title = document.querySelector("[data-split]");
  // Découpé une fois la police du titre chargée (1,5 s au plus) : découpés avant, les mots
  // changeraient de ligne à l'arrivée de la police et la page « sauterait » (CLS).
  // En attendant, le titre est masqué par fil-rouge.css (opacité seulement, sans décalage).
  function splitTitle() {
    if (title.classList.contains("is-split")) return;
    const text = title.textContent.trim();
    const words = text.split(/ +/);
    title.textContent = "";
    // Le titre reste lu d'un seul tenant par les lecteurs d'écran.
    const label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = text;
    title.append(label);
    words.forEach((word, i) => {
      const outer = document.createElement("span");
      outer.className = "fr-w";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "fr-w__i";
      inner.style.setProperty("--w", String(i));
      inner.textContent = word;
      outer.append(inner);
      title.append(outer);
      if (i < words.length - 1) title.append(" ");
    });
    title.classList.add("is-split");
  }
  if (title && !reduce) {
    (document.fonts?.ready ?? Promise.resolve()).then(splitTitle);
    setTimeout(splitTitle, 1500);
  }

  /* ---------- Entrées au défilement ---------- */

  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Questions ---------- */

  const section = document.querySelector(".fr-questions");
  const list = section?.querySelector(".fr-list");
  const items = list ? Array.from(list.querySelectorAll(".fr-q")) : [];
  if (!items.length) return;

  const toggles = items.map((item) => item.querySelector(".fr-q__toggle"));
  const autoplayButton = section.querySelector(".fr-autoplay");
  let current = 0;
  let playing = !reduce;

  function render() {
    items.forEach((item, i) => {
      const open = i === current;
      item.classList.toggle("is-open", open);
      item.classList.remove("is-timed");
      toggles[i].setAttribute("aria-expanded", String(open));
    });
    if (playing && current >= 0) {
      void items[current].offsetWidth; // relance l'animation de la barre
      items[current].classList.add("is-timed");
    }
    autoplayButton?.classList.toggle("is-paused", !playing);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    render();
  }

  list.classList.add("is-enhanced");

  toggles.forEach((button, i) => {
    button.addEventListener("click", () => {
      playing = false;
      current = current === i ? -1 : i;
      render();
    });
  });

  // Le défilement passe à la question suivante quand la barre de la question ouverte est pleine.
  items.forEach((item, i) => {
    item.querySelector(".fr-q__progress").addEventListener("animationend", () => {
      if (!playing || i !== current) return;
      current = (current + 1) % items.length;
      render();
    });
  });

  // Au clavier, le contenu ne doit pas bouger pendant la lecture.
  list.addEventListener("focusin", stop);

  if (autoplayButton && !reduce) {
    autoplayButton.hidden = false;
    autoplayButton.addEventListener("click", () => {
      playing = !playing;
      if (playing && current < 0) current = 0;
      render();
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => section.classList.toggle("is-visible", entry.isIntersecting),
      { threshold: 0.25 },
    ).observe(section);
  } else {
    section.classList.add("is-visible");
  }

  render();
})();
