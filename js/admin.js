// Modo edição do administrador — troca imagens/vídeos direto pelo GitHub,
// sem banco de dados. As trocas são salvas em assets/media.json e publicadas
// no GitHub Pages (o site atualiza sozinho em ~1 minuto).
//
// Invisível para visitantes:
// - Login: 5 cliques no logo → cole seu token do GitHub.
// - O token fica salvo apenas neste navegador (localStorage).
// - Os botões só são criados em memória quando o token existe.
(() => {
  const REPO = "geovane-maia/escola_menezes";
  const BRANCH = "main";
  const MEDIA_PATH = "assets/media.json";
  const TOKEN_KEY = "escola_admin_token";
  const TRIGGER_CLICKS = 5;
  const TRIGGER_WINDOW_MS = 4000;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // limite do GitHub

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

  async function getMediaMap() {
    try {
      const data = await gh(MEDIA_PATH);
      return base64ToJson(data.content);
    } catch {
      return {}; // arquivo ainda não existe
    }
  }

  async function saveMediaMap(map) {
    const existing = await gh(MEDIA_PATH).catch(() => null);
    await gh(MEDIA_PATH, {
      method: "PUT",
      body: {
        message: "Atualizar mídias do site",
        content: jsonToBase64(map),
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

  function attachOverlay(mediaEl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-edit-btn";
    btn.title = "Alterar: " + mediaEl.dataset.mediaKey;
    btn.textContent = "✎ Alterar";
    btn.addEventListener("click", () => openMediaDialog(mediaEl));
    document.body.appendChild(btn);
    overlayButtons.push(btn);

    const position = () => {
      const r = mediaEl.getBoundingClientRect();
      if (!r.width && !r.height) {
        btn.style.display = "none";
        return;
      }
      btn.style.display = "block";
      // Botão logo ABAIXO da imagem/vídeo
      btn.style.left = Math.max(8, r.left + 8) + "px";
      btn.style.top = r.bottom + 8 + "px";
    };
    btn._position = position;
    position();
    window.addEventListener("scroll", position, { passive: true });
    window.addEventListener("resize", position);
  }

  function ensureBar() {
    if (editBar) return;
    editBar = document.createElement("div");
    editBar.className = "edit-bar";
    editBar.innerHTML = `
      <span>✎ Modo edição ativo</span>
      <button id="edit-exit" class="admin-btn">Sair do modo edição</button>
      <button id="edit-logout" class="admin-btn admin-btn-ghost">Sair</button>`;
    document.body.appendChild(editBar);

    editBar.querySelector("#edit-exit").addEventListener("click", exitEditMode);
    editBar.querySelector("#edit-logout").addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    });
  }

  // ---------- Diálogo de troca de mídia ----------
  function openMediaDialog(mediaEl) {
    const key = mediaEl.dataset.mediaKey;
    const modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.innerHTML = `
      <div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Alterar mídia">
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
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector("#media-cancel").addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    const fileInput = modal.querySelector("#media-file");
    const urlInput = modal.querySelector("#media-url");
    const errorEl = modal.querySelector(".admin-error");
    const statusEl = modal.querySelector(".admin-status");
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
    const busy = (on) => {
      modal.querySelectorAll("button").forEach((b) => (b.disabled = on));
    };

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

        const map = await getMediaMap();
        const old = map[key];
        map[key] = path;
        await saveMediaMap(map);

        if (old && !/^https?:/.test(old) && old !== path) {
          await deleteFromRepo(old); // sem backup, como combinado
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

        const map = await getMediaMap();
        const old = map[key];
        map[key] = value;
        await saveMediaMap(map);

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
        const map = await getMediaMap();
        const old = map[key];
        delete map[key];
        await saveMediaMap(map);
        if (old && !/^https?:/.test(old)) {
          await deleteFromRepo(old);
        }
        location.reload(); // volta aos assets originais
      } catch (err) {
        busy(false);
        showError("Falha ao restaurar: " + (err.message || err));
      }
    }

    modal.querySelector("#media-save-file").addEventListener("click", saveFile);
    modal.querySelector("#media-save-link").addEventListener("click", saveLink);
    modal.querySelector("#media-reset").addEventListener("click", reset);
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
      dataUrl = canvas.toDataURL("image/jpeg", 0.85); // PNG pesado demais → JPEG
    }
    return dataUrl;
  }

  // ---------- Sessão existente ----------
  if (getToken()) enableEditMode();
})();
