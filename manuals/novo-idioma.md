# Manual rígido de instalação de novo idioma

> **Este procedimento é obrigatório e deve ser executado exatamente como descrito.**
> Toda automação deve seguir esta sequência sem adaptações. A única intervenção
> humana permitida é a revisão e o merge do Pull Request gerado após a execução.

## Objetivo

Padronizar a inclusão de um novo idioma no AppBase e em **todos** os MiniApps do
Projeto Marco, garantindo consistência total das traduções e disponibilidade
imediata para qualquer usuário. O AppBase e cada MiniApp sempre mantêm os
idiomas base (`pt-BR`, `en-US`, `es-ES`) e passam a oferecer todos os idiomas
adicionais aprovados.

## Entradas obrigatórias

1. **Código do idioma** no padrão BCP 47 (ex.: `it-IT`, `de-DE`).
2. **Nome público** para o menu (ex.: "Italiano", "Alemão").
3. **Conjunto completo de strings traduzidas** para AppBase e MiniApps,
   revisadas com o responsável pelo idioma. Nenhuma chave pode ficar sem valor.
4. **Validação de contexto**: confirmação de que as traduções respeitam o
   significado presente nos dicionários `pt-BR`, `en-US` e `es-ES`.

Sem essas entradas, o processo deve ser interrompido e o solicitante notificado.

## Checklist de preparação

- [ ] Confirmar que AppBase e MiniApps possuem os dicionários `pt-BR`, `en-US`
      e `es-ES` atualizados e alinhados em estrutura.
- [ ] Comparar as três bases para compreender nuances e intenções de cada
      mensagem antes de iniciar a nova tradução.
- [ ] Registrar o pedido em um ticket/issue com link para este manual e anexar
      as traduções aprovadas.
- [ ] Garantir que o placeholder **"Solicitar novo idioma"** esteja ativo no
      AppBase para registrar novas solicitações automáticas enquanto a língua
      não é liberada.

## Política de cobertura

Sempre que um novo idioma for solicitado e aprovado:

- O AppBase recebe imediatamente o dicionário completo e habilita o idioma em
  `supportedLocales`.
- **Todos os MiniApps oficiais** são atualizados, mesmo que o solicitante ainda
  não tenha instalado alguns deles. Isso evita lacunas futuras e simplifica o
  suporte.
- O idioma passa a ficar disponível para todos os usuários do ecossistema,
  independentemente de quem originou a solicitação.

Não é permitido limitar a tradução a um subconjunto de MiniApps.

## Fluxo automatizado (GitHub + Codex)

1. **Validar elegibilidade**
   - Confirme que o checklist de preparação está completo e que as traduções
     foram revisadas por uma pessoa fluente.
   - Caso alguma chave esteja faltando, devolva o pedido. A automação não deve
     inferir textos.
2. **Abrir uma issue/ticket com instruções explícitas**
   - Documente código e nome público do idioma, anexe os arquivos traduzidos e
     destaque que todos os MiniApps devem ser atualizados.
   - Liste este manual como referência obrigatória para a automação.
3. **Acionar o Codex por comentário**
   - Em um comentário na issue, informe que a automação deve criar uma branch
     dedicada, aplicar as traduções e abrir um PR para revisão humana.
   - Inclua instruções claras, como:
     ```
     - criar appbase/i18n/<locale>.json com as traduções fornecidas
     - atualizar supportedLocales e LOCALE_META
     - replicar o dicionário para cada miniapps/*/src/i18n/<locale>.json
     - atualizar supportedLocales em todos os manifests
     - executar npm test
     ```
   - Reforce que nenhuma etapa manual deve ser necessária além da revisão do PR.
4. **Aguardar execução automática**
   - O agente Codex deve:
     - Criar uma branch nomeada `feat/i18n-<locale>` (ou similar).
     - Atualizar o AppBase conforme a seção "Alterações esperadas no AppBase".
     - Atualizar **todos** os MiniApps conforme a seção "Alterações esperadas
       nos MiniApps".
     - Rodar `npm test` e anexar a saída ao PR.
     - Abrir um Pull Request descrevendo as modificações.
