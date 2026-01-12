import * as Tone from 'tone';
import { NoteEvent, MasterState } from '../types';

interface BufferEvent {
    note: string;
    velocity: number;
    time: number;
}

class AudioEngineService {
  // Channels
  private synthPoly: Tone.PolySynth | null = null;
  private synthMono: Tone.Synth | null = null;
  
  // Drum Engines
  private drumKick: Tone.MembraneSynth | null = null;
  private drumSnare: Tone.NoiseSynth | null = null;
  private drumHiHat: Tone.MetalSynth | null = null;
  private drumLowPass: Tone.Filter | null = null;

  // Channel Strips (Vol/Pan/Solo/Mute logic)
  private channelStrips: Map<string, Tone.Channel> = new Map();
  private meters: Map<string, Tone.Meter> = new Map();

  // Master Chain
  private masterChannel: Tone.Channel | null = null;
  private masterLimiter: Tone.Limiter | null = null;
  private masterCompressor: Tone.Compressor | null = null;
  private masterSaturator: Tone.Distortion | null = null;
  private masterMeter: Tone.Meter | null = null;

  // FX (Send effects for tracks)
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private distortion: Tone.Distortion | null = null;

  // State
  private parts: Map<string, Tone.Part> = new Map();
  private isInitialized = false;
  private activeNotesCallback: ((notes: string[]) => void) | null = null;
  private stepCallback: ((step: number) => void) | null = null;

  // Retrospective Recording
  public inputBuffer: BufferEvent[] = [];
  private BUFFER_DURATION = 30; // Keep last 30 seconds

  private currentlyPlayingNotes: Set<string> = new Set();
  private trackChannelMap: Map<string, 'synth' | 'bass' | 'drum'> = new Map();

  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();

    // --- Master Chain Setup ---
    this.masterLimiter = new Tone.Limiter(-1).toDestination();
    this.masterMeter = new Tone.Meter({ smoothing: 0.8 });
    this.masterChannel = new Tone.Channel(0, 0);
    
    // Placeholder FX for DYN/SAT (simplified for prototype)
    this.masterCompressor = new Tone.Compressor({ threshold: -20, ratio: 4 });
    this.masterSaturator = new Tone.Distortion(0);

