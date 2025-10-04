<script lang="ts">
  import { onMount } from 'svelte';
  import { projectData } from '$lib/data/projects';
  import {
    closeOnboarding,
    onboardingState,
    openPanel,
    type PanelId,
  } from '$lib/stores/ui';

  interface TaskTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
  }

  const CHECKLIST_TEMPLATES = {
    default: [
      {
        id: 'default-briefing',
        title: 'Reunião inicial com anfitrião',
        description: 'Mapeie expectativas, orçamento e estilo do evento.',
        category: 'Planejamento',
      },
      {
        id: 'default-orcamento',
        title: 'Definir orçamento macro',
        description: 'Distribua valores por categoria (local, buffet, decoração).',
        category: 'Planejamento',
      },
      {
        id: 'default-fornecedores-prioritarios',
        title: 'Listar fornecedores prioritários',
        description: 'Buffet, espaço, decoração, fotografia e entretenimento.',
        category: 'Fornecedores',
      },
      {
        id: 'default-comunicacao',
        title: 'Planejar comunicação com convidados',
        description: 'Defina canais, templates e cronograma de convites.',
        category: 'Comunicação',
      },
      {
        id: 'default-cronograma',
        title: 'Criar cronograma do dia do evento',
        description: 'Inclua horários-chave, entradas e alinhamentos com equipe.',
        category: 'Operacional',
      },
    ],
    casamento: [
      {
        id: 'casamento-cerimonia',
        title: 'Reservar local da cerimônia e recepção',
        description: 'Garanta disponibilidade dos espaços desejados na data escolhida.',
        category: 'Planejamento',
      },
      {
        id: 'casamento-buffet',
        title: 'Selecionar buffet e degustação',
        description: 'Marque degustações e alinhe cardápio com restrições dos convidados.',
        category: 'Fornecedores',
      },
      {
        id: 'casamento-figurino',
        title: 'Definir traje dos noivos e padrinhos',
        description: 'Liste prazos de prova, ajustes e retirada de vestidos ou ternos.',
        category: 'Experiência',
      },
      {
        id: 'casamento-cerimonial',
        title: 'Planejar roteiro da cerimônia',
        description: 'Organize entradas, música e votos com o celebrante.',
        category: 'Operacional',
      },
      {
        id: 'casamento-chuva',
        title: 'Criar plano B para clima',
        description: 'Defina alternativas cobertas ou locação de tendas.',
        category: 'Logística',
      },
    ],
    corporativo: [
      {
        id: 'corporativo-objetivos',
        title: 'Alinhar objetivos do evento',
        description: 'Registre metas com a diretoria e áreas envolvidas.',
        category: 'Planejamento',
      },
      {
        id: 'corporativo-venue',
        title: 'Reservar espaço com infraestrutura',
        description: 'Confirme palco, projeção, internet e acessibilidade.',
        category: 'Logística',
      },
      {
        id: 'corporativo-palestrantes',
        title: 'Selecionar palestrantes e agenda',
        description: 'Convide participantes e defina temas por bloco.',
        category: 'Conteúdo',
      },
      {
        id: 'corporativo-divulgacao',
        title: 'Planejar divulgação e inscrições',
        description: 'Configure landing page, formulários e fluxos de confirmação.',
        category: 'Comunicação',
      },
      {
        id: 'corporativo-kit',
        title: 'Organizar brindes e material de apoio',
        description: 'Inclua itens promocionais, crachás e impressos.',
        category: 'Operacional',
      },
    ],
    aniversario: [
      {
        id: 'aniversario-tema',
        title: 'Definir tema e identidade visual',
        description: 'Selecione cores, convite e elementos decorativos.',
        category: 'Planejamento',
      },
      {
        id: 'aniversario-cardapio',
        title: 'Montar cardápio e bolo',
        description: 'Inclua opções para restrições alimentares dos convidados.',
        category: 'Fornecedores',
      },
      {
        id: 'aniversario-atracoes',
        title: 'Contratar atrações e recreação',
        description: 'Planeje música, brincadeiras e cronograma de atividades.',
        category: 'Experiência',
      },
      {
        id: 'aniversario-lista',
        title: 'Atualizar lista de convidados',
        description: 'Confirme contatos e faixas etárias para ambientação.',
        category: 'Comunicação',
      },
      {
        id: 'aniversario-lembrancinhas',
        title: 'Produzir lembrancinhas personalizadas',
        description: 'Defina fornecedor, orçamento e prazo de entrega.',
        category: 'Operacional',
      },
    ],
    formatura: [
      {
        id: 'formatura-comissao',
        title: 'Formalizar comissão de formatura',
        description: 'Distribua responsabilidades e canais de comunicação.',
        category: 'Planejamento',
      },
      {
        id: 'formatura-colacao',
        title: 'Confirmar local da colação',
        description: 'Garanta estrutura de palco, som e projeção para turmas.',
        category: 'Logística',
      },
      {
        id: 'formatura-fotos',
        title: 'Contratar foto e vídeo oficiais',
        description: 'Defina formatos de entrega e pacotes individuais.',
        category: 'Fornecedores',
      },
      {
        id: 'formatura-ensaio',
        title: 'Agendar ensaio geral',
        description: 'Planeje cronograma com mestres de cerimônia e turma.',
        category: 'Operacional',
      },
      {
        id: 'formatura-financeiro',
        title: 'Organizar plano financeiro',
        description: 'Defina mensalidades, prazos e indicadores de pagamento.',
        category: 'Financeiro',
      },
    ],
    debutante: [
      {
        id: 'debutante-coreografia',
        title: 'Definir coreografia das valsas',
        description: 'Escolha músicas e organize ensaios com o grupo.',
        category: 'Experiência',
      },
      {
        id: 'debutante-dresscode',
        title: 'Planejar dress code dos convidados',
        description: 'Oriente padrinhos, damas e equipe de apoio.',
        category: 'Planejamento',
      },
      {
        id: 'debutante-roteiro',
        title: 'Montar roteiro da noite',
        description: 'Inclua entradas, troca de vestidos e homenagens.',
        category: 'Operacional',
      },
      {
        id: 'debutante-fotos',
        title: 'Agendar sessão de fotos pré-evento',
        description: 'Defina locações, figurinos e estilo das imagens.',
        category: 'Fornecedores',
      },
      {
        id: 'debutante-interativo',
        title: 'Criar experiências interativas',
        description: 'Planeje ativações e lembranças digitais para convidados.',
        category: 'Experiência',
      },
    ],
    cha: [
      {
        id: 'cha-lista-presentes',
        title: 'Montar lista de presentes',
        description: 'Inclua itens essenciais com diferentes faixas de preço.',
        category: 'Planejamento',
      },
      {
        id: 'cha-dinamicas',
        title: 'Planejar dinâmicas e brincadeiras',
        description: 'Defina roteiro, materiais e anfitriões para cada atividade.',
        category: 'Experiência',
      },
      {
        id: 'cha-cardapio',
        title: 'Organizar cardápio enxuto',
        description: 'Combine itens doces e salgados de preparo rápido.',
        category: 'Fornecedores',
      },
      {
        id: 'cha-lembrancas',
        title: 'Separar lembrancinhas personalizadas',
        description: 'Produza etiquetas, embalagens e mensagem especial.',
        category: 'Operacional',
      },
      {
        id: 'cha-convidados',
        title: 'Confirmar lista de convidados',
        description: 'Envie convites digitais e registre confirmações.',
        category: 'Comunicação',
      },
    ],
    bodas: [
      {
        id: 'bodas-retrospectiva',
        title: 'Preparar retrospectiva do casal',
        description: 'Reúna fotos, vídeos e depoimentos para a celebração.',
        category: 'Experiência',
      },
      {
        id: 'bodas-renovacao',
        title: 'Organizar renovação de votos',
        description: 'Defina celebrante, textos e participação da família.',
        category: 'Planejamento',
      },
      {
        id: 'bodas-jantar',
        title: 'Planejar jantar especial',
        description: 'Crie menu harmonizado com bebidas preferidas do casal.',
        category: 'Fornecedores',
      },
      {
        id: 'bodas-musica',
        title: 'Selecionar trilha sonora afetiva',
        description: 'Monte playlist com momentos marcantes da história.',
        category: 'Comunicação',
      },
      {
        id: 'bodas-homenagens',
        title: 'Coordenar homenagens dos convidados',
        description: 'Reserve tempo no roteiro para discursos e brindes.',
        category: 'Operacional',
      },
    ],
  } satisfies Record<string, TaskTemplate[]>;

  type ChecklistKey = keyof typeof CHECKLIST_TEMPLATES;

  interface ChecklistItem extends TaskTemplate {
    selected: boolean;
  }

  const normalizeType = (value: string | null | undefined): string => {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  };

  const resolveChecklistKey = (value: string | null | undefined): ChecklistKey => {
    const slug = normalizeType(value);
    if (slug.includes('casamento')) return 'casamento';
    if (slug.includes('corpor')) return 'corporativo';
    if (slug.includes('aniversario')) return 'aniversario';
    if (slug.includes('formatura')) return 'formatura';
    if (slug.includes('debut')) return 'debutante';
    if (slug.includes('cha')) return 'cha';
    if (slug.includes('boda')) return 'bodas';
    return 'default';
  };

  const createChecklist = (key: ChecklistKey): ChecklistItem[] =>
    (CHECKLIST_TEMPLATES[key] ?? CHECKLIST_TEMPLATES.default).map((task) => ({
      ...task,
      selected: true,
    }));

  interface DraftAddress {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    complemento: string;
  }

  const emptyAddress = (): DraftAddress => ({
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    complemento: '',
  });

  interface WizardDraft {
    nome: string;
    tipo: string;
    datetime: string;
    local: string;
    endereco: DraftAddress;
    anfitriao: {
      nome: string;
      telefone: string;
      redeSocial: string;
      correspondencia: DraftAddress;
      entrega: DraftAddress;
    };
    cerimonialista: {
      nome: string;
      telefone: string;
      redeSocial: string;
    };
  }

  let step = 0;
  let busy = false;
  let error: string | null = null;

  let draft: WizardDraft = {
    nome: '',
    tipo: '',
    datetime: '',
    local: '',
    endereco: emptyAddress(),
    anfitriao: {
      nome: '',
      telefone: '',
      redeSocial: '',
      correspondencia: emptyAddress(),
      entrega: emptyAddress(),
    },
    cerimonialista: {
      nome: '',
      telefone: '',
      redeSocial: '',
    },
  };

  let checklistKey: ChecklistKey = resolveChecklistKey('');
  let checklist: ChecklistItem[] = createChecklist(checklistKey);

  $: {
    const nextKey = resolveChecklistKey(draft.tipo);
    if (nextKey !== checklistKey) {
      checklistKey = nextKey;
      checklist = createChecklist(checklistKey);
    }
  }

  const totalSteps = 3;

  const isLastStep = () => step === totalSteps - 1;
  const isFirstStep = () => step === 0;

  const isStepValid = (): boolean => {
    if (step === 0) {
      return Boolean(draft.nome.trim());
    }
    return true;
  };

  const goToStep = (target: number) => {
    if (target < 0 || target >= totalSteps) return;
    step = target;
  };

  const next = () => {
    if (!isStepValid()) return;
    goToStep(step + 1);
  };

  const prev = () => {
    goToStep(step - 1);
  };

  const close = () => {
    if (busy) return;
    closeOnboarding();
  };

  const syncFromStore = () => {
    step = Math.min(totalSteps - 1, Math.max(0, $onboardingState.step ?? 0));
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (! $onboardingState.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  onMount(() => {
    const unsubscribe = onboardingState.subscribe(() => syncFromStore());
    syncFromStore();
    window.addEventListener('keydown', handleKeydown);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  const handleChecklistToggle = (id: string, event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    const selected = Boolean(target?.checked);
    checklist = checklist.map((task) =>
      task.id === id ? { ...task, selected } : task,
    );
  };

  const selectedTasks = () =>
    checklist
      .filter((item) => item.selected)
      .map((item) => ({
        id: item.id,
        titulo: item.title,
        descricao: item.description,
        categoria: item.category,
        status: 'todo',
        responsavel: '',
        prazo: '',
        done: false,
      }));

  async function handleCreate() {
    if (busy) return;
    busy = true;
    error = null;
    try {
      const [data, horaRaw] = draft.datetime ? draft.datetime.split('T') : ['', ''];
      const hora = (horaRaw ?? '').slice(0, 5);

      const record = await projectData.createProject({
        evento: {
          nome: draft.nome.trim(),
          tipo: draft.tipo,
          data: data ?? '',
          hora,
          local: draft.local,
          endereco: { ...draft.endereco },
          anfitriao: {
            nome: draft.anfitriao.nome,
            telefone: draft.anfitriao.telefone,
            redeSocial: draft.anfitriao.redeSocial,
            endCorrespondencia: { ...draft.anfitriao.correspondencia },
            endEntrega: { ...draft.anfitriao.entrega },
          },
        },
        cerimonialista: {
          nomeCompleto: draft.cerimonialista.nome,
          telefone: draft.cerimonialista.telefone,
          redeSocial: draft.cerimonialista.redeSocial,
        },
        checklist: selectedTasks(),
        fornecedores: [],
        convidados: [],
        tipos: [],
        modelos: {},
        vars: {},
        updatedAt: Date.now(),
      });

      window.dispatchEvent(
        new CustomEvent('ac:onboarding:complete', {
          detail: {
            record,
            focus: 'tarefas' as PanelId,
          },
        })
      );
      closeOnboarding();
      openPanel('tarefas');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Não foi possível criar o evento. Tente novamente.';
    } finally {
      busy = false;
    }
  }
</script>

{#if $onboardingState.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10">
    <div
      class="relative w-full max-w-3xl rounded-3xl bg-surface p-6 shadow-2xl ring-1 ring-black/10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        class="absolute right-4 top-4 rounded-full bg-surface-muted p-2 text-sm font-semibold text-ink-muted transition hover:bg-surface"
        type="button"
        on:click={close}
        aria-label="Fechar wizard"
      >
        ✕
      </button>

      <header class="mb-6 space-y-2">
        <div class="flex items-center justify-between">
          <h1 id="onboarding-title" class="text-2xl font-semibold text-ink">Configurar novo evento</h1>
          <span class="text-sm font-medium text-ink-muted">Etapa {step + 1} de {totalSteps}</span>
        </div>
        <p class="text-sm text-ink-muted">
          Preencha os campos essenciais para começar com recomendações e um checklist personalizado.
        </p>
        <div class="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full bg-brand transition-all" style={`width:${((step + 1) / totalSteps) * 100}%`}></div>
        </div>
      </header>

      <div class="space-y-6">
        {#if step === 0}
          <section class="space-y-4">
            <h2 class="text-lg font-semibold text-ink">Detalhes básicos do evento</h2>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-name">
                Nome do evento
                <input
                  id="wizard-event-name"
                  type="text"
                  bind:value={draft.nome}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  placeholder="Ex.: Casamento Ana & Bruno"
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-type">
                Tipo do evento
                <select
                  id="wizard-event-type"
                  bind:value={draft.tipo}
                  class="form-select rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                >
                  <option value=""></option>
                  <option>Casamento</option>
                  <option>Aniversário</option>
                  <option>Formatura</option>
                  <option>Debutante</option>
                  <option>Corporativo</option>
                  <option>Batizado</option>
                  <option>Chá de Panela</option>
                  <option>Chá de Bebê</option>
                  <option>Bodas</option>
                  <option>Outro</option>
                </select>
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-datetime">
                Data e horário (opcional)
                <input
                  id="wizard-event-datetime"
                  type="datetime-local"
                  bind:value={draft.datetime}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-location">
                Local
                <input
                  id="wizard-event-location"
                  type="text"
                  bind:value={draft.local}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  placeholder="Espaço, salão ou endereço resumido"
                />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-cep">
                CEP
                <input
                  id="wizard-event-cep"
                  type="text"
                  bind:value={draft.endereco.cep}
                  maxlength="9"
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-logradouro">
                Logradouro
                <input
                  id="wizard-event-logradouro"
                  type="text"
                  bind:value={draft.endereco.logradouro}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-numero">
                Número
                <input
                  id="wizard-event-numero"
                  type="text"
                  bind:value={draft.endereco.numero}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-bairro">
                Bairro
                <input
                  id="wizard-event-bairro"
                  type="text"
                  bind:value={draft.endereco.bairro}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-cidade">
                Cidade
                <input
                  id="wizard-event-cidade"
                  type="text"
                  bind:value={draft.endereco.cidade}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-uf">
                UF
                <input
                  id="wizard-event-uf"
                  type="text"
                  maxlength="2"
                  bind:value={draft.endereco.uf}
                  class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-event-complemento">
                Complemento
                <input
                  id="wizard-event-complemento"
                  type="text"
                  bind:value={draft.endereco.complemento}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
            </div>
          </section>
        {:else if step === 1}
          <section class="space-y-4">
            <h2 class="text-lg font-semibold text-ink">Contatos e equipe</h2>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-host-nome">
                Nome do anfitrião
                <input
                  id="wizard-host-nome"
                  type="text"
                  bind:value={draft.anfitriao.nome}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-host-telefone">
                Telefone
                <input
                  id="wizard-host-telefone"
                  type="text"
                  bind:value={draft.anfitriao.telefone}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
            </div>
            <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-host-rede">
              Rede social / contato
              <input
                id="wizard-host-rede"
                type="text"
                bind:value={draft.anfitriao.redeSocial}
                class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-3 rounded-2xl bg-surface-muted/60 p-4">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">Correspondência</h3>
                <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-corr-cep">
                  CEP
                  <input
                    id="wizard-corr-cep"
                    type="text"
                    maxlength="9"
                    bind:value={draft.anfitriao.correspondencia.cep}
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  />
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-corr-logradouro">
                  Logradouro
                  <input
                    id="wizard-corr-logradouro"
                    type="text"
                    bind:value={draft.anfitriao.correspondencia.logradouro}
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  />
                </label>
                <div class="grid gap-3 md:grid-cols-3">
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Número"
                    bind:value={draft.anfitriao.correspondencia.numero}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Bairro"
                    bind:value={draft.anfitriao.correspondencia.bairro}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Cidade"
                    bind:value={draft.anfitriao.correspondencia.cidade}
                  />
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <input
                    class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
                    placeholder="UF"
                    maxlength="2"
                    bind:value={draft.anfitriao.correspondencia.uf}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Complemento"
                    bind:value={draft.anfitriao.correspondencia.complemento}
                  />
                </div>
              </div>
              <div class="space-y-3 rounded-2xl bg-surface-muted/60 p-4">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">Entrega de presentes</h3>
                <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-entrega-cep">
                  CEP
                  <input
                    id="wizard-entrega-cep"
                    type="text"
                    maxlength="9"
                    bind:value={draft.anfitriao.entrega.cep}
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  />
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-entrega-logradouro">
                  Logradouro
                  <input
                    id="wizard-entrega-logradouro"
                    type="text"
                    bind:value={draft.anfitriao.entrega.logradouro}
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  />
                </label>
                <div class="grid gap-3 md:grid-cols-3">
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Número"
                    bind:value={draft.anfitriao.entrega.numero}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Bairro"
                    bind:value={draft.anfitriao.entrega.bairro}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Cidade"
                    bind:value={draft.anfitriao.entrega.cidade}
                  />
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <input
                    class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
                    placeholder="UF"
                    maxlength="2"
                    bind:value={draft.anfitriao.entrega.uf}
                  />
                  <input
                    class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                    placeholder="Complemento"
                    bind:value={draft.anfitriao.entrega.complemento}
                  />
                </div>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-cerimonial-nome">
                Cerimonialista (opcional)
                <input
                  id="wizard-cerimonial-nome"
                  type="text"
                  bind:value={draft.cerimonialista.nome}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                  placeholder="Nome completo"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-cerimonial-telefone">
                Telefone do cerimonial
                <input
                  id="wizard-cerimonial-telefone"
                  type="text"
                  bind:value={draft.cerimonialista.telefone}
                  class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
                />
              </label>
            </div>
            <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="wizard-cerimonial-rede">
              Rede social do cerimonial
              <input
                id="wizard-cerimonial-rede"
                type="text"
                bind:value={draft.cerimonialista.redeSocial}
                class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
              />
            </label>
          </section>
        {:else}
          <section class="space-y-4">
            <h2 class="text-lg font-semibold text-ink">Monte o checklist inicial</h2>
            <p class="text-sm text-ink-muted">
              As recomendações se adaptam ao tipo escolhido. Revise os itens sugeridos e selecione o que faz sentido para começar.
            </p>
            <div class="grid gap-3 md:grid-cols-2">
              {#each checklist as item (item.id)}
                <label class="flex h-full flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm">
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      on:change={(event) => handleChecklistToggle(item.id, event)}
                      class="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <div class="space-y-1">
                      <h3 class="text-sm font-semibold text-ink">{item.title}</h3>
                      <p class="text-xs text-ink-muted">{item.description}</p>
                    </div>
                  </div>
                  <span class="text-xs font-medium uppercase tracking-wide text-brand">{item.category}</span>
                </label>
              {/each}
            </div>
            {#if selectedTasks().length === 0}
              <p class="rounded-xl bg-warning/10 px-4 py-2 text-sm text-warning">
                Selecione pelo menos um item para iniciar o checklist do evento.
              </p>
            {/if}
          </section>
        {/if}
      </div>

      {#if error}
        <div class="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>
      {/if}

      <footer class="mt-6 flex items-center justify-between">
        <div class="text-xs text-ink-muted">
          Você poderá editar qualquer informação após criar o evento.
        </div>
        <div class="flex items-center gap-3">
          {#if !isFirstStep()}
            <button
              type="button"
              class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              on:click={prev}
              disabled={busy}
            >
              Voltar
            </button>
          {/if}
          {#if !isLastStep()}
            <button
              type="button"
              class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-60"
              on:click={next}
              disabled={busy || !isStepValid()}
            >
              Avançar
            </button>
          {:else}
            <button
              type="button"
              class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-60"
              on:click={handleCreate}
              disabled={busy || selectedTasks().length === 0}
            >
              {busy ? 'Criando...' : 'Criar evento com checklist'}
            </button>
          {/if}
        </div>
      </footer>
    </div>
  </div>
{/if}
