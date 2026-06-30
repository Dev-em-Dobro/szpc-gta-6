/**
 * ========================================================================
 *   LÓGICA JAVASCRIPT — ESTRUTURADA & DIDÁTICA
 *   Desenvolvido de forma modular e resiliente para iniciantes!
 * ========================================================================
 */

// REGISTRO DE PLUGINS DO GSAP
// Ativamos o ScrollTrigger para gerenciar as animações baseadas no scroll
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ========================================================================
   1. SETUP DO MENU / HEADER (setupNavbar)
   Gerencia os efeitos visuais de rolagem e clique no menu de navegação.
   ======================================================================== */
function setupNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobile-menu');

  if (navbar) {
    window.addEventListener('scroll', () => {
      // Adiciona fundo fosco à navbar ao descer o scroll
      if (window.scrollY > 50) {
        navbar.classList.add('navbar--scrolled');
      } else {
        navbar.classList.remove('navbar--scrolled');
      }
    });
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('is-active');
      alert('Menu mobile clicado! Em breve implementaremos a barra lateral de links.');
    });
  }
}

/* ========================================================================
   2. SETUP DE REVEAL (setupReveal)
   Controla a revelação suave (fade-in + slide) de textos ao rolar a página.
   ======================================================================== */
function setupReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length === 0) return;

  const observerOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(element => {
    observer.observe(element);
  });
}

/* ========================================================================
   UTILITÁRIO: SCRUB DE VÍDEO COM MOMENTUM (EASE OUT)
   Ao parar o scroll, o vídeo continua um pouco e desacelera organicamente.
   ======================================================================== */
const VIDEO_FPS = 30;
const FRAME_TIME = 1 / VIDEO_FPS;

let isPageScrolling = false;
let scrollIdleTimer = null;

window.addEventListener('scroll', () => {
  isPageScrolling = true;
  clearTimeout(scrollIdleTimer);
  scrollIdleTimer = setTimeout(() => {
    isPageScrolling = false;
  }, 140);
}, { passive: true });

function snapToFrame(time, duration) {
  const clamped = Math.max(0, Math.min(duration, time));
  return Math.round(clamped / FRAME_TIME) * FRAME_TIME;
}

function getRawProgress(scrollTrigger) {
  const range = scrollTrigger.end - scrollTrigger.start;
  if (range <= 0) return 0;
  return gsap.utils.clamp(0, 1, (scrollTrigger.scroll() - scrollTrigger.start) / range);
}

function applyVideoTime(video, time, force = false) {
  if (!video?.duration || isNaN(video.duration)) return;

  const frameTime = snapToFrame(time, video.duration);
  if (!force && Math.abs(video.currentTime - frameTime) < FRAME_TIME * 0.4) return;

  if (typeof video.fastSeek === 'function') {
    video.fastSeek(frameTime);
  } else {
    video.currentTime = frameTime;
  }
}

function createMomentumVideoScrubber(video, options = {}) {
  const {
    invert = false,
    scrollLerp = 0.42,
    friction = 0.9,
    momentumScale = 0.38,
    maxVelocity = 2.8
  } = options;

  const state = {
    targetTime: 0,
    displayTime: 0,
    lastTargetTime: 0,
    velocity: 0,
    ready: false
  };

  function progressToTime(progress) {
    if (!video.duration) return 0;
    const normalized = invert ? 1 - progress : progress;
    return normalized * video.duration;
  }

  return {
    setProgress(progress) {
      state.targetTime = progressToTime(progress);
    },
    snapTo(time) {
      state.targetTime = time;
      state.displayTime = time;
      state.lastTargetTime = time;
      state.velocity = 0;
      applyVideoTime(video, time, true);
    },
    markReady(initialTime = 0) {
      state.ready = true;
      state.targetTime = initialTime;
      state.displayTime = initialTime;
      state.lastTargetTime = initialTime;
    },
    tick(deltaSeconds) {
      if (!state.ready || !video.duration || isNaN(video.duration)) return;

      const dt = Math.min(deltaSeconds, 0.05);

      if (isPageScrolling) {
        const targetDelta = state.targetTime - state.lastTargetTime;
        if (dt > 0) {
          const instantVelocity = targetDelta / dt;
          state.velocity = gsap.utils.clamp(
            -maxVelocity,
            maxVelocity,
            instantVelocity * momentumScale
          );
        }
        state.lastTargetTime = state.targetTime;
        state.displayTime += (state.targetTime - state.displayTime) * scrollLerp;
      } else {
        state.displayTime += state.velocity * dt;
        state.velocity *= Math.pow(friction, dt * 60);

        if (Math.abs(state.velocity) < 0.015) {
          state.velocity = 0;
          state.displayTime += (state.targetTime - state.displayTime) * 0.1;
        }
      }

      state.displayTime = gsap.utils.clamp(0, video.duration, state.displayTime);
      applyVideoTime(video, state.displayTime);
    }
  };
}

/* ========================================================================
   3. ANIMAÇÃO DE INTRODUÇÃO DO HERO
   Animação original que encolhe (scale) o conteúdo e revela o primeiro vídeo.
   ======================================================================== */

