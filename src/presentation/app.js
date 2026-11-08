import { addDays, startOfWeek, toISODate } from "../domain/dates.js";
import {
  AREAS,
  PRIORITIES,
  compareTasksBySchedule,
  formatTaskTime,
  expandTaskOccurrences,
  normalizeRecurrence,
  normalizeTask,
  normalizeTaskArea,
  normalizeTaskPriority,
  capitalizeTaskTitle,
  taskEndDate,
  taskIncludesDate,
  parseTaskOccurrenceId,
  taskPriorityOrder,
  taskStatus,
} from "../domain/tasks.js";
import {
  moveTaskToBoard as moveTaskBetweenBoards,
  moveTaskToDate as moveTaskBetweenDays,
  saveTask,
  toggleTaskStatus,
  updateTaskSchedule,
  deleteTask,
} from "../application/taskService.js";
const TODAY = toISODate(new Date());
const SECTION_NAMES = {
  inicio: "Visão geral",
  tarefas: "Tarefas",
  planner: "Planner",
  habitos: "Hábitos",
  financas: "Finanças",
  metas: "Metas",
  diario: "Diário",
  ajustes: "Dados e ajustes",
};
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1z"/>',
  refresh: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="m19 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h16a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5"/><path d="M16 14h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
  flag: '<path d="M5 21V5m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5m-5 5V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5m5-5v12"/>',
  heart: '<path d="M20.8 8.6c0 4.5-8.8 10-8.8 10s-8.8-5.5-8.8-10A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
};

let state = { tasks: [], habits: [], transactions: [], goals: [], entries: [], theme: "light" };
let activeSection = "inicio";
let taskSearch = "";
let taskView = "weekly";
let plannerDate = TODAY;
let plannerView = "week";
let plannerDragOffsetY = 0;
let plannerDraggedTaskId = "";
let draggedTaskId = "";
let selectedMood = "🙂";
let lastSavedJSON = null;
let stateRepository;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ICONS.circle}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}

function loadState() {
  try {
    const saved = stateRepository.read();
    if (!saved) {
      lastSavedJSON = JSON.stringify(state);
      return;
    }
    const parsed = JSON.parse(saved);
    const collections = ["tasks", "habits", "transactions", "goals", "entries"];
    if (!parsed || collections.some((key) => !Array.isArray(parsed[key]))) {
      throw new Error("O arquivo local não tem o formato esperado.");
    }
    state = {
      tasks: parsed.tasks.filter((item) => item && typeof item.id === "string" && typeof item.title === "string").map(normalizeTask),
      habits: parsed.habits.filter((item) => item && typeof item.id === "string" && typeof item.title === "string"),
      transactions: parsed.transactions.filter((item) => item && typeof item.id === "string" && typeof item.title === "string"),
      goals: parsed.goals.filter((item) => item && typeof item.id === "string" && typeof item.title === "string"),
      entries: parsed.entries.filter((item) => item && typeof item.id === "string" && typeof item.content === "string"),
      theme: parsed.theme === "dark" ? "dark" : "light",
    };
    lastSavedJSON = JSON.stringify(state);
  } catch (error) {
    console.error("Não foi possível carregar os dados locais:", error);
    state = { tasks: [], habits: [], transactions: [], goals: [], entries: [], theme: "light" };
    lastSavedJSON = JSON.stringify(state);
    window.setTimeout(() => notify("Não foi possível ler os dados salvos. A área foi aberta vazia; confira o console antes de salvar novos dados."), 150);
  }
}

function persist() {
  try {
    lastSavedJSON = stateRepository.write(state);
    updateNavCount();
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados locais:", error);
    if (lastSavedJSON) state = JSON.parse(lastSavedJSON);
    notify("Não foi possível salvar. Verifique o espaço disponível no navegador.");
    return false;
  }
}

function notify(message) {
  const region = document.querySelector("#toast-region");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function formatDate(value, options = { day: "2-digit", month: "short" }) {
  if (!value) return "Sem data";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", options).format(date).replace(".", "");
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function pageHeading(eyebrow, title, description, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function emptyState(iconName, title, text, action = "") {
  return `<section class="empty-state"><span class="empty-symbol">${icon(iconName)}</span><h3>${title}</h3><p>${text}</p>${action}</section>`;
}

function emptyAction(label, action) {
  return `<button class="button button-primary" data-action="${action}">${icon("plus")}${label}</button>`;
}

function updateNavCount() {
  const count = state.tasks.filter((task) => !task.done).length;
  const badge = document.querySelector("#nav-task-count");
  if (badge) badge.textContent = String(count);
}

function updateShell() {
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date()).replace(".", "");
  document.body.classList.toggle("dark", state.theme === "dark");
  const themeToggle = document.querySelector(".theme-toggle");
  themeToggle.querySelector(".nav-icon").innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
  themeToggle.querySelector("span:nth-child(2)").textContent = state.theme === "dark" ? "Modo claro" : "Modo escuro";
  themeToggle.setAttribute("aria-label", state.theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro");
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === activeSection);
    if (button.dataset.nav === "inicio") button.setAttribute("aria-current", activeSection === "inicio" ? "page" : "false");
    else button.setAttribute("aria-current", activeSection === button.dataset.nav ? "page" : "false");
  });
  updateNavCount();
}

function render() {
  updateShell();
  const content = document.querySelector("#page-content");
  const pageScroll = { x: window.scrollX, y: window.scrollY };
  const calendarScroll = [".calendar-scroll", ".calendar-month-wrap"].map((selector) => (
    [...content.querySelectorAll(selector)].map((element) => ({ top: element.scrollTop, left: element.scrollLeft }))
  ));
  const renderers = {
    inicio: renderHome,
    tarefas: renderTasks,
    planner: renderPlanner,
    habitos: renderHabits,
    financas: renderFinances,
    metas: renderGoals,
    diario: renderJournal,
    ajustes: renderSettings,
  };
  content.innerHTML = (renderers[activeSection] ?? renderHome)();
  hydrateIcons(content);
  [".calendar-scroll", ".calendar-month-wrap"].forEach((selector, groupIndex) => {
    content.querySelectorAll(selector).forEach((element, index) => {
      const position = calendarScroll[groupIndex][index];
      if (position) {
        element.scrollTop = position.top;
        element.scrollLeft = position.left;
      }
    });
  });
  window.scrollTo(pageScroll.x, pageScroll.y);
}

function getTodayTasks() {
  return expandTaskOccurrences(state.tasks, TODAY, TODAY).filter((task) => taskIncludesDate(task, TODAY));
}

function getTaskForDate(date) {
  const maxDuration = state.tasks.reduce((longest, task) => {
    if (task.recurrence || !task.date || !taskEndDate(task)) return longest;
    const duration = Math.max(0, Math.round((new Date(`${taskEndDate(task)}T12:00:00`) - new Date(`${task.date}T12:00:00`)) / 86400000));
    return Math.max(longest, duration);
  }, 0);
  return expandTaskOccurrences(state.tasks, addDays(date, -maxDuration), date)
    .filter((task) => taskIncludesDate(task, date));
}

function getTaskById(id) {
  const occurrence = parseTaskOccurrenceId(id);
  return state.tasks.find((task) => task.id === (occurrence?.taskId || id));
}

function currentMonthTransactions() {
  const month = TODAY.slice(0, 7);
  return state.transactions.filter((item) => !item.date || item.date.slice(0, 7) === month);
}

function renderHome() {
  const todayTasks = getTodayTasks();
  const pendingToday = todayTasks.filter((task) => !task.done);
  const completedToday = todayTasks.filter((task) => task.done).length;
  const doneHabits = state.habits.filter((habit) => (habit.days ?? []).includes(TODAY)).length;
  const transactions = currentMonthTransactions();
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const mainGoal = state.goals[0];
  const taskContent = todayTasks.length
    ? `<div class="task-list">${[...todayTasks].sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 5).map(taskRow).join("")}</div>`
    : `<p class="empty-inline">Seu dia ainda está em branco. Adicione uma tarefa para começar a organizar suas prioridades.</p>`;
  const habitsContent = state.habits.length
    ? `<div class="habit-list">${state.habits.slice(0, 4).map(habitRow).join("")}</div>`
    : `<p class="empty-inline">Crie um hábito simples para acompanhar sua constância.</p>`;
  const goalContent = mainGoal
    ? goalMini(mainGoal)
    : `<p class="empty-inline">Defina um objetivo que seja importante para você.</p>`;

  return `
    ${pageHeading("ORGANIZAÇÃO PESSOAL", "Um passo de cada vez", "Um espaço tranquilo para cuidar do que importa hoje.")}
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <section class="welcome-card">
          <div class="welcome-content">
            <p class="eyebrow">SEU DIA, NO SEU RITMO</p>
            <h2>${pendingToday.length ? `Você tem ${pendingToday.length} ${pendingToday.length === 1 ? "prioridade" : "prioridades"} para hoje.` : "Abra espaço para o que importa."}</h2>
            <p>${completedToday ? `Você já concluiu ${completedToday} ${completedToday === 1 ? "tarefa" : "tarefas"} hoje. ` : ""}Organização não precisa ser complicada — comece pelo próximo passo.</p>
            <button class="button welcome-cta" data-action="add-task">Anotar uma tarefa ${icon("arrow")}</button>
          </div>
          <div class="welcome-illustration" aria-hidden="true"><span>m</span></div>
        </section>
        <div class="stats-grid">
          <article class="stat-card"><span class="stat-icon">${icon("check")}</span><div><p class="stat-label">Tarefas de hoje</p><p class="stat-value">${pendingToday.length}</p><p class="stat-note">${completedToday} concluídas</p></div></article>
          <article class="stat-card"><span class="stat-icon green">${icon("spark")}</span><div><p class="stat-label">Hábitos feitos</p><p class="stat-value">${doneHabits}<span style="font-size:12px;color:#a0a3b2"> / ${state.habits.length}</span></p><p class="stat-note">um dia de cada vez</p></div></article>
          <article class="stat-card"><span class="stat-icon orange">${icon("wallet")}</span><div><p class="stat-label">Saldo do mês</p><p class="stat-value" style="font-size:16px">${formatMoney(income - expenses)}</p><p class="stat-note">entradas menos saídas</p></div></article>
        </div>
        <section class="panel">
          <div class="panel-heading"><div><h2>O que vem hoje</h2><p class="panel-subtitle">Suas tarefas para este dia</p></div><button class="text-button" data-nav="tarefas">Ver tarefas ${icon("arrow")}</button></div>
          ${taskContent}
          ${todayTasks.length > 5 ? `<button class="text-button" data-nav="tarefas">Ver mais ${todayTasks.length - 5} tarefas</button>` : ""}
        </section>
      </div>
      <div class="dashboard-aside">
        <section class="panel"><div class="panel-heading"><div><h2>Pequenas constâncias</h2><p class="panel-subtitle">${doneHabits} de ${state.habits.length} feitos hoje</p></div><button class="text-button" data-nav="habitos">Ver todos</button></div>${habitsContent}</section>
        <section class="panel"><div class="panel-heading"><div><h2>Um objetivo em foco</h2><p class="panel-subtitle">Continue avançando no seu ritmo</p></div><button class="text-button" data-nav="metas">Metas</button></div>${goalContent}</section>
        <section class="panel"><div class="panel-heading"><div><h2>Uma nota para você</h2><p class="panel-subtitle">Registre como está se sentindo</p></div>${icon("book")}</div><p class="empty-inline">${state.entries.length ? "Suas reflexões ficam só neste aparelho." : "O diário é um espaço seu, sem cobranças."}</p><button class="text-button" data-nav="diario">Abrir diário ${icon("arrow")}</button></section>
      </div>
    </div>`;
}