    // Chain: MasterChannel -> Sat -> Comp -> Limiter -> Meter -> Out
    this.masterChannel.connect(this.masterSaturator);
    this.masterSaturator.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterMeter);

    // --- Send FX Setup ---
    this.reverb = new Tone.Reverb({ decay: 3, preDelay: 0.01, wet: 0.2 }).connect(this.masterChannel);
    this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 }).connect(this.reverb);
    this.filter = new Tone.Filter({ frequency: 2000, type: "lowpass", Q: 1, rolloff: -12 }).connect(this.distortion);

    // --- Instruments ---
    this.synthPoly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
      volume: -8
    }); 

    this.synthMono = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2 },
      volume: -4
    });

    // --- Drum Engines (909 Inspired Tweaks) ---
    this.drumLowPass = new Tone.Filter(20000, "lowpass");
    
    this.drumKick = new Tone.MembraneSynth({
        pitchDecay: 0.02, // Faster pitch drop for punch
        octaves: 5,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.0 },
        volume: 2 // Boost kick slightly
    }).connect(this.drumLowPass);

    this.drumSnare = new Tone.NoiseSynth({
        noise: { type: "pink" }, // Pink noise has more body
        envelope: { attack: 0.001, decay: 0.25, sustain: 0 },
        volume: -2
    }).connect(this.drumLowPass);

    this.drumHiHat = new Tone.MetalSynth({
        frequency: 250,
        envelope: { attack: 0.001, decay: 0.05, release: 0.05 },
        harmonicity: 4.1,
        modulationIndex: 40,
        resonance: 3000,
        octaves: 1,
        volume: -10
    }).connect(this.drumLowPass);

    Tone.Transport.bpm.value = 120;
    
    Tone.Transport.scheduleRepeat((time) => {
        const sixteenth = Tone.Time("16n").toSeconds();
        const current16th = Math.floor(Tone.Transport.seconds / sixteenth) % 16;
        Tone.Draw.schedule(() => {
            if (this.stepCallback) this.stepCallback(current16th);
        }, time);
    }, "16n");

    this.isInitialized = true;
  }

  public registerTrack(trackId: string, type: 'synth' | 'bass' | 'drum') {
      this.trackChannelMap.set(trackId, type);

      if (!this.channelStrips.has(trackId)) {
          const channel = new Tone.Channel(0, 0);
          const meter = new Tone.Meter({ smoothing: 0.8 });
          
          channel.connect(this.filter!); 
          channel.connect(meter); 
          
          this.channelStrips.set(trackId, channel);
          this.meters.set(trackId, meter);

          if (type === 'bass' && this.synthMono) {
              this.synthMono.disconnect();
              this.synthMono.connect(channel);
          } else if (type === 'drum' && this.drumLowPass) {
              this.drumLowPass.disconnect();
              this.drumLowPass.connect(channel);
          } else if (this.synthPoly) {
              this.synthPoly.connect(channel);
          }
      }
  }

  // --- Mixer Control ---

  public setTrackVolume(trackId: string, db: number) {
      const channel = this.channelStrips.get(trackId);
      if (channel) channel.volume.rampTo(db, 0.05); // Faster response
  }

  public setTrackMute(trackId: string, muted: boolean) {
      const channel = this.channelStrips.get(trackId);
      if (channel) channel.mute = muted;
  }

  public setTrackSolo(trackId: string, soloed: boolean) {
      const channel = this.channelStrips.get(trackId);
      if (channel) channel.solo = soloed;
  }

  public setMasterVolume(db: number) {
      if (this.masterChannel) this.masterChannel.volume.rampTo(db, 0.05);
  }

  public updateMasterFX(state: MasterState) {
      if (!this.masterCompressor || !this.masterSaturator) return;
      this.masterCompressor.threshold.value = -60 + (state.dyn.threshold * 60); 
      this.masterCompressor.ratio.value = 1 + (state.dyn.highGain * 20); 
      this.masterCompressor.wet.value = state.dyn.dryWet;
      this.masterSaturator.distortion = state.sat.drive;
      this.masterSaturator.wet.value = state.sat.dryWet;
  }

  public getMeterValues(trackIds: string[]): Record<string, number> {
      const levels: Record<string, number> = {};
      trackIds.forEach(id => {
          const meter = this.meters.get(id);
          if (meter) {
              const val = meter.getValue();
              levels[id] = typeof val === 'number' ? val : -100;
          }
      });
      if (this.masterMeter) {
          const val = this.masterMeter.getValue();
          levels['master'] = typeof val === 'number' ? val : -100;
      }
      return levels;
  }

  // --- Sequencer Logic ---

  public stopTrack(trackId: string) {
      if (this.parts.has(trackId)) {
          this.parts.get(trackId)?.dispose();
          this.parts.delete(trackId);
      }
  }

  public setClip(trackId: string, notes: NoteEvent[]) {
      this.stopTrack(trackId); 
      if (notes.length === 0) return;

      const part = new Tone.Part((time, event) => {
          this.triggerNoteFromSequence(trackId, event.note, event.duration, time);
      }, notes.map(n => ({ 
          time: `0:0:${n.step}`, 
          note: n.note, 
          duration: n.duration, 
          velocity: n.velocity 
      })));

      part.loop = true;
      part.loopEnd = "1m"; 
      part.start(0);
      this.parts.set(trackId, part);
  }

  private triggerNoteFromSequence(trackId: string, note: string, duration: string, time: number) {
      const type = this.trackChannelMap.get(trackId);
      
      Tone.Draw.schedule(() => {
          this.currentlyPlayingNotes.add(note);
          this.notifyActiveNotes();
      }, time);

      if (type === 'bass' && this.synthMono) {
          this.synthMono.triggerAttackRelease(note, duration, time);
      } else if (type === 'drum') {
          this.triggerDrum(note, time, 1);
      } else if (this.synthPoly) {
          this.synthPoly.triggerAttackRelease(note, duration, time);
      }

      Tone.Draw.schedule(() => {
          this.currentlyPlayingNotes.delete(note);
          this.notifyActiveNotes();
      }, time + Tone.Time("16n").toSeconds()); // Short release for visual feedback
  }

  // --- Drum Specific Logic ---
  
  private triggerDrum(note: string, time: number = Tone.now(), velocity: number = 1) {
      // Map MIDI Note to Drum Synth
      // C2 (36): Kick, D2 (38): Snare, F#2 (42): CH, A#2 (46): OH
      if (note.includes("C2") && this.drumKick) {
          this.drumKick.triggerAttackRelease("C2", "8n", time, velocity);
      } else if (note.includes("D2") && this.drumSnare) {
          this.drumSnare.triggerAttackRelease("8n", time, velocity);
      } else if ((note.includes("F#2") || note.includes("Gb2")) && this.drumHiHat) {
          this.drumHiHat.triggerAttackRelease("32n", time, velocity * 0.8);
      } else if ((note.includes("A#2") || note.includes("Bb2")) && this.drumHiHat) {
          this.drumHiHat.triggerAttackRelease("8n", time, velocity);
      }
  }

  // --- Drum Macros ---
  public setKickDecay(val: number) {
      if (this.drumKick) this.drumKick.envelope.decay = 0.1 + (val * 0.8);
  }
  
  public setSnareTone(val: number) {
      if (this.drumSnare) this.drumSnare.envelope.decay = 0.05 + (val * 0.4);
  }

  public setHatDecay(val: number) {
      if (this.drumHiHat) this.drumHiHat.envelope.decay = 0.01 + (val * 0.3);
  }

  public setDrumDrive(val: number) {
      if (this.drumLowPass) {
          const freq = 500 + (val * 15000);
          this.drumLowPass.frequency.rampTo(freq, 0.1);
      }
  }

  // --- Live Input & Passive Buffer ---

  public triggerAttack(note: string, trackType: 'synth' | 'bass' | 'drum' = 'synth') {
    if (!this.isInitialized) return;
    
    if (trackType === 'bass' && this.synthMono) {
        this.synthMono.triggerAttack(note);
    } else if (trackType === 'drum') {
        this.triggerDrum(note);
    } else if (this.synthPoly) {
        this.synthPoly.triggerAttack(note);
    }

    // Always record to buffer (Retrospective)
    this.inputBuffer.push({
        note,
        velocity: 1,
        time: Tone.now()
    });
    
    // Maintain 30s buffer
    const now = Tone.now();
    this.inputBuffer = this.inputBuffer.filter(e => now - e.time < this.BUFFER_DURATION);
  }

  public triggerRelease(note: string, trackType: 'synth' | 'bass' | 'drum' = 'synth') {
    if (!this.isInitialized) return;
    if (trackType === 'bass' && this.synthMono) {
        this.synthMono.triggerRelease();
    } else if (trackType === 'drum') {
        // One-shot drums don't need release
    } else if (this.synthPoly) {
        this.synthPoly.triggerRelease(note);
    }
  }

  public clearBuffer() {
      this.inputBuffer = [];
  }

  // --- Capture Logic ---

  public analyzeTempoAndCapture(): { notes: NoteEvent[], bpm: number } {
      if (this.inputBuffer.length === 0) return { notes: [], bpm: 120 };

      const now = Tone.now();
      const startTime = this.inputBuffer[0].time;
      const duration = now - startTime;

      let detectedBpm = Tone.Transport.bpm.value;
      let bars = 1;

      // Smart BPM Detection (Only if Transport is STOPPED)
      if (Tone.Transport.state !== 'started') {
          // Attempt to find a BPM between 70-160 that fits 1, 2, or 4 bars
          const candidates = [1, 2, 4]; 
          let best = { bpm: 120, diff: Infinity, bars: 1 };
          
          for (let b of candidates) {
             const testBpm = (b * 240) / duration;
             if (testBpm >= 70 && testBpm <= 160) {
                 const diff = Math.abs(testBpm - 120); // Bias slightly towards 120
                 if (diff < best.diff) {
                     best = { bpm: testBpm, diff, bars: b };
                 }
             }
          }
          
          if (best.diff !== Infinity) {
              detectedBpm = best.bpm;
              bars = best.bars;
          } else {
              detectedBpm = 120; // Fallback
          }
          
          Tone.Transport.bpm.value = detectedBpm;
      } else {
          // If running, align to current grid
          // In this prototype, we force 1 bar loop for UI simplicity, 
          // but in production we'd calc bars = Math.round(duration / (240/bpm))
      }

      // 16th Note Quantization
      const sixteen = (60 / detectedBpm) / 4;
      
      const capturedNotes: NoteEvent[] = this.inputBuffer.map(e => {
          const relativeTime = e.time - startTime;
          const stepIndex = Math.round(relativeTime / sixteen);
          // Modulo 16 to wrap everything into a 1-bar loop (HÅW v0.4 constraint)
          const step = stepIndex % 16; 
          
          return {
              note: e.note,
              startTime: `0:0:${step}`,
              step: step,
              duration: "16n",
              velocity: e.velocity
          };
      });

      this.inputBuffer = [];
      return { notes: capturedNotes, bpm: detectedBpm };
  }

  public capturePerformance(): NoteEvent[] {
      // Logic for Overdubbing on existing clip (Fixed grid)
      if (this.inputBuffer.length === 0) return [];
      const bpm = Tone.Transport.bpm.value;
      const sixteen = (60 / bpm) / 4;
      
      // We assume user just played relative to "Now"
      // But for overdub, we usually want last 1 bar of data.
      const now = Tone.now();
      const oneBar = (60 / bpm) * 4;
      const loopStartTime = now - oneBar;

      // Filter events in the last bar
      const events = this.inputBuffer.filter(e => e.time >= loopStartTime);
      
      const capturedNotes: NoteEvent[] = events.map(e => {
          const relativeTime = e.time - loopStartTime;
          const stepIndex = Math.round(relativeTime / sixteen);
          const step = Math.max(0, Math.min(15, stepIndex));
          
          return {
              note: e.note,
              startTime: `0:0:${step}`,
              step: step,
              duration: "16n",
              velocity: e.velocity
          };
      });

      this.inputBuffer = []; 
      return capturedNotes;
  }

  // --- Setters/Getters ---

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
       // Clamp to 8s max to avoid range errors
       this.reverb.decay = 1 + (value * 7); 
    }
  }
  
  public setHeat(value: number) {
     if (this.distortion) {
         this.distortion.distortion = value;
         this.distortion.wet.rampTo(value * 0.5, 0.1);
     }
  }

  public setBpm(bpm: number) {
    Tone.Transport.bpm.value = bpm;
  }

  public stop() {
    Tone.Transport.stop();
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
