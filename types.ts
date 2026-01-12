export type ViewMode = 'PROJECTS' | 'SESSION' | 'INSTRUMENT';
export type InstrumentTab = 'PADS' | 'SEQ' | 'FX';

export interface NoteEvent {
  note: string;     // e.g., "C3"
  startTime: string; // "0:0:2" (Tone.Time notation)
  step: number;     // 0-15
  duration: string; // "16n"
  velocity: number;
}

export interface PadNote {
  note: string;
  label: string;
  id: number;
  isRoot: boolean;
  intervalIndex: number; // For isomorphic coloring
}

export interface Clip {
  id: string;
  name: string;
  color: string;
  isPlaying: boolean;
  notes: NoteEvent[]; // Replaces 'pattern' boolean array
  duration: number; // in bars, default 1
}

export interface Track {
  id: string;
  type: 'synth' | 'bass' | 'drum';
  name: string;
  clips: Clip[]; 
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  tracks: Track[];
  bpm: number;
  scale: string; // e.g., "Minor"
  rootNote: string; // e.g., "C"
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
