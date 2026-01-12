export type ViewMode = 'PROJECTS' | 'SESSION' | 'INSTRUMENT' | 'MIXER';
export type InstrumentTab = 'PADS' | 'FX';
export type MasterTab = 'MAIN' | 'DYN' | 'SAT';

export interface NoteEvent {
  note: string;
  startTime: string;
  step: number;
  duration: string;
  velocity: number;
}

export interface PadNote {
  note: string;
  label: string;
  id: number;
  isRoot: boolean;
  intervalIndex: number;
}

export interface Clip {
  id: string;
  name: string;
  color: string;
  isPlaying: boolean;
  notes: NoteEvent[];
  duration: number;
}

export interface Track {
  id: string;
  type: 'synth' | 'bass' | 'drum';
  name: string;
  color: string; // e.g., "bg-rose-500"
  clips: Clip[]; 
  // Mixer State
  volume: number; // -60 to +6 dB
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
}

export interface MasterState {
  volume: number;
  dyn: {
    lowGain: number;
    midGain: number;
    highGain: number;
    compHiPass: number;
    release: number;
    threshold: number;
    outputGain: number;
    dryWet: number;
  };
  sat: {
    drive: number;
    analogClip: number;
    colorLow: number;
    colorFreq: number;
    colorWidth: number;
    colorHi: number;
    output: number;
    dryWet: number;
  };
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  tracks: Track[];
  master: MasterState; // New Master State
  bpm: number;
  scale: string;
  rootNote: string;
  macros: {
    filter: number;
    reso: number;
    space: number;
    heat: number;
  }
}

export interface AppState {
  currentProjectId: string | null;
  projects: Record<string, Project>;
}
