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

// Sempre inicia/recarrega a página no TOPO. O hero é "pinado" e sua animação
// depende de começar do scroll 0; restaurar uma posição mais abaixo deixava o
// conteúdo do hero preso (sumido).
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Pula para o topo SEM animação. Como o CSS usa scroll-behavior: smooth, um
// scrollTo normal "subiria" a página de forma animada no F5. Desativamos o
// comportamento suave só durante o salto e restauramos em seguida.
function jumpToTop() {
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  html.style.scrollBehavior = prev;
}

// Antes de descarregar a página (F5), rola pro topo: assim a posição que o
// navegador salva para "restaurar" já é o topo. É a garantia mais forte.
window.addEventListener('beforeunload', jumpToTop);

// Reforços: ao mostrar a página (inclusive vindo do cache) e após o load,
// garante o topo mesmo que algo tente restaurar a posição.
window.addEventListener('pageshow', jumpToTop);
window.addEventListener('load', () => requestAnimationFrame(jumpToTop));
jumpToTop();

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
let heroVideoScrubber = null;

// Cria o ScrollTrigger pinado + animação de fade do hero.
// IMPORTANTE: é criado de forma SÍNCRONA no carregamento, SEM esperar o vídeo.
// Assim o pin existe desde o início. Se ele só fosse criado após o download do
// vídeo (12MB), o usuário poderia rolar a página antes do pin existir — e, ao
// voltar pra cima, o conteúdo do hero não reaparecia (ficava preso em opacity 0).
function initHeroTimeline() {
  const heroSection = document.querySelector('.hero');
  if (!heroSection || !heroVideo) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "+=2500",
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true // Recalcula os valores da animação no resize (evita estado "preso")
    }
  });

  heroScrollTrigger = tl.scrollTrigger;

  tl.to(".hero__container, .hero__bottom-bar, .hero__scroll-hint", {
    opacity: 0,
    scale: 0.6,
    duration: 0.1,
    ease: "power2.out"
  });

  tl.to(heroVideo, {
    opacity: 1,
    duration: 0.8
  }, "<");
}

// Conecta o scrubber de momentum quando o vídeo estiver pronto.
// O loop do ticker já verifica se o scrubber existe, então antes disso
// o vídeo simplesmente não é avançado (e está com opacity 0 mesmo).
function attachHeroVideoScrubber() {
  heroVideoScrubber = createMomentumVideoScrubber(heroVideo);
  heroVideoScrubber.markReady(0);
}

function setupHero() {
  if (!heroVideo) return;

  // 1) Cria o pin/animação IMEDIATAMENTE (não depende do vídeo).
  initHeroTimeline();

  // No celular (iOS principalmente) o vídeo só decodifica/renderiza frames
  // após um play() disparado DENTRO de um gesto do usuário. Sem isso, mexer no
  // currentTime durante o scroll não mostra nada (o vídeo fica preto/em branco).
  // Aqui destravamos o decoder no primeiro toque/clique do usuário.
  function unlockHeroVideo() {
    window.removeEventListener('touchstart', unlockHeroVideo);
    window.removeEventListener('pointerdown', unlockHeroVideo);
    const p = heroVideo.play();
    if (p && typeof p.then === 'function') {
      p.then(() => heroVideo.pause()).catch(() => {});
    }
  }
  window.addEventListener('touchstart', unlockHeroVideo, { passive: true });
  window.addEventListener('pointerdown', unlockHeroVideo, { passive: true });

  // 2) Baixa o vídeo em segundo plano e liga o scrubber quando carregar.
  const originalSrc = heroVideo.src;

  fetch(originalSrc)
    .then(response => {
      if (!response.ok) throw new Error();
      return response.blob();
    })
    .then(blob => {
      heroVideo.src = URL.createObjectURL(blob);

      heroVideo.addEventListener('loadedmetadata', function init() {
        heroVideo.play().then(() => heroVideo.pause()).catch(() => {});
        attachHeroVideoScrubber();
        heroVideo.removeEventListener('loadedmetadata', init);
      });
    })
    .catch(() => {
      heroVideo.load();
      heroVideo.addEventListener('loadedmetadata', function init() {
        heroVideo.play().then(() => heroVideo.pause()).catch(() => {});
        attachHeroVideoScrubber();
        heroVideo.removeEventListener('loadedmetadata', init);
      }, { once: true });
    });
}


function startVideoScrubLoop() {
  gsap.ticker.add((_, deltaTime) => {
    const dt = deltaTime / 1000;

    if (heroScrollTrigger?.isActive && heroVideoScrubber) {
      heroVideoScrubber.setProgress(getRawProgress(heroScrollTrigger));
      heroVideoScrubber.tick(dt);
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
  startVideoScrubLoop();

  // O ScrollTrigger também guarda a posição de scroll entre reloads.
  // Limpamos essa memória e garantimos o topo após o pin do hero ser criado.
  if (window.ScrollTrigger) {
    ScrollTrigger.clearScrollMemory();
  }
  requestAnimationFrame(jumpToTop);
});
