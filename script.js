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
   UTILITÁRIO: SCRUB DE VÍDEO SUAVE
   Interpola o currentTime com velocidade adaptativa e fila de seeks.
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
  }, 120);
}, { passive: true });

function getAdaptiveLerpSpeed(distance) {
  if (isPageScrolling) {
    return distance > 0.15 ? 0.65 : 0.45;
  }
  return distance > 0.05 ? 0.35 : 0.2;
}

function seekVideoToFrame(video, time, pendingSeekRef) {
  const safeTime = Math.max(0, Math.min(video.duration, time));

  if (video.seeking) {
    pendingSeekRef.value = safeTime;
    return;
  }

  if (typeof video.fastSeek === 'function') {
    video.fastSeek(safeTime);
  } else {
    video.currentTime = safeTime;
  }
}

function createVideoScrubber(video) {
  const state = {
    targetTime: 0,
    currentTime: 0,
    pendingSeek: { value: null },
    ready: false
  };

  video.addEventListener('seeked', () => {
    if (state.pendingSeek.value === null) return;
    const nextTime = state.pendingSeek.value;
    state.pendingSeek.value = null;
    seekVideoToFrame(video, nextTime, state.pendingSeek);
  });

  return {
    setTarget(time) {
      state.targetTime = time;
    },
    snapTo(time) {
      state.targetTime = time;
      state.currentTime = time;
      seekVideoToFrame(video, time, state.pendingSeek);
    },
    tick() {
      if (!state.ready || !video.duration || isNaN(video.duration)) return;

      const distance = Math.abs(state.targetTime - state.currentTime);
      const lerpSpeed = getAdaptiveLerpSpeed(distance);
      state.currentTime += (state.targetTime - state.currentTime) * lerpSpeed;

      const roundedTime = Math.round(state.currentTime / FRAME_TIME) * FRAME_TIME;

      if (Math.abs(video.currentTime - roundedTime) >= FRAME_TIME * 0.4) {
        seekVideoToFrame(video, roundedTime, state.pendingSeek);
      }
    },
    markReady(initialTime = 0) {
      state.ready = true;
      state.targetTime = initialTime;
      state.currentTime = initialTime;
    }
  };
}

const heroVideo = document.querySelector('.hero__video');
let heroScrubber = null;

/* ========================================================================
   3. ANIMAÇÃO DE INTRODUÇÃO DO HERO
   Animação original que encolhe (scale) o conteúdo e revela o primeiro vídeo.
   ======================================================================== */

function initHeroGSAPAnimation() {
  const heroSection = document.querySelector('.hero');
  if (!heroSection || !heroVideo) return;

  heroScrubber = createVideoScrubber(heroVideo);
  heroScrubber.markReady(0);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "+=2500",
      scrub: 0.35,
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        if (heroVideo && !isNaN(heroVideo.duration) && heroVideo.duration > 0) {
          heroScrubber.setTarget(self.progress * heroVideo.duration);
        }
      }
    }
  });

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

function startVideoScrubLoop() {
  function tick() {
    heroScrubber?.tick();
    buildScrubber?.tick();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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
        initHeroGSAPAnimation();
        heroVideo.removeEventListener('loadedmetadata', init);
      });
    })
    .catch(() => {
      // Fallback local se o fetch for bloqueado (CORS/file://)
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
let buildScrubber = null;

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

        // Inicializa a animação com a duração real carregada
        initBuildTimeline(buildVideoElement.duration);
        buildVideoElement.removeEventListener('loadedmetadata', init);
      });
    })
    .catch(err => {
      console.warn("CORS/Erro ao carregar Build Video como Blob. Usando fallback progressivo.", err);
      
      // Fallback seguro: tenta inicializar usando escuta padrão ou valor estimado
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

  buildScrubber = createVideoScrubber(buildVideoElement);
  buildScrubber.markReady(videoDuration);
  buildScrubber.snapTo(videoDuration);

  // Configuração do ScrollTrigger com GSAP
  gsap.timeline({
    scrollTrigger: {
      trigger: ".build-section",
      start: "top top",
      end: "+=3000",
      scrub: 0.35,
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        if (buildVideoElement && !isNaN(buildVideoElement.duration) && buildVideoElement.duration > 0) {
          buildScrubber.setTarget((1 - self.progress) * buildVideoElement.duration);
        }
      },
      onLeave: () => {
        buildScrubber.snapTo(0);
      },
      onLeaveBack: () => {
        if (buildVideoElement && !isNaN(buildVideoElement.duration)) {
          buildScrubber.snapTo(buildVideoElement.duration);
        }
      }
    }
  });
}

/* ========================================================================
   INICIALIZAÇÃO DO SITE
   Chamada de cada função de configuração modular.
   ======================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.config({ limitCallbacks: true });
  }

  setupNavbar();
  setupReveal();
  setupHero();
  setupBuildSequence();
  startVideoScrubLoop();
});
