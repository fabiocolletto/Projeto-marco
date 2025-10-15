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

## Automação e QA

- Elementos críticos do shell possuem atributos `data-testid` (por exemplo,
  `data-testid="login-button"`), facilitando a criação de seletores estáveis em
  testes end-to-end.
- Ao escrever testes, prefira esses identificadores dedicados em vez de textos
  visíveis para evitar falhas por colisão de conteúdo.

## Testes

Uma suíte Playwright garante os fluxos principais em viewport mobile. Antes de
rodar os testes, instale as dependências e os navegadores necessários:

```bash
npm install
npx playwright install --with-deps
```

Em seguida execute:

```bash
npm run test:e2e
```

Os testes utilizam os atributos `data-testid` do shell e fazem mock das
requisições de validação de licença para evitar chamadas externas.
