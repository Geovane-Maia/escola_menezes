// Modo edição do administrador — troca mídias e edita o conteúdo do site
// direto pelo GitHub, sem banco de dados. Tudo é salvo em arquivos JSON
// (assets/media.json e assets/content.json) publicados no GitHub Pages.
//
// Invisível para visitantes:
// - Login: 5 cliques no logo → cole seu token do GitHub.
// - O token fica salvo apenas neste navegador (localStorage).
// - Os botões só são criados em memória quando o token existe.
(() => {
  const REPO = "geovane-maia/escola_menezes";
  const BRANCH = "main";
  const MEDIA_PATH = "assets/media.json";
  const CONTENT_PATH = "assets/content.json";
  const TOKEN_KEY = "escola_admin_token";
  const TRIGGER_CLICKS = 5;
  const TRIGGER_WINDOW_MS = 4000;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // limite do GitHub

  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  let clicks = 0;
  let lastClick = 0;
  let overlayButtons = [];
  let editBar = null;

  // ---------- GitHub API ----------
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  async function gh(path, { method = "GET", body } = {}) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Erro ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  function base64ToJson(content) {
    const binary = atob(content.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function jsonToBase64(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj, null, 2));
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  async function getRepoJson(path) {
    try {
      const data = await gh(path);
      return base64ToJson(data.content);
    } catch {
      return {}; // arquivo ainda não existe
    }
  }

  async function putRepoJson(path, obj) {
    const existing = await gh(path).catch(() => null);
    await gh(path, {
      method: "PUT",
      body: {
        message: `Atualizar ${path}`,
        content: jsonToBase64(obj),
        branch: BRANCH,
        ...(existing ? { sha: existing.sha } : {}),
      },
    });
  }

  async function uploadToRepo(path, base64Content) {
    const existing = await gh(path).catch(() => null);
    await gh(path, {
      method: "PUT",
      body: {
        message: `Atualizar mídia ${path}`,
        content: base64Content,
        branch: BRANCH,
        ...(existing ? { sha: existing.sha } : {}),
      },
    });
  }

  async function deleteFromRepo(path) {
    try {
      const existing = await gh(path);
      if (!existing) return;
      await gh(path, {
        method: "DELETE",
        body: { message: `Remover ${path}`, sha: existing.sha, branch: BRANCH },
      });
    } catch {
      // best effort — sem backup, mas não impede a troca
    }
  }

  async function checkToken() {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/vnd.github+json" },
    });
    return res.ok;
  }

  // ---------- Login escondido (token) ----------
  const brand = document.querySelector(".brand-logo");
  if (brand) {
    brand.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastClick > TRIGGER_WINDOW_MS) clicks = 0;
      lastClick = now;
      clicks += 1;
      if (clicks >= TRIGGER_CLICKS) {
        clicks = 0;
        openLogin();
      }
    });
  }

  function openLogin() {
    const modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.innerHTML = `
      <div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Área do administrador">
        <h3>Área do administrador</h3>
        <p class="admin-hint">Cole seu token do GitHub com permissão de escrita neste repositório. Ele fica salvo apenas neste navegador.</p>
        <label>Token do GitHub
          <input id="admin-token" type="password" autocomplete="off" placeholder="github_pat_..." />
        </label>
        <p class="admin-error" hidden></p>
        <div class="admin-modal-actions">
          <button id="admin-save-token" class="admin-btn">Entrar</button>
          <button id="admin-cancel-btn" class="admin-btn admin-btn-ghost">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector("#admin-cancel-btn").addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    const tokenInput = modal.querySelector("#admin-token");
    const errorEl = modal.querySelector(".admin-error");
    tokenInput.focus();

    async function submit() {
      const token = tokenInput.value.trim();
      if (!token) {
        errorEl.textContent = "Cole seu token.";
        errorEl.hidden = false;
        return;
      }
      try {
        localStorage.setItem(TOKEN_KEY, token);
        if (!(await checkToken())) throw new Error("token inválido ou sem acesso ao repositório");
        close();
        enableEditMode();
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY);
        errorEl.textContent = err.message || "Falha ao validar o token.";
        errorEl.hidden = false;
      }
    }

    modal.querySelector("#admin-save-token").addEventListener("click", submit);
    tokenInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }

  // ---------- Modo edição ----------
  function enableEditMode() {
    document.querySelectorAll("[data-media-key]").forEach(attachOverlay);
    document.querySelectorAll("[data-content-key]").forEach(attachTextOverlay);
    document.querySelectorAll("[data-edit-section]").forEach(attachSectionOverlay);
    ensureBar();
  }

  function exitEditMode() {
    overlayButtons.forEach((btn) => {
      btn.remove();
      if (btn._position) {
        window.removeEventListener("scroll", btn._position);
        window.removeEventListener("resize", btn._position);
      }
    });
    overlayButtons = [];
    if (editBar) editBar.remove();
    editBar = null;
  }

  function makeOverlayButton(label, onClick, { textBtn = false } = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-edit-btn" + (textBtn ? " text-btn" : "");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);
    overlayButtons.push(btn);

    const position = () => {
      const r = btn._anchor.getBoundingClientRect();
      if (!r.width && !r.height) {
        btn.style.display = "none";
        return;
      }
      btn.style.display = "block";
      btn.style.left = Math.max(8, r.left + 8) + "px";
      btn.style.top = r.bottom + 8 + "px";
    };
    btn._position = position;
    window.addEventListener("scroll", position, { passive: true });
    window.addEventListener("resize", position);
    return btn;
  }

  function attachOverlay(mediaEl) {
    const btn = makeOverlayButton("✎ Alterar", () => openMediaDialog(mediaEl));
    btn._anchor = mediaEl;
    btn._position();
    if (mediaEl._onOver) {
      mediaEl.removeEventListener("mouseenter", mediaEl._onOver);
      mediaEl.removeEventListener("mouseleave", mediaEl._onLeave);
    }
  }

  function attachTextOverlay(el) {
    const btn = makeOverlayButton("✎ Editar", () => {
      if (el.dataset.contentKey === "anuncio") openAnuncioDialog(el);
      else openTextDialog(el);
    }, { textBtn: true });
    btn._anchor = el;
    btn._position();

    // Aparece ao passar o mouse sobre o texto
    el._onOver = () => btn.classList.add("force");
    el._onLeave = () => btn.classList.remove("force");
    el.addEventListener("mouseenter", el._onOver);
    el.addEventListener("mouseleave", el._onLeave);
  }

  function attachSectionOverlay(sectionEl) {
    const type = sectionEl.dataset.editSection;
    const labels = {
      depoimentos: "✎ Editar depoimentos",
      faq: "✎ Editar FAQ",
      "galeria-estrutura": "✎ Editar galeria: Estrutura",
      "galeria-vivencias": "✎ Editar galeria: Vivências",
    };
    const btn = makeOverlayButton(labels[type] || "✎ Editar", () => {
      if (type === "depoimentos") openListDialog("depoimentos");
      else if (type === "faq") openListDialog("faq");
      else if (type === "galeria-estrutura") openGalleryDialog("estrutura");
      else if (type === "galeria-vivencias") openGalleryDialog("vivencias");
    });
    btn._anchor = sectionEl;
    btn._position();
  }

  function ensureBar() {
    if (editBar) return;
    editBar = document.createElement("div");
    editBar.className = "edit-bar";
    editBar.innerHTML = `
      <span>✎ Modo edição ativo</span>
      <button id="edit-settings" class="admin-btn">Configurações</button>
      <button id="edit-exit" class="admin-btn">Sair do modo edição</button>
      <button id="edit-logout" class="admin-btn admin-btn-ghost">Sair</button>`;
    document.body.appendChild(editBar);

    editBar.querySelector("#edit-settings").addEventListener("click", openSettingsDialog);
    editBar.querySelector("#edit-exit").addEventListener("click", exitEditMode);
    editBar.querySelector("#edit-logout").addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    });
  }

  // ---------- Modal genérico ----------
  function openModal(innerHTML) {
    const modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.innerHTML = `<div class="admin-modal-card" role="dialog" aria-modal="true">${innerHTML}</div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    return { modal, close, $: (sel) => modal.querySelector(sel) };
  }

  function modalFeedback($, errorEl, statusEl) {
    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      statusEl.hidden = true;
    };
    const showStatus = (msg) => {
      statusEl.textContent = msg;
      statusEl.hidden = false;
      errorEl.hidden = true;
    };
    return { showError, showStatus };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Diálogo de troca de mídia ----------
  function openMediaDialog(mediaEl) {
    const key = mediaEl.dataset.mediaKey;
    const { modal, close, $ } = openModal(`
      <h3>Alterar: <code>${key}</code></h3>
      <label>Enviar arquivo <small>(imagem ou vídeo)</small>
        <input id="media-file" type="file" accept="image/*,video/*" />
      </label>
      <label>Ou cole um link <small>(use YouTube para vídeos)</small>
        <input id="media-url" type="url" placeholder="https://..." />
      </label>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="media-save-file" class="admin-btn">Enviar arquivo</button>
        <button id="media-save-link" class="admin-btn">Usar link</button>
        <button id="media-reset" class="admin-btn admin-btn-danger">Restaurar padrão</button>
        <button id="media-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);

    $("#media-cancel").addEventListener("click", close);
    const fileInput = $("#media-file");
    const urlInput = $("#media-url");
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));

    async function saveFile() {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        showError("Escolha um arquivo.");
        return;
      }
      try {
        busy(true);
        showStatus("Enviando para o GitHub...");

        const isImage = file.type.startsWith("image/");
        let dataUrl;
        let ext;
        if (isImage) {
          dataUrl = await imageToDataUrl(file);
          ext = "." + (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
        } else {
          if (file.size > MAX_VIDEO_BYTES) {
            showError("Vídeo muito grande (máx. 50 MB). Prefira subir no YouTube e colar o link.");
            return;
          }
          dataUrl = await fileToDataUrl(file);
          ext = "." + (file.name.split(".").pop() || "mp4").toLowerCase();
        }

        const path = `assets/${key}-${Date.now()}${ext}`;
        await uploadToRepo(path, dataUrl.split(",")[1]);

        const map = await getRepoJson(MEDIA_PATH);
        const old = map[key];
        map[key] = path;
        await putRepoJson(MEDIA_PATH, map);

        if (old && !/^https?:/.test(old) && old !== path) {
          await deleteFromRepo(old);
        }

        window.MediaManager?.applyMedia(mediaEl, path);
        showStatus("✓ Trocado! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao enviar: " + (err.message || err));
      }
    }

    async function saveLink() {
      const value = urlInput.value.trim();
      if (!value) {
        showError("Cole um link.");
        return;
      }
      try {
        busy(true);
        showStatus("Salvando no GitHub...");

        const map = await getRepoJson(MEDIA_PATH);
        const old = map[key];
        map[key] = value;
        await putRepoJson(MEDIA_PATH, map);

        if (old && !/^https?:/.test(old)) {
          await deleteFromRepo(old);
        }

        window.MediaManager?.applyMedia(mediaEl, value);
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    async function reset() {
      try {
        busy(true);
        showStatus("Restaurando...");
        const map = await getRepoJson(MEDIA_PATH);
        const old = map[key];
        delete map[key];
        await putRepoJson(MEDIA_PATH, map);
        if (old && !/^https?:/.test(old)) {
          await deleteFromRepo(old);
        }
        location.reload();
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    $("#media-save-file").addEventListener("click", saveFile);
    $("#media-save-link").addEventListener("click", saveLink);
    $("#media-reset").addEventListener("click", reset);
  }

  // ---------- Diálogo de texto ----------
  function openTextDialog(el) {
    const key = el.dataset.contentKey;
    const { modal, close, $ } = openModal(`
      <h3>Editar texto: <code>${key}</code></h3>
      <label>Texto
        <textarea id="text-value" rows="4">${escapeHtml(el.textContent)}</textarea>
      </label>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="text-save" class="admin-btn">Salvar</button>
        <button id="text-reset" class="admin-btn admin-btn-danger">Restaurar padrão</button>
        <button id="text-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);

    const textarea = $("#text-value");
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    $("#text-cancel").addEventListener("click", close);

    async function save() {
      const value = textarea.value.trim();
      if (!value) {
        showError("O texto não pode ficar vazio.");
        return;
      }
      try {
        busy(true);
        showStatus("Salvando no GitHub...");
        const map = await getRepoJson(CONTENT_PATH);
        map.textos = map.textos || {};
        map.textos[key] = value;
        await putRepoJson(CONTENT_PATH, map);
        el.textContent = value;
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    async function reset() {
      try {
        busy(true);
        const map = await getRepoJson(CONTENT_PATH);
        if (map.textos) delete map.textos[key];
        await putRepoJson(CONTENT_PATH, map);
        location.reload();
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    $("#text-save").addEventListener("click", save);
    $("#text-reset").addEventListener("click", reset);
  }

  // ---------- Diálogo do anúncio ----------
  function openAnuncioDialog(el) {
    const { modal, close, $ } = openModal(`
      <h3>Anúncio da página</h3>
      <label>Texto
        <input id="anun-text" type="text" value="${escapeHtml(el.textContent)}" />
      </label>
      <label class="admin-check"><input id="anun-ativo" type="checkbox" ${el.hidden ? "" : "checked"} /> Visível no site</label>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="anun-save" class="admin-btn">Salvar</button>
        <button id="anun-reset" class="admin-btn admin-btn-danger">Restaurar padrão</button>
        <button id="anun-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);

    const textInput = $("#anun-text");
    const ativoInput = $("#anun-ativo");
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    $("#anun-cancel").addEventListener("click", close);

    async function save() {
      const value = textInput.value.trim();
      if (!value) {
        showError("O texto não pode ficar vazio.");
        return;
      }
      try {
        busy(true);
        showStatus("Salvando no GitHub...");
        const map = await getRepoJson(CONTENT_PATH);
        map.anuncio = { texto: value, ativo: ativoInput.checked };
        await putRepoJson(CONTENT_PATH, map);
        el.textContent = value;
        el.hidden = !ativoInput.checked;
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    async function reset() {
      try {
        busy(true);
        const map = await getRepoJson(CONTENT_PATH);
        delete map.anuncio;
        await putRepoJson(CONTENT_PATH, map);
        location.reload();
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    $("#anun-save").addEventListener("click", save);
    $("#anun-reset").addEventListener("click", reset);
  }

  // ---------- Leitores do estado atual (depoimentos / FAQ) ----------
  function currentTestimonials() {
    return $$("#testimonial-track .testimonial").map((a) => ({
      nome: a.querySelector(".testimonial-author strong")?.textContent || "",
      relacao: a.querySelector(".testimonial-author small")?.textContent || "",
      texto: (a.querySelector("p")?.textContent || "").replace(/^“|”$/g, ""),
    }));
  }

  function currentFaq() {
    return $$("#faq-list .faq-item").map((item) => ({
      pergunta: (item.querySelector(".faq-question span")?.textContent || "").trim(),
      resposta: (item.querySelector(".faq-answer p")?.textContent || "").trim(),
    }));
  }

  // ---------- Diálogo de listas (depoimentos / FAQ) ----------
  function openListDialog(type) {
    const isDep = type === "depoimentos";
    const rows = isDep ? currentTestimonials() : currentFaq();
    const titles = { depoimentos: "Editar depoimentos", faq: "Editar perguntas frequentes" };

    const { modal, close, $ } = openModal(`
      <h3>${titles[type]}</h3>
      <div class="admin-list" id="list-rows"></div>
      <button id="list-add" class="admin-btn">+ Adicionar ${isDep ? "depoimento" : "pergunta"}</button>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="list-save" class="admin-btn">Salvar</button>
        <button id="list-reset" class="admin-btn admin-btn-danger">Restaurar padrão</button>
        <button id="list-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);
    modal.querySelector(".admin-modal-card").classList.add("admin-card-wide");

    const listEl = $("#list-rows");
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    $("#list-cancel").addEventListener("click", close);

    function renderRows() {
      listEl.innerHTML = "";
      rows.forEach((row, i) => {
        const item = document.createElement("div");
        item.className = "admin-list-item";
        if (isDep) {
          item.innerHTML = `
            <label>Nome <input class="f-nome" value="${escapeHtml(row.nome)}" placeholder="Avaliações públicas" /></label>
            <label>Relação <input class="f-rel" value="${escapeHtml(row.relacao)}" placeholder="Pais e responsáveis" /></label>
            <label>Texto do depoimento <textarea class="f-texto" rows="3">${escapeHtml(row.texto)}</textarea></label>`;
        } else {
          item.innerHTML = `
            <label>Pergunta <input class="f-pergunta" value="${escapeHtml(row.pergunta)}" /></label>
            <label>Resposta <textarea class="f-resposta" rows="3">${escapeHtml(row.resposta)}</textarea></label>`;
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-btn admin-btn-danger";
        remove.textContent = "Remover";
        remove.addEventListener("click", () => {
          rows.splice(i, 1);
          renderRows();
        });
        item.appendChild(remove);
        listEl.appendChild(item);
      });
    }
    renderRows();

    $("#list-add").addEventListener("click", () => {
      rows.push(isDep ? { nome: "", relacao: "", texto: "" } : { pergunta: "", resposta: "" });
      renderRows();
    });

    async function save() {
      try {
        busy(true);
        const collected = rows.map((_, i) => {
          const item = listEl.children[i];
          if (isDep) {
            return {
              nome: item.querySelector(".f-nome").value.trim() || "Avaliações públicas",
              relacao: item.querySelector(".f-rel").value.trim(),
              texto: item.querySelector(".f-texto").value.trim(),
            };
          }
          return {
            pergunta: item.querySelector(".f-pergunta").value.trim(),
            resposta: item.querySelector(".f-resposta").value.trim(),
          };
        });
        if (collected.some((r) => !r.texto || (isDep ? false : !r.pergunta))) {
          showError("Preencha todos os campos obrigatórios.");
          return;
        }
        showStatus("Salvando no GitHub...");
        const map = await getRepoJson(CONTENT_PATH);
        map[type] = collected;
        await putRepoJson(CONTENT_PATH, map);
        if (isDep) {
          window.renderTestimonials?.(collected.map((d) => ({ name: d.nome, relation: d.relacao, text: d.texto })));
        } else {
          window.renderFaq?.(collected.map((q) => [q.pergunta, q.resposta]));
        }
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    async function reset() {
      try {
        busy(true);
        const map = await getRepoJson(CONTENT_PATH);
        delete map[type];
        await putRepoJson(CONTENT_PATH, map);
        location.reload();
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    $("#list-save").addEventListener("click", save);
    $("#list-reset").addEventListener("click", reset);
  }

  // ---------- Diálogo de galeria ----------
  function openGalleryDialog(galleryKey) {
    const container = document.querySelector(`[data-gallery-key="${galleryKey}"]`);
    if (!container) return;
    const rows = $$("img", container).map((img) => img.getAttribute("src"));
    const isEstrutura = galleryKey === "estrutura";

    const { modal, close, $ } = openModal(`
      <h3>Editar galeria: ${isEstrutura ? "Estrutura" : "Vivências"}</h3>
      <div class="admin-list" id="gal-rows"></div>
      <label>Adicionar fotos <small>(imagens)</small>
        <input id="gal-file" type="file" accept="image/*" multiple />
      </label>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="gal-save" class="admin-btn">Salvar</button>
        <button id="gal-reset" class="admin-btn admin-btn-danger">Restaurar padrão</button>
        <button id="gal-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);
    modal.querySelector(".admin-modal-card").classList.add("admin-card-wide");

    const listEl = $("#gal-rows");
    const fileInput = $("#gal-file");
    const newFiles = [];
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    $("#gal-cancel").addEventListener("click", close);

    fileInput.addEventListener("change", () => {
      for (const file of fileInput.files) newFiles.push(file);
      renderRows();
    });

    function renderRows() {
      listEl.innerHTML = "";
      rows.forEach((src, i) => {
        const item = document.createElement("div");
        item.className = "admin-gallery-row";
        item.innerHTML = `<img src="${escapeHtml(src)}" alt="" /><span>${escapeHtml(src.split("/").pop())}</span>`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-btn admin-btn-danger";
        remove.textContent = "Remover";
        remove.addEventListener("click", () => {
          rows.splice(i, 1);
          renderRows();
        });
        item.appendChild(remove);
        listEl.appendChild(item);
      });
      newFiles.forEach((file, i) => {
        const item = document.createElement("div");
        item.className = "admin-gallery-row";
        item.innerHTML = `<span class="gal-new">➕ ${escapeHtml(file.name)}</span>`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-btn admin-btn-danger";
        remove.textContent = "Remover";
        remove.addEventListener("click", () => {
          newFiles.splice(i, 1);
          renderRows();
        });
        item.appendChild(remove);
        listEl.appendChild(item);
      });
    }
    renderRows();

    async function save() {
      try {
        busy(true);
        showStatus("Enviando para o GitHub...");
        const uploaded = [];
        for (let i = 0; i < newFiles.length; i += 1) {
          const file = newFiles[i];
          const dataUrl = await imageToDataUrl(file);
          const ext = "." + (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
          const path = `assets/${galleryKey}-gal-${Date.now()}-${i}${ext}`;
          await uploadToRepo(path, dataUrl.split(",")[1]);
          uploaded.push(path);
        }
        const final = [...rows, ...uploaded];
        const map = await getRepoJson(CONTENT_PATH);
        map.galerias = map.galerias || {};
        map.galerias[galleryKey] = final;
        await putRepoJson(CONTENT_PATH, map);
        window.ContentManager?.renderGallery(galleryKey, final);
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    async function reset() {
      try {
        busy(true);
        const map = await getRepoJson(CONTENT_PATH);
        if (map.galerias) delete map.galerias[galleryKey];
        await putRepoJson(CONTENT_PATH, map);
        location.reload();
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    $("#gal-save").addEventListener("click", save);
    $("#gal-reset").addEventListener("click", reset);
  }

  // ---------- Configurações (Google Analytics) ----------
  function openSettingsDialog() {
    const { modal, close, $ } = openModal(`
      <h3>Configurações</h3>
      <label>Google Analytics <small>ID de acompanhamento, ex.: G-XXXXXXXXXX</small>
        <input id="cfg-ga" type="text" placeholder="G-XXXXXXXXXX" />
      </label>
      <p class="admin-error" hidden></p>
      <p class="admin-status" hidden></p>
      <div class="admin-modal-actions">
        <button id="cfg-save" class="admin-btn">Salvar</button>
        <button id="cfg-cancel" class="admin-btn admin-btn-ghost">Fechar</button>
      </div>`);

    const input = $("#cfg-ga");
    const { showError, showStatus } = modalFeedback($, $(".admin-error"), $(".admin-status"));
    const busy = (on) => modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    $("#cfg-cancel").addEventListener("click", close);

    getRepoJson(CONTENT_PATH)
      .then((map) => {
        input.value = map.analytics_id || "";
      })
      .catch(() => {});

    async function save() {
      const value = input.value.trim();
      try {
        busy(true);
        showStatus("Salvando no GitHub...");
        const map = await getRepoJson(CONTENT_PATH);
        if (value) map.analytics_id = value;
        else delete map.analytics_id;
        await putRepoJson(CONTENT_PATH, map);
        showStatus("✓ Salvo! A atualização fica visível para todos em ~1 minuto.");
        busy(false);
      } catch (err) {
        busy(false);
        showError("Falha ao salvar: " + (err.message || err));
      }
    }

    $("#cfg-save").addEventListener("click", save);
  }

  // ---------- Leitura de arquivos ----------
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
      reader.readAsDataURL(file);
    });
  }

  // Redimensiona a imagem no cliente (máx. 1920px) para o site ficar leve.
  async function imageToDataUrl(file) {
    if (!file.type.startsWith("image/")) throw new Error("não é imagem");
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("imagem inválida"));
      i.src = URL.createObjectURL(file);
    });

    const MAX = 1920;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > MAX || h > MAX) {
      const scale = Math.min(MAX / w, MAX / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    let dataUrl = canvas.toDataURL(mime, 0.85);
    if (mime === "image/png" && dataUrl.length > 3_500_000) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }
    return dataUrl;
  }

  // ---------- Sessão existente ----------
  if (getToken()) enableEditMode();
})();
