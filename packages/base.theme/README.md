# Base Theme Tokens

Este pacote define o conjunto de tokens compartilhados utilizado pelos miniapps.
Os valores foram atualizados para um design *mobile-first*, com tipografia fluida
(`clamp`), espaçamentos responsivos e suporte nativo a `safe-area`.

## Tokens principais (`theme.css`)

| Categoria | Variáveis | Notas |
| --- | --- | --- |
| Tipografia | `--font-family`, `--font-size-base`, `--font-size-sm`, `--font-size-lg`, `--line-height-base` | Escalam entre celulares compactos e tablets. |
| Espaçamento | `--space-3xs` … `--space-xl` | Utilizados para margens, *gaps* e *padding* fluidos. |
| Raios | `--radius-sm`, `--radius-md`, `--radius-lg` | Mantêm cartões com cantos arredondados consistentes. |
| Sombra | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Ajustados para gerar profundidade suave em telas de toque. |
| Cores | `--color-surface`, `--color-surface-muted`, `--color-surface-raised`, `--color-border`, `--color-border-strong`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-soft`, `--color-accent-contrast` | Inclui pares claros/escuros e contraste adequado. |
| Safe area | `--safe-area-top`, `--safe-area-right`, `--safe-area-bottom`, `--safe-area-left` | Leitura direta das variáveis `env()` suportadas por iOS/Android. |
| Transições | `--transition-default`, `--transition-emphasis` | Respeitam `prefers-reduced-motion`. |

## Como usar

1. **Importe o tema** com `@import url('../../packages/base.theme/theme.css');`
   na folha específica do miniapp (como `miniapps/base_shell/styles.css`).
2. **Consuma apenas tokens** nas folhas locais. Quando precisar de um novo
   espaçamento, cor ou raio, declare primeiro no tema e só depois utilize.
3. **Lembre do modo escuro:** ao definir novas cores, ofereça equivalentes
   dentro do seletor `[data-theme='dark']`.
4. **Safe areas e `dvh`:** combine `var(--safe-area-*)` com unidades dinâmicas
   (`dvh`, `dvw`) para evitar recortes por *notches* ou barras de gesto.
5. **Acessibilidade:** mantenha foco visível, respeite `prefers-reduced-motion`
   e valide contraste mínimo (WCAG AA) para novos pares de cores.

Documentar mudanças nos tokens ajuda outras equipes a manter consistência no
visual e simplifica auditorias de design exigidas por Apple App Store e Google
Play.
