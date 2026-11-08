import { addDays } from "../domain/dates.js";
import {
  normalizeTaskArea,
  normalizeTaskPriority,
  normalizeRecurrence,
  normalizeTaskStatus,
  capitalizeTaskTitle,
  parseTaskOccurrenceId,
  taskEndDate,
} from "../domain/tasks.js";

export function saveTask(tasks, data, existing, createId) {
  const task = {
    id: existing?.id || createId(),
    title: capitalizeTaskTitle(data.title),
    description: data.description.trim(),
    date: data.date || "",
    endDate: data.date ? data.recurrenceEnabled ? data.endDate || "" : data.endDate || data.date : "",
    time: data.time || "",
    endTime: data.endTime || "",
    area: normalizeTaskArea(data.area),
    priority: normalizeTaskPriority(data.priority),
    done: existing?.done ?? false,
    status: existing ? normalizeTaskStatus(existing.status, existing.done) : "todo",
    recurrence: data.recurrenceEnabled
      ? normalizeRecurrence({ frequency: data.recurrenceFrequency, weekdays: data.recurrenceWeekdays }, data.date)
      : null,
    completedOccurrences: existing ? [...(existing.completedOccurrences ?? [])] : [],
  };
  const sameRecurrence = JSON.stringify(task.recurrence) === JSON.stringify(existing?.recurrence ?? null)
    && task.date === existing?.date
    && task.endDate === existing?.endDate;
  if (!sameRecurrence) task.completedOccurrences = [];
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
