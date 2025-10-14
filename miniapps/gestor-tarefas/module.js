const DEFAULT_LOCALE = 'pt-BR';
const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'];
const STORAGE_KEY = 'marco-miniapp:gestor-tarefas';
const STATUS_ORDER = ['pending', 'in_progress', 'blocked', 'done'];
const KEY_PREFIX = 'miniapp.gestor_tarefas';
const DICTIONARY_CACHE = new Map();
const DICTIONARY_PROMISES = new Map();

const FALLBACK_STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  done: 'Concluída',
};

const FEEDBACK_CLASSNAMES = {
  success: 'ac-feedback ac-feedback--success',
  pending: 'ac-feedback ac-feedback--pending',
  error: 'ac-feedback ac-feedback--error',
};

function normaliseLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    return locale;
  }
  return DEFAULT_LOCALE;
}

function getActiveLocale() {
  try {
    const locale = window?.AppBaseI18n?.getLocale?.();
    if (typeof locale === 'string' && locale) {
      return locale;
    }
  } catch (error) {
    /* noop */
  }
  return DEFAULT_LOCALE;
}

function resolvePath(dictionary, path) {
  if (!dictionary || !path) {
    return null;
  }
  return path
    .split('.')
    .filter(Boolean)
    .reduce((acc, segment) => (acc && typeof acc === 'object' ? acc[segment] : null), dictionary);
}

function formatMessage(template, replacements = {}) {
  if (typeof template !== 'string' || !template) {
    return '';
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      const value = replacements[key];
      return value === null || value === undefined ? '' : String(value);
    }
    return '';
  });
}

function translateFromCache(locale, path, replacements) {
  const localesToTry = [locale, DEFAULT_LOCALE];
  for (const candidate of localesToTry) {
    const dictionary = DICTIONARY_CACHE.get(candidate);
    if (!dictionary) {
      continue;
    }
    const raw = resolvePath(dictionary, path);
    if (typeof raw === 'string' && raw.trim()) {
      return formatMessage(raw, replacements);
    }
  }
  return '';
}

function getDictionaryUrl(locale) {
  return new URL(`./src/i18n/${locale}.json`, import.meta.url).href;
}

function ensureDictionary(locale) {
  const target = normaliseLocale(locale);
  if (DICTIONARY_CACHE.has(target)) {
    return Promise.resolve(DICTIONARY_CACHE.get(target));
  }
  if (DICTIONARY_PROMISES.has(target)) {
    return DICTIONARY_PROMISES.get(target);
  }
  const url = getDictionaryUrl(target);
  const promise = fetch(url, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Falha ao carregar dicionário ${target}`);
      }
      return response.json();
    })
    .then((dictionary) => {
      DICTIONARY_CACHE.set(target, dictionary);
      return dictionary;
    })
    .catch((error) => {
      console.warn('Gestor de tarefas: falha ao carregar dicionário', target, error);
      return null;
    })
    .finally(() => {
      DICTIONARY_PROMISES.delete(target);
    });
  DICTIONARY_PROMISES.set(target, promise);
  return promise;
}

function getFallbackStatusLabel(status) {
  return FALLBACK_STATUS_LABELS[status] || status;
}

function getStatusLabel(locale, status) {
  const key = `${KEY_PREFIX}.statuses.${status}`;
  const label = translateFromCache(locale, key);
  return label || getFallbackStatusLabel(status);
}

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (error) {
    return false;
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

function startOfDay(date) {
  const value = new Date(date.getTime());
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseDateInput(value) {
  if (!value) {
    return null;
  }
  const iso = `${value}T00:00:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatDate(date, locale) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const target = normaliseLocale(locale);
  try {
    return new Intl.DateTimeFormat(target, { dateStyle: 'medium' }).format(date);
  } catch (error) {
    try {
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, { dateStyle: 'medium' }).format(date);
    } catch (fallbackError) {
      return date.toISOString().slice(0, 10);
    }
  }
}

function isOverdue(date, status) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }
  if (status === 'done') {
    return false;
  }
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() < today.getTime();
}

function isDueToday(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() === today.getTime();
}

