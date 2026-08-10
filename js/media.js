// Mídias dinâmicas: aplica as trocas feitas pelo administrador.
// As mídias trocadas ficam em assets/media.json (publicado no GitHub Pages).
// Sem trocas (arquivo vazio/inexistente) → o site usa os assets originais do HTML.
(() => {
  const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

  function youTubeId(url) {
    const m = YT_RE.exec(url);
    return m ? m[1] : null;
  }

  function embedYouTube(videoEl, id) {
    const wrap = document.createElement("div");
    wrap.className = "video-embed";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
    iframe.title = "Vídeo do Colégio Menezes e Sousa";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    videoEl.replaceWith(wrap);
  }

  function applyMedia(el, url) {
    if (!el || !url) return;
    el.dataset.currentUrl = url;
    const ytId = youTubeId(url);

    if (el.tagName === "VIDEO") {
      if (ytId) {
        embedYouTube(el, ytId);
      } else {
        while (el.firstChild) el.removeChild(el.firstChild); // remove <source> locais
        el.src = url;
        el.load();
      }
      return;
    }

    if (el.tagName === "IMG") {
      el.src = url;
    }
  }

  // ?v= evita cache antigo do GitHub Pages após uma troca
  async function load() {
    try {
      const res = await fetch("assets/media.json?v=" + Date.now(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const media = await res.json();
      if (!media) return;

      for (const el of document.querySelectorAll("[data-media-key]")) {
        const url = media[el.dataset.mediaKey];
        if (url) applyMedia(el, url);
      }
    } catch {
      // Arquivo ausente ou indisponível → mantém os assets locais
    }
  }

  window.MediaManager = { applyMedia, youTubeId };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
