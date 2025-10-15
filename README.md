# AppBase v3.0 • Clean

Este repositório foi reiniciado para hospedar exclusivamente a variante **Clean**
do AppBase Marco. O objetivo é oferecer um shell mobile-first com login local e
integração mínima com o serviço de billing Mercado Pago.

## Estrutura

```
appbase/
  app.css          # tokens e layout responsivo (grid de 12 colunas)
  app.js           # lógica do shell Clean (login, overlay desktop, billing)
  index.html       # ponto de entrada da aplicação
  config/
    app.config.json
  modules/
    licensing.js   # wrappers para subscribe/validate no worker
    users.js       # persistência local (localStorage)
```

## Executando localmente

Como se trata de uma aplicação estática, basta servir o diretório raiz em um
servidor HTTP simples:

```bash
npx serve .
# ou qualquer alternativa, como: python -m http.server
```

Em seguida acesse `http://localhost:3000/appbase/` (ajuste a porta conforme o
servidor escolhido).

## Fluxo principal

1. O usuário informa um e-mail e realiza login local (persistido em
   `localStorage`).
2. Com o login ativo, é possível acionar:
   - **Assinar PRO** (`POST /subscribe` no worker).
   - **Ver planos (API)** (`GET /plans`).
   - **Validar agora** (`GET /license/validate`).
3. Em telas desktop é exibido um overlay bloqueando a interação, reforçando o
   modo mobile-only configurado em `app.config.json`.

## Testes

No momento não há suíte automatizada. Recomenda-se validar manualmente em uma
viewport mobile (largura ≤ 800 px) para conferir os fluxos de login e billing.