function normaliseTask(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  if (!title) {
    return null;
  }
  const status = STATUS_ORDER.includes(entry.status) ? entry.status : STATUS_ORDER[0];
  const dueDate = typeof entry.dueDate === 'string' && entry.dueDate ? entry.dueDate : null;
  const createdAt = typeof entry.createdAt === 'string' && entry.createdAt ? entry.createdAt : new Date().toISOString();
  const id = typeof entry.id === 'string' && entry.id ? entry.id : createId();
  return { id, title, status, dueDate, createdAt };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.dueDate ? Date.parse(`${a.dueDate}T00:00:00`) : null;
    const bDate = b.dueDate ? Date.parse(`${b.dueDate}T00:00:00`) : null;
    if (aDate && bDate) {
      if (aDate !== bDate) {
        return aDate - bDate;
      }
    } else if (aDate && !bDate) {
      return -1;
    } else if (!aDate && bDate) {
      return 1;
    }
    const aCreated = a.createdAt || '';
    const bCreated = b.createdAt || '';
    return aCreated.localeCompare(bCreated);
  });
}

function loadTasks() {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const tasks = parsed.map(normaliseTask).filter(Boolean);
    return sortTasks(tasks);
  } catch (error) {
    console.warn('Gestor de tarefas: falha ao carregar dados armazenados', error);
    return [];
  }
}

function saveTasks(tasks) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('Gestor de tarefas: falha ao salvar dados', error);
  }
}

function createMiniAppMount(container, key) {
  const isStage = container && container.id === 'painel-stage';
  if (isStage) {
    container.setAttribute('data-miniapp-stage', key);
    return {
      destroy() {
        container.removeAttribute('data-miniapp-stage');
      },
    };
  }
  container.setAttribute('data-miniapp-panel', key);
  return null;
}

