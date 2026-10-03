/*
 * Vue détail d'un projet : vidéo de démonstration et chapitres.
 *
 * - Lecture automatique, muette et en boucle ; en « mouvement réduit », seul le
 *   poster s'affiche jusqu'à ce que la lecture soit demandée.
 * - Le chapitre en cours se met en surbrillance (timeupdate) ; un clic y saute.
 * - La vidéo se met en pause hors écran et reprend en revenant.
 */
(() => {
  "use strict";

  const video = document.querySelector(".pj-video");
  const playButton = document.querySelector("button.pj-play");
  const chapters = Array.from(document.querySelectorAll(".pj-chapter"));
  if (!video || chapters.length === 0) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const starts = chapters.map((button) => Number(button.dataset.start));
  let pausedOffscreen = false;

  const isLoaded = () => video.hasAttribute("src");

  function load() {
    if (isLoaded()) return;
    video.src = video.dataset.src;
    video.controls = true;
    if (playButton) playButton.hidden = true;
  }

  function play() {
    load();
    video.play().catch(() => {}); // lecture refusée : le poster reste, les contrôles restent disponibles
  }

  function chapterAt(time) {
    let index = 0;
    starts.forEach((start, i) => {
      if (time >= start) index = i;
    });
    return index;
  }

  function chapterEnd(index) {
    if (index + 1 < starts.length) return starts[index + 1];
    return Number.isFinite(video.duration) ? video.duration : starts[index];
  }

  function render() {
    const time = video.currentTime;
    const current = chapterAt(time);
    chapters.forEach((button, index) => {
      const isCurrent = index === current;
      button.classList.toggle("is-active", isCurrent);
      if (isCurrent) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");

      let progress = index < current ? 1 : 0;
      if (isCurrent && isLoaded()) {
        const span = chapterEnd(index) - starts[index];
        progress = span > 0 ? Math.min(1, Math.max(0, (time - starts[index]) / span)) : 1;
      }
      button.style.setProperty("--p", progress.toFixed(3));
    });
  }

  function seekTo(index) {
    const go = () => {
      video.currentTime = starts[index];
      render();
      video.play().catch(() => {});
    };
    if (isLoaded() && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      go();
      return;
    }
    video.addEventListener("loadedmetadata", go, { once: true });
    load();
  }

  video.addEventListener("timeupdate", render);
  video.addEventListener("seeked", render);
  video.addEventListener("loadedmetadata", render);
  chapters.forEach((button, index) => button.addEventListener("click", () => seekTo(index)));
  if (playButton) playButton.addEventListener("click", play);

  // Pause hors écran, reprise au retour (seulement si c'est nous qui l'avions mise en pause).
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
          pausedOffscreen = true;
        } else if (entry.isIntersecting && pausedOffscreen) {
          pausedOffscreen = false;
          video.play().catch(() => {});
        }
      },
      { threshold: 0.25 },
    ).observe(video);
  }

  reduceMotion.addEventListener?.("change", (event) => {
    if (event.matches) video.pause();
  });

  if (reduceMotion.matches) {
    if (playButton) playButton.hidden = false;
  } else {
    play();
  }
  render();
})();
