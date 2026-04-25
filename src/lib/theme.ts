import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'terminal' | 'retro' | 'pixel' | 'gameboy';

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'terminal', label: 'Terminal' },
  { value: 'retro',    label: 'Retro Purple' },
  { value: 'pixel',    label: 'Pixel Ocean' },
  { value: 'gameboy',  label: 'Game Boy' },
];

function createThemeStore() {
  const initial: Theme = browser
    ? (localStorage.getItem('theme') as Theme) ?? 'terminal'
    : 'terminal';

  const { subscribe, set } = writable<Theme>(initial);

  return {
    subscribe,
    set: (t: Theme) => {
      if (browser) localStorage.setItem('theme', t);
      set(t);
    }
  };
}

export const theme = createThemeStore();
