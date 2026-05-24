import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'terminal' | 'retro' | 'pixel' | 'gameboy' | 'crt' | 'vapor' | 'paper' | 'synth';

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'terminal', label: 'Terminal' },
  { value: 'retro',    label: 'Retro Purple' },
  { value: 'pixel',    label: 'Pixel Ocean' },
  { value: 'gameboy',  label: 'Game Boy DMG' },
  { value: 'crt',      label: 'CRT — phosphor + scanlines' },
  { value: 'vapor',    label: 'Vaporwave — pink + cyan' },
  { value: 'paper',    label: 'Paper — ink on cream' },
  { value: 'synth',    label: 'Synthwave — sunset' },
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