5. **Revisão humana e merge**
   - Analise o diff completo, compare com as traduções originais e certifique-se
     de que nenhum arquivo ficou parcial.
   - Execute `npm test` localmente para confirmar o resultado.
   - Caso tudo esteja correto, aprove o PR e faça o merge. Problemas devem ser
     reportados na issue para uma nova rodada automática.

## Alterações esperadas no AppBase

1. **Criar o dicionário do novo idioma**
   - Copie `appbase/i18n/en-US.json` para `appbase/i18n/<locale>.json` e
     preencha todas as chaves com as traduções fornecidas.
   - Utilize as três bases (`pt-BR`, `en-US`, `es-ES`) como referência de
     significado. Traduza ideias, não palavras isoladas.
2. **Registrar o idioma como suportado**
   - Atualize a meta `supportedLocales` em `appbase/index.html`, mantendo a ordem
     alfabética por código.
3. **Atualizar metadados e seletor**
   - Inclua a entrada correspondente em `appbase/settings/settings.js` dentro de
     `LOCALE_META` com `flag` e `label` adequados.
   - Garanta que a chave `app.locale.menu.options.<locale>` existe no novo
     dicionário.
4. **Sincronizar runtime**
   - Assegure-se de que o novo arquivo é importado por qualquer registrador de
     dicionários (ex.: `appbase/i18n/i18n.js`). Nenhuma chave pode faltar.

## Alterações esperadas nos MiniApps

Para cada diretório em `miniapps/`:

1. **Verificar estrutura base**
   - Confirme a presença de `pt-BR.json`, `en-US.json` e `es-ES.json` com as
     mesmas chaves. Corrija divergências antes de adicionar o novo idioma.
2. **Adicionar o dicionário**
   - Copie `en-US.json` para `miniapps/<id>/src/i18n/<locale>.json` e substitua
     os valores pelas traduções definitivas.
   - Revise as três bases para assegurar consistência sem literalismos.
3. **Atualizar manifesto**
   - Acrescente o novo código no array `supportedLocales` do arquivo
     `miniapps/<id>/src/manifest.ts` (ou equivalente).
4. **Executar builds específicos**
   - Caso o MiniApp tenha comandos de build ou geração de assets, a automação
     deve executá-los e incluir a saída no PR.

## Comportamento esperado após o merge

- O AppBase apresenta o novo idioma imediatamente no seletor global.
- Todos os MiniApps respondem ao evento `app:i18n:locale_changed` com textos na
  nova língua, sem placeholders.
- Novos usuários visualizam o idioma tanto no onboarding quanto em quaisquer
  MiniApps que instalem.
- MiniApps futuros devem herdar o padrão de quatro ou mais idiomas (base +
  adicionais) ao copiar estruturas existentes.

## FAQ de consistência

**O que acontece se um usuário solicitar um idioma diferente dos três iniciais?**

O AppBase exibe o placeholder "Solicitar novo idioma" e registra automaticamente
um pedido. Assim que as traduções completas forem disponibilizadas e este
protocolo for executado pela automação, o idioma passa a ficar acessível para
qualquer usuário sem novas solicitações.

**Instalar um MiniApp após o merge requer nova tradução?**

Não. Como todos os MiniApps foram atualizados na mesma entrega, qualquer MiniApp
instalado depois já conterá o novo dicionário e funcionará no idioma escolhido.

**A mudança de idioma no AppBase reflete em toda a interface?**

Sim. O AppBase controla o estado via `window.AppBaseI18n` e emite o evento
`app:i18n:locale_changed`, garantindo a atualização global. Certifique-se de que
os MiniApps continuem ouvindo esse evento após a adição do novo dicionário.

## Validação final obrigatória

1. `npm test` na raiz do repositório (automação e revisão humana).
2. Verificação visual do AppBase e de uma amostra de MiniApps confirmando a
   presença do novo idioma e das línguas base.
3. Revisão do diff para garantir que todos os MiniApps receberam o novo arquivo
   e que não há placeholders.
4. Atualização deste manual se novas lições forem aprendidas durante o processo.

O respeito integral a este manual garante que a automação possa entregar novos
idiomas com segurança e repetibilidade, mantendo o ecossistema pronto para um
número ilimitado de traduções.

## Log de revisões

| Data       | Alteração | Responsável |
|------------|-----------|-------------|
| 2024-05-27 | Criação do log de revisões e alinhamento com o manual de novo MiniApp. | Codex |
