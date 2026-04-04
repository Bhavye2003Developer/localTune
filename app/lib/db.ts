import Dexie, { type Table } from 'dexie';

export interface StoredTrack {
  id?: number;
  fileId: string;        // `${name}-${size}` — session identity key
  name: string;
  title: string;
  artist?: string;
  album?: string;
  size: number;
  type: string;
  duration: number;
  bpm?: number;
  musicalKey?: string;
  mood?: string;
}

export interface EQPreset {
  id?: number;
  name: string;
  bands: { freq: number; gain: number; q: number }[];
}

export class FineTuneDB extends Dexie {
  tracks!: Table<StoredTrack>;
  eqPresets!: Table<EQPreset>;

  constructor() {
    super('finetune_v1');
    this.version(1).stores({
      tracks:    '++id, fileId, name',
      eqPresets: '++id, name',
    });
  }
}

export const db = new FineTuneDB();
