/*
 * Vidéo de présentation : le bouton « Présentation » de la barre du haut l'ouvre dans une fenêtre.
 *
 * - Sans JavaScript (ou sans <dialog>), le lien ouvre simplement le fichier MP4.
 * - Rien n'est téléchargé avant le clic ; le format suit l'écran au moment de l'ouverture :
 *   4:5 sur un écran tenu en portrait, 16:9 sinon.
 * - Lecture avec le son (le clic l'autorise) ; fermer (bouton, Échap, clic à côté) met en pause.
 */
(() => {
  "use strict";

  const opener = document.querySelector(".intro-open");
  const dialog = document.querySelector("dialog.intro");
  if (!opener || !dialog || typeof dialog.showModal !== "function") return;

  const video = dialog.querySelector(".intro__video");
  const closeButton = dialog.querySelector(".intro__close");
  const tall = window.matchMedia("(max-aspect-ratio: 4/5)");

  function open(event) {
    event.preventDefault();
    const src = tall.matches ? video.dataset.srcTall : video.dataset.srcWide;
    dialog.classList.toggle("intro--tall", tall.matches);
    if (video.getAttribute("src") !== src) video.src = src;

    dialog.showModal();
    video.play().catch(() => {}); // lecture refusée : les contrôles restent disponibles
  }

  opener.addEventListener("click", open);
  closeButton.addEventListener("click", () => dialog.close());
  // Clic sur le fond (le <dialog> lui-même, hors du cadre de la vidéo).
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    video.pause();
    opener.focus();
  });
})();
