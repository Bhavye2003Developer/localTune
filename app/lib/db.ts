import Dexie, { type Table } from 'dexie';

export interface StoredTrack {
  id?: number;
  fileId: string;
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
  loopA?: number | null;
  loopB?: number | null;
}

export interface StoredFileBlob {
  fileId: string;   // primary key — matches StoredTrack.fileId
  blob: Blob;
}

export interface EQPreset {
  id?: number;
  name: string;
  bands: { freq: number; gain: number; q: number }[];
}

export interface StoredDSPSettings {
  id: string;           // always 'default'
  settings: string;     // JSON-serialised DSPSettings
}

export interface StoredGaplessSettings {
  id: string;           // always 'default'
  enabled: boolean;
  crossfade: number;    // 0–6 seconds
}

export class LocalTuneDB extends Dexie {
  tracks!: Table<StoredTrack>;
  eqPresets!: Table<EQPreset>;
  dspSettings!: Table<StoredDSPSettings>;
  fileBlobs!: Table<StoredFileBlob>;
  gaplessSettings!: Table<StoredGaplessSettings>;

  constructor() {
    super('localtune_v1');
    this.version(1).stores({
      tracks:      '++id, fileId, name',
      eqPresets:   '++id, name',
    });
    this.version(2).stores({
      tracks:      '++id, fileId, name',
      eqPresets:   '++id, name',
      dspSettings: 'id',
    });
    this.version(3).stores({
      tracks:      '++id, fileId, name',
      eqPresets:   '++id, name',
      dspSettings: 'id',
      fileBlobs:   'fileId',
    });
    // v4 — gapless playback settings (single-row, id='default')
    this.version(4).stores({
      tracks:          '++id, fileId, name',
      eqPresets:       '++id, name',
      dspSettings:     'id',
      fileBlobs:       'fileId',
      gaplessSettings: 'id',
    });
    // v5 — same schema; bumped to resolve native IDB version mismatch that
    // occurs when v4 was first loaded without gaplessSettings in some browsers
    this.version(5).stores({
      tracks:          '++id, fileId, name',
      eqPresets:       '++id, name',
      dspSettings:     'id',
      fileBlobs:       'fileId',
      gaplessSettings: 'id',
    });
  }
}

export const db = new LocalTuneDB();
