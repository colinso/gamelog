export type Status = 'inProgress' | 'inRotation' | 'onShelf' | 'playingNext' | 'notStarted' | 'wishlist' | 'beat' | 'abandoned';

export interface Game {
  id: number;
  title: string;
  platform: string;
  status: Status;
  hrsIn: number;
  ttb: number;
  hrsLeft: number;
  rating: number | null;
  coop: boolean;
  coverUrl: string | null;
  notes?: string;
  steamAppId?: number;
  epicAppName?: string;
  hidden?: boolean;
}

export interface StatusGroup {
  key: Status;
  label: string;
  color: string;
}
