# Pacote de conteúdo e i18n do MiniApp Boas-vindas

> Atualizado em 2025-01-16 · Responsável: Marina Duarte (Conteúdo & Localização).

## 1. Vocabulário aprovado
- **Boas-vindas Marco** — cartão demonstrativo que apresenta o AppBase Base.
- **Painel principal** — remete ao painel de cadastro reutilizado pelo módulo `painel-controles`.
- **Pronto para montar** — comunica que o host está pronto para receber MiniApps reais seguindo os manuais.

## 2. Estrutura das chaves i18n
```json
{
  "miniapp": {
    "boas_vindas": {
      "card": {
        "title": {
          "pt-BR": "Boas-vindas Marco",
          "en-US": "Marco Welcome",
          "es-ES": "Bienvenida Marco"
        },
        "subtitle": {
          "pt-BR": "Teste o fluxo completo com o painel oficial habilitado.",
          "en-US": "Exercise the full flow with the official panel enabled.",
          "es-ES": "Pruebe el flujo completo con el panel oficial habilitado."
        },
        "cta": {
          "pt-BR": "Abrir painel principal",
          "en-US": "Open main panel",
          "es-ES": "Abrir panel principal"
        }
      },
      "badges": {
        "demo": {
          "pt-BR": "Demo",
          "en-US": "Demo",
          "es-ES": "Demo"
        },
        "ready": {
          "pt-BR": "Pronto",
          "en-US": "Ready",
          "es-ES": "Listo"
        }
      },
      "panel": {
        "meta": {
          "pt-BR": "MiniApp de demonstração que reutiliza o painel oficial.",
          "en-US": "Demo MiniApp that reuses the official panel.",
          "es-ES": "MiniApp de demostración que reutiliza el panel oficial."
        }
      },
      "marketplace": {
        "title": {
          "pt-BR": "Boas-vindas Marco",
          "en-US": "Marco Welcome",
          "es-ES": "Bienvenida Marco"
        },
        "description": {
          "pt-BR": "Cartão de validação para garantir que o host está pronto para novos MiniApps.",
          "en-US": "Validation card that ensures the host is ready for new MiniApps.",
          "es-ES": "Tarjeta de validación que garantiza que el host está listo para nuevos MiniApps."
        },
        "capabilities": {
          "demo": {
            "pt-BR": "Fluxo demo",
            "en-US": "Demo flow",
            "es-ES": "Flujo demo"
          },
          "panel": {
            "pt-BR": "Painel compartilhado",
            "en-US": "Shared panel",
            "es-ES": "Panel compartido"
          },
          "docs": {
            "pt-BR": "Documentação completa",
            "en-US": "Complete documentation",
            "es-ES": "Documentación completa"
          }
        }
      }
    }
  }
}
```

## 3. Regras de localização
- Todas as menções ao painel devem permanecer como "painel" nas três línguas, evitando traduções alternativas como "dashboard".
- Use termos curtos para badges (máximo 6 caracteres) garantindo que cabem no cartão `.minicard`.
- Em futuras adições de idioma, manter a estrutura acima exatamente e validar com o serviço automatizado de novo idioma.

## 4. Pendências de conteúdo
- Nenhuma. O cartão serve apenas para fins de demonstração interna.
