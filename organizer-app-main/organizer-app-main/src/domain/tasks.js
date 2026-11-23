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
    durationDays: Number.isInteger(recurrence.durationDays) && recurrence.durationDays >= 0 && recurrence.durationDays <= 366
      ? recurrence.durationDays
      : 0,
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

export function getTaskOccurrence(task, occurrenceDate) {
  const override = task.scheduleOverrides?.[occurrenceDate] ?? {};
  const hasOverride = (field) => Object.prototype.hasOwnProperty.call(override, field);
  const date = hasOverride("date") ? override.date : occurrenceDate;
  const time = hasOverride("time") ? override.time : task.time;
  const endTime = hasOverride("endTime") ? override.endTime : task.endTime;
  const durationDays = task.recurrence?.durationDays ?? 0;
  const overnight = time && endTime && endTime <= time ? 1 : 0;
  const defaultEndDate = date ? addDays(date, Math.max(durationDays, overnight)) : "";
  const endDate = hasOverride("endDate") ? override.endDate : defaultEndDate;
  const done = Boolean(task.completedOccurrences?.includes(occurrenceDate));
  return {
    ...task,
    id: taskOccurrenceId(task.id, occurrenceDate),
    seriesId: task.id,
    occurrenceDate,
    date,
    endDate,
    time,
    endTime,
    done,
    status: done ? "done" : task.status === "done" || task.done ? "todo" : taskStatus(task),
  };
}

function isRecurrenceDate(task, recurrence, date) {
  if (date < task.date || (task.endDate && date > task.endDate)) return false;
  if (recurrence.frequency === "daily") return true;
  if (recurrence.frequency === "weekly") {
    const weekday = new Date(`${date}T12:00:00`).getDay() || 7;
    return recurrence.weekdays.includes(weekday);
  }
  const index = recurrenceIndexAtOrAfter(task.date, "monthly", date);
  return recurrenceDateAt(task.date, "monthly", index) === date;
}

export function expandTaskOccurrences(tasks, startDate, endDate, { includePastFinal = false } = {}) {
  const expanded = tasks.filter((task) => !task.recurrence || !task.date);
  if (!startDate || !endDate || endDate < startDate) return expanded;

  tasks.forEach((task) => {
    const recurrence = normalizeRecurrence(task.recurrence, task.date);
    if (!recurrence || !task.date) return;
    const recurrenceEndDate = task.endDate || "";
    const includedDates = new Set();
    const addOccurrence = (occurrenceDate) => {
      if (includedDates.has(occurrenceDate)) return;
      includedDates.add(occurrenceDate);
      const occurrence = getTaskOccurrence(task, occurrenceDate);
      if (occurrence.date && occurrence.date <= endDate && taskEndDate(occurrence) >= startDate) {
        expanded.push(occurrence);
      }
    };
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
          addOccurrence(candidate);
          break;
        }
      }
    } else if (lastOccurrenceDate >= firstOccurrenceDate && recurrence.frequency === "daily") {
      let occurrenceDate = recurrenceDateAt(task.date, "daily", recurrenceIndexAtOrAfter(task.date, "daily", firstOccurrenceDate));
      while (occurrenceDate <= lastOccurrenceDate) {
        addOccurrence(occurrenceDate);
        occurrenceDate = addDays(occurrenceDate, 1);
      }
    } else if (lastOccurrenceDate >= firstOccurrenceDate && recurrence.frequency === "weekly") {
      for (let date = firstOccurrenceDate; date <= lastOccurrenceDate; date = addDays(date, 1)) {
        const weekday = new Date(`${date}T12:00:00`).getDay() || 7;
        if (recurrence.weekdays.includes(weekday)) addOccurrence(date);
      }
    } else if (lastOccurrenceDate >= firstOccurrenceDate) {
      let occurrenceDate = recurrenceDateAt(task.date, "monthly", recurrenceIndexAtOrAfter(task.date, "monthly", firstOccurrenceDate));
      while (occurrenceDate <= lastOccurrenceDate) {
        addOccurrence(occurrenceDate);
        const nextMonth = recurrenceDateAt(task.date, "monthly", recurrenceIndexAtOrAfter(task.date, "monthly", occurrenceDate) + 1);
        occurrenceDate = nextMonth;
      }
    }
    Object.keys(task.scheduleOverrides ?? {}).forEach((occurrenceDate) => {
      if (isRecurrenceDate(task, recurrence, occurrenceDate)) addOccurrence(occurrenceDate);
    });
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

export function suggestTaskEndTime(startTime) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return "";
  const endMinutes = (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)) + 60) % (24 * 60);
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

export function normalizeTask(task) {
  const { duration, ...savedTask } = task;
  const status = normalizeTaskStatus(savedTask.status, savedTask.done);
  const recurrence = normalizeRecurrence(savedTask.recurrence, savedTask.date);
  const time = savedTask.date && typeof savedTask.time === "string" ? savedTask.time : "";
  const hasValidStartTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
  const hasSavedEndTime = Boolean(savedTask.date) && typeof savedTask.endTime === "string" && savedTask.endTime;
  const endTime = !savedTask.date
    ? ""
    : hasSavedEndTime
    ? savedTask.endTime
    : hasValidStartTime
      ? suggestTaskEndTime(time)
      : "";
  const endTimeAutoSuggested = Boolean(savedTask.date)
    && (savedTask.endTimeAutoSuggested === true || (!hasSavedEndTime && hasValidStartTime));
  const suggestedEndCrossesMidnight = !hasSavedEndTime && hasValidStartTime && endTime <= time;
  const legacyRecurrenceEndDate = typeof savedTask.recurrence?.endDate === "string"
    ? savedTask.recurrence.endDate
    : null;
  let endDate = recurrence
    ? legacyRecurrenceEndDate ?? (typeof savedTask.endDate === "string" ? savedTask.endDate : "")
    : typeof savedTask.endDate === "string" && savedTask.endDate ? savedTask.endDate : savedTask.date || "";
  const scheduleOverrides = {};
  if (recurrence && savedTask.scheduleOverrides && typeof savedTask.scheduleOverrides === "object"
    && !Array.isArray(savedTask.scheduleOverrides)) {
    Object.entries(savedTask.scheduleOverrides).forEach(([occurrenceDate, override]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate) || !override || typeof override !== "object" || Array.isArray(override)) return;
      const normalized = {};
      if (typeof override.date === "string" && (!override.date || /^\d{4}-\d{2}-\d{2}$/.test(override.date))) normalized.date = override.date;
      if (typeof override.endDate === "string" && (!override.endDate || /^\d{4}-\d{2}-\d{2}$/.test(override.endDate))) normalized.endDate = override.endDate;
      if (typeof override.time === "string" && (!override.time || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(override.time))) normalized.time = override.time;
      if (typeof override.endTime === "string" && (!override.endTime || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(override.endTime))) normalized.endTime = override.endTime;
      if (Object.keys(normalized).length) scheduleOverrides[occurrenceDate] = normalized;
    });
  }
  if (suggestedEndCrossesMidnight && !recurrence && savedTask.date && endDate === savedTask.date) {
    endDate = addDays(savedTask.date, 1);
  }
  return {
    ...savedTask,
    endTimeAutoSuggested,
    time,
    endDate,
    recurrence,
    scheduleOverrides,
    completedOccurrences: Array.isArray(savedTask.completedOccurrences)
      ? [...new Set(savedTask.completedOccurrences.filter((date) => typeof date === "string"))]
      : [],
    endTime,
    area: normalizeTaskArea(savedTask.area),
    priority: normalizeTaskPriority(savedTask.priority),
    status,
    done: status === "done",
  };
}
