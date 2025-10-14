# Pacote de conteúdo e i18n do MiniApp gestor-tarefas

## 1. Vocabulário aprovado
- "Gestor de tarefas" (pt-BR) / "Task manager" (en-US) / "Gestor de tareas" (es-ES).
- Estados: Pendente, Em andamento, Bloqueada, Concluída (pt-BR) — equivalentes diretos em en-US/es-ES.
- Mensagens destacam ação concreta: adicionar, atualizar status, remover.

## 2. Estrutura das chaves i18n
```json
{
  "miniapp": {
    "gestor_tarefas": {
      "card": {
        "title": "…",
        "subtitle": "…",
        "cta": "…"
      },
      "badges": {
        "beta": "…"
      },
      "panel": {
        "meta": "…"
      },
      "marketplace": {
        "title": "…",
        "description": "…",
        "capabilities": {
          "create": "…",
          "deadlines": "…",
          "summary": "…"
        }
      },
      "ui": {
        "header": {
          "title": "…",
          "subtitle": "…",
          "badge": "…",
          "note": "…"
        },
        "summary": {
          "metrics": "…",
          "empty": "…"
        },
        "form": {
          "title": "…",
          "titlePlaceholder": "…",
          "dueDate": "…",
          "status": "…",
          "submit": "…",
          "feedback": {
            "created": "…",
            "updated": "…",
            "deleted": "…",
            "validation": "…"
          }
        },
        "table": {
          "title": "…",
          "note": "…",
          "caption": "…",
          "columns": {
            "task": "…",
            "dueDate": "…",
            "status": "…",
            "actions": "…"
          },
          "empty": "…",
          "noDueDate": "…",
          "dueToday": "…",
          "delete": "…",
          "deleteAria": "…",
          "statusAria": "…"
        },
        "loading": "…"
      },
      "statuses": {
        "pending": "…",
        "in_progress": "…",
        "blocked": "…",
        "done": "…",
        "overdue": "…",
        "due_today": "…"
      }
    }
  }
}
```

## 3. Regras de localização
- Usar frase única para feedbacks, sempre com o título interpolado entre aspas.
- Status deve ser traduzido como substantivo feminino para manter concordância com "tarefa".
- Evitar abreviações; palavras completas facilitam leitura no painel e acessibilidade.

## 4. Pendências de conteúdo
- Nenhuma. Conteúdo inicial aprovado para os três idiomas base.
