# Pacote de conteúdo e i18n do MiniApp Painel de Controles

> Atualizado em 2025-01-15 · Responsável: Marina Duarte (Conteúdo & Localização) · Referência: alinhamento com o checklist rígido e com o manual de novo idioma.

## 1. Vocabulário aprovado
- **Painel de Controles** — módulo obrigatório que unifica sessão, sincronização e backups do tenant.
- **Sync** — integração de sincronização em tempo real entre dispositivos Marco.
- **Backup automático** — cópia periódica dos dados operacionais em repositório seguro.
- **Sessão auditável** — registro completo das ações do operador, incluindo mudanças de idioma e exportações.

## 2. Estrutura das chaves i18n
```json
{
  "miniapp": {
    "painel": {
      "card": {
        "title": {
          "pt-BR": "Painel de Controles",
          "en-US": "Control Panel",
          "es-ES": "Panel de Controles"
        },
        "subtitle": {
          "pt-BR": "Sessão, sincronização e backups monitorados em tempo real.",
          "en-US": "Session, synchronization and backups monitored in real time.",
          "es-ES": "Sesión, sincronización y copias de seguridad monitoradas en tiempo real."
        },
        "cta": {
          "pt-BR": "Abrir painel de controles",
          "en-US": "Open control panel",
          "es-ES": "Abrir panel de controles"
        }
      },
      "badges": {
        "system": {
          "pt-BR": "Sistema",
          "en-US": "System",
          "es-ES": "Sistema"
        },
        "sync": {
          "pt-BR": "Sync",
          "en-US": "Sync",
          "es-ES": "Sync"
        }
      },
      "panel": {
        "meta": {
          "pt-BR": "Visão consolidada do painel de controles com integrações essenciais.",
          "en-US": "Consolidated control panel view with essential integrations.",
          "es-ES": "Vista consolidada del panel de controles con integraciones esenciales."
        }
      },
      "marketplace": {
        "title": {
          "pt-BR": "Painel de Controles",
          "en-US": "Control Panel",
          "es-ES": "Panel de Controles"
        },
        "description": {
          "pt-BR": "Sessão, sincronização e backups monitorados em tempo real.",
          "en-US": "Session, synchronization and backups monitored in real time.",
          "es-ES": "Sesión, sincronización y copias de seguridad monitoradas en tiempo real."
        },
        "capabilities": {
          "sync": {
            "pt-BR": "Sync em tempo real",
            "en-US": "Real-time sync",
            "es-ES": "Sync en tiempo real"
          },
          "backup": {
            "pt-BR": "Backup automático",
            "en-US": "Automatic backup",
            "es-ES": "Copia de seguridad automática"
          },
          "session": {
            "pt-BR": "Sessão auditável",
            "en-US": "Auditable session",
            "es-ES": "Sesión auditable"
          }
        }
      }
    }
  }
}
```

## 3. Regras de localização
- Trate "Sync" como nome próprio da capacidade homologada; mantenha sem tradução literal.
- Mensagens auditáveis devem priorizar verbos no imperativo para orientar operadores ("Ative", "Revise").
- Placeholder dinâmico `{{locale}}` usado no histórico deve manter nomes públicos definidos pelo AppBaseI18n.
- Em futuras expansões de idioma, copiar esta estrutura e preencher integralmente os valores antes de acionar a automação.

## 4. Pendências de conteúdo
- Nenhuma pendência aberta. Próxima revisão ocorrerá após integração com dados reais do serviço de auditoria.