function taskRow(task) {
  return `<div class="task-row">
    <button class="check-button ${task.done ? "is-done" : ""}" data-action="toggle-task" data-id="${escapeAttr(task.id)}" aria-label="${task.done ? "Reabrir" : "Concluir"} ${escapeAttr(task.title)}">${task.done ? icon("check") : ""}</button>
    <div class="task-copy"><p class="task-title ${task.done ? "is-done" : ""}">${escapeHTML(task.title)}</p>${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}<div class="task-meta">${task.date && taskEndDate(task) !== task.date ? `<span>${formatDate(task.date)} – ${formatDate(taskEndDate(task))}</span>` : ""}${formatTaskTime(task) ? `<span>${escapeHTML(formatTaskTime(task))}</span>` : ""}${task.recurrence ? `<span class="tag task-recurrence-tag">${icon("refresh")}${recurrenceLabel(task.recurrence.frequency)}</span>` : ""}${task.area ? `<span class="tag">${escapeHTML(task.area)}</span>` : ""}</div></div>
    <div class="task-actions"><button class="small-icon-button" data-action="edit-task" data-id="${escapeAttr(task.id)}" aria-label="Editar ${escapeAttr(task.title)}">${icon("edit")}</button><button class="small-icon-button" data-action="delete-task" data-id="${escapeAttr(task.id)}" aria-label="Excluir ${escapeAttr(task.title)}">${icon("trash")}</button></div>
  </div>`;
}

function recurrenceLabel(frequency) {
  return ({ daily: "Diária", weekly: "Semanal", monthly: "Mensal" })[frequency] || "";
}

function taskViewButtons() {
  const views = [
    ["weekly", "Dia a Dia"],
    ["kanban", "Kanban"],
    ["eisenhower", "Eisenhower"],
  ];
  return `<div class="task-view-switch" role="group" aria-label="Visualização das tarefas">${views.map(([view, label]) => `<button class="filter-chip ${taskView === view ? "is-active" : ""}" data-task-view="${view}" aria-pressed="${taskView === view}">${label}</button>`).join("")}</div>`;
}

function taskViewCard(task, showDate = true, draggable = false) {
  return `<article class="task-view-card ${taskStatus(task) === "done" ? "is-complete" : ""}" ${draggable && !task.occurrenceDate ? `draggable="true" data-task-card-id="${escapeAttr(task.id)}"` : ""}>
    <button class="task-view-title" data-action="edit-task" data-id="${escapeAttr(task.id)}">${escapeHTML(task.title)}</button>
    <div class="task-meta">${showDate ? task.date ? `<span>${escapeHTML(formatDate(task.date, { day: "2-digit", month: "short" }))}</span>` : `<span>Sem data</span>` : ""}${task.time ? `<span>${escapeHTML(formatTaskTime(task))}</span>` : ""}${task.recurrence ? `<span class="tag task-recurrence-tag">${icon("refresh")}${recurrenceLabel(task.recurrence.frequency)}</span>` : ""}</div>
  </article>`;
}

function renderWeeklyTasks(tasks) {
  const overdueTasks = tasks.filter((task) => task.date && taskEndDate(task) < TODAY && !task.done)
    .sort(compareTasksBySchedule);
  const latestOverdueBySeries = new Map();
  overdueTasks.forEach((task) => {
    if (task.seriesId) latestOverdueBySeries.set(task.seriesId, task);
  });
  const visibleOverdueTasks = overdueTasks.filter((task) => !task.seriesId || latestOverdueBySeries.get(task.seriesId) === task);
  const overdueColumn = `<section class="task-day-column task-overdue-column"><h2>Em atraso<span>${visibleOverdueTasks.length}</span></h2>${visibleOverdueTasks.length ? visibleOverdueTasks.map((task) => taskViewCard(task, true, true)).join("") : `<p class="task-view-empty">Sem tarefas</p>`}</section>`;
  const dates = Array.from({ length: 4 }, (_, index) => addDays(TODAY, index));
  const days = dates.map((date, index) => {
    const dayTasks = tasks.filter((task) => taskIncludesDate(task, date)).sort((a, b) => (
      (a.time || "99:99").localeCompare(b.time || "99:99") || (a.date || "").localeCompare(b.date || "")
    ));
    const heading = formatDate(date, { weekday: "long", day: "numeric", month: "short" });
    const todayTasks = getTodayTasks();
    const completedToday = todayTasks.filter((task) => task.done).length;
    const progress = index === 0 ? `<span class="task-day-progress" aria-label="${completedToday} de ${todayTasks.length} tarefas concluídas">${completedToday}/${todayTasks.length}</span>` : "";
    return `<section class="task-day-column" data-week-date="${date}"><h2><span class="task-day-heading">${escapeHTML(heading)}${index === 0 ? `<small>Hoje</small>` : ""}</span>${progress}</h2>${dayTasks.length ? dayTasks.map((task) => taskViewCard(task, true, true)).join("") : `<p class="task-view-empty">Sem tarefas</p>`}</section>`;
  }).join("");
  const undatedTasks = tasks.filter((task) => !task.date).sort(compareTasksBySchedule);
  return `<div class="task-week-grid">${overdueColumn}${days}</div>${undatedTasks.length ? `<section class="task-undated-group"><h2>Sem data</h2><div class="task-view-card-list">${undatedTasks.map((task) => taskViewCard(task, true, true)).join("")}</div></section>` : ""}`;
}

function renderKanbanTasks(tasks) {
  const columns = [
    ["todo", "A Fazer"],
    ["doing", "Fazendo"],
    ["done", "Feito"],
  ];
  return `<div class="task-kanban">${columns.map(([status, label]) => {
    const columnTasks = tasks.filter((task) => taskStatus(task) === status)
      .sort((a, b) => compareTasksBySchedule(a, b) || taskPriorityOrder(a) - taskPriorityOrder(b));
    return `<section class="task-kanban-column" data-task-status="${status}"><h2>${label}<span>${columnTasks.length}</span></h2>${columnTasks.length ? columnTasks.map((task) => taskViewCard(task, true, true)).join("") : `<p class="task-view-empty">Nenhuma tarefa</p>`}</section>`;
  }).join("")}</div>`;
}

function renderEisenhowerTasks(tasks) {
  return `<div class="task-eisenhower-grid">${PRIORITIES.map((priority) => {
    const quadrantTasks = tasks.filter((task) => normalizeTaskPriority(task.priority) === priority).sort(compareTasksBySchedule);
    return `<section class="task-eisenhower-quadrant" data-task-priority="${escapeAttr(priority)}"><h2>${escapeHTML(priority)}<span>${quadrantTasks.length}</span></h2>${quadrantTasks.length ? quadrantTasks.map((task) => taskViewCard(task, true, true)).join("") : `<p class="task-view-empty">Nenhuma tarefa</p>`}</section>`;
  }).join("")}</div>`;
}

function habitRow(habit) {
  const done = (habit.days ?? []).includes(TODAY);
  const streak = getStreak(habit);
  return `<div class="habit-row"><span class="habit-emoji">${escapeHTML(habit.emoji || "✦")}</span><span class="habit-name">${escapeHTML(habit.title)}</span><span class="habit-streak">${streak} ${streak === 1 ? "dia" : "dias"}</span><button class="check-button habit-toggle ${done ? "is-done" : ""}" data-action="toggle-habit" data-id="${escapeAttr(habit.id)}" aria-label="${done ? "Desmarcar" : "Marcar"} ${escapeAttr(habit.title)}">${done ? icon("check") : ""}</button></div>`;
}

function goalMini(goal) {
  const progress = goal.target > 0 ? Math.min(100, Math.round((Number(goal.current) / Number(goal.target)) * 100)) : 0;
  return `<div class="goal-mini"><span class="goal-symbol">${icon("target")}</span><div class="goal-info"><strong>${escapeHTML(goal.title)}</strong><span>${formatMoney(goal.current)} de ${formatMoney(goal.target)}</span><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div></div></div>`;
}

