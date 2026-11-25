import { useSyncExternalStore } from "react";

const KEY = "devMode";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let value = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setDevMode(next: boolean) {
  value = next;
  try {
    if (next) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((cb) => cb());
}

/**
 * Developer mode: a single remembered flag. It only changes which sections
 * are open by default and whether protocol-level fields (gas, raw units) show.
 */
export default function useDevMode(): boolean {
  return useSyncExternalStore(subscribe, () => value);
}
