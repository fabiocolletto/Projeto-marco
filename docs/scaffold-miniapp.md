# Scaffold oficial de MiniApps

## Gerando um novo MiniApp

Execute o comando abaixo informando o nome desejado:

```bash
npm run create:miniapp MeuMiniApp -- --admin=false --visible=true
```

Argumentos opcionais:

- `--admin=true|false` — define se o MiniApp é exclusivo de administradores (`adminOnly`).
- `--visible=true|false` — controla a visibilidade inicial no catálogo.

O comando cria a estrutura em `miniapps/<Nome>/` com:

- `index.html`
- `main.js`
- `manifest.json`
- `i18n/pt-br.json`, `i18n/en-us.json`, `i18n/es-419.json`

## Manifesto

O `manifest.json` segue o formato:

```json
{
  "id": "miniapp-slug",
  "name": "Nome legível",
  "version": "0.1.0",
  "adminOnly": false,
  "visible": true
}
```

O script gera automaticamente `id` (kebab-case) e `name` (title case) a partir do nome informado.

## Registro automático

Após gerar os arquivos, o CLI atualiza `miniapps/registry.json` garantindo a ordenação alfabética pela propriedade `name`. Se já existir uma entrada com o mesmo `id`, a execução é abortada para evitar colisões.

Os arquivos de tradução gerados contêm as chaves `title`, `description` e `actions` prontas para edição.
