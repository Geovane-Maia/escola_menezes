// Hero em carrossel — réplica do efeito "circle-bg" do Colégio Núcleo:
// um círculo de gradiente animado atrás da foto troca de posição/tamanho a
// cada slide, com autoplay, setas laterais, dots e animação de conteúdo.
// Implementação em JavaScript puro (sem bibliotecas), no padrão dos demais
// scripts do site.
(() => {
  const slider = document.querySelector(".hero-slider");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".hero-slide"));
  if (slides.length < 2) return;

  const circleSvg = slider.querySelector(".hero-circle-svg");
  const circle = slider.querySelector(".hero-circle");
  const prevBtn = slider.querySelector(".hero-slider-prev");
  const nextBtn = slider.querySelector(".hero-slider-next");
  const dotsWrap = slider.querySelector(".hero-slider-dots");
  if (!circle || !prevBtn || !nextBtn || !dotsWrap) return;

  const AUTOPLAY_MS = 4600; // mesmo ritmo do site de referência
  const SWAP_MS = 520; // tempo do círculo cobrindo a tela antes de encolher
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SMALL = window.matchMedia("(max-width: 720px)");

  if (REDUCED) {
    circleSvg.querySelectorAll("animate").forEach((node) => node.remove());
  }

  const num = (value, fallback) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  let index = 0;
  let timer = null;
  let transitioning = false;

  // Posição/tamanho do círculo do slide (mesmos data-circle-* do site de referência)
  function geometry(slide) {
    const width = slider.clientWidth;
    const height = slider.clientHeight;
    const style = getComputedStyle(slider);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;

    let radius = num(slide.dataset.circleR, 0.15) * width;
    if (SMALL.matches) radius *= 1.15;

    // Limita o raio para o círculo caber inteiro na área visível do carrossel
    // (abaixo do cabeçalho fixo e acima do rodapé da seção)
    radius = Math.min(radius, Math.max(0, height - padTop - padBottom) / 2);

    // Centro vertical calculado na área de conteúdo (fora do padding do topo,
    // evitando que a foto fique cortada atrás do cabeçalho)
    let cx = num(slide.dataset.circleCx, 0.6) * width;
    let cy = padTop + num(slide.dataset.circleCy, 0.5) * Math.max(0, height - padTop - padBottom);

    cx = Math.min(Math.max(cx, radius), width - radius);
    cy = Math.min(Math.max(cy, padTop + radius), height - padBottom - radius);
    return { cx, cy, r: radius };
  }

  // Círculo grande o bastante para cobrir o carrossel inteiro
  function coverGeometry() {
    const width = slider.clientWidth;
    const height = slider.clientHeight;
    return { cx: width / 2, cy: height / 2, r: Math.hypot(width, height) + 2 };
  }

  function placeCircle({ cx, cy, r }) {
    circleSvg.setAttribute("viewBox", `0 0 ${slider.clientWidth} ${slider.clientHeight}`);
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
  }

  function placePhoto(slide, { cx, cy, r }) {
    const photo = slide.querySelector(".hero-slide-photo");
    if (!photo) return;
    // A foto ocupa ~88% do círculo para o anel de gradiente ficar visível,
    // como no site de referência (fotos recortadas sobre o círculo laranja).
    const size = r * 1.76;
    photo.style.left = `${cx}px`;
    photo.style.top = `${cy}px`;
    photo.style.width = `${size}px`;
    photo.style.height = `${size}px`;
  }

  function updateDots() {
    dotsWrap.querySelectorAll("button").forEach((dot, dotIndex) => {
      const active = dotIndex === index;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function goTo(nextIndex, { instant = false } = {}) {
    if (transitioning && !instant) return;
    nextIndex = (nextIndex + slides.length) % slides.length;
    if (nextIndex === index) return;

    const current = slides[index];
    const next = slides[nextIndex];
    const nextGeo = geometry(next);

    if (instant || REDUCED) {
      circle.style.transition = "none";
      current.classList.remove("is-active");
      current.setAttribute("aria-hidden", "true");
      next.classList.add("is-active");
      next.setAttribute("aria-hidden", "false");
      placePhoto(next, nextGeo);
      placeCircle(nextGeo);
      index = nextIndex;
      updateDots();
      return;
    }

    transitioning = true;
    current.classList.remove("is-active");

    // 1) círculo cresce e cobre a tela (atrás do conteúdo)
    circle.style.transition =
      "cx .5s cubic-bezier(.7,0,.3,1), cy .5s cubic-bezier(.7,0,.3,1), r .5s cubic-bezier(.7,0,.3,1)";
    placeCircle(coverGeometry());

    window.setTimeout(() => {
      // 2) troca o slide e o círculo encolhe para a posição do novo slide
      current.setAttribute("aria-hidden", "true");
      next.classList.add("is-active");
      next.setAttribute("aria-hidden", "false");
      placePhoto(next, nextGeo);

      circle.style.transition =
        "cx .55s cubic-bezier(.22,1,.36,1), cy .55s cubic-bezier(.22,1,.36,1), r .55s cubic-bezier(.22,1,.36,1)";
      placeCircle(nextGeo);

      index = nextIndex;
      updateDots();
      transitioning = false;
    }, SWAP_MS);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (REDUCED) return;
    timer = window.setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  }

  function restart() {
    if (document.hidden) return;
    start();
  }

  function init() {
    dotsWrap.innerHTML = "";
    slides.forEach((slide, slideIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Ir para o destaque ${slideIndex + 1}`);
      dot.addEventListener("click", () => {
        goTo(slideIndex);
        restart();
      });
      dotsWrap.appendChild(dot);
    });

    prevBtn.addEventListener("click", () => {
      goTo(index - 1);
      restart();
    });
    nextBtn.addEventListener("click", () => {
      goTo(index + 1);
      restart();
    });

    // Estado inicial: círculo e foto no lugar do primeiro slide
    const first = geometry(slides[0]);
    placePhoto(slides[0], first);
    placeCircle(first);
    updateDots();
    start();
  }

  window.addEventListener("resize", () => {
    const geo = geometry(slides[index]);
    placeCircle(geo);
    placePhoto(slides[index], geo);
  });

  // Arrastar (swipe) no celular: navega o carrossel sem conflitar com a rolagem
  const SWIPE_THRESHOLD = 60; // px de arrasto para trocar de slide
  let drag = null;

  slider.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.target.closest("button, a")) return;
    drag = { startX: event.clientX, startY: event.clientY, dx: 0, locked: false, slide: null };
    try {
      slider.setPointerCapture(event.pointerId);
    } catch {
      // captura de ponteiro indisponível — segue sem ela
    }
  });

  slider.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.locked) {
      // Se o dedo anda mais na vertical, deixa a página rolar e cancela o swipe
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 8) {
        if (Math.abs(dy) > Math.abs(dx)) drag = null;
        return;
      }
      drag.locked = true;
      drag.slide = slides[index];
      drag.slide.classList.add("is-dragging");
    }

    drag.dx = dx;
    drag.slide.style.transform = `translateX(${dx}px)`;
  });

  const finishDrag = (cancel) => {
    if (!drag) return;
    if (drag.slide) {
      drag.slide.classList.remove("is-dragging");
      drag.slide.style.transform = "";
      if (!cancel && drag.locked) {
        if (drag.dx < -SWIPE_THRESHOLD) {
          goTo(index + 1);
          restart();
        } else if (drag.dx > SWIPE_THRESHOLD) {
          goTo(index - 1);
          restart();
        }
      }
    }
    drag = null;
  };

  slider.addEventListener("pointerup", () => finishDrag(false));
  slider.addEventListener("pointercancel", () => finishDrag(true));

  // Pausa ao passar o mouse, ao sair da tela ou com a aba oculta
  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", start);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0.2 }
    );
    observer.observe(slider);
  }

  init();
})();
