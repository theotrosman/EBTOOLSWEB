/* ===== EBTOOLS — ENHANCE =====
   Micro-interacciones sutiles reservadas para computadoras de gama alta
   (puntero fino, pantalla ancha, varios núcleos y sin prefers-reduced-motion).
   En mobile o con movimiento reducido no corre nada: costo cero.
   La idea es que la página se sienta "viva" en una buena compu sin caer en el
   efecto AI-slop de animaciones por todos lados. */
/* global anime */

(function () {
  'use strict';

  function isHighEndDesktop() {
    try {
      const fine    = matchMedia('(hover: hover) and (pointer: fine)').matches;
      const wide    = matchMedia('(min-width: 1024px)').matches;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cores   = navigator.hardwareConcurrency || 4;
      return fine && wide && !reduced && cores >= 4;
    } catch (_) { return false; }
  }

  /* Flotación idle de los chips del hero (anime.js). Duraciones distintas para
     que no floten sincronizados → se siente orgánico, no mecánico. */
  function floatHeroChips() {
    if (typeof anime !== 'function') return;
    const a = document.querySelector('.hero-chip--a');
    const b = document.querySelector('.hero-chip--b');
    if (a) anime({ targets: a, translateY: [0, -7], direction: 'alternate', loop: true, duration: 3200, easing: 'easeInOutSine' });
    if (b) anime({ targets: b, translateY: [0, -6], direction: 'alternate', loop: true, duration: 3900, delay: 500, easing: 'easeInOutSine' });
  }

  /* Tilt 3D del hero-card siguiendo el puntero. rAF + lerp para un seguimiento
     suave (mejor que una transición CSS que se reinicia en cada frame). */
  function tiltHeroCard() {
    const stage = document.querySelector('.hero-stage');
    const card  = document.querySelector('.hero-product-card');
    if (!stage || !card) return;

    stage.style.perspective = '1100px';
    // Sacamos la transición de transform (dejamos la del box-shadow para que el
    // hover glow siga suave); si no, el tilt se sentiría con lag.
    card.style.transition = 'box-shadow 0.35s cubic-bezier(0.23,1,0.32,1)';
    card.style.willChange = 'transform';

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const MAX = 5; // grados máximos de inclinación

    function frame() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      card.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${cy.toFixed(2)}deg)`;
      if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
        raf = requestAnimationFrame(frame);
      } else {
        card.style.transform = `rotateY(${tx}deg) rotateX(${ty}deg)`;
        raf = null;
      }
    }
    function kick() { if (raf == null) raf = requestAnimationFrame(frame); }

    stage.addEventListener('mousemove', (e) => {
      const r  = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5; // -0.5 .. 0.5
      const py = (e.clientY - r.top)  / r.height - 0.5;
      tx =  px * (MAX * 2);   // izquierda/derecha
      ty = -py * (MAX * 2);   // arriba/abajo (invertido = natural)
      kick();
    }, { passive: true });

    stage.addEventListener('mouseleave', () => { tx = 0; ty = 0; kick(); });
  }

  function init() {
    if (!isHighEndDesktop()) return;
    floatHeroChips();
    tiltHeroCard();
  }

  // Esperamos a que la entrada GSAP del hero termine (arranca ~0.05s y dura
  // ~1.3s) para no pelearnos con su clearProps sobre los mismos elementos.
  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1600));
})();
