export const AREAS = ["Casa", "Estudos", "Financeiro", "Lazer", "Outros", "Saúde", "Trabalho"];
export const PRIORITIES = ["Urgente e Importante", "Importante", "Urgente", "Quando der"];

export function normalizeTaskArea(area) {
  return AREAS.includes(area) ? area : "Outros";
}

export function normalizeTaskPriority(priority) {
  if (PRIORITIES.includes(priority)) return priority;
  const legacyPriorities = {
    "Fazer agora": "Urgente e Importante",
    Agendar: "Importante",
    Delegar: "Urgente",
    Avaliar: "Quando der",
    Alta: "Urgente e Importante",
  };
  return legacyPriorities[priority] || "Quando der";
}

export function normalizeTaskStatus(status, done = false) {
  if (done || status === "done") return "done";
  return status === "doing" ? "doing" : "todo";
}

export function taskStatus(task) {
  return normalizeTaskStatus(task.status, task.done);
}

export function taskEndDate(task) {
  return task.endDate || task.date || "";
}

export function taskIncludesDate(task, date) {
  return Boolean(task.date && date >= task.date && date <= taskEndDate(task));
}

export function compareTasksBySchedule(a, b) {
  const dateOrder = (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
  if (dateOrder) return dateOrder;
  return (a.time || "99:99").localeCompare(b.time || "99:99");
}

export function taskPriorityOrder(task) {
  return PRIORITIES.indexOf(normalizeTaskPriority(task.priority));
}

export function formatTaskTime(task) {
  if (!task.time) return task.endTime ? `até ${task.endTime}` : "";
  return task.endTime ? `${task.time}–${task.endTime}` : task.time;
}

export function normalizeTask(task) {
  const { duration, ...savedTask } = task;
  const status = normalizeTaskStatus(savedTask.status, savedTask.done);
  return {
    ...savedTask,
    endDate: typeof savedTask.endDate === "string" && savedTask.endDate ? savedTask.endDate : savedTask.date || "",
    endTime: typeof savedTask.endTime === "string" ? savedTask.endTime : "",
    area: normalizeTaskArea(savedTask.area),
    priority: normalizeTaskPriority(savedTask.priority),
    status,
    done: status === "done",
  };
}
