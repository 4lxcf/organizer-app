import { addDays } from "../domain/dates.js";
import {
  normalizeTaskArea,
  normalizeTaskPriority,
  normalizeRecurrence,
  normalizeTaskStatus,
  capitalizeTaskTitle,
  getTaskOccurrence,
  parseTaskOccurrenceId,
  suggestTaskEndTime,
  taskEndDate,
} from "../domain/tasks.js";

export function saveTask(tasks, data, existing, createId) {
  const date = data.date || "";
  const time = date ? data.time || "" : "";
  const task = {
    id: existing?.id || createId(),
    title: capitalizeTaskTitle(data.title),
    description: data.description.trim(),
    date,
    endDate: date ? data.recurrenceEnabled ? data.endDate || "" : data.endDate || date : "",
    time,
    endTime: date ? data.endTime || suggestTaskEndTime(time) : "",
    endTimeAutoSuggested: Boolean(date) && data.endTimeAutoSuggested === "true",
    area: normalizeTaskArea(data.area),
    priority: normalizeTaskPriority(data.priority),
    done: existing?.done ?? false,
    status: existing ? normalizeTaskStatus(existing.status, existing.done) : "todo",
    recurrence: data.recurrenceEnabled
      ? normalizeRecurrence({
        frequency: data.recurrenceFrequency,
        weekdays: data.recurrenceWeekdays,
        durationDays: existing?.recurrence?.durationDays ?? 0,
      }, data.date)
      : null,
    completedOccurrences: existing ? [...(existing.completedOccurrences ?? [])] : [],
    scheduleOverrides: existing ? { ...(existing.scheduleOverrides ?? {}) } : {},
  };
  const sameRecurrence = JSON.stringify(task.recurrence) === JSON.stringify(existing?.recurrence ?? null)
    && task.date === existing?.date
    && task.endDate === existing?.endDate;
  if (!sameRecurrence) {
    task.completedOccurrences = [];
    task.scheduleOverrides = {};
  }
  return existing
    ? tasks.map((item) => item.id === task.id ? task : item)
    : [task, ...tasks];
}

export function setTaskStatus(tasks, id, status) {
  if (!["todo", "doing", "done"].includes(status)) return tasks;
  return tasks.map((task) => task.id === id
    ? { ...task, status, done: status === "done" }
    : task);
}

export function moveTaskToBoard(tasks, id, destination) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return tasks;
  const { status, priority } = destination;
  const updated = {
    ...task,
    ...(status ? { status, done: status === "done" } : {}),
    ...(priority ? { priority } : {}),
  };
  if (task.status === updated.status && task.done === updated.done && task.priority === updated.priority) return tasks;
  return tasks.map((item) => item.id === id ? updated : item);
}

export function moveTaskToDate(tasks, id, date) {
  const task = tasks.find((item) => item.id === id);
  if (!task || !date) return tasks;
  const durationDays = task.date && taskEndDate(task)
    ? Math.round((new Date(`${taskEndDate(task)}T12:00:00`) - new Date(`${task.date}T12:00:00`)) / 86400000)
    : 0;
  const endDate = addDays(date, durationDays);
  if (task.date === date && taskEndDate(task) === endDate) return tasks;
  return tasks.map((item) => item.id === id ? { ...item, date, endDate } : item);
}

export function updateTaskSchedule(tasks, id, schedule) {
  return tasks.map((task) => task.id === id ? { ...task, ...schedule } : task);
}

function dateOffset(from, to) {
  return Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
}

function shiftTime(time, minutes) {
  if (!time || !minutes) return time;
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function updateRecurringTaskSchedule(tasks, id, occurrenceDate, schedule, scope) {
  const task = tasks.find((item) => item.id === id);
  if (!task?.recurrence) return tasks;

  if (scope === "occurrence") {
    const scheduleOverrides = {
      ...(task.scheduleOverrides ?? {}),
      [occurrenceDate]: {
        date: schedule.date,
        endDate: schedule.endDate,
        time: schedule.time,
        endTime: schedule.endTime,
      },
    };
    return tasks.map((item) => item.id === id ? { ...item, scheduleOverrides } : item);
  }

  if (!schedule.date) {
    return tasks.map((item) => item.id === id ? {
      ...item,
      date: "",
      endDate: "",
      time: "",
      endTime: "",
      recurrence: null,
      scheduleOverrides: {},
      completedOccurrences: [],
    } : item);
  }

  const currentOccurrence = getTaskOccurrence(task, occurrenceDate);
  const dayOffset = currentOccurrence.date === schedule.date ? 0 : dateOffset(occurrenceDate, schedule.date);
  const timeOffset = task.time && schedule.time
    ? Number(schedule.time.slice(0, 2)) * 60 + Number(schedule.time.slice(3, 5))
      - Number(task.time.slice(0, 2)) * 60 - Number(task.time.slice(3, 5))
    : 0;
  const shiftedOverrides = {};
  Object.entries(task.scheduleOverrides ?? {}).forEach(([date, override]) => {
    const shiftedDate = addDays(date, dayOffset);
    if (shiftedDate === schedule.date) return;
    shiftedOverrides[shiftedDate] = {
      ...override,
      ...(override.date ? { date: addDays(override.date, dayOffset) } : {}),
      ...(override.endDate ? { endDate: addDays(override.endDate, dayOffset) } : {}),
      ...(override.time ? { time: shiftTime(override.time, timeOffset) } : {}),
      ...(override.endTime ? { endTime: shiftTime(override.endTime, timeOffset) } : {}),
    };
  });
  const recurrence = {
    ...task.recurrence,
    weekdays: task.recurrence.frequency === "weekly"
      ? task.recurrence.weekdays.map((day) => ((day - 1 + dayOffset % 7 + 7) % 7) + 1).sort((a, b) => a - b)
      : [],
    durationDays: Math.max(0, dateOffset(schedule.date, schedule.endDate || schedule.date)),
  };
  return tasks.map((item) => item.id === id ? {
    ...item,
    date: addDays(task.date, dayOffset),
    endDate: task.endDate ? addDays(task.endDate, dayOffset) : "",
    time: schedule.time,
    endTime: schedule.endTime,
    recurrence,
    scheduleOverrides: shiftedOverrides,
    completedOccurrences: (task.completedOccurrences ?? []).map((date) => addDays(date, dayOffset)),
  } : item);
}

export function deleteTask(tasks, id) {
  const occurrence = parseTaskOccurrenceId(id);
  if (occurrence) id = occurrence.taskId;
  return tasks.filter((task) => task.id !== id);
}

export function toggleTaskStatus(tasks, id) {
  const occurrence = parseTaskOccurrenceId(id);
  if (occurrence) {
    return tasks.map((task) => {
      if (task.id !== occurrence.taskId) return task;
      const completed = new Set(task.completedOccurrences ?? []);
      if (completed.has(occurrence.date)) completed.delete(occurrence.date);
      else completed.add(occurrence.date);
      return { ...task, completedOccurrences: [...completed] };
    });
  }
  const task = tasks.find((item) => item.id === id);
  if (!task) return tasks;
  return setTaskStatus(tasks, id, normalizeTaskStatus(task.status, task.done) === "done" ? "todo" : "done");
}