function renderTasks() {
  const query = taskSearch.trim().toLocaleLowerCase("pt-BR");
  let allTasks = [...state.tasks];
  if (query) allTasks = allTasks.filter((task) => `${task.title} ${task.area} ${task.priority}`.toLocaleLowerCase("pt-BR").includes(query));
  if (taskView !== "weekly") {
    const content = taskView === "kanban" ? renderKanbanTasks(allTasks) : renderEisenhowerTasks(allTasks);
    return `
      ${pageHeading("TUDO COMEÇA POR AQUI", "Tarefas", "Tire as ideias da cabeça e organize o próximo passo.", emptyAction("Nova tarefa", "add-task"))}
      <div class="task-view-toolbar">${taskViewButtons()}<label class="search-box">${icon("search")}<input type="search" id="task-search" placeholder="Buscar uma tarefa" value="${escapeAttr(taskSearch)}" aria-label="Buscar uma tarefa"></label></div>
      <div class="task-page-list">${content}</div>`;
  }
  const tasks = taskView === "weekly"
    ? expandTaskOccurrences(allTasks, addDays(TODAY, -30), addDays(TODAY, 3), { includePastFinal: true })
    : allTasks;
  return `
    ${pageHeading("TUDO COMEÇA POR AQUI", "Tarefas", "Tire as ideias da cabeça e organize o próximo passo.", emptyAction("Nova tarefa", "add-task"))}
    <div class="task-view-toolbar">${taskViewButtons()}</div>
    <div class="toolbar"><label class="search-box">${icon("search")}<input type="search" id="task-search" placeholder="Buscar uma tarefa" value="${escapeAttr(taskSearch)}" aria-label="Buscar uma tarefa"></label></div>
    <div class="task-page-list">${renderWeeklyTasks(tasks)}</div>`;
}

function getPlannerDates() {
  if (plannerView === "day") return [plannerDate];
  if (plannerView === "week") {
    const start = startOfWeek(plannerDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return toISODate(date);
    });
  }

  const monthStart = new Date(`${plannerDate.slice(0, 7)}-01T12:00:00`);
  const firstDay = new Date(monthStart);
  firstDay.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12);
  const totalDays = Math.ceil((((monthStart.getDay() + 6) % 7) + lastDay.getDate()) / 7) * 7;
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return toISODate(date);
  });
}

function plannerRangeLabel(dates) {
  if (plannerView === "day") {
    return formatDate(plannerDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (plannerView === "month") {
    return formatDate(plannerDate, { month: "long", year: "numeric" });
  }
  return `${formatDate(dates[0], { day: "2-digit", month: "short" })} — ${formatDate(dates[6], { day: "2-digit", month: "short", year: "numeric" })}`;
}

function plannerTaskCard(task, showDate = false, timedGrid = false, dayIndex = 0, segment = null) {
  const areaIndex = AREAS.indexOf(normalizeTaskArea(task.area));
  const recurringOccurrence = Boolean(task.occurrenceDate);
  const minuteOffset = segment?.startMinutes % 60 || 0;
  const startMinutes = segment?.startMinutes ?? (task.time ? Number(task.time.slice(0, 2)) * 60 + Number(task.time.slice(3, 5)) : 0);
  const endMinutes = segment?.endMinutes ?? (task.endTime ? Number(task.endTime.slice(0, 2)) * 60 + Number(task.endTime.slice(3, 5)) : startMinutes + 60);
  const eventDuration = endMinutes - startMinutes;
  const rowSpan = Math.max(1, Math.ceil((minuteOffset + eventDuration) / 60));
  const eventStyle = timedGrid
    ? ` style="grid-column:${dayIndex + 2};grid-row:${Math.floor(startMinutes / 60) + 3}/span ${rowSpan};margin-top:${minuteOffset / 60 * 56 + 3}px;height:${Math.max(34, eventDuration / 60 * 56 - 6)}px"`
    : "";
  const segmentDate = segment?.date || task.date || "";
  const segmentTime = segment?.startTime ?? task.time ?? "";
  const eventMeta = showDate && segment?.isStart ? formatTaskTime(task) : "";
  const dateHandles = !recurringOccurrence ? `${segment?.isStart ? `<span class="calendar-resize-handle resize-date-start" data-resize-edge="start-date" aria-hidden="true"></span>` : ""}${segment?.isEnd ? `<span class="calendar-resize-handle resize-date-end" data-resize-edge="end-date" aria-hidden="true"></span>` : ""}` : "";
  const timeHandles = timedGrid && !recurringOccurrence ? `${segment?.isStart ? `<span class="calendar-resize-handle resize-time-start" data-resize-edge="start-time" aria-hidden="true"></span>` : ""}${segment?.isEnd ? `<span class="calendar-resize-handle resize-time-end" data-resize-edge="end-time" aria-hidden="true"></span>` : ""}` : "";
  return `<button class="calendar-event area-color-${areaIndex} ${task.done ? "is-complete" : ""} ${timedGrid ? "calendar-event--timed" : ""} ${segment?.continuesBefore ? "continues-before" : ""} ${segment?.continuesAfter ? "continues-after" : ""}"${eventStyle} data-action="edit-task" data-id="${escapeAttr(task.id)}" data-calendar-date="${escapeAttr(segmentDate)}" data-calendar-time="${escapeAttr(segmentTime)}" draggable="${!recurringOccurrence}" aria-label="Editar ${escapeAttr(task.title)}${task.recurrence ? `, repetição ${escapeAttr(recurrenceLabel(task.recurrence.frequency))}` : ""}${formatTaskTime(task) ? ` no horário ${escapeAttr(formatTaskTime(task))}` : ""}">
    <span class="calendar-event-title">${escapeHTML(task.title)}</span>
    ${showDate && eventMeta ? `<span class="calendar-event-meta">${escapeHTML(eventMeta)}</span>` : ""}
    ${dateHandles}${timeHandles}
  </button>`;
}

function plannerDayHeader(date) {
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(`${date}T12:00:00`)).replace(".", "");
  const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric" }).format(new Date(`${date}T12:00:00`));
  return `<div class="calendar-day-heading ${date === TODAY ? "is-today" : ""}"><span>${weekday}</span><button data-action="planner-select-day" data-date="${date}" aria-label="Ver ${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}">${day}</button></div>`;
}

function renderUntimedLane(dates) {
  return `<div class="calendar-lane-row">
    <div class="calendar-lane-label">Sem horário</div>
    ${dates.map((date) => {
      const tasks = getTaskForDate(date).filter((task) => !task.time);
      return `<div class="calendar-lane-cell" data-calendar-date="${date}">${tasks.map((task) => plannerTaskCard(task, false, false, 0, { date, isStart: date === task.date, isEnd: date === taskEndDate(task) })).join("")}</div>`;
    }).join("")}
  </div>`;
}

function renderDayWeekGrid(dates) {
  const columns = `54px repeat(${dates.length}, minmax(${plannerView === "day" ? "320px" : "105px"}, 1fr))`;
  const timedTasks = dates.flatMap((date, dayIndex) => getTaskForDate(date)
    .filter((task) => task.time)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((task) => {
      const startDate = task.date;
      const endDate = taskEndDate(task);
      const isStart = date === startDate;
      const isEnd = date === endDate;
      const startMinutes = Number(task.time.slice(0, 2)) * 60 + Number(task.time.slice(3, 5));
      const endMinutes = task.endTime
        ? Number(task.endTime.slice(0, 2)) * 60 + Number(task.endTime.slice(3, 5))
        : Math.min(1440, startMinutes + 60);
      return plannerTaskCard(task, false, true, dayIndex, {
        date, startMinutes, endMinutes, startTime: task.time, isStart, isEnd,
      });
    })).join("");
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const timeLabel = `${String(hour).padStart(2, "0")}:00`;
    const cells = dates.map((date) => {
      return `<div class="calendar-hour-cell" data-calendar-date="${date}" data-calendar-time="${timeLabel}">
        <button class="calendar-slot" data-action="add-planner-task" data-date="${date}" data-time="${timeLabel}" aria-label="Adicionar tarefa em ${formatDate(date, { day: "numeric", month: "long" })} às ${timeLabel}"></button>
      </div>`;
    }).join("");
    return `<div class="calendar-hour-row" style="grid-column:1 / -1;grid-row:${hour + 3};grid-template-columns:${columns}"><div class="calendar-hour-label">${timeLabel}</div>${cells}</div>`;
  }).join("");

  return `<div class="calendar-scroll"><div class="calendar-time-grid" style="--calendar-columns:${columns};--calendar-min-width:${plannerView === "day" ? "374px" : "790px"}">
    <div class="calendar-header-row" style="grid-template-columns:${columns}"><div class="calendar-hour-label"></div>${dates.map(plannerDayHeader).join("")}</div>
    ${renderUntimedLane(dates)}
    ${hours}
    ${timedTasks}
  </div></div>`;
}

function renderMonthGrid(dates) {
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const headers = weekdays.map((weekday) => `<div class="calendar-month-weekday">${weekday}</div>`).join("");
  const cells = dates.map((date, index) => {
    const inMonth = date.slice(0, 7) === plannerDate.slice(0, 7);
    const tasks = getTaskForDate(date).filter((task) => task.time).sort((a, b) => a.time.localeCompare(b.time));
    const taskCards = tasks.slice(0, 4).map((task) => {
      const isStart = date === task.date;
      const isEnd = date === taskEndDate(task);
      return plannerTaskCard(task, true, false, 0, {
        date, isStart, isEnd, startTime: task.time,
      });
    }).join("");
    return `<section class="calendar-month-cell ${inMonth ? "" : "is-outside-month"} ${date === TODAY ? "is-today" : ""}" data-calendar-date="${date}" style="grid-row:${Math.floor(index / 7) + 2}">
      <button class="calendar-month-date" data-action="planner-select-day" data-date="${date}" aria-label="Ver ${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}">${Number(date.slice(-2))}</button>
      <div class="calendar-month-events">${taskCards}${tasks.length > 4 ? `<span class="calendar-more-tasks">+${tasks.length - 4} tarefas</span>` : ""}</div>
    </section>`;
  }).join("");
  return `<div class="calendar-month-wrap"><div class="calendar-month-grid" style="grid-template-rows:30px repeat(${dates.length / 7}, minmax(110px, 1fr))">${headers}${cells}</div></div>`;
}

