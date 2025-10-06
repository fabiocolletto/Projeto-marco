# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.0 consolida o shell completo com AppBar,
rail de etiquetas, palco central e miniapps carregados por vanilla JS dentro da
pasta `appbase/`, seguindo as diretrizes do blueprint visual.

## Estrutura do repositório

```
.
├── appbase/
│   ├── index.html            # Shell do AppBase + MiniApp “Painel de controle”
│   ├── app.css               # Tokens `--ac-*`, grid responsivo e overlays
│   └── app.js                # Controle do painel, cadastro local e interações vanilla
├── assets/                   # Logos e imagens utilizadas pelo protótipo
├── index.html                # Redirecionamento (GitHub Pages)
├── src/                      # Versão anterior do protótipo modular
├── MARCO_BLUEPRINT.md        # Blueprint consolidado do AppBase
├── README.md                 # Este documento
└── agent.md                  # Diretrizes operacionais para contribuições
```

A pasta `src/` preserva o protótipo modular utilizado nas primeiras iterações.
A pasta `appbase/` concentra a implementação atual do shell R1.0 com o novo
MiniApp “Painel de controle”.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Para consultar a versão legada modular, abra `src/index.html` diretamente.
3. Ao abrir, o palco permanece vazio até que um usuário seja cadastrado. Use o
   botão “Começar cadastro” ou clique na etiqueta “Painel de controle” para
   abrir o formulário de Login.
4. Os dados cadastrados são guardados apenas no `localStorage` do navegador. Ao
   salvar, o painel é exibido com o nome, a conta derivada do e-mail e a data do
   último acesso, e essas informações permanecem disponíveis em visitas
   futuras.
5. Utilize o botão ⋯ da etiqueta para recolher/exibir o painel quando houver um
   cadastro ativo. O overlay de Login pode ser reaberto para editar o usuário a
   qualquer momento.

## MiniApp “Painel de controle” — destaques

- **Etiqueta simplificada** exibe o primeiro nome cadastrado, o último acesso e
  o status (vermelho quando vazio, verde quando configurado), mantendo o rail
  coerente com o palco.
- **Palco dedicado ao Login**, com tile único que mostra nome completo, conta e
  horário do último acesso. O botão ⋯ recolhe/exibe o painel sem perder o
  cadastro.
- **Overlay de Login acessível** (`role="dialog"`, `aria-modal`, foco gerenciado
  e fechamento por Esc/backdrop) com feedback imediato de sucesso ou erro ao
  salvar.
- **Persistência local leve**: os dados são gravados no `localStorage`,
  reaplicados automaticamente na próxima visita e podem ser editados a qualquer
  momento sem dependências de sync/backup.

## Próximos passos sugeridos

- Reintroduzir gradualmente os módulos de sincronização, backup e eventos a
  partir deste núcleo enxuto, validando compatibilidade antes de expandir o
  escopo.
- Avaliar a integração com um backend real de autenticação quando o fluxo de
  cadastro estiver validado com usuários.
- Ampliar a suíte de testes end-to-end cobrindo cenários de edição contínua,
  múltiplos cadastros e comportamento em navegadores móveis.