export function createModule({ key = 'gestor-tarefas', manifest = null, meta = {} } = {}) {
  const resolvedMeta = { ...meta };
  if (!resolvedMeta.card) {
    resolvedMeta.card = { ...(manifest?.meta?.card ?? {}) };
  }
  if (!resolvedMeta.panel) {
    resolvedMeta.panel = { ...(manifest?.meta?.panel ?? {}) };
  }
  if (!resolvedMeta.id) {
    resolvedMeta.id = manifest?.miniappId ?? manifest?.id ?? key;
  }
  if (!resolvedMeta.kind) {
    resolvedMeta.kind = manifest?.kind ?? 'experience';
  }

  return {
    meta: resolvedMeta,
    init(container) {
      if (!container) {
        return { destroy() {} };
      }

      const stageMount = createMiniAppMount(container, key);
      if (stageMount) {
        return stageMount;
      }

      container.classList.add('miniapp-task-manager__mount');

      const state = {
        tasks: loadTasks(),
        locale: normaliseLocale(getActiveLocale()),
        ready: Boolean(DICTIONARY_CACHE.get(normaliseLocale(getActiveLocale()))),
      };

      const manifestMeta = manifest?.meta ?? {};

      const elements = {};
      let feedbackTimer = null;
      let lastLocaleRendered = null;

      function t(path, replacements) {
        const keyPath = `${KEY_PREFIX}.${path}`;
        return translateFromCache(state.locale, keyPath, replacements);
      }

      function clearFeedback() {
        if (elements.feedback) {
          elements.feedback.textContent = '';
          elements.feedback.className = 'ac-feedback';
        }
        if (feedbackTimer) {
          window.clearTimeout(feedbackTimer);
          feedbackTimer = null;
        }
      }

      function showFeedback(type, messageKey, replacements) {
        if (!elements.feedback) {
          return;
        }
        const text = messageKey ? t(messageKey, replacements) : '';
        const className = FEEDBACK_CLASSNAMES[type] || 'ac-feedback';
        elements.feedback.textContent = text;
        elements.feedback.className = className;
        if (feedbackTimer) {
          window.clearTimeout(feedbackTimer);
          feedbackTimer = null;
        }
        if (text) {
          feedbackTimer = window.setTimeout(() => {
            elements.feedback.textContent = '';
            elements.feedback.className = 'ac-feedback';
            feedbackTimer = null;
          }, 4000);
        }
      }

      function buildUI() {
        const root = document.createElement('div');
        root.className = 'miniapp-task-manager';

        const summaryCard = document.createElement('article');
        summaryCard.className = 'ac-panel-card miniapp-task-manager__card miniapp-task-manager__card--summary';

        const head = document.createElement('div');
        head.className = 'ac-panel-card__head';

        const titles = document.createElement('div');
        titles.className = 'ac-panel-card__titles';

        const title = document.createElement('h3');
        title.className = 'ac-panel-card__title';
        titles.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'ac-panel-card__subtitle';
        titles.appendChild(subtitle);

        head.appendChild(titles);

        const badge = document.createElement('span');
        badge.className = 'ac-panel-card__badge';
        head.appendChild(badge);

        summaryCard.appendChild(head);

        const note = document.createElement('p');
        note.className = 'ac-panel-card__note';
        summaryCard.appendChild(note);

        const summary = document.createElement('p');
        summary.className = 'miniapp-task-manager__summary';
        summaryCard.appendChild(summary);

        const form = document.createElement('form');
        form.className = 'miniapp-task-manager__form';
        form.noValidate = true;

        const formGrid = document.createElement('div');
        formGrid.className = 'ac-form-grid miniapp-task-manager__form-grid';

        const titleField = document.createElement('div');
        titleField.className = 'ac-field';
        const titleLabel = document.createElement('label');
        const titleInputId = `${key}-task-title`;
        titleLabel.setAttribute('for', titleInputId);
        titleField.appendChild(titleLabel);
        const titleControl = document.createElement('div');
        titleControl.className = 'ac-field__control';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = titleInputId;
        titleInput.name = 'taskTitle';
        titleInput.required = true;
        titleInput.autocomplete = 'off';
        titleInput.maxLength = 140;
        titleControl.appendChild(titleInput);
        titleField.appendChild(titleControl);
        formGrid.appendChild(titleField);

        const dueField = document.createElement('div');
        dueField.className = 'ac-field';
        const dueLabel = document.createElement('label');
        const dueInputId = `${key}-task-due`;
        dueLabel.setAttribute('for', dueInputId);
        dueField.appendChild(dueLabel);
        const dueControl = document.createElement('div');
        dueControl.className = 'ac-field__control';
        const dueInput = document.createElement('input');
        dueInput.type = 'date';
        dueInput.id = dueInputId;
        dueInput.name = 'taskDueDate';
        dueControl.appendChild(dueInput);
        dueField.appendChild(dueControl);
        formGrid.appendChild(dueField);

        const statusField = document.createElement('div');
        statusField.className = 'ac-field';
        const statusLabel = document.createElement('label');
        const statusId = `${key}-task-status`;
        statusLabel.setAttribute('for', statusId);
        statusField.appendChild(statusLabel);
        const statusControl = document.createElement('div');
        statusControl.className = 'ac-field__control';
        const statusSelect = document.createElement('select');
        statusSelect.id = statusId;
        statusSelect.name = 'taskStatus';
        statusSelect.className = 'miniapp-task-manager__status-select';
        statusControl.appendChild(statusSelect);
        statusField.appendChild(statusControl);
        formGrid.appendChild(statusField);

        form.appendChild(formGrid);

        const actions = document.createElement('div');
        actions.className = 'miniapp-task-manager__form-actions';
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'ac-btn ac-btn--primary miniapp-task-manager__submit';
        actions.appendChild(submit);
        form.appendChild(actions);

        summaryCard.appendChild(form);

        const feedback = document.createElement('p');
        feedback.className = 'ac-feedback';
        feedback.setAttribute('role', 'status');
        summaryCard.appendChild(feedback);

        root.appendChild(summaryCard);

        const listCard = document.createElement('article');
        listCard.className = 'ac-panel-card miniapp-task-manager__card miniapp-task-manager__card--list';

        const listHead = document.createElement('div');
        listHead.className = 'ac-panel-card__head';
        const listTitles = document.createElement('div');
        listTitles.className = 'ac-panel-card__titles';
        const listTitle = document.createElement('h3');
        listTitle.className = 'ac-panel-card__title';
        listTitles.appendChild(listTitle);
        const listNote = document.createElement('p');
        listNote.className = 'ac-panel-card__subtitle miniapp-task-manager__list-note';
        listTitles.appendChild(listNote);
        listHead.appendChild(listTitles);
        listCard.appendChild(listHead);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'ac-table-wrap ac-table-wrap--inner miniapp-task-manager__table-wrap';
        const table = document.createElement('table');
        table.className = 'ac-table ac-table--compact miniapp-task-manager__table';
        const caption = document.createElement('caption');
        table.appendChild(caption);
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const headTask = document.createElement('th');
        headTask.scope = 'col';
        headRow.appendChild(headTask);
        const headDue = document.createElement('th');
        headDue.scope = 'col';
        headRow.appendChild(headDue);
        const headStatus = document.createElement('th');
        headStatus.scope = 'col';
        headRow.appendChild(headStatus);
        const headActions = document.createElement('th');
        headActions.scope = 'col';
        headActions.className = 'ac-table__actions';
        headRow.appendChild(headActions);
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        listCard.appendChild(tableWrap);
        root.appendChild(listCard);

        container.appendChild(root);

        elements.root = root;
        elements.summaryCard = summaryCard;
        elements.badge = badge;
        elements.title = title;
        elements.subtitle = subtitle;
        elements.note = note;
        elements.summary = summary;
        elements.form = form;
        elements.titleLabel = titleLabel;
        elements.titleInput = titleInput;
        elements.dueLabel = dueLabel;
        elements.dueInput = dueInput;
        elements.statusLabel = statusLabel;
        elements.statusSelect = statusSelect;
        elements.submit = submit;
        elements.feedback = feedback;
        elements.listTitle = listTitle;
        elements.listNote = listNote;
        elements.tableCaption = caption;
        elements.theadTask = headTask;
        elements.theadDue = headDue;
        elements.theadStatus = headStatus;
        elements.theadActions = headActions;
        elements.tbody = tbody;
        elements.tableWrap = tableWrap;
      }

      function updateHeader() {
        if (!elements.title || !elements.subtitle || !elements.badge || !elements.note) {
          return;
        }
        const cardMeta = manifestMeta.card ?? {};
        const panelMeta = manifestMeta.panel ?? {};
        const badgeKey = manifestMeta.badgeKeys?.[0] ?? `${KEY_PREFIX}.badges.beta`;
        const badgeFallback = manifestMeta.badges?.[0] ?? 'Beta';
        elements.badge.textContent = t('ui.header.badge') || translateFromCache(state.locale, badgeKey) || badgeFallback;
        elements.badge.hidden = !elements.badge.textContent.trim();
        const titleFallback = cardMeta.label ?? resolvedMeta.card?.label ?? 'Gestor de tarefas';
        elements.title.textContent = t('ui.header.title') || titleFallback;
        const subtitleFallback = cardMeta.meta ?? resolvedMeta.card?.meta ?? '';
        elements.subtitle.textContent = t('ui.header.subtitle') || subtitleFallback;
        elements.subtitle.hidden = !elements.subtitle.textContent.trim();
        const noteFallback = panelMeta.meta ?? '';
        elements.note.textContent = t('ui.header.note') || noteFallback;
        elements.note.hidden = !elements.note.textContent.trim();
      }

      function updateFormLabels() {
        if (!elements.form) {
          return;
        }
        elements.titleLabel.textContent = t('ui.form.title') || 'Título';
        elements.titleInput.placeholder = t('ui.form.titlePlaceholder') || 'Ex.: Revisar entrega da squad';
        elements.dueLabel.textContent = t('ui.form.dueDate') || 'Prazo';
        elements.statusLabel.textContent = t('ui.form.status') || 'Situação';

        const currentValue = elements.statusSelect.value;
        elements.statusSelect.innerHTML = '';
        STATUS_ORDER.forEach((statusKey) => {
          const option = document.createElement('option');
          option.value = statusKey;
          option.textContent = getStatusLabel(state.locale, statusKey);
          elements.statusSelect.appendChild(option);
        });
        if (STATUS_ORDER.includes(currentValue)) {
          elements.statusSelect.value = currentValue;
        } else {
          elements.statusSelect.value = STATUS_ORDER[0];
        }

        elements.submit.textContent = t('ui.form.submit') || 'Adicionar tarefa';
      }

      function updateSummary() {
        if (!elements.summary) {
          return;
        }
        const total = state.tasks.length;
        const counts = state.tasks.reduce(
          (acc, task) => {
            acc.total += 1;
            if (task.status === 'pending') {
              acc.pending += 1;
            } else if (task.status === 'in_progress') {
              acc.inProgress += 1;
            } else if (task.status === 'blocked') {
              acc.blocked += 1;
            } else if (task.status === 'done') {
              acc.done += 1;
            }
            return acc;
          },
          { total: 0, pending: 0, inProgress: 0, blocked: 0, done: 0 },
        );
        const template = total
          ? t('ui.summary.metrics', counts)
          : t('ui.summary.empty', counts);
        if (template) {
          elements.summary.textContent = template;
        } else if (total) {
          elements.summary.textContent = `${counts.total} tarefas`;
        } else {
          elements.summary.textContent = 'Nenhuma tarefa cadastrada.';
        }
      }

      function buildStatusBadge({ text, variant }) {
        const badge = document.createElement('span');
        badge.className = `miniapp-task-manager__status-badge miniapp-task-manager__status-badge--${variant}`;
        badge.textContent = text;
        return badge;
      }

      function buildStatusSelect(task) {
        const select = document.createElement('select');
        select.className = 'miniapp-task-manager__status-select';
        select.value = task.status;
        select.setAttribute('aria-label', t('ui.table.statusAria', { task: task.title }) || 'Atualizar situação');
        STATUS_ORDER.forEach((statusKey) => {
          const option = document.createElement('option');
          option.value = statusKey;
          option.textContent = getStatusLabel(state.locale, statusKey);
          if (statusKey === task.status) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        select.addEventListener('change', (event) => {
          const nextStatus = event.target.value;
          updateTaskStatus(task.id, nextStatus);
        });
        return select;
      }

      function buildActionsCell(task) {
        const cell = document.createElement('td');
        cell.className = 'ac-table__actions';
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'ac-btn ac-btn--ghost miniapp-task-manager__delete';
        deleteButton.textContent = t('ui.table.delete') || 'Remover';
        deleteButton.setAttribute('aria-label', t('ui.table.deleteAria', { task: task.title }) || `Remover "${task.title}"`);
        deleteButton.addEventListener('click', () => {
          deleteTask(task.id);
        });
        cell.appendChild(deleteButton);
        return cell;
      }

      function renderTasks() {
        if (!elements.tbody) {
          return;
        }
        elements.tbody.innerHTML = '';
        const tasks = sortTasks(state.tasks);
        if (!tasks.length) {
          const emptyRow = document.createElement('tr');
          const emptyCell = document.createElement('td');
          emptyCell.colSpan = 4;
          emptyCell.className = 'miniapp-task-manager__empty';
          const loadingText = t('ui.loading');
          emptyCell.textContent = state.ready ? t('ui.table.empty') || 'Nenhuma tarefa cadastrada ainda.' : loadingText || 'Carregando gestor de tarefas...';
          emptyRow.appendChild(emptyCell);
          elements.tbody.appendChild(emptyRow);
          return;
        }

        tasks.forEach((task) => {
          const row = document.createElement('tr');

          const titleCell = document.createElement('td');
          titleCell.className = 'miniapp-task-manager__title-cell';
          const titleText = document.createElement('span');
          titleText.className = 'miniapp-task-manager__task-title';
          titleText.textContent = task.title;
          titleCell.appendChild(titleText);
          row.appendChild(titleCell);

          const dueCell = document.createElement('td');
          dueCell.className = 'miniapp-task-manager__due-cell';
          const dueDate = task.dueDate ? parseDateInput(task.dueDate) : null;
          if (dueDate) {
            const formatted = formatDate(dueDate, state.locale);
            const dueText = document.createElement('span');
            dueText.className = 'miniapp-task-manager__due-date';
            dueText.textContent = formatted;
            dueCell.appendChild(dueText);
            if (isOverdue(dueDate, task.status)) {
              const badge = buildStatusBadge({
                text: t('statuses.overdue') || 'Atrasada',
                variant: 'overdue',
              });
              dueCell.appendChild(badge);
            } else if (isDueToday(dueDate)) {
              const badge = buildStatusBadge({
                text: t('ui.table.dueToday') || 'Entrega hoje',
                variant: 'today',
              });
              dueCell.appendChild(badge);
            }
          } else {
            dueCell.textContent = t('ui.table.noDueDate') || 'Sem prazo';
          }
          row.appendChild(dueCell);

          const statusCell = document.createElement('td');
          statusCell.className = 'miniapp-task-manager__status-cell';
          const statusLabel = document.createElement('span');
          statusLabel.className = 'miniapp-task-manager__status-label';
          statusLabel.textContent = getStatusLabel(state.locale, task.status);
          statusCell.appendChild(statusLabel);
          statusCell.appendChild(buildStatusSelect(task));
          row.appendChild(statusCell);

          row.appendChild(buildActionsCell(task));

          elements.tbody.appendChild(row);
        });
      }

      function updateTableLabels() {
        if (!elements.listTitle || !elements.theadTask) {
          return;
        }
        elements.listTitle.textContent = t('ui.table.title') || 'Tarefas cadastradas';
        elements.listNote.textContent = t('ui.table.note') || 'Visualize prazos, atualize a situação e remova entregas concluídas.';
        elements.tableCaption.textContent = t('ui.table.caption') || 'Tabela com tarefas registradas e respectivos prazos';
        elements.theadTask.textContent = t('ui.table.columns.task') || 'Tarefa';
        elements.theadDue.textContent = t('ui.table.columns.dueDate') || 'Prazo';
        elements.theadStatus.textContent = t('ui.table.columns.status') || 'Situação';
        elements.theadActions.textContent = t('ui.table.columns.actions') || 'Ações';
      }

      function render() {
        const localeChanged = lastLocaleRendered !== state.locale;
        if (localeChanged) {
          updateHeader();
          updateFormLabels();
          updateTableLabels();
          lastLocaleRendered = state.locale;
        }
        updateSummary();
        renderTasks();
      }

      function addTask(task) {
        state.tasks = sortTasks([...state.tasks, task]);
        saveTasks(state.tasks);
        render();
      }

      function updateTaskStatus(id, nextStatus) {
        if (!STATUS_ORDER.includes(nextStatus)) {
          return;
        }
        const tasks = state.tasks.map((task) => {
          if (task.id !== id) {
            return task;
          }
          return { ...task, status: nextStatus };
        });
        const targetTask = state.tasks.find((task) => task.id === id);
        state.tasks = sortTasks(tasks);
        saveTasks(state.tasks);
        render();
        if (targetTask) {
          showFeedback('pending', 'ui.form.feedback.updated', {
            title: targetTask.title,
            status: getStatusLabel(state.locale, nextStatus),
          });
        }
      }

      function deleteTask(id) {
        const targetTask = state.tasks.find((task) => task.id === id);
        state.tasks = state.tasks.filter((task) => task.id !== id);
        saveTasks(state.tasks);
        render();
        if (targetTask) {
          showFeedback('pending', 'ui.form.feedback.deleted', { title: targetTask.title });
        }
      }

      function handleSubmit(event) {
        event.preventDefault();
        const title = elements.titleInput.value.trim();
        const dueRaw = elements.dueInput.value;
        const statusValue = elements.statusSelect.value;
        if (!title) {
          showFeedback('error', 'ui.form.feedback.validation');
          elements.titleInput.focus();
          return;
        }
        const task = {
          id: createId(),
          title,
          status: STATUS_ORDER.includes(statusValue) ? statusValue : STATUS_ORDER[0],
          dueDate: dueRaw || null,
          createdAt: new Date().toISOString(),
        };
        addTask(task);
        showFeedback('success', 'ui.form.feedback.created', { title });
        elements.form.reset();
        elements.statusSelect.value = STATUS_ORDER[0];
        elements.titleInput.focus();
      }

      function handleInputChange() {
        clearFeedback();
      }

      function handleLocaleChange(event) {
        const nextLocale = normaliseLocale(event?.detail?.locale);
        if (nextLocale === state.locale) {
          render();
          return;
        }
        state.locale = nextLocale;
        state.ready = Boolean(DICTIONARY_CACHE.get(nextLocale));
        render();
        ensureDictionary(nextLocale).then(() => {
          if (state.locale === nextLocale) {
            state.ready = true;
            render();
          }
        });
      }

      buildUI();
      render();

      elements.form.addEventListener('submit', handleSubmit);
      elements.titleInput.addEventListener('input', handleInputChange);
      elements.dueInput.addEventListener('input', handleInputChange);
      elements.statusSelect.addEventListener('change', handleInputChange);
      window.addEventListener('app:i18n:locale_changed', handleLocaleChange);

      ensureDictionary(DEFAULT_LOCALE)
        .then(() => ensureDictionary(state.locale))
        .then(() => {
          state.ready = true;
          render();
        })
        .catch(() => {
          state.ready = Boolean(DICTIONARY_CACHE.get(DEFAULT_LOCALE));
          render();
        });

      return {
        destroy() {
          clearFeedback();
          window.removeEventListener('app:i18n:locale_changed', handleLocaleChange);
          elements.form?.removeEventListener('submit', handleSubmit);
          elements.titleInput?.removeEventListener('input', handleInputChange);
          elements.dueInput?.removeEventListener('input', handleInputChange);
          elements.statusSelect?.removeEventListener('change', handleInputChange);
          container.removeAttribute('data-miniapp-panel');
          container.classList.remove('miniapp-task-manager__mount');
          if (elements.root && container.contains(elements.root)) {
            container.removeChild(elements.root);
          }
        },
      };
    },
  };
}

export default createModule;