function renderPlanner() {
  const dates = getPlannerDates();
  const tasksWithoutDate = state.tasks.filter((task) => !task.date);
  const viewButtons = [
    ["day", "Dia"],
    ["week", "Semana"],
    ["month", "Mês"],
  ].map(([view, label]) => `<button class="planner-view-button ${plannerView === view ? "is-active" : ""}" data-action="planner-view" data-view="${view}" aria-pressed="${plannerView === view}">${label}</button>`).join("");
  const undatedTasks = `<section class="calendar-undated calendar-undated-drop" data-drop-zone="undated"><div class="calendar-undated-heading"><span>Tarefas sem data</span><small>${tasksWithoutDate.length}</small></div><div class="calendar-undated-list">${tasksWithoutDate.map((task) => plannerTaskCard(task)).join("")}${tasksWithoutDate.length ? "" : `<span class="calendar-lane-empty">Arraste tarefas para cá para remover a data.</span>`}<button class="calendar-add-untimed" data-action="add-planner-task" aria-label="Adicionar tarefa sem data">+</button></div></section>`;
  const monthUntimedLane = plannerView === "month" ? `<section class="calendar-undated calendar-month-untimed"><div class="calendar-undated-heading"><span>Tarefas sem horário</span><small>Escolha uma data para agendá-las</small></div><div class="calendar-undated-list">${dates.flatMap((date) => getTaskForDate(date).filter((task) => !task.time).map((task) => plannerTaskCard(task, true, false, 0, { date, isStart: date === task.date, isEnd: date === taskEndDate(task) }))).join("") || `<span class="calendar-lane-empty">Nenhuma tarefa sem horário neste mês.</span>`}</div></section>` : "";
  return `
    ${pageHeading("UM OLHAR MAIS AMPLO", "Planner", "Enxergue sua semana com calma e sem deixar nada escapar.", emptyAction("Planejar tarefa", "add-task"))}
    <section class="panel planner-panel">
      <div class="panel-heading planner-toolbar">
        <div><h2>Calendário</h2><p class="panel-subtitle">${plannerRangeLabel(dates)}</p></div>
        <div class="planner-controls"><div class="planner-view-switch" role="group" aria-label="Visualização do calendário">${viewButtons}</div><div class="planner-actions"><button class="icon-button" data-action="planner-shift" data-step="-1" aria-label="Período anterior">‹</button><button class="button button-secondary" data-action="planner-today">Hoje</button><button class="icon-button" data-action="planner-shift" data-step="1" aria-label="Próximo período">›</button></div></div>
      </div>
      ${undatedTasks}
      ${plannerView === "month" ? monthUntimedLane + renderMonthGrid(dates) : renderDayWeekGrid(dates)}
      <p class="calendar-help">Arraste tarefas para mudar o início. Use as alças nas bordas para ajustar as datas e, na visualização de dia/semana, os horários.</p>
    </section>`;
}

function movePlannerTask(taskId, dropTarget, clientY) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const target = dropTarget.closest(".calendar-event, .calendar-hour-cell, .calendar-lane-cell, .calendar-month-cell, .calendar-undated-drop");
  if (!target || !target.closest(".planner-panel")) return;

  let date = target.dataset.calendarDate || "";
  const durationDays = task.date && taskEndDate(task)
    ? Math.round((new Date(`${taskEndDate(task)}T12:00:00`) - new Date(`${task.date}T12:00:00`)) / 86400000)
    : 0;
  let endDate = date ? addDays(date, durationDays) : "";
  let time = task.time || "";
  let endTime = task.endTime || "";
  const setTime = (startMinutes) => {
    if (task.time && task.endTime) {
      const oldStart = Number(task.time.slice(0, 2)) * 60 + Number(task.time.slice(3, 5));
      const oldEnd = Number(task.endTime.slice(0, 2)) * 60 + Number(task.endTime.slice(3, 5));
      const duration = oldEnd - oldStart;
      startMinutes = Math.min(startMinutes, Math.floor((1439 - duration) / 15) * 15);
      endTime = `${String(Math.floor((startMinutes + duration) / 60)).padStart(2, "0")}:${String((startMinutes + duration) % 60).padStart(2, "0")}`;
    }
    time = `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`;
  };

  if (target.matches(".calendar-undated-drop")) {
    date = "";
    time = "";
    endTime = "";
  } else if (target.matches(".calendar-hour-cell")) {
    const dropTime = plannerDropTimeAtPoint(clientY - plannerDragOffsetY) || target.dataset.calendarTime;
    const [hour, minute] = dropTime.split(":").map(Number);
    setTime(hour * 60 + minute);
  } else if (target.matches(".calendar-lane-cell")) {
    time = "";
    endTime = "";
  } else if (target.matches(".calendar-event")) {
    if (target.dataset.calendarTime) {
      const dropTime = plannerDropTimeAtPoint(clientY - plannerDragOffsetY) || target.dataset.calendarTime;
      const [hour, minute] = dropTime.split(":").map(Number);
      setTime(hour * 60 + minute);
    } else {
      time = "";
      endTime = "";
    }
  }

  if (task.date === date && taskEndDate(task) === endDate && task.time === time && task.endTime === endTime) return;
  state.tasks = updateTaskSchedule(state.tasks, taskId, { date, endDate, time, endTime });
  if (!persist()) {
    render();
    return;
  }
  render();
}

function moveTaskToBoard(taskId, target) {
  const status = target.closest(".task-kanban-column")?.dataset.taskStatus;
  const priority = target.closest(".task-eisenhower-quadrant")?.dataset.taskPriority;
  if (!status && !priority) return;
  const updatedTasks = moveTaskBetweenBoards(state.tasks, taskId, { status, priority });
  if (updatedTasks === state.tasks) return;
  state.tasks = updatedTasks;
  if (!persist()) { render(); return; }
  render();
}

function moveTaskToDate(taskId, date) {
  const updatedTasks = moveTaskBetweenDays(state.tasks, taskId, date);
  if (updatedTasks === state.tasks) return;
  state.tasks = updatedTasks;
  if (!persist()) { render(); return; }
  render();
}

let plannerResize = null;

function plannerDateAtPoint(x, y) {
  if (plannerView !== "month") {
    const heading = [...document.querySelectorAll(".planner-panel .calendar-day-heading button[data-date]")].find((item) => {
      const rect = item.parentElement.getBoundingClientRect();
      return x >= rect.left && x <= rect.right;
    });
    if (heading) return heading.dataset.date;
  }
  const hit = document.elementFromPoint(x, y)?.closest(".calendar-hour-cell, .calendar-lane-cell, .calendar-month-cell, .calendar-event");
  return hit?.closest(".planner-panel") ? hit.dataset.calendarDate || "" : "";
}

function plannerTimeAtPoint(y) {
  const row = plannerHourRowAtPoint(y);
  if (!row) return "";
  const rect = row.getBoundingClientRect();
  const hour = Number(row.querySelector(".calendar-slot").dataset.time.slice(0, 2));
  const minute = Math.min(45, Math.max(0, Math.round(((y - rect.top) / rect.height * 60) / 15) * 15));
  const minutes = hour * 60 + minute;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function plannerHourRowAtPoint(y) {
  return [...document.querySelectorAll(".planner-panel .calendar-hour-row")].find((item) => {
    const rect = item.getBoundingClientRect();
    return y >= rect.top && y <= rect.bottom;
  });
}

function plannerDropTimeAtPoint(y) {
  const time = plannerTimeAtPoint(y);
  const task = state.tasks.find((item) => item.id === plannerDraggedTaskId);
  if (!time || !task?.time || !task.endTime) return time;
  const originalStart = Number(task.time.slice(0, 2)) * 60 + Number(task.time.slice(3, 5));
  const originalEnd = Number(task.endTime.slice(0, 2)) * 60 + Number(task.endTime.slice(3, 5));
  const duration = originalEnd - originalStart;
  const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const adjustedStart = Math.min(start, Math.floor((1439 - duration) / 15) * 15);
  return `${String(Math.floor(adjustedStart / 60)).padStart(2, "0")}:${String(adjustedStart % 60).padStart(2, "0")}`;
}

function clearPlannerSnapIndicator() {
  document.querySelectorAll(".planner-snap-indicator").forEach((indicator) => indicator.remove());
}

function showPlannerSnapIndicator(time, date, y) {
  clearPlannerSnapIndicator();
  const row = plannerHourRowAtPoint(y);
  const cell = row && [...row.querySelectorAll(".calendar-hour-cell")].find((item) => item.dataset.calendarDate === date);
  if (!cell || !time) return;

  const minute = Number(time.slice(3, 5));
  const indicator = document.createElement("div");
  indicator.className = "planner-snap-indicator";
  indicator.style.top = `${minute / 60 * cell.clientHeight}px`;
  indicator.dataset.time = time;
  cell.append(indicator);
}

function updatePlannerSnapIndicator(event, target) {
  const date = target.dataset.calendarDate || "";
  const anchorY = event.clientY - plannerDragOffsetY;
  const time = plannerDropTimeAtPoint(anchorY);
  showPlannerSnapIndicator(time, date, anchorY);
}

function resizePlannerTask(taskId, edge, value) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !value) return;
  let updated = { ...task };
  if (edge === "start-date" && value <= taskEndDate(task)) updated.date = value;
  else if (edge === "end-date" && value >= task.date) updated.endDate = value;
  else if (edge === "start-time") {
    if (task.endTime && value >= task.endTime) return;
    updated.time = value;
  } else if (edge === "end-time") {
    if (task.time && value <= task.time) return;
    updated.endTime = value;
  }
  if (updated.date === task.date && updated.endDate === taskEndDate(task)
    && updated.time === task.time && updated.endTime === task.endTime) return;
  state.tasks = updateTaskSchedule(state.tasks, taskId, updated);
  if (!persist()) {
    render();
    return;
  }
  render();
}

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".planner-panel .calendar-resize-handle");
  if (!handle) return;
  const card = handle.closest(".calendar-event");
  if (!card) return;
  event.preventDefault();
  event.stopPropagation();
  plannerResize = {
    id: card.dataset.id,
    edge: handle.dataset.resizeEdge,
    date: card.dataset.calendarDate || "",
    pointerId: event.pointerId,
    value: "",
  };
  clearPlannerSnapIndicator();
  card.classList.add("is-resizing");
  handle.setPointerCapture(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  if (!plannerResize || event.pointerId !== plannerResize.pointerId) return;
  plannerResize.value = plannerResize.edge.endsWith("-date")
    ? plannerDateAtPoint(event.clientX, event.clientY)
    : plannerTimeAtPoint(event.clientY);
  if (plannerResize.edge.endsWith("-time")) {
    showPlannerSnapIndicator(plannerResize.value, plannerResize.date, event.clientY);
  } else {
    clearPlannerSnapIndicator();
  }
});

