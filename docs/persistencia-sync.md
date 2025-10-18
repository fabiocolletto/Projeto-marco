# Persistência e Sync

## Escolhendo o driver de armazenamento

Defina a variável `STORAGE_DRIVER` para alternar entre os drivers disponíveis:

- `indexeddb` *(padrão)* — utiliza IndexedDB com persistência offline completa.
- `memory` — mantém os dados apenas em memória volátil, útil para testes.

Exemplo em ambiente de desenvolvimento:

```bash
STORAGE_DRIVER=memory npm run dev
```

## Exportando e importando backups

Use os scripts utilitários para gerar ou restaurar um backup JSON humanamente legível:

- `npm run backup:export [caminho/opcional]` — cria um arquivo `.json` com perfis, configurações e telemetria.
- `npm run backup:import <arquivo.json> -- --merge=keep-newer|overwrite` — importa um backup escolhendo a estratégia de merge.

A estratégia `keep-newer` (padrão) mantém dados locais mais recentes comparando o campo `updatedAt`/`ts`; `overwrite` substitui tudo pelo conteúdo do arquivo.

## Providers de sincronização

Defina `SYNC_PROVIDER` para ativar os stubs de sincronização:

- `none` *(padrão)* — sincronização desativada.
- `drive` — utiliza o stub do Google Drive (localStorage `sync:drive`).
- `onedrive` — utiliza o stub do OneDrive (localStorage `sync:onedrive`).

```bash
SYNC_PROVIDER=drive npm start
```

Os stubs gravam em `localStorage` e retornam revisões incrementais para facilitar a futura integração com APIs reais.
