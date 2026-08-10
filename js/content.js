// Conteúdo dinâmico: aplica anúncio, textos, depoimentos, FAQ, galerias e
// Google Analytics a partir de assets/content.json (publicado no GitHub Pages).
// Sem arquivo ou sem entradas → o site usa o conteúdo padrão do HTML/JS.
(() => {
  const DEFAULT_GALLERY_CAPTIONS = {
    estrutura: [
      "Salas de aula",
      "Biblioteca",
      "Quadra esportiva",
      "Laboratório",
      "Espaços de convivência",
      "Área infantil",
    ],
    vivencias: ["Semana da Criança", "Feira Cultural", "Projetos e exposições"],
  };

  function renderGallery(galleryKey, urls) {
    const container = document.querySelector(`[data-gallery-key="${galleryKey}"]`);
    if (!container) return;
    const captions = DEFAULT_GALLERY_CAPTIONS[galleryKey] || [];
    const isVivencias = galleryKey === "vivencias";
    container.innerHTML = "";

    urls.forEach((url, i) => {
      const caption = captions[i] || `Foto ${i + 1}`;
      const figure = document.createElement("figure");
      if (isVivencias) figure.className = "school-life-card";

      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.alt = caption;
      figure.appendChild(img);

      const figcaption = document.createElement("figcaption");
      if (isVivencias) {
        const strong = document.createElement("strong");
        strong.textContent = caption;
        figcaption.appendChild(strong);
        const span = document.createElement("span");
        span.textContent = "Galeria";
        figcaption.appendChild(span);
      } else {
        figcaption.textContent = caption;
      }
      figure.appendChild(figcaption);
      container.appendChild(figure);
    });

    if (window.attachGalleryLightbox) window.attachGalleryLightbox(container);
  }

  function applyAnuncio(anuncio) {
    const el = document.querySelector('[data-content-key="anuncio"]');
    if (!el) return;
    if (anuncio && typeof anuncio.texto === "string" && anuncio.texto.trim()) {
      el.textContent = anuncio.texto;
    }
    el.hidden = !!(anuncio && anuncio.ativo === false);
  }

  function applyTextos(textos) {
    if (!textos) return;
    for (const el of document.querySelectorAll("[data-content-key]")) {
      if (el.dataset.contentKey === "anuncio") continue; // tratado separadamente
      const value = textos[el.dataset.contentKey];
      if (typeof value === "string") el.textContent = value;
    }
  }

  function applyAnalytics(id) {
    if (!id || window.gtag) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id);
  }

  function apply(data) {
    if (!data) return;
    applyAnuncio(data.anuncio);
    applyTextos(data.textos);

    if (Array.isArray(data.depoimentos) && data.depoimentos.length && window.renderTestimonials) {
      window.renderTestimonials(
        data.depoimentos.map((d) => ({
          name: d.nome || "Avaliações públicas",
          relation: d.relacao || "",
          text: d.texto || "",
        }))
      );
    }

    if (Array.isArray(data.faq) && data.faq.length && window.renderFaq) {
      window.renderFaq(data.faq.map((q) => [q.pergunta || "", q.resposta || ""]));
    }

    if (data.galerias) {
      if (Array.isArray(data.galerias.estrutura)) renderGallery("estrutura", data.galerias.estrutura);
      if (Array.isArray(data.galerias.vivencias)) renderGallery("vivencias", data.galerias.vivencias);
    }

    applyAnalytics(data.analytics_id);
  }

  async function load() {
    try {
      const res = await fetch("assets/content.json?v=" + Date.now(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      apply(await res.json());
    } catch {
      // Arquivo ausente ou indisponível → mantém o conteúdo padrão
    }
  }

  window.ContentManager = { apply, renderGallery };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
