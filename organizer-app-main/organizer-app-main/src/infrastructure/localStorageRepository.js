export const STORAGE_KEY = "meu-ritmo:v1";

export function readState() {
  return localStorage.getItem(STORAGE_KEY);
}

export function writeState(state) {
  const serialized = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, serialized);
  return serialized;
}

export const localStorageRepository = {
  key: STORAGE_KEY,
  read: readState,
  write: writeState,
};
