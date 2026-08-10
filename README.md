# Colégio Menezes e Sousa

Site institucional do Colégio Menezes e Sousa (landing page) com **modo edição para o administrador** trocar imagens e vídeos por botões — invisível para visitantes. Tudo funciona **sem banco de dados**: as trocas vão direto para o repositório GitHub e o GitHub Pages publica.

## Como funciona o modo edição

1. **Login escondido:** clique **5 vezes** no logo da escola (no cabeçalho).
2. Cole seu **token do GitHub** (criado uma vez, fica salvo só no seu navegador).
3. Aparece a barra **"Modo edição ativo"** e um botão **✎ Alterar** logo abaixo de cada imagem/vídeo.
4. **Enviar arquivo** (abre sua galeria) ou **colar um link** (use **YouTube** para vídeos).
5. **Restaurar padrão** volta ao arquivo original do site.

Após cada troca, o GitHub Pages republica o site — a atualização fica visível para todos em **~1 minuto**.

Os botões são criados por JS **somente quando o token do admin está salvo** — visitantes não veem nada.

### Criando o token do GitHub (uma vez)

1. GitHub → **Settings** (foto do perfil) → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Em **Repository access**: *Only select repositories* → escolha `escola_menezes`.
3. Em **Permissions → Contents**: marque **Read and write**.
4. Gere o token (ex.: `github_pat_...`) e cole na tela de login do site.

⚠️ O token dá acesso de escrita só a este repositório. Se suspeitar de vazamento, revogue-o no GitHub (o site volta a pedir um novo).

## Como as trocas são armazenadas

- Arquivos enviados vão para `assets/<chave>-<timestamp>.<ext>` no repositório.
- Mídias: **`assets/media.json`** (ex.: `{ "hero_image": "assets/hero_image-123.jpg" }`) — aplicado por `js/media.js`.
- Conteúdo: **`assets/content.json`** — aplicado por `js/content.js`. Suporta:
  - `anuncio` — texto + visível/oculto do banner "Matrículas abertas" (faixa vermelha no topo).
  - `textos` — títulos e textos de seções (ex.: `{ "hero_titulo": "..." }`).
  - `depoimentos` — lista `[{ nome, relacao, texto }]`.
  - `faq` — lista `[{ pergunta, resposta }]`.
  - `galerias` — `{ estrutura: [...], vivencias: [...] }` (galerias dinâmicas).
- Sem entradas nos JSON, o site usa o conteúdo padrão do HTML/JS.
- Trocas **substituem** sem manter backup (o arquivo antigo é removido do repositório).

## O que o modo edição permite

- **Mídias:** trocar qualquer imagem/vídeo (arquivo ou link do YouTube).
- **Textos:** clicar ✎ sobre um título/texto (aparece ao passar o mouse) e editar.
- **Anúncio:** editar o banner "Matrículas abertas" (faixa vermelha no topo) e ligar/desligar.
- **Depoimentos e FAQ:** editar a lista completa (adicionar/remover/alterar).
- **Galerias (Estrutura e Vivências):** adicionar/remover várias fotos.

## Estrutura

- `index.html` — página principal (cada mídia tem `data-media-key`).
- `assets/` — imagens/vídeos originais + `media.json` (trocas).
- `css/` — estilos; `css/admin.css` tem o visual do modo edição e dos embeds de vídeo.
- `js/` — `js/media.js` (aplica as trocas) e `js/admin.js` (modo edição).

## Publicar

O repositório é publicado no **GitHub Pages** a partir da branch `main` (Settings → Pages → Deploy from a branch → `main`, pasta `/`). Qualquer alteração feita pelo modo edição também é publicada automaticamente.