document.addEventListener("pointerup", (event) => {
  if (!plannerResize || event.pointerId !== plannerResize.pointerId) return;
  const resize = plannerResize;
  plannerResize = null;
  clearPlannerSnapIndicator();
  document.querySelectorAll(".is-resizing").forEach((card) => card.classList.remove("is-resizing"));
  resizePlannerTask(resize.id, resize.edge, resize.value);
});

document.addEventListener("pointercancel", () => {
  plannerResize = null;
  clearPlannerSnapIndicator();
  document.querySelectorAll(".is-resizing").forEach((card) => card.classList.remove("is-resizing"));
});

document.addEventListener("dragstart", (event) => {
  if (event.target.closest(".calendar-resize-handle")) {
    event.preventDefault();
    return;
  }
  const boardCard = event.target.closest(".task-view-card[draggable='true']");
  if (boardCard && event.dataTransfer) {
    draggedTaskId = boardCard.dataset.taskCardId;
    event.dataTransfer.setData("text/plain", draggedTaskId);
    event.dataTransfer.effectAllowed = "move";
    boardCard.classList.add("is-dragging");
    return;
  }
  const taskCard = event.target.closest(".planner-panel .calendar-event[draggable='true']");
  if (!taskCard || !event.dataTransfer) return;
  plannerDragOffsetY = Math.max(0, event.clientY - taskCard.getBoundingClientRect().top);
  plannerDraggedTaskId = taskCard.dataset.id;
  event.dataTransfer.setData("text/plain", taskCard.dataset.id);
  event.dataTransfer.effectAllowed = "move";
  taskCard.classList.add("is-dragging");
});

document.addEventListener("dragover", (event) => {
  const boardTarget = event.target.closest(".task-kanban-column[data-task-status], .task-eisenhower-quadrant[data-task-priority]");
  if (boardTarget && draggedTaskId) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".is-drop-target").forEach((item) => {
      if (item !== boardTarget) item.classList.remove("is-drop-target");
    });
    boardTarget.classList.add("is-drop-target");
    return;
  }
  const dayTarget = event.target.closest(".task-day-column[data-week-date]");
  if (dayTarget && draggedTaskId) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".is-drop-target").forEach((item) => {
      if (item !== dayTarget) item.classList.remove("is-drop-target");
    });
    dayTarget.classList.add("is-drop-target");
    return;
  }
  const target = event.target.closest(".planner-panel .calendar-event, .planner-panel .calendar-hour-cell, .planner-panel .calendar-lane-cell, .planner-panel .calendar-month-cell, .planner-panel .calendar-undated-drop");
  if (!target) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".is-drop-target").forEach((item) => {
    if (item !== target && !item.contains(target)) item.classList.remove("is-drop-target");
  });
  target.classList.add("is-drop-target");
  if (target.matches(".calendar-hour-cell, .calendar-event[data-calendar-time]")) {
    updatePlannerSnapIndicator(event, target);
  } else {
    clearPlannerSnapIndicator();
  }
});

document.addEventListener("dragleave", (event) => {
  const target = event.target.closest(".is-drop-target");
  if (target && !target.contains(event.relatedTarget)) target.classList.remove("is-drop-target");
  const indicatorCell = document.querySelector(".planner-snap-indicator")?.parentElement;
  if (indicatorCell && !indicatorCell.contains(event.relatedTarget)) clearPlannerSnapIndicator();
});

document.addEventListener("drop", (event) => {
  const boardTarget = event.target.closest(".task-kanban-column[data-task-status], .task-eisenhower-quadrant[data-task-priority]");
  if (boardTarget && event.dataTransfer) {
    event.preventDefault();
    moveTaskToBoard(event.dataTransfer.getData("text/plain") || draggedTaskId, boardTarget);
    boardTarget.classList.remove("is-drop-target");
    document.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
    draggedTaskId = "";
    return;
  }
  const dayTarget = event.target.closest(".task-day-column[data-week-date]");
  if (dayTarget && event.dataTransfer) {
    event.preventDefault();
    moveTaskToDate(event.dataTransfer.getData("text/plain") || draggedTaskId, dayTarget.dataset.weekDate);
    dayTarget.classList.remove("is-drop-target");
    document.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
    draggedTaskId = "";
    return;
  }
  const target = event.target.closest(".planner-panel .calendar-event, .planner-panel .calendar-hour-cell, .planner-panel .calendar-lane-cell, .planner-panel .calendar-month-cell, .planner-panel .calendar-undated-drop");
  if (!target || !event.dataTransfer) return;
  event.preventDefault();
  movePlannerTask(event.dataTransfer.getData("text/plain"), target, event.clientY);
  document.querySelectorAll(".is-drop-target, .is-dragging").forEach((element) => element.classList.remove("is-drop-target", "is-dragging"));
  clearPlannerSnapIndicator();
});

document.addEventListener("dragend", (event) => {
  event.target.closest(".is-dragging")?.classList.remove("is-dragging");
  draggedTaskId = "";
  document.querySelectorAll(".is-drop-target").forEach((element) => element.classList.remove("is-drop-target"));
  clearPlannerSnapIndicator();
  plannerDraggedTaskId = "";
  plannerDragOffsetY = 0;
});

