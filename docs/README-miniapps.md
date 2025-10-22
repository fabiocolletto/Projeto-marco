# Contrato de MiniApps (R1)

- Entregar: `manifest.json`, `i18n-snippet.json`, `app.html` (**sem CSS próprio**).
- Namespace i18n: `miniapps.<id>.*`.
- Idiomas: `pt-br`, `en-us`, `es-419`.
- CSS do MiniApp: PROIBIDO. Usar somente utilitários/componentes do AppBase (.u-*, .c-*) e tokens var(--ac-*).
- MiniApps que gravam dados dependem de sessão Supabase autenticada iniciada no AppBase.