const heroVideo = document.querySelector('.hero__video');
let heroScrollTrigger = null;
let buildScrollTrigger = null;
let heroVideoScrubber = null;
let buildVideoScrubber = null;

function initHeroGSAPAnimation() {
  const heroSection = document.querySelector('.hero');
  if (!heroSection || !heroVideo) return;

  heroVideoScrubber = createMomentumVideoScrubber(heroVideo);
  heroVideoScrubber.markReady(0);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "+=2500",
      scrub: 1,
      pin: true,
      anticipatePin: 1
    }
  });

  heroScrollTrigger = tl.scrollTrigger;

  tl.to(".hero__container, .hero__bottom-bar", {
    opacity: 0,
    scale: 0.6,
    duration: 1.5,
    ease: "power2.out"
  });

  tl.to(heroVideo, {
    opacity: 1,
    duration: 0.8
  }, "<");
}

function setupHero() {
  if (!heroVideo) return;

  const originalSrc = heroVideo.src;

  fetch(originalSrc)
    .then(response => {
      if (!response.ok) throw new Error();
      return response.blob();
    })
    .then(blob => {
      const blobURL = URL.createObjectURL(blob);
      heroVideo.src = blobURL;
      
      heroVideo.addEventListener('loadedmetadata', function init() {
        heroVideo.play().then(() => heroVideo.pause()).catch(() => {});
        initHeroGSAPAnimation();
        heroVideo.removeEventListener('loadedmetadata', init);
      });
    })
    .catch(() => {
      heroVideo.load();
      heroVideo.play().then(() => heroVideo.pause()).catch(() => {});
      initHeroGSAPAnimation();
    });
}

/* ========================================================================
   4. SETUP DA SEÇÃO BUILD SEQUENCE (setupBuildSequence)
   [OBRIGATÓRIO] Sequência pinada de vídeo rodando invertida no scroll
   ======================================================================== */
let buildVideoElement = null;

function setupBuildSequence() {
  buildVideoElement = document.querySelector('.build-section__video');
  const buildSection = document.getElementById('build-section');

  // Checa resiliência: se os elementos existem na página
  if (!buildVideoElement || !buildSection) return;

  const originalSrc = buildVideoElement.src;

  // Pré-carrega o vídeo como Blob na RAM para garantir que a rolagem invertida
  // seja extremamente fluida e não sofra atrasos de download.
  fetch(originalSrc)
    .then(response => {
      if (!response.ok) throw new Error("Erro de rede no Build Video");
      return response.blob();
    })
    .then(blob => {
      const blobURL = URL.createObjectURL(blob);
      buildVideoElement.src = blobURL;

      buildVideoElement.addEventListener('loadedmetadata', function init() {
        // Pré-carrega os frames na RAM reproduzindo e pausando rapidamente
        buildVideoElement.play().then(() => {
          buildVideoElement.pause();
        }).catch(() => {});

        initBuildTimeline(buildVideoElement.duration);
        buildVideoElement.removeEventListener('loadedmetadata', init);
      });
    })
    .catch(err => {
      console.warn("CORS/Erro ao carregar Build Video como Blob. Usando fallback progressivo.", err);
      
      buildVideoElement.load();
      buildVideoElement.addEventListener('loadedmetadata', function init() {
        buildVideoElement.play().then(() => {
          buildVideoElement.pause();
        }).catch(() => {});

        initBuildTimeline(buildVideoElement.duration);
        buildVideoElement.removeEventListener('loadedmetadata', init);
      });

      // Se os metadados já estiverem prontos no cache
      if (buildVideoElement.readyState >= 1) {
        initBuildTimeline(buildVideoElement.duration);
      } else {
        // Fallback final imediato se o navegador demorar a responder (usa duração padrão estimada de 5s)
        initBuildTimeline(5);
      }
    });
}

function initBuildTimeline(duration) {
  const videoDuration = duration || 5;

  buildVideoScrubber = createMomentumVideoScrubber(buildVideoElement, { invert: true });
  buildVideoScrubber.markReady(videoDuration);
  buildVideoScrubber.snapTo(videoDuration);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".build-section",
      start: "top top",
      end: "+=3000",
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      onLeave: () => {
        buildVideoScrubber.snapTo(0);
      },
      onLeaveBack: () => {
        buildVideoScrubber.snapTo(videoDuration);
      }
    }
  });

  buildScrollTrigger = tl.scrollTrigger;
}

function startVideoScrubLoop() {
  gsap.ticker.add((_, deltaTime) => {
    const dt = deltaTime / 1000;

    if (heroScrollTrigger?.isActive && heroVideoScrubber) {
      heroVideoScrubber.setProgress(getRawProgress(heroScrollTrigger));
      heroVideoScrubber.tick(dt);
    }

    if (buildScrollTrigger?.isActive && buildVideoScrubber) {
      buildVideoScrubber.setProgress(getRawProgress(buildScrollTrigger));
      buildVideoScrubber.tick(dt);
    }
  });
}

/* ========================================================================
   INICIALIZAÇÃO DO SITE
   Chamada de cada função de configuração modular.
   ======================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupReveal();
  setupHero();
  setupBuildSequence();
  startVideoScrubLoop();
});
