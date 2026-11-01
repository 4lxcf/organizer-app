import { addDays } from "../domain/dates.js";
import {
  normalizeTaskArea,
  normalizeTaskPriority,
  normalizeTaskStatus,
  taskEndDate,
} from "../domain/tasks.js";

export function saveTask(tasks, data, existing, createId) {
  const task = {
    id: existing?.id || createId(),
    title: data.title.trim(),
    description: data.description.trim(),
    date: data.date || "",
    endDate: data.date ? data.endDate || data.date : "",
    time: data.time || "",
    endTime: data.endTime || "",
    area: normalizeTaskArea(data.area),
    priority: normalizeTaskPriority(data.priority),
    done: existing?.done ?? false,
    status: existing ? normalizeTaskStatus(existing.status, existing.done) : "todo",
  };
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
  return tasks.filter((task) => task.id !== id);
}

export function toggleTaskStatus(tasks, id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return tasks;
  return setTaskStatus(tasks, id, normalizeTaskStatus(task.status, task.done) === "done" ? "todo" : "done");
}