function getStreak(habit) {
  const days = new Set(habit.days ?? []);
  const cursor = new Date(`${TODAY}T12:00:00`);
  let streak = 0;
  while (days.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHabits() {
  const done = state.habits.filter((habit) => (habit.days ?? []).includes(TODAY)).length;
  return `
    ${pageHeading("PEQUENAS AÇÕES, GRANDES MUDANÇAS", "Hábitos", "Acompanhe o que você quer cultivar, um dia de cada vez.", emptyAction("Novo hábito", "add-habit"))}
    <section class="welcome-card" style="min-height:145px;margin-bottom:16px"><div class="welcome-content"><p class="eyebrow">CONSTÂNCIA SEM PRESSA</p><h2>${done} de ${state.habits.length} ${state.habits.length === 1 ? "hábito feito" : "hábitos feitos"} hoje</h2><p>Pequeno também é progresso. Marque o que você fez e siga no seu ritmo.</p></div><div class="welcome-illustration" aria-hidden="true"><span>✦</span></div></section>
    ${state.habits.length ? `<section class="panel"><div class="panel-heading"><div><h2>Seus hábitos</h2><p class="panel-subtitle">Toque no círculo quando concluir</p></div><span class="tag">${done}/${state.habits.length} hoje</span></div><div class="habit-list">${state.habits.map((habit) => `<div class="habit-card">${habitRow(habit)}<span class="habit-card-streak">${getStreak(habit) ? `Sequência atual: ${getStreak(habit)} ${getStreak(habit) === 1 ? "dia" : "dias"}` : "O primeiro dia começa hoje"}</span><button class="small-icon-button habit-delete" data-action="delete-habit" data-id="${escapeAttr(habit.id)}" aria-label="Excluir ${escapeAttr(habit.title)}">${icon("trash")}</button></div>`).join("")}</div></section>` : emptyState("spark", "Crie um hábito que faça sentido", "Pode ser beber água, caminhar, ler ou simplesmente fazer uma pausa. Escolha algo possível para você.", emptyAction("Criar meu primeiro hábito", "add-habit"))}`;
}

function renderFinances() {
  const monthItems = currentMonthTransactions();
  const income = monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = state.transactions.filter((item) => item.type === "expense" && !item.paid).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const transactions = [...state.transactions].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return `
    ${pageHeading("SEU DINHEIRO, COM MAIS CLAREZA", "Finanças", "Anote entradas e saídas para entender melhor seus caminhos.", emptyAction("Nova movimentação", "add-finance"))}
    <div class="finance-summary">
      <article class="stat-card"><span class="stat-icon green">${icon("trend")}</span><div><p class="stat-label">Entradas no mês</p><p class="stat-value money-positive">${formatMoney(income)}</p></div></article>
      <article class="stat-card"><span class="stat-icon orange">${icon("wallet")}</span><div><p class="stat-label">Saídas no mês</p><p class="stat-value">${formatMoney(expenses)}</p></div></article>
      <article class="stat-card"><span class="stat-icon">${icon("calendar")}</span><div><p class="stat-label">Contas pendentes</p><p class="stat-value">${formatMoney(pending)}</p></div></article>
    </div>
    <section class="panel"><div class="panel-heading"><div><h2>Movimentações</h2><p class="panel-subtitle">Um registro simples do que entra e sai</p></div></div>
      ${transactions.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>DESCRIÇÃO</th><th>DATA</th><th>CATEGORIA</th><th>VALOR</th><th>STATUS</th><th></th></tr></thead><tbody>${transactions.map((item) => `<tr><td><span class="transaction-name"><span class="transaction-icon">${item.type === "income" ? "+" : "−"}</span>${escapeHTML(item.title)}</span></td><td>${formatDate(item.date)}</td><td>${escapeHTML(item.category || "Geral")}</td><td class="${item.type === "income" ? "money-positive" : "money-negative"}">${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}</td><td>${item.type === "income" ? `<span class="status-pill paid">Recebido</span>` : `<button class="status-pill ${item.paid ? "paid" : ""}" data-action="toggle-paid" data-id="${escapeAttr(item.id)}">${item.paid ? "Pago" : "Pendente"}</button>`}</td><td><button class="small-icon-button" data-action="delete-finance" data-id="${escapeAttr(item.id)}" aria-label="Excluir ${escapeAttr(item.title)}">${icon("trash")}</button></td></tr>`).join("")}</tbody></table></div>` : emptyState("wallet", "Seu panorama financeiro começa aqui", "Registre uma entrada ou uma despesa. Os valores ficam salvos apenas neste navegador.", emptyAction("Adicionar movimentação", "add-finance"))}
    </section>`;
}

function renderGoals() {
  return `
    ${pageHeading("PLANOS QUE IMPORTAM PARA VOCÊ", "Metas", "Transforme intenções em passos possíveis e acompanhe seu avanço.", emptyAction("Nova meta", "add-goal"))}
    ${state.goals.length ? `<div class="goal-grid">${state.goals.map((goal) => {
      const progress = goal.target > 0 ? Math.min(100, Math.round((Number(goal.current) / Number(goal.target)) * 100)) : 0;
      return `<article class="goal-card"><div class="goal-card-top"><div><h3>${escapeHTML(goal.title)}</h3><p>${goal.deadline ? `Até ${formatDate(goal.deadline, { day: "numeric", month: "long", year: "numeric" })}` : "Sem prazo definido"}</p></div><span class="goal-percent">${progress}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><div class="goal-numbers"><span>${formatMoney(goal.current)} guardados</span><span>Meta ${formatMoney(goal.target)}</span></div><div class="goal-controls"><button class="button button-secondary" data-action="goal-step" data-id="${escapeAttr(goal.id)}" data-step="-1">− R$ 50</button><button class="button button-secondary" data-action="goal-step" data-id="${escapeAttr(goal.id)}" data-step="1">+ R$ 50</button><button class="small-icon-button" data-action="delete-goal" data-id="${escapeAttr(goal.id)}" aria-label="Excluir meta ${escapeAttr(goal.title)}">${icon("trash")}</button></div></article>`;
    }).join("")}</div>` : emptyState("target", "O que você quer realizar?", "Uma meta pode ser uma viagem, um curso, uma reserva ou qualquer plano que seja seu.", emptyAction("Criar minha primeira meta", "add-goal"))}`;
}

const MOODS = ["😌", "🙂", "😐", "😔", "😣"];

function renderJournal() {
  const entries = [...state.entries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return `
    ${pageHeading("UM ESPAÇO SEU", "Diário", "Escreva sem se preocupar com formato ou frequência.", "")}
    <section class="panel journal-composer"><div class="panel-heading"><div><h2>Como você está hoje?</h2><p class="panel-subtitle">Só você tem acesso a estas palavras neste aparelho.</p></div><span>${icon("lock")}</span></div>
      <form data-form="entry"><textarea name="content" id="journal-text" placeholder="Pode começar com uma frase, uma ideia ou um agradecimento..." required maxlength="3000"></textarea><div class="mood-row"><div class="mood-options" aria-label="Como você está se sentindo?">${MOODS.map((mood) => `<button type="button" class="mood-button ${selectedMood === mood ? "is-active" : ""}" data-mood="${mood}" aria-label="Humor ${mood}" aria-pressed="${selectedMood === mood}">${mood}</button>`).join("")}</div><button class="button button-primary" type="submit">Guardar registro</button></div></form>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2>Suas anotações</h2><p class="panel-subtitle">${entries.length} ${entries.length === 1 ? "registro" : "registros"}</p></div></div>${entries.length ? `<div class="entry-list">${entries.map((entry) => `<article class="entry-card"><div class="entry-top"><span><span class="entry-mood">${escapeHTML(entry.mood || "🙂")}</span>${formatDate(entry.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span><button class="small-icon-button" data-action="edit-entry" data-id="${escapeAttr(entry.id)}" aria-label="Editar anotação">${icon("edit")}</button><button class="small-icon-button" data-action="delete-entry" data-id="${escapeAttr(entry.id)}" aria-label="Excluir anotação">${icon("trash")}</button></span></div><p class="entry-content">${escapeHTML(entry.content)}</p></article>`).join("")}</div>` : `<p class="empty-inline">Seus registros aparecerão aqui quando você escrever.</p>`}</section>`;
}

function renderSettings() {
  return `
    ${pageHeading("VOCÊ NO CONTROLE", "Dados e ajustes", "Escolha como usar seu espaço e cuide das suas informações.", "")}
    <div class="settings-grid">
      <section class="settings-card"><h2>Seus dados, no seu aparelho</h2><p>As informações ficam armazenadas neste navegador e não são enviadas a um servidor. Se limpar os dados do navegador ou trocar de aparelho, use uma cópia de segurança para restaurá-las.</p><div class="storage-indicator"><span></span>Armazenamento local ativo</div><div class="settings-actions" style="margin-top:17px"><button class="button button-primary" data-action="export">${icon("download")} Baixar cópia de segurança</button><button class="button button-secondary" data-action="import">${icon("upload")} Restaurar cópia</button></div></section>
      <section class="settings-card"><h2>Preferências de aparência</h2><p>Escolha uma aparência confortável para o seu dia a dia. A preferência fica salva neste aparelho.</p><div class="settings-actions"><button class="button button-secondary" data-action="theme">${icon(state.theme === "dark" ? "sun" : "moon")} Usar tema ${state.theme === "dark" ? "claro" : "escuro"}</button></div></section>
      <section class="settings-card"><h2>Recomeçar do zero</h2><p>Isso remove tarefas, hábitos, registros financeiros, metas e anotações deste navegador. Esta ação não pode ser desfeita.</p><div class="settings-actions"><button class="button button-danger" data-action="reset">Apagar todos os meus dados</button></div></section>
      <section class="settings-card"><h2>Sobre este espaço</h2><p>Uma ferramenta pessoal e simples para conectar seus planos do dia, hábitos, finanças e objetivos sem depender de uma conta.</p><p style="margin-bottom:0">Versão 1.0 · Seus dados permanecem sob seu controle.</p></section>
    </div>`;
}

function taskFields(task = null, defaults = {}) {
  const startDate = task ? task.date || "" : defaults.date ?? TODAY;
  const recurrence = normalizeRecurrence(task?.recurrence, task?.date);
  const endDate = task
    ? recurrence ? task.endDate || "" : taskEndDate(task)
    : defaults.endDate || startDate;
  const weekdays = recurrence?.weekdays || [];
  const weekdayOptions = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [7, "Dom"]];
  return `
    <div class="task-primary-fields">
      <input id="task-title" name="title" maxlength="120" required autofocus value="${escapeAttr(task?.title || "")}" placeholder="Nome da tarefa" aria-label="Nome da tarefa">
      <textarea id="task-description" name="description" maxlength="500" placeholder="Descrição (opcional)" aria-label="Descrição">${escapeHTML(task?.description || "")}</textarea>
    </div>
    <section class="task-recurrence">
      <div class="task-recurrence-heading"><span class="task-detail-icon">${icon("calendar")}</span><span class="task-detail-label">Repetir</span><button class="task-recurrence-switch" type="button" role="switch" aria-checked="${Boolean(recurrence)}" aria-label="Repetir tarefa" data-action="toggle-recurrence"><span></span></button><input type="hidden" name="recurrenceEnabled" value="${recurrence ? "true" : ""}"></div>
      <div class="task-recurrence-options" ${recurrence ? "" : "hidden"}>
        <label class="task-recurrence-field"><span>Frequência</span><select name="recurrenceFrequency" ${recurrence ? "" : "disabled"}><option value="daily" ${recurrence?.frequency === "daily" ? "selected" : ""}>Diariamente</option><option value="weekly" ${recurrence?.frequency === "weekly" ? "selected" : ""}>Semanalmente</option><option value="monthly" ${recurrence?.frequency === "monthly" ? "selected" : ""}>Mensalmente</option></select></label>
        <fieldset class="task-weekday-options" ${recurrence?.frequency === "weekly" ? "" : "hidden"} ${recurrence ? "" : "disabled"}><legend>Repetir nos dias</legend><div>${weekdayOptions.map(([day, label]) => `<button class="task-weekday-button" type="button" data-recurrence-day="${day}" aria-pressed="${weekdays.includes(day)}" ${recurrence?.frequency === "weekly" ? "" : "disabled"}>${label}</button>`).join("")}</div></fieldset>
        <p class="task-recurrence-hint">A repetição termina na data de fim em Data. Sem data de fim, continua indefinidamente.</p>
      </div>
    </section>
    <section class="task-detail-group" aria-label="Data e horário">
      <div class="task-detail-row task-date-row"><span class="task-detail-icon">${icon("calendar")}</span><span class="task-detail-label">Data</span><div class="task-detail-values"><label><span class="visually-hidden">Data de início</span><input id="task-date" name="date" type="date" value="${escapeAttr(startDate)}"></label><span class="task-date-separator">até</span><label><span class="visually-hidden">Data de fim</span><input id="task-end-date" name="endDate" type="date" value="${escapeAttr(endDate)}"></label></div></div>
      <div class="task-detail-row"><span class="task-detail-icon">${icon("calendar")}</span><span class="task-detail-label">Horário</span><div class="task-detail-values task-time-values"><div class="task-time-input"><span class="visually-hidden">Horário de início</span><input id="task-time-hour" class="task-time-part" data-time-part="hour" data-time-field="time" type="text" inputmode="numeric" maxlength="2" placeholder="HH" aria-label="Hora de início"><span aria-hidden="true">:</span><input id="task-time-minute" class="task-time-part" data-time-part="minute" data-time-field="time" type="text" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="Minutos de início"><input id="task-time" name="time" type="hidden" value="${escapeAttr(task ? task.time || "" : defaults.time || "")}"></div><span class="task-time-separator">–</span><div class="task-time-input"><span class="visually-hidden">Horário de fim</span><input id="task-end-time-hour" class="task-time-part" data-time-part="hour" data-time-field="endTime" type="text" inputmode="numeric" maxlength="2" placeholder="HH" aria-label="Hora de fim"><span aria-hidden="true">:</span><input id="task-end-time-minute" class="task-time-part" data-time-part="minute" data-time-field="endTime" type="text" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="Minutos de fim"><input id="task-end-time" name="endTime" type="hidden" value="${escapeAttr(task?.endTime || "")}"></div></div></div>
    </section>
    <div class="task-detail-row task-select-row"><span class="task-detail-icon">${icon("circle")}</span><label class="task-detail-label" for="task-area">Área</label><select id="task-area" name="area">${AREAS.map((area) => `<option ${normalizeTaskArea(task?.area) === area ? "selected" : ""}>${area}</option>`).join("")}</select></div>
    <div class="task-detail-row task-select-row"><span class="task-detail-icon">${icon("flag")}</span><label class="task-detail-label" for="task-priority">Prioridade</label><select id="task-priority" name="priority">${PRIORITIES.map((item) => `<option ${normalizeTaskPriority(task?.priority) === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
    <p class="task-form-hint">Sem horário, a tarefa fica como atividade do dia todo.</p>
    <div class="modal-actions task-modal-actions">${task ? `<button type="button" class="task-delete-button" data-action="delete-task" data-id="${escapeAttr(task.id)}" aria-label="Excluir tarefa">${icon("trash")}</button>` : `<span></span>`}<div><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Salvar</button></div></div>
    <input type="hidden" name="id" value="${escapeAttr(task?.id || "")}">`;
}

function showModal(title, formType, formFields, id = "") {
  const modal = document.querySelector("#modal");
  document.querySelector("#modal-content").innerHTML = `<div class="modal-header"><h2>${title}</h2><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div><form class="modal-form ${formType === "task" ? "task-form" : ""}" data-form="${formType}" ${id ? `data-id="${escapeAttr(id)}"` : ""}>${formFields}</form>`;
  const taskForm = modal.querySelector('[data-form="task"]');
  modal.classList.toggle("modal-task", Boolean(taskForm));
  if (taskForm) {
    const titleInput = taskForm.querySelector('[name="title"]');
    titleInput.addEventListener("blur", () => {
      titleInput.value = capitalizeTaskTitle(titleInput.value);
    });
    const startDateInput = taskForm.querySelector('[name="date"]');
    const endDateInput = taskForm.querySelector('[name="endDate"]');
    const startInput = taskForm.querySelector('[name="time"]');
    const endInput = taskForm.querySelector('[name="endTime"]');
    const recurrenceEnabled = taskForm.querySelector('[name="recurrenceEnabled"]');
    const recurrenceOptions = taskForm.querySelector(".task-recurrence-options");
    const recurrenceSwitch = taskForm.querySelector(".task-recurrence-switch");
    const recurrenceFrequency = taskForm.querySelector('[name="recurrenceFrequency"]');
    const weekdayOptions = taskForm.querySelector(".task-weekday-options");
    const weekdayButtons = [...taskForm.querySelectorAll("[data-recurrence-day]")];
    const timeParts = [...taskForm.querySelectorAll(".task-time-part")];
    const descriptionInput = taskForm.querySelector('[name="description"]');
    const syncTimeField = (fieldName) => {
      const parts = timeParts.filter((part) => part.dataset.timeField === fieldName);
      const hour = parts.find((part) => part.dataset.timePart === "hour");
      const minute = parts.find((part) => part.dataset.timePart === "minute");
      const hidden = taskForm.elements.namedItem(fieldName);
      const stored = hidden.value;
      if (stored) {
        hour.value = stored.slice(0, 2);
        minute.value = stored.slice(3, 5);
      }
      const update = () => {
        hour.value = hour.value.replace(/\D/g, "").slice(0, 2);
        minute.value = minute.value.replace(/\D/g, "").slice(0, 2);
        const complete = hour.value.length === 2 && minute.value.length === 2;
        hidden.value = complete ? `${hour.value}:${minute.value}` : "";
        validateRange();
      };
      parts.forEach((part) => part.addEventListener("input", update));
      parts.forEach((part) => part.addEventListener("blur", update));
      return { hour, minute };
    };
    const startParts = syncTimeField("time");
    const endParts = syncTimeField("endTime");
    const autoSizeDescription = () => {
      descriptionInput.style.height = "auto";
      descriptionInput.style.height = `${descriptionInput.scrollHeight}px`;
    };
    const validateRange = () => {
      if (!startDateInput.value) endDateInput.value = "";
      endDateInput.min = startDateInput.value;
      endDateInput.setCustomValidity(!endDateInput.value ? "" : !startDateInput.value
        ? "Informe a data de início antes da data de fim."
        : endDateInput.value < startDateInput.value ? "A data de fim precisa ser igual ou posterior à data de início." : "");
      startDateInput.setCustomValidity(recurrenceEnabled.value === "true" && !startDateInput.value
        ? "Informe a data de início para configurar a recorrência." : "");
      recurrenceFrequency.setCustomValidity(recurrenceEnabled.value === "true" && recurrenceFrequency.value === "weekly"
        && !weekdayButtons.some((button) => button.getAttribute("aria-pressed") === "true")
        ? "Selecione ao menos um dia da semana." : "");
      const validTime = (input, parts) => {
        const hasValue = Boolean(parts.hour.value || parts.minute.value);
        const complete = input.value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.value);
        const message = hasValue && !complete ? "Informe uma hora entre 00 e 23 e minutos entre 00 e 59."
          : input === endInput && complete && !startInput.value ? "Informe o horário de início antes do horário de fim."
            : input === endInput && complete && input.value <= startInput.value ? "O horário de fim precisa ser depois do horário de início." : "";
        parts.hour.setCustomValidity(message);
        parts.minute.setCustomValidity(message);
        return !message;
      };
      validTime(startInput, startParts);
      validTime(endInput, endParts);
      if (endInput.value && !startInput.value && !endParts.hour.validationMessage) {
        endParts.hour.setCustomValidity("Informe o horário de início antes do horário de fim.");
        endParts.minute.setCustomValidity("Informe o horário de início antes do horário de fim.");
      }
    };
    const updateRecurrenceFields = (enabled) => {
      recurrenceEnabled.value = enabled ? "true" : "";
      recurrenceSwitch.setAttribute("aria-checked", String(enabled));
      recurrenceOptions.hidden = !enabled;
      recurrenceFrequency.disabled = !enabled;
      startDateInput.required = enabled;
      const weekly = enabled && recurrenceFrequency.value === "weekly";
      weekdayOptions.hidden = !weekly;
      weekdayOptions.disabled = !weekly;
      weekdayButtons.forEach((button) => { button.disabled = !weekly; });
      validateRange();
    };
    recurrenceSwitch.addEventListener("click", () => {
      const enabled = recurrenceEnabled.value !== "true";
      if (enabled && endDateInput.value === startDateInput.value) endDateInput.value = "";
      updateRecurrenceFields(enabled);
    });
    recurrenceFrequency.addEventListener("change", () => updateRecurrenceFields(recurrenceEnabled.value === "true"));
    weekdayButtons.forEach((button) => button.addEventListener("click", () => {
      const selected = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(selected));
      validateRange();
    }));
    startDateInput.addEventListener("input", validateRange);
    endDateInput.addEventListener("input", validateRange);
    descriptionInput.addEventListener("input", autoSizeDescription);
    updateRecurrenceFields(recurrenceEnabled.value === "true");
    autoSizeDescription();
  }
  modal.showModal();
  window.setTimeout(() => modal.querySelector("input:not([type=hidden]), textarea")?.focus(), 0);
}

function openTaskModal(id = "", defaults = {}) {
  const task = getTaskById(id);
  showModal(task ? "Editar tarefa" : "Nova tarefa", "task", taskFields(task, defaults));
}

function openModalFor(action, id = "", defaults = {}) {
  if (action === "add-task") return openTaskModal();
  if (action === "add-planner-task") return openTaskModal("", defaults);
  if (action === "edit-task") return openTaskModal(id);
  if (action === "add-habit") {
    return showModal("Novo hábito", "habit", `<div class="form-field"><label for="habit-title">Qual hábito quer acompanhar?</label><input id="habit-title" name="title" maxlength="80" required placeholder="Ex.: ler por 15 minutos"></div><div class="form-field"><label for="habit-emoji">Símbolo (emoji)</label><input id="habit-emoji" name="emoji" maxlength="4" value="✦"></div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Criar hábito</button></div>`);
  }
  if (action === "add-finance") {
    return showModal("Nova movimentação", "finance", `<div class="form-field"><label for="finance-title">Descrição</label><input id="finance-title" name="title" maxlength="100" required placeholder="Ex.: mercado, salário, transporte"></div><div class="form-grid"><div class="form-field"><label for="finance-type">Tipo</label><select id="finance-type" name="type"><option value="expense">Saída</option><option value="income">Entrada</option></select></div><div class="form-field"><label for="finance-amount">Valor (R$)</label><input id="finance-amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00"></div></div><div class="form-grid"><div class="form-field"><label for="finance-date">Data</label><input id="finance-date" name="date" type="date" value="${TODAY}"></div><div class="form-field"><label for="finance-category">Categoria</label><input id="finance-category" name="category" maxlength="40" placeholder="Ex.: Casa"></div></div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Salvar movimentação</button></div>`);
  }
  if (action === "add-goal") {
    return showModal("Nova meta", "goal", `<div class="form-field"><label for="goal-title">O que você quer alcançar?</label><input id="goal-title" name="title" maxlength="90" required placeholder="Ex.: fazer uma viagem"></div><div class="form-grid"><div class="form-field"><label for="goal-current">Quanto já juntou (R$)</label><input id="goal-current" name="current" type="number" min="0" step="0.01" value="0"></div><div class="form-field"><label for="goal-target">Valor da meta (R$)</label><input id="goal-target" name="target" type="number" min="0.01" step="0.01" required placeholder="0,00"></div></div><div class="form-field"><label for="goal-deadline">Data desejada (opcional)</label><input id="goal-deadline" name="deadline" type="date"></div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Criar meta</button></div>`);
  }
  if (action === "edit-entry") {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    selectedMood = entry.mood || "🙂";
    return showModal("Editar anotação", "edit-entry", `<div class="form-field"><label for="entry-content">Sua anotação</label><textarea id="entry-content" name="content" maxlength="3000" required>${escapeHTML(entry.content)}</textarea></div><div class="form-field"><label for="entry-date">Data</label><input id="entry-date" name="date" type="date" value="${escapeAttr(entry.date || TODAY)}"></div><div class="form-field"><label for="entry-mood">Como você estava se sentindo?</label><select id="entry-mood" name="mood">${MOODS.map((mood) => `<option ${mood === (entry.mood || "🙂") ? "selected" : ""}>${mood}</option>`).join("")}</select></div><input type="hidden" name="id" value="${escapeAttr(id)}"><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Salvar alterações</button></div>`, id);
  }
}

function submitForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === "task") {
    data.recurrenceWeekdays = [...form.querySelectorAll('[data-recurrence-day][aria-pressed="true"]')]
      .map((button) => Number(button.dataset.recurrenceDay));
    const existing = getTaskById(data.id);
    state.tasks = saveTask(state.tasks, data, existing, makeId);
    if (!persist()) { render(); return; }
    document.querySelector("#modal").close();
    render();
  } else if (form.dataset.form === "habit") {
    state.habits.unshift({ id: makeId(), title: data.title.trim(), emoji: data.emoji.trim() || "✦", days: [] });
    if (!persist()) { render(); return; }
    document.querySelector("#modal").close();
    render();
    notify("Hábito criado.");
  } else if (form.dataset.form === "finance") {
    state.transactions.unshift({ id: makeId(), title: data.title.trim(), type: data.type, amount: Number(data.amount), date: data.date || "", category: data.category.trim() || "Geral", paid: data.type === "income" });
    if (!persist()) { render(); return; }
    document.querySelector("#modal").close();
    render();
    notify("Movimentação salva.");
  } else if (form.dataset.form === "goal") {
    state.goals.push({ id: makeId(), title: data.title.trim(), current: Number(data.current) || 0, target: Number(data.target), deadline: data.deadline || "" });
    if (!persist()) { render(); return; }
    document.querySelector("#modal").close();
    render();
    notify("Meta criada.");
  } else if (form.dataset.form === "edit-entry") {
    state.entries = state.entries.map((entry) => entry.id === data.id
      ? { ...entry, content: data.content.trim(), date: data.date || TODAY, mood: data.mood || "🙂" }
      : entry);
    if (!persist()) { render(); return; }
    document.querySelector("#modal").close();
    render();
    notify("Anotação atualizada.");
  }
}

function toggleTask(id) {
  state.tasks = toggleTaskStatus(state.tasks, id);
  if (!persist()) { render(); return; }
  render();
}

function toggleHabit(id) {
  state.habits = state.habits.map((habit) => {
    if (habit.id !== id) return habit;
    const days = new Set(habit.days ?? []);
    if (days.has(TODAY)) days.delete(TODAY);
    else days.add(TODAY);
    return { ...habit, days: [...days].sort() };
  });
  persist();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meu-ritmo-backup-${TODAY}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Cópia de segurança baixada.");
}

function normalizeImportedData(parsed) {
  const collectionNames = ["tasks", "habits", "transactions", "goals", "entries"];
  if (!parsed || collectionNames.some((key) => !Array.isArray(parsed[key]))) {
    throw new Error("O arquivo não parece ser uma cópia de segurança válida do Meu ritmo.");
  }
  const validItems = (key, requiredFields) => parsed[key].map((item) => {
    if (!item || typeof item !== "object" || requiredFields.some((field) => typeof item[field] !== "string")) {
      throw new Error(`Há um registro inválido na seção ${key}.`);
    }
    return item;
  });
  return {
    tasks: validItems("tasks", ["id", "title"]).map((item) => {
      const { duration, ...task } = item;
      const endDate = typeof task.endDate === "string" && task.endDate ? task.endDate : task.date || "";
      const endTime = typeof task.endTime === "string" ? task.endTime : "";
      if (task.date && !/^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
        throw new Error("Há uma data de início inválida em uma tarefa da cópia.");
      }
      if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !task.date || endDate < task.date)) {
        throw new Error("Há uma data de fim inválida em uma tarefa da cópia.");
      }
      if (task.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time)) {
        throw new Error("Há um horário de início inválido em uma tarefa da cópia.");
      }
      if (endTime && (!task.time || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)
        || endTime <= task.time)) {
        throw new Error("Há um horário de fim inválido em uma tarefa da cópia.");
      }
      return normalizeTask({ ...task, date: task.date || "", endDate, time: task.time || "", endTime });
    }),
    habits: validItems("habits", ["id", "title"]).map((item) => ({ ...item, emoji: item.emoji || "✦", days: Array.isArray(item.days) ? item.days.filter((day) => typeof day === "string") : [] })),
    transactions: validItems("transactions", ["id", "title"]).map((item) => {
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount < 0 || !["income", "expense"].includes(item.type)) throw new Error("Há uma movimentação inválida na cópia.");
      return { ...item, amount, date: item.date || "", category: item.category || "Geral", paid: Boolean(item.paid) };
    }),
    goals: validItems("goals", ["id", "title"]).map((item) => {
      const current = Number(item.current);
      const target = Number(item.target);
      if (!Number.isFinite(current) || !Number.isFinite(target) || current < 0 || target <= 0) throw new Error("Há uma meta inválida na cópia.");
      return { ...item, current, target, deadline: item.deadline || "" };
    }),
    entries: validItems("entries", ["id", "content"]).map((item) => ({ ...item, date: item.date || TODAY, mood: item.mood || "🙂" })),
    theme: parsed.theme === "dark" ? "dark" : "light",
  };
}

