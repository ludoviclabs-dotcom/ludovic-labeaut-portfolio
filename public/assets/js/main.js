/*
 * Diaporamas des panneaux.
 *
 * - Chaque panneau fait défiler les photos de son thème (liste : assets/js/photos.js).
 * - Les changements sont décalés d'un panneau à l'autre : une vague de gauche à droite.
 * - Une photo ne s'affiche qu'une fois chargée et décodée ; une photo absente est ignorée.
 * - Pause automatique quand l'onglet est masqué ou le panneau hors écran,
 *   pause manuelle via le bouton du haut, arrêt par défaut si « mouvement réduit ».
 */
(() => {
  "use strict";

  const PHOTOS = window.PORTFOLIO_PHOTOS || {};
  const INTERVAL = 6500; // durée d'affichage d'une photo (ms)
  const FADE = 1600; // fondu entre deux photos (ms) — aligné sur .slide dans le CSS
  const STAGGER = 1300; // décalage entre deux panneaux voisins (ms)
  const INTRO = 2600; // laisse l'animation d'entrée se terminer avant le premier changement
  const KEN_BURNS = ["kb-1", "kb-2", "kb-3", "kb-4"];

  const root = document.documentElement;
  const stage = document.querySelector(".stage");
  const panels = Array.from(document.querySelectorAll(".panel"));
  const toggle = document.querySelector(".motion-toggle");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideLayout = window.matchMedia("(min-width: 821px) and (min-aspect-ratio: 4/5)");

  let paused = reduceMotion.matches;

  class Slideshow {
    constructor(panel, index) {
      this.panel = panel;
      this.index = index;
      this.media = panel.querySelector(".panel__media");
      this.caption = panel.querySelector(".panel__caption");
      this.progress = panel.querySelector(".panel__progress");
      this.slides = (PHOTOS[panel.dataset.project] || [])
        .filter((photo) => photo && photo.src)
        .map((photo) => ({ photo, img: null, state: "idle", promise: null }));
      this.current = -1;
      this.elapsed = -(INTRO + index * STAGGER);
      this.visible = true;
      this.started = false;
    }

    get usable() {
      return this.slides.filter((s) => s.state !== "error");
    }

    start() {
      if (this.started || this.slides.length === 0) return;
      this.started = true;
      this.showFirstAvailable(0);
    }

    load(i) {
      const slide = this.slides[i];
      if (slide.promise) return slide.promise;
      slide.state = "loading";
      const img = new Image();
      img.className = "slide";
      img.alt = "";
      img.decoding = "async";
      if (slide.photo.width && slide.photo.height) {
        img.width = slide.photo.width;
        img.height = slide.photo.height;
      }
      if (slide.photo.focus) img.style.objectPosition = slide.photo.focus;
      img.src = slide.photo.src;
      slide.img = img;
      slide.promise = img
        .decode()
        .then(() => {
          slide.state = "ready";
          if (!img.isConnected) this.media.appendChild(img);
          updateToggle();
          return true;
        })
        .catch(() => {
          slide.state = "error";
          img.remove();
          this.renderProgress();
          if (this.current !== -1 && this.usable.length === 1) this.makeSolo();
          updateToggle();
          return false;
        });
      return slide.promise;
    }

    async showFirstAvailable(from) {
      for (let i = from; i < this.slides.length; i += 1) {
        if (await this.load(i)) {
          this.show(i);
          if (this.slides.length === 1) this.makeSolo();
          return;
        }
      }
    }

    nextIndex(from) {
      for (let step = 1; step <= this.slides.length; step += 1) {
        const i = (from + step) % this.slides.length;
        if (this.slides[i].state !== "error") return i;
      }
      return -1;
    }

    show(i) {
      const prev = this.slides[this.current];
      const next = this.slides[i];
      if (!next || !next.img) return;

      next.img.style.setProperty("--kb", KEN_BURNS[(i + this.index) % KEN_BURNS.length]);
      next.img.style.setProperty("--kb-duration", `${INTERVAL + FADE * 2}ms`);
      next.img.classList.remove("is-live");
      void next.img.offsetWidth; // relance l'animation Ken Burns depuis le début
      next.img.classList.add("is-live", "is-active");
      this.media.appendChild(next.img); // passe au-dessus de la précédente

      if (prev && prev !== next) {
        prev.img.classList.remove("is-active");
        const leaving = prev.img;
        window.setTimeout(() => {
          if (!leaving.classList.contains("is-active")) leaving.classList.remove("is-live");
        }, FADE + 100);
      }

      this.current = i;
      this.elapsed = Math.min(this.elapsed, 0);
      this.panel.classList.add("has-photo");
      this.setCaption(next.photo.caption || "");
      this.renderProgress();
    }

    makeSolo() {
      const slide = this.slides[this.current];
      if (!slide) return;
      slide.img.classList.remove("is-live");
      slide.img.classList.add("is-solo");
    }

    setCaption(text) {
      if (this.caption.textContent === text) return;
      this.caption.classList.add("is-changing");
      window.setTimeout(() => {
        this.caption.textContent = text;
        this.caption.classList.remove("is-changing");
      }, 450);
    }

    renderProgress() {
      const usable = this.usable;
      if (usable.length < 2) {
        this.progress.replaceChildren();
        return;
      }
      const bars = usable.map((slide) => {
        const bar = document.createElement("i");
        if (slide === this.slides[this.current]) bar.className = "is-current";
        return bar;
      });
      this.progress.replaceChildren(...bars);
      this.bar = this.progress.querySelector(".is-current");
    }

    tick(dt) {
      if (this.current === -1 || this.usable.length < 2) return;
      if (paused || !this.visible) return;

      this.elapsed += dt;
      const ratio = Math.max(0, Math.min(1, this.elapsed / INTERVAL));
      if (this.bar) this.bar.style.setProperty("--p", ratio.toFixed(4));

      const next = this.nextIndex(this.current);
      if (next === -1 || next === this.current) return;
      if (ratio > 0.4 && this.slides[next].state === "idle") this.load(next);
      if (ratio >= 1 && this.slides[next].state === "ready") {
        this.elapsed = 0;
        this.show(next);
      }
    }
  }

  const shows = panels.map((panel, i) => new Slideshow(panel, i));

  /* ---------- Visuel dessiné (FinValStudio sans photo) ----------------- */

  function drawValuationChart(container) {
    const NS = "http://www.w3.org/2000/svg";
    const el = (name, attrs, parent) => {
      const node = document.createElementNS(NS, name);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (parent) parent.appendChild(node);
      return node;
    };
    const W = 600;
    const H = 1000;
    const gold = "#e2c27d";
    const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" });

    const grid = el("g", { stroke: "rgba(244,241,234,0.055)", "stroke-width": 1 }, svg);
    for (let x = 0; x <= W; x += 40) el("line", { x1: x, y1: 0, x2: x, y2: H }, grid);
    for (let y = 0; y <= H; y += 40) el("line", { x1: 0, y1: y, x2: W, y2: y }, grid);

    // Flux de trésorerie actualisés : barres qui croissent, puis valeur terminale en pointillé.
    // Haut du panneau : flux actualisés ; bas : distribution Monte Carlo. Le centre reste libre pour le texte.
    const flows = [0.34, 0.41, 0.47, 0.55, 0.6, 0.66, 0.71];
    const baseY = 350;
    const scale = 200;
    flows.forEach((v, k) => {
      const h = v * scale;
      const x = 118 + k * 52;
      const bar = el("rect", { class: "chart__bar", x, y: baseY - h, width: 26, height: h, fill: "rgba(226,194,125,0.16)", stroke: "rgba(226,194,125,0.45)", "stroke-width": 1 }, svg);
      bar.style.animationDelay = `${0.9 + k * 0.09}s`;
    });
    el("line", { x1: 90, y1: baseY + 0.5, x2: 520, y2: baseY + 0.5, stroke: "rgba(244,241,234,0.25)", "stroke-width": 1 }, svg);

    const pts = flows.map((v, k) => [131 + k * 52, baseY - v * scale - 30]);
    const path = `M${pts.map((p) => p.join(",")).join(" L")}`;
    el("path", { class: "chart__draw", d: path, pathLength: 1, fill: "none", stroke: gold, "stroke-width": 2 }, svg);
    const last = pts[pts.length - 1];
    el("path", { d: `M${last.join(",")} L${last[0] + 70},${last[1] - 58}`, fill: "none", stroke: gold, "stroke-width": 1.5, "stroke-dasharray": "4 6", opacity: 0.8 }, svg);
    pts.forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 3.2, fill: "#131417", stroke: gold, "stroke-width": 1.5 }, svg));

    // Distribution Monte Carlo et sa courbe cumulée.
    const mcBase = 880;
    const n = 31;
    let cumulative = "";
    let acc = 0;
    const weights = Array.from({ length: n }, (_, k) => Math.exp(-(((k - 15.5) / 6.2) ** 2) / 2));
    const total = weights.reduce((a, b) => a + b, 0);
    weights.forEach((w, k) => {
      const x = 100 + k * 13;
      const h = w * 130;
      const bar = el("rect", { class: "chart__bar", x, y: mcBase - h, width: 9, height: h, fill: k >= 12 && k <= 19 ? "rgba(226,194,125,0.55)" : "rgba(244,241,234,0.2)" }, svg);
      bar.style.animationDelay = `${1.4 + k * 0.025}s`;
      acc += w / total;
      cumulative += `${k === 0 ? "M" : " L"}${x + 4.5},${(mcBase - acc * 165).toFixed(1)}`;
    });
    el("path", { class: "chart__draw", d: cumulative, pathLength: 1, fill: "none", stroke: "rgba(244,241,234,0.55)", "stroke-width": 1.2 }, svg);
    el("line", { x1: 90, y1: mcBase + 0.5, x2: 520, y2: mcBase + 0.5, stroke: "rgba(244,241,234,0.25)", "stroke-width": 1 }, svg);

    const label = (x, y, text, anchor = "start") =>
      el("text", { x, y, fill: "rgba(244,241,234,0.42)", "font-family": "Inter, sans-serif", "font-size": 11, "letter-spacing": 2, "text-anchor": anchor }, svg).append(text);
    label(90, baseY + 26, "FCF  T1 → T7");
    label(last[0] + 78, last[1] - 64, "VT", "end");
    label(90, mcBase + 26, "P5");
    label(305, mcBase + 26, "P50", "middle");
    label(520, mcBase + 26, "P95", "end");

    container.prepend(svg);
  }

  shows
    .filter((s) => s.panel.dataset.project === "finvalstudio")
    .forEach((s) => drawValuationChart(s.media));

  /* ---------- Alignement du texte sur la diagonale --------------------- */
  // Chaque ligne est recentrée dans la partie visible du panneau à sa hauteur :
  // le bloc de texte suit ainsi l'inclinaison des « / ».

  const TAN = Math.tan((8 * Math.PI) / 180); // = --angle dans le CSS

  function alignToSlant() {
    const items = [];
    const stageRect = stage.getBoundingClientRect();
    const H = stage.clientHeight;
    const stageW = stage.clientWidth;
    const wide = wideLayout.matches;

    for (const panel of panels) {
      const left = panel.offsetLeft;
      const W = panel.offsetWidth;
      const targets = panel.querySelectorAll(".panel__content > *, .panel__foot");
      for (const node of targets) {
        if (!wide) {
          items.push([node, 0]);
          continue;
        }
        const rect = node.getBoundingClientRect();
        const current = parseFloat(node.dataset.tx || "0");
        const y = rect.top + rect.height / 2 - stageRect.top;
        const x = rect.left + rect.width / 2 - current - stageRect.left - left;
        const shift = TAN * (H / 2 - y);
        const visLeft = Math.max(shift, -left);
        const visRight = Math.min(W + shift, stageW - left);
        items.push([node, (visLeft + visRight) / 2 - x]);
      }
    }
    for (const [node, tx] of items) {
      const rounded = Math.round(tx * 10) / 10;
      node.dataset.tx = String(rounded);
      node.style.translate = rounded ? `${rounded}px 0` : "";
    }
  }

  let alignUntil = 0;
  let alignFrame = 0;
  function alignFor(ms) {
    alignUntil = Math.max(alignUntil, performance.now() + ms);
    if (alignFrame) return;
    const step = () => {
      alignToSlant();
      alignFrame = performance.now() < alignUntil ? requestAnimationFrame(step) : 0;
    };
    alignFrame = requestAnimationFrame(step);
  }

  // Le survol élargit un panneau (0,85 s) et déplie sa description : on suit la transition.
  panels.forEach((panel) => {
    panel.addEventListener("pointerenter", () => alignFor(1000));
    panel.addEventListener("pointerleave", () => alignFor(1000));
    panel.addEventListener("focusin", () => alignFor(1000));
    panel.addEventListener("focusout", () => alignFor(1000));
  });
  window.addEventListener("resize", () => alignFor(150));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alignFor(100));
  alignFor(INTRO + 400); // couvre l'animation d'entrée (lettrage du titre)

  /* ---------- Pause / lecture ------------------------------------------ */

  function setPaused(value) {
    paused = value;
    root.classList.toggle("is-paused", paused);
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.querySelector(".motion-toggle__label").textContent = paused ? "Lecture" : "Pause";
    toggle.setAttribute("aria-label", paused ? "Relancer le défilement des photos" : "Mettre en pause le défilement des photos");
  }

  // Le bouton n'apparaît que si au moins un panneau a vraiment de quoi défiler.
  function updateToggle() {
    if (!toggle) return;
    toggle.hidden = !shows.some((s) => s.usable.length > 1 && s.slides.some((slide) => slide.state === "ready"));
  }

  if (toggle) toggle.addEventListener("click", () => setPaused(!paused));
  setPaused(paused);
  reduceMotion.addEventListener?.("change", (e) => setPaused(e.matches));

  /* ---------- Démarrage et boucle ------------------------------------- */

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const show = shows[panels.indexOf(entry.target)];
          show.visible = entry.isIntersecting;
          if (entry.isIntersecting) show.start();
        }
      },
      { rootMargin: "25% 0px" },
    );
    panels.forEach((panel) => io.observe(panel));
  } else {
    shows.forEach((s) => s.start());
  }

  let last = performance.now();
  document.addEventListener("visibilitychange", () => {
    last = performance.now(); // pas de saut au retour sur l'onglet
  });
  function loop(now) {
    const dt = Math.min(now - last, 1000);
    last = now;
    if (!document.hidden) shows.forEach((s) => s.tick(dt));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
