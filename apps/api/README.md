# @marco/api

Serviço backend responsável por receber snapshots cifrados dos mini-apps, propagar o conteúdo para os provedores Google Drive e Microsoft OneDrive e expor APIs REST e GraphQL para consumo pelo front-end.

## Conceitos

- **Snapshot cifrado** – resultado da criptografia AES-GCM aplicada no payload do evento a partir de uma chave derivada via PBKDF2 (telefone + senha).
- **Provider** – camada de integração com Google ou Microsoft responsável por persistir o arquivo no `appDataFolder` / `App Folder` utilizando os tokens de acesso do usuário.
- **Store** – armazenamento interno de snapshots e metadados, garantindo versionamento, idempotência e auditoria simples.

## Rotas REST

- `PUT /api/providers/:provider/token` – registra ou atualiza os tokens do provedor.
- `POST /api/snapshots` – cria/atualiza um snapshot cifrado e o propaga para o provedor configurado.
- `GET /api/snapshots/:provider/:projectId` – recupera o snapshot mais recente.

## Endpoint GraphQL

Disponível em `/graphql`, com os tipos `Snapshot`, `SnapshotMeta` e operações:

- `snapshot(provider, projectId)` – consulta único snapshot.
- `snapshots(provider)` – lista snapshots disponíveis.
- `pushSnapshot(input)` – cria ou atualiza um snapshot.

O schema GraphQL compartilha a mesma camada de domínio utilizada pelas rotas REST, facilitando a evolução de contratos.

## Execução

```bash
npm install
npm --workspace @marco/api run dev
```

O serviço utiliza `tsx` durante o desenvolvimento e `tsc` para gerar artefatos de produção (`dist/`).