async function importData(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const imported = normalizeImportedData(parsed);
    if (!window.confirm("Restaurar esta cópia vai substituir os dados atuais neste aparelho. Deseja continuar?")) return;
    state = imported;
    if (!persist()) { render(); return; }
    render();
    notify("Cópia de segurança restaurada.");
  } catch (error) {
    console.error("Não foi possível restaurar a cópia:", error);
    notify(error instanceof SyntaxError ? "Não foi possível ler o arquivo JSON." : error.message || "Não foi possível restaurar a cópia.");
  } finally {
    document.querySelector("#import-file").value = "";
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-nav]");
  if (!target) return;
  if (target.dataset.nav) {
    activeSection = target.dataset.nav;
    document.body.classList.remove("menu-open");
    render();
    return;
  }
  const { action, id } = target.dataset;
  if (!action) {
    if (target.dataset.taskView) {
      taskView = target.dataset.taskView;
      render();
    } else if (target.dataset.date) {
      plannerDate = target.dataset.date; render();
    } else if (target.dataset.mood) {
      selectedMood = target.dataset.mood;
      document.querySelectorAll("[data-mood]").forEach((button) => {
        const active = button.dataset.mood === selectedMood;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
    return;
  }
  if (action === "menu") document.body.classList.toggle("menu-open");
  else if (action === "close-menu") document.body.classList.remove("menu-open");
  else if (action === "close-modal") document.querySelector("#modal").close();
  else if (action === "add-task" || action === "edit-task" || action === "add-habit" || action === "add-finance" || action === "add-goal" || action === "edit-entry") openModalFor(action, id);
  else if (action === "add-planner-task") openModalFor(action, id, { date: target.dataset.date ?? "", time: target.dataset.time ?? "" });
  else if (action === "toggle-task") toggleTask(id);
  else if (action === "toggle-habit") toggleHabit(id);
  else if (action === "delete-task") {
    const task = getTaskById(id);
    if (task && window.confirm(`Excluir ${task.recurrence ? `a recorrência da tarefa “${task.title}”` : `a tarefa “${task.title}”`}?`)) {
      state.tasks = deleteTask(state.tasks, id);
      persist();
      const modal = document.querySelector("#modal");
      if (modal.open) modal.close();
      render();
    }
  } else if (action === "delete-habit") {
    const habit = state.habits.find((item) => item.id === id);
    if (habit && window.confirm(`Excluir o hábito “${habit.title}” e seu histórico?`)) {
      state.habits = state.habits.filter((item) => item.id !== id);
      const saved = persist(); render(); if (saved) notify("Hábito excluído.");
    }
  } else if (action === "delete-finance") {
    if (window.confirm("Excluir esta movimentação?")) {
      state.transactions = state.transactions.filter((item) => item.id !== id);
      const saved = persist(); render(); if (saved) notify("Movimentação excluída.");
    }
  } else if (action === "toggle-paid") {
    state.transactions = state.transactions.map((item) => item.id === id ? { ...item, paid: !item.paid } : item);
    persist(); render();
  } else if (action === "add-entry") {
    document.querySelector("#journal-text")?.focus();
  } else if (action === "delete-entry") {
    if (window.confirm("Excluir esta anotação do diário?")) {
      state.entries = state.entries.filter((item) => item.id !== id);
      const saved = persist(); render(); if (saved) notify("Anotação excluída.");
    }
  } else if (action === "delete-goal") {
    if (window.confirm("Excluir esta meta?")) {
      state.goals = state.goals.filter((item) => item.id !== id);
      const saved = persist(); render(); if (saved) notify("Meta excluída.");
    }
  } else if (action === "goal-step") {
    const step = Number(target.dataset.step) * 50;
    state.goals = state.goals.map((goal) => goal.id === id ? { ...goal, current: Math.max(0, Number(goal.current) + step) } : goal);
    persist(); render();
  } else if (action === "theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    persist(); render();
  } else if (action === "planner-today") {
    plannerDate = TODAY; render();
  } else if (action === "planner-view") {
    plannerView = target.dataset.view;
    render();
  } else if (action === "planner-select-day") {
    plannerDate = target.dataset.date;
    plannerView = "day";
    render();
  } else if (action === "planner-shift") {
    const direction = Number(target.dataset.step);
    if (plannerView === "month") {
      const shifted = new Date(`${plannerDate.slice(0, 7)}-01T12:00:00`);
      shifted.setMonth(shifted.getMonth() + direction);
      plannerDate = toISODate(shifted);
    } else {
      plannerDate = addDays(plannerDate, direction * (plannerView === "week" ? 7 : 1));
    }
    render();
  } else if (action === "export") exportData();
  else if (action === "import") document.querySelector("#import-file").click();
  else if (action === "reset") {
    if (window.confirm("Apagar tarefas, hábitos, finanças, metas e diário deste aparelho? Essa ação não pode ser desfeita.")) {
      state = { tasks: [], habits: [], transactions: [], goals: [], entries: [], theme: state.theme };
      const saved = persist(); render(); if (saved) notify("Seus dados foram apagados deste aparelho.");
    }
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === "entry") {
    const content = new FormData(form).get("content").trim();
    if (!content) return;
    state.entries.unshift({ id: makeId(), date: TODAY, mood: selectedMood, content });
    if (!persist()) return;
    selectedMood = "🙂"; render(); notify("Anotação guardada.");
  } else {
    submitForm(form);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "task-search") return;
  taskSearch = event.target.value;
  const start = event.target.selectionStart;
  render();
  const replacement = document.querySelector("#task-search");
  replacement.focus();
  replacement.setSelectionRange(start, start);
});

document.querySelector("#modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector("#mobile-overlay").addEventListener("click", () => document.body.classList.remove("menu-open"));
document.querySelector("#import-file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importData(file);
});
window.addEventListener("storage", (event) => {
  if (event.key !== stateRepository.key) return;
  loadState();
  render();
  notify("Dados atualizados em outra aba.");
});

export function startApp(repository) {
  stateRepository = repository;
  loadState();
  hydrateIcons();
  render();
}
