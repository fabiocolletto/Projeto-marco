# Sistema Operacional Marco

Este repositório contém uma única página HTML (`index.html`) que materializa o conceito do Sistema Operacional Marco descrito nos esboços fornecidos. A interface reproduz a **tela principal** com o painel unificado e dois mini-apps navegáveis diretamente no mesmo arquivo.

## Como usar

1. Abra `index.html` em qualquer navegador moderno.
2. A tela inicial apresenta o painel principal com KPIs e cartões de destaque.
3. Utilize os botões ou cartões de mini-apps para navegar entre:
   - **Mini-app • Painel de Operações**
   - **Mini-app • Gestor de Tarefas**
4. Clique em “Voltar para a tela principal” para retornar ao painel inicial.

Toda a navegação e o estilo estão contidos no próprio HTML, dispensando build tools ou dependências externas.

## Estrutura

```
.
├── README.md
├── agent.md
└── index.html
```

- `index.html`: implementa o layout completo, estilos, interações e conteúdo base.
- `agent.md`: instruções institucionais preservadas para referência futura.

## Próximos passos

A página foi planejada para receber expansões incrementais no mesmo padrão visual. Novos mini-apps ou componentes podem ser adicionados criando novas seções e conectando-as aos cartões existentes ou a novos pontos de navegação.
