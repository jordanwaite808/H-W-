import * as Tone from 'tone';
import { NoteEvent } from '../types';

interface BufferEvent {
    note: string;
    velocity: number;
    time: number; // Tone.now()
}

class AudioEngineService {
  // Channels
  private synthPoly: Tone.PolySynth | null = null;
  private synthMono: Tone.Synth | null = null;
  
  // FX
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private distortion: Tone.Distortion | null = null;
  private limiter: Tone.Limiter | null = null;

  // State
  private parts: Map<string, Tone.Part> = new Map();
  private isInitialized = false;
  private activeNotesCallback: ((notes: string[]) => void) | null = null;
  private stepCallback: ((step: number) => void) | null = null;

  // Retrospective Recording
  private inputBuffer: BufferEvent[] = [];
  private BUFFER_DURATION = 30; // seconds

  // Active playing notes (visuals)
  private currentlyPlayingNotes: Set<string> = new Set();
  
  // Track Channel Map
  private trackChannelMap: Map<string, 'synth' | 'bass'> = new Map();

  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();

    // FX Chain
    this.limiter = new Tone.Limiter(-1).toDestination();
    this.reverb = new Tone.Reverb({ decay: 3, preDelay: 0.01, wet: 0.2 }).connect(this.limiter);
    this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 }).connect(this.reverb);
    this.filter = new Tone.Filter({ frequency: 2000, type: "lowpass", Q: 1, rolloff: -12 }).connect(this.distortion);

    // Instruments
    this.synthPoly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
      volume: -8
    }).connect(this.filter);

    this.synthMono = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2 },
      volume: -4
    }).connect(this.filter);

    Tone.Transport.bpm.value = 120;
    
    // Global Transport Loop for step visualization
    Tone.Transport.scheduleRepeat((time) => {
        // Quantized 16th step calculation
        // Note: parsing position string "0:0:0" is approximate, better to use ticks, but this works for prototype
        const sixteenth = Tone.Time("16n").toSeconds();
        const current16th = Math.floor(Tone.Transport.seconds / sixteenth) % 16;
        
        Tone.Draw.schedule(() => {
            if (this.stepCallback) this.stepCallback(current16th);
        }, time);
    }, "16n");

    this.isInitialized = true;
  }

  public registerTrack(trackId: string, type: 'synth' | 'bass' | 'drum') {
      this.trackChannelMap.set(trackId, type === 'bass' ? 'bass' : 'synth');
  }

  // --- Sequencer Logic (Tone.Part) ---

  public stopTrack(trackId: string) {
      if (this.parts.has(trackId)) {
          this.parts.get(trackId)?.dispose();
          this.parts.delete(trackId);
      }
  }

  public setClip(trackId: string, notes: NoteEvent[]) {
      this.stopTrack(trackId); // Clear existing part
      if (notes.length === 0) return;

      const part = new Tone.Part((time, event) => {
          this.triggerNoteFromSequence(trackId, event.note, event.duration, time);
      }, notes.map(n => ({ 
          time: `0:0:${n.step}`, // Map step to Transport Time
          note: n.note, 
          duration: n.duration, 
          velocity: n.velocity 
      })));

      part.loop = true;
      part.loopEnd = "1m"; // 1 measure loop
      part.start(0);
      
      this.parts.set(trackId, part);
  }

  private triggerNoteFromSequence(trackId: string, note: string, duration: string, time: number) {
      const type = this.trackChannelMap.get(trackId);
      
      // Visual Feedback Start
      Tone.Draw.schedule(() => {
          this.currentlyPlayingNotes.add(note);
          this.notifyActiveNotes();
      }, time);

      // Audio
      if (type === 'bass' && this.synthMono) {
          this.synthMono.triggerAttackRelease(note, duration, time);
      } else if (this.synthPoly) {
          this.synthPoly.triggerAttackRelease(note, duration, time);
      }

      // Visual Feedback End
      Tone.Draw.schedule(() => {
          this.currentlyPlayingNotes.delete(note);
          this.notifyActiveNotes();
      }, time + Tone.Time(duration).toSeconds());
  }

  // --- Live Input & Capture ---

  public triggerAttack(note: string, trackType: 'synth' | 'bass' = 'synth') {
    if (!this.isInitialized) return;
    
    // Audio
    if (trackType === 'bass' && this.synthMono) {
        this.synthMono.triggerAttack(note);
    } else if (this.synthPoly) {
        this.synthPoly.triggerAttack(note);
    }

    // Buffer Record
    this.inputBuffer.push({
        note,
        velocity: 1,
        time: Tone.now()
    });
    
    // Cleanup old buffer
    const now = Tone.now();
    this.inputBuffer = this.inputBuffer.filter(e => now - e.time < this.BUFFER_DURATION);
  }

  public triggerRelease(note: string, trackType: 'synth' | 'bass' = 'synth') {
    if (!this.isInitialized) return;
    if (trackType === 'bass' && this.synthMono) {
        this.synthMono.triggerRelease();
    } else if (this.synthPoly) {
        this.synthPoly.triggerRelease(note);
    }
  }

  // The "Capture" Logic
  public capturePerformance(): NoteEvent[] {
      if (this.inputBuffer.length === 0) return [];

      const now = Tone.now();
      const oneBar = Tone.Time("1m").toSeconds();
      const sixteen = Tone.Time("16n").toSeconds();
      
      // Grab last 1 bar of events
      const loopDuration = oneBar;
      const loopStartTime = now - loopDuration;

      const events = this.inputBuffer.filter(e => e.time >= loopStartTime);
      
      if (events.length === 0) return [];

      // Quantize to steps
      const capturedNotes: NoteEvent[] = events.map(e => {
          const relativeTime = e.time - loopStartTime;
          // Find nearest 16th step
          const stepIndex = Math.floor(relativeTime / sixteen);
          const clampedStep = Math.max(0, Math.min(15, stepIndex));
          
          return {
              note: e.note,
              startTime: `0:0:${clampedStep}`,
              step: clampedStep,
              duration: "16n",
              velocity: e.velocity
          };
      });

      // Clear buffer after capture to prevent double capture
      this.inputBuffer = []; 
      
      return capturedNotes;
  }

  // --- Visuals ---
  
  public setStepCallback(cb: (step: number) => void) {
      this.stepCallback = cb;
  }

  public setActiveNotesCallback(cb: (notes: string[]) => void) {
      this.activeNotesCallback = cb;
  }

  private notifyActiveNotes() {
      if (this.activeNotesCallback) {
          this.activeNotesCallback(Array.from(this.currentlyPlayingNotes));
      }
  }

  // --- FX & Transport ---

  public setFilterFrequency(value: number) {
    if (this.filter) {
      const freq = 100 * Math.pow(100, value); 
      this.filter.frequency.rampTo(freq, 0.1);
    }
  }

  public setFilterResonance(value: number) {
    if (this.filter) {
      const q = value * 15; 
      this.filter.Q.rampTo(q, 0.1);
    }
  }

  public setSpace(value: number) {
    if (this.reverb) {
       this.reverb.wet.rampTo(value, 0.1);
       this.reverb.decay = 1 + (value * 10);
    }
  }
  
  public setHeat(value: number) {
     if (this.distortion) {
         this.distortion.distortion = value;
         this.distortion.wet.rampTo(value * 0.5, 0.1);
     }
  }

  public togglePlayback(): boolean {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
      return false;
    } else {
      Tone.Transport.start();
      return true;
    }
  }
}

export const audioService = new AudioEngineService();
