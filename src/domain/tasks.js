import { addDays, addMonths } from "./dates.js";

export const AREAS = ["Casa", "Estudos", "Financeiro", "Lazer", "Outros", "Saúde", "Trabalho"];
export const PRIORITIES = ["Urgente e Importante", "Importante", "Urgente", "Quando der"];
export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly"];

export function capitalizeTaskTitle(title) {
  return title.trim().split(/\s+/).map((word) => word
    ? `${word[0].toLocaleUpperCase("pt-BR")}${word.slice(1).toLocaleLowerCase("pt-BR")}`
    : "").join(" ");
}

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

export function normalizeRecurrence(recurrence, startDate = "") {
  if (!recurrence || !RECURRENCE_FREQUENCIES.includes(recurrence.frequency)) return null;
  const defaultWeekday = startDate ? new Date(`${startDate}T12:00:00`).getDay() || 7 : 0;
  const weekdays = Array.isArray(recurrence.weekdays)
    ? [...new Set(recurrence.weekdays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort((a, b) => a - b)
    : recurrence.frequency === "weekly" && defaultWeekday ? [defaultWeekday] : [];
  return {
    frequency: recurrence.frequency,
    weekdays: recurrence.frequency === "weekly" ? weekdays : [],
  };
}

export function taskOccurrenceId(taskId, date) {
  return `occurrence:${encodeURIComponent(taskId)}:${date}`;
}

export function parseTaskOccurrenceId(id) {
  const match = /^occurrence:(.*):(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!match) return null;
  return { taskId: decodeURIComponent(match[1]), date: match[2] };
}

function recurrenceDateAt(startDate, frequency, index) {
  if (frequency === "daily") return addDays(startDate, index);
  if (frequency === "weekly") return addDays(startDate, index * 7);
  return addMonths(startDate, index);
}

function recurrenceIndexAtOrAfter(startDate, frequency, targetDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  const daysApart = Math.max(0, Math.floor((target - start) / 86400000));
  if (frequency === "daily") return daysApart;
  if (frequency === "weekly") return Math.ceil(daysApart / 7);
  let monthsApart = Math.max(0, (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth());
  if (recurrenceDateAt(startDate, frequency, monthsApart) < targetDate) monthsApart += 1;
  return monthsApart;
}

function createTaskOccurrence(task, occurrenceDate) {
  const done = Boolean(task.completedOccurrences?.includes(occurrenceDate));
  return {
    ...task,
    id: taskOccurrenceId(task.id, occurrenceDate),
    seriesId: task.id,
    occurrenceDate,
    date: occurrenceDate,
    endDate: occurrenceDate,
    done,
    status: done ? "done" : task.status === "done" || task.done ? "todo" : taskStatus(task),
  };
}

export function expandTaskOccurrences(tasks, startDate, endDate, { includePastFinal = false } = {}) {
  const expanded = tasks.filter((task) => !task.recurrence || !task.date);
  if (!startDate || !endDate || endDate < startDate) return expanded;

  tasks.forEach((task) => {
    const recurrence = normalizeRecurrence(task.recurrence, task.date);
    if (!recurrence || !task.date) return;
    const recurrenceEndDate = task.endDate || "";
    const firstOccurrenceDate = startDate > task.date ? startDate : task.date;
    const lastOccurrenceDate = recurrenceEndDate && recurrenceEndDate < endDate ? recurrenceEndDate : endDate;
    if (includePastFinal && recurrenceEndDate && recurrenceEndDate < firstOccurrenceDate) {
      for (let daysBack = 0; daysBack <= 31; daysBack += 1) {
        const candidate = addDays(recurrenceEndDate, -daysBack);
        if (candidate < task.date) break;
        const candidateWeekday = new Date(`${candidate}T12:00:00`).getDay() || 7;
        const matches = recurrence.frequency === "daily"
          || (recurrence.frequency === "weekly" && recurrence.weekdays.includes(candidateWeekday))
          || (recurrence.frequency === "monthly" && recurrenceDateAt(task.date, "monthly", recurrenceIndexAtOrAfter(task.date, "monthly", candidate)) === candidate);
        if (matches && !task.completedOccurrences?.includes(candidate)) {
          expanded.push(createTaskOccurrence(task, candidate));
          break;
        }
      }
      return;
    }
    if (lastOccurrenceDate < firstOccurrenceDate) return;
    if (recurrence.frequency === "daily") {
      let occurrenceDate = recurrenceDateAt(task.date, "daily", recurrenceIndexAtOrAfter(task.date, "daily", firstOccurrenceDate));
      while (occurrenceDate <= lastOccurrenceDate) {
        expanded.push(createTaskOccurrence(task, occurrenceDate));
        occurrenceDate = addDays(occurrenceDate, 1);
      }
    } else if (recurrence.frequency === "weekly") {
      for (let date = firstOccurrenceDate; date <= lastOccurrenceDate; date = addDays(date, 1)) {
        const weekday = new Date(`${date}T12:00:00`).getDay() || 7;
        if (recurrence.weekdays.includes(weekday)) expanded.push(createTaskOccurrence(task, date));
      }
    } else {
      let occurrenceDate = recurrenceDateAt(task.date, "monthly", recurrenceIndexAtOrAfter(task.date, "monthly", firstOccurrenceDate));
      while (occurrenceDate <= lastOccurrenceDate) {
        expanded.push(createTaskOccurrence(task, occurrenceDate));
        const nextMonth = recurrenceDateAt(task.date, "monthly", recurrenceIndexAtOrAfter(task.date, "monthly", occurrenceDate) + 1);
        occurrenceDate = nextMonth;
      }
    }
  });
  return expanded;
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
  const recurrence = normalizeRecurrence(savedTask.recurrence, savedTask.date);
  const legacyRecurrenceEndDate = typeof savedTask.recurrence?.endDate === "string"
    ? savedTask.recurrence.endDate
    : null;
  const endDate = recurrence
    ? legacyRecurrenceEndDate ?? (typeof savedTask.endDate === "string" ? savedTask.endDate : "")
    : typeof savedTask.endDate === "string" && savedTask.endDate ? savedTask.endDate : savedTask.date || "";
  return {
    ...savedTask,
    endDate,
    recurrence,
    completedOccurrences: Array.isArray(savedTask.completedOccurrences)
      ? [...new Set(savedTask.completedOccurrences.filter((date) => typeof date === "string"))]
      : [],
    endTime: typeof savedTask.endTime === "string" ? savedTask.endTime : "",
    area: normalizeTaskArea(savedTask.area),
    priority: normalizeTaskPriority(savedTask.priority),
    status,
    done: status === "done",
  };
}
