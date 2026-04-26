import type { Game, StatusGroup } from './types';

export const STATUS_GROUPS: StatusGroup[] = [
  { key: 'inProgress',  label: 'Playing',     color: '#a3e635' },
  { key: 'playingNext', label: 'Up Next',     color: '#60a5fa' },
  { key: 'onShelf',     label: 'On Shelf',    color: '#f59e0b' },
  { key: 'wishlist',    label: 'Wishlist',    color: '#a78bfa' },
  { key: 'notStarted',  label: 'Not Started', color: '#555' },
  { key: 'beat',        label: 'Beat',        color: '#34d399' },
  { key: 'abandoned',   label: 'Abandoned',   color: '#f87171' },
];

export const STATUS_MAP = Object.fromEntries(STATUS_GROUPS.map(s => [s.key, s]));

export const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox', 'Switch', 'Mobile', 'Other'];

export const INITIAL_GAMES: Game[] = [
  { id: 1,  title: 'Hades II',               platform: 'PC',  status: 'inProgress',  hrsIn: 31.2, ttb: 33,    hrsLeft: 1.8,   rating: 9,    coop: false, coverUrl: null },
  { id: 2,  title: "Baldur's Gate 3",         platform: 'PC',  status: 'inProgress',  hrsIn: 49.3, ttb: 72.1,  hrsLeft: 22.8,  rating: 10,   coop: true,  coverUrl: null },
  { id: 3,  title: 'Cyberpunk 2077',          platform: 'PC',  status: 'inProgress',  hrsIn: 20,   ttb: 23,    hrsLeft: 3,     rating: 9,    coop: false, coverUrl: null },
  { id: 4,  title: 'Black Myth: Wukong',      platform: 'PC',  status: 'onShelf',     hrsIn: 19.4, ttb: 37.91, hrsLeft: 18.51, rating: 8,    coop: false, coverUrl: null },
  { id: 5,  title: 'Metaphor: ReFantazio',    platform: 'PC',  status: 'onShelf',     hrsIn: 11.4, ttb: 65.15, hrsLeft: 53.75, rating: null, coop: false, coverUrl: null },
  { id: 6,  title: 'S.T.A.L.K.E.R. 2',       platform: 'PC',  status: 'onShelf',     hrsIn: 17,   ttb: 35.4,  hrsLeft: 18.4,  rating: null, coop: false, coverUrl: null },
  { id: 7,  title: 'Half-Life 2',             platform: 'PC',  status: 'playingNext', hrsIn: 0,    ttb: 12.88, hrsLeft: 12.88, rating: null, coop: false, coverUrl: null },
  { id: 8,  title: 'Path of Exile 2',         platform: 'PC',  status: 'playingNext', hrsIn: 8.7,  ttb: 34.81, hrsLeft: 26.11, rating: null, coop: true,  coverUrl: null },
  { id: 9,  title: 'Hi Fi Rush',              platform: 'PC',  status: 'beat',        hrsIn: 4,    ttb: 11.21, hrsLeft: 0,     rating: 9,    coop: false, coverUrl: null },
  { id: 10, title: 'Control',                 platform: 'PC',  status: 'beat',        hrsIn: 13,   ttb: 13,    hrsLeft: 0,     rating: 8,    coop: false, coverUrl: null },
  { id: 11, title: 'FF VII Rebirth',          platform: 'PS5', status: 'beat',        hrsIn: 67,   ttb: 60,    hrsLeft: 0,     rating: 9,    coop: false, coverUrl: null },
  { id: 12, title: 'Nine Sols',               platform: 'PC',  status: 'beat',        hrsIn: 7.4,  ttb: 21.15, hrsLeft: 0,     rating: 8,    coop: false, coverUrl: null },
  { id: 13, title: 'RE4 Remake',              platform: 'PC',  status: 'beat',        hrsIn: 12,   ttb: 12,    hrsLeft: 0,     rating: 9,    coop: false, coverUrl: null },
  { id: 14, title: 'Sifu',                    platform: 'PC',  status: 'beat',        hrsIn: 7.8,  ttb: 7.8,   hrsLeft: 0,     rating: 8,    coop: false, coverUrl: null },
  { id: 15, title: 'Pizza Tower',             platform: 'PC',  status: 'notStarted',  hrsIn: 0,    ttb: 6.27,  hrsLeft: 6.27,  rating: null, coop: false, coverUrl: null },
  { id: 16, title: 'Animal Well',             platform: 'PC',  status: 'notStarted',  hrsIn: 0,    ttb: 7.01,  hrsLeft: 7.01,  rating: null, coop: false, coverUrl: null },
  { id: 17, title: 'Sekiro',                  platform: 'PC',  status: 'notStarted',  hrsIn: 0,    ttb: 30.13, hrsLeft: 30.13, rating: null, coop: false, coverUrl: null },
  { id: 18, title: 'Hollow Knight: Silksong', platform: 'PC',  status: 'wishlist',    hrsIn: 0,    ttb: 27.52, hrsLeft: 27.52, rating: null, coop: false, coverUrl: null },
  { id: 19, title: 'KCD2',                    platform: 'PC',  status: 'wishlist',    hrsIn: 0,    ttb: 65,    hrsLeft: 65,    rating: null, coop: false, coverUrl: null },
  { id: 20, title: 'No Rest for the Wicked',  platform: 'PC',  status: 'abandoned',   hrsIn: 2.1,  ttb: 14.19, hrsLeft: 0,     rating: 5,    coop: false, coverUrl: null },
  { id: 21, title: 'Dragon Age: Veilguard',   platform: 'PC',  status: 'notStarted',  hrsIn: 7,    ttb: 28.56, hrsLeft: 21.56, rating: null, coop: false, coverUrl: null },
  { id: 22, title: 'Persona 3 Reload',        platform: 'PC',  status: 'onShelf',     hrsIn: 7.3,  ttb: 64.71, hrsLeft: 57.41, rating: null, coop: false, coverUrl: null },
  { id: 23, title: 'Disco Elysium',           platform: 'PC',  status: 'notStarted',  hrsIn: 0,    ttb: 20,    hrsLeft: 20,    rating: null, coop: false, coverUrl: null },
  { id: 24, title: 'Avowed',                  platform: 'PC',  status: 'beat',        hrsIn: 12.7, ttb: 20.06, hrsLeft: 0,     rating: 7,    coop: false, coverUrl: null },
];
