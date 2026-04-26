import type { StatusGroup } from './types';

export const STATUS_GROUPS: StatusGroup[] = [
  { key: 'inProgress',  label: 'Playing',      color: '#a3e635' },
  { key: 'inRotation',  label: 'In Rotation',  color: '#22d3ee' },
  { key: 'playingNext', label: 'Up Next',      color: '#60a5fa' },
  { key: 'onShelf',     label: 'On Shelf',     color: '#f59e0b' },
  { key: 'wishlist',    label: 'Wishlist',     color: '#a78bfa' },
  { key: 'notStarted',  label: 'Not Started',  color: '#555' },
  { key: 'beat',        label: 'Beat',         color: '#34d399' },
  { key: 'abandoned',   label: 'Abandoned',    color: '#f87171' },
];

export const STATUS_MAP = Object.fromEntries(STATUS_GROUPS.map(s => [s.key, s]));

export const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox', 'Switch', 'Mobile', 'Other'];
