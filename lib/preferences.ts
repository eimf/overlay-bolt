import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export type Preferences = {
  persistenceEnabled: boolean;
  gridType: 'none' | 'lines' | 'squared' | 'dots';
  canvasOpacity: number;
};

const STORAGE_KEY = 'overlay-notes-prefs-v1';

const defaults: Preferences = {
  persistenceEnabled: false,
  gridType: 'dots',
  canvasOpacity: 1,
};

function read(): Preferences {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

let current: Preferences = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(next: Preferences) {
  current = next;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  emit();
}

export function getPreferences(): Preferences {
  return current;
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  write({ ...current, [key]: value });
}

export function usePreferences(): [Preferences, typeof setPreference] {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
  return [snapshot, setPreference];
}
