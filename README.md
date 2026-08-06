# Colégio Menezes e Sousa

Site institucional estático do Colégio Menezes e Sousa.

## Estrutura

- `index.html` — página principal.
- `assets/` — logos, fotos e vídeos da escola.
- `css/` — estilos do site.
- `js/` — interações, cursos, FAQ, galeria e formulário.
- `favicon.png` — ícone do site.

## Como visualizar localmente

Abra o `index.html` no navegador ou use uma extensão como Live Server no VS Code.

## Publicar no GitHub Pages

1. Envie o conteúdo deste diretório para a raiz do repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Source**, selecione **Deploy from a branch**.
4. Selecione a branch `main` e a pasta `/(root)`.
5. Clique em **Save** e aguarde a execução de **pages build and deployment**.

O arquivo `index.html` precisa permanecer na raiz do repositório. A pasta `backup/` é apenas uma cópia local e está configurada no `.gitignore`.

## Observações

- O formulário encaminha os dados preenchidos para o WhatsApp da escola.
- Os vídeos estão em `assets/videos/`.
- As imagens de aprovação usam nomes organizados por aluno e resultado.
