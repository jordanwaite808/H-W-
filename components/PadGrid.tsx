import React, { useEffect, useState } from 'react';
import { generateIsomorphicGrid } from '../constants';
import { audioService } from '../services/audioEngine';
import { PadNote } from '../types';

interface PadGridProps {
    trackType?: 'synth' | 'bass' | 'drum';
    rootNote?: string;
    scale?: string;
}

const PadGrid: React.FC<PadGridProps> = ({ trackType = 'synth', rootNote = "C", scale = "Minor" }) => {
  const [pads, setPads] = useState<PadNote[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
      // Regenerate grid when scale changes or trackType changes
      if (trackType === 'drum') {
          // Dedicated 4x4 Drum Layout
          const drumPads: PadNote[] = [
              // Row 4 (Top) - Cymbals/Perc
              { id: 12, note: "D#3", label: "Ride", isRoot: false, intervalIndex: 0 },
              { id: 13, note: "E3", label: "Crash", isRoot: false, intervalIndex: 0 },
              { id: 14, note: "F3", label: "Perc 1", isRoot: false, intervalIndex: 0 },
              { id: 15, note: "G3", label: "Perc 2", isRoot: false, intervalIndex: 0 },
              
              // Row 3
              { id: 8, note: "A#2", label: "OH", isRoot: false, intervalIndex: 0 },
              { id: 9, note: "B2", label: "Tom Hi", isRoot: false, intervalIndex: 0 },
              { id: 10, note: "C3", label: "Tom Mid", isRoot: false, intervalIndex: 0 },
              { id: 11, note: "C#3", label: "Tom Lo", isRoot: false, intervalIndex: 0 },

              // Row 2
              { id: 4, note: "F#2", label: "CH", isRoot: false, intervalIndex: 0 },
              { id: 5, note: "G2", label: "Clap", isRoot: false, intervalIndex: 0 },
              { id: 6, note: "G#2", label: "Rim", isRoot: false, intervalIndex: 0 },
              { id: 7, note: "A2", label: "Shaker", isRoot: false, intervalIndex: 0 },

              // Row 1 (Bottom) - Kick/Snare
              { id: 0, note: "C2", label: "KICK", isRoot: true, intervalIndex: 0 },
              { id: 1, note: "D2", label: "SNARE", isRoot: false, intervalIndex: 0 },
              { id: 2, note: "D#2", label: "Clap 2", isRoot: false, intervalIndex: 0 },
              { id: 3, note: "E2", label: "Snare 2", isRoot: false, intervalIndex: 0 },
          ];
          // We render from Top-Left to Bottom-Right in CSS Grid usually, 
          // but we want index 0 at bottom left.
          // Let's sort for standard grid rendering:
          // Grid 4x4.
          // Visual Row 0 (Top): 12, 13, 14, 15
          // ...
          // Visual Row 3 (Bottom): 0, 1, 2, 3
          setPads(drumPads.reverse()); // Simple reverse for rendering top-to-bottom
      } else {
          const startOctave = trackType === 'bass' ? 1 : 3;
          setPads(generateIsomorphicGrid(rootNote, scale, startOctave));
      }
  }, [rootNote, scale, trackType]);

  useEffect(() => {
      // Subscribe to audio engine visual updates
      audioService.setActiveNotesCallback((notes) => {
          setActiveNotes(new Set(notes));
      });
  }, []);

  const getEngineTrackType = () => {
      if (trackType === 'bass') return 'bass';
      if (trackType === 'drum') return 'drum';
      return 'synth';
  };

  const handlePadDown = (note: string, e: React.PointerEvent) => {
    e.preventDefault();
    audioService.triggerAttack(note, getEngineTrackType());
    // Visual immediate feedback for touch
    e.currentTarget.classList.add('scale-95', 'brightness-150');
  };

  const handlePadUp = (note: string, e: React.PointerEvent) => {
    e.preventDefault();
    audioService.triggerRelease(note, getEngineTrackType());
    e.currentTarget.classList.remove('scale-95', 'brightness-150');
  };

  const handlePadLeave = (note: string, e: React.PointerEvent) => {
      e.preventDefault();
      audioService.triggerRelease(note, getEngineTrackType());
      e.currentTarget.classList.remove('scale-95', 'brightness-150');
  };

  // Color logic
  const getPadColor = (pad: PadNote) => {
      if (activeNotes.has(pad.note)) return 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10'; // Sequence Follow / Playing
      
      if (trackType === 'drum') {
          // Specific Drum Colors
          if (pad.note === "C2") return 'bg-rose-600'; // Kick
          if (pad.note === "D2") return 'bg-amber-500'; // Snare
          if (pad.note.includes("#2")) return 'bg-cyan-600'; // Hats
          return 'bg-[#222]';
      }

      if (pad.isRoot) return 'bg-[#8A2BE2]'; // HÅW Purple for Root
      return 'bg-daw-surface hover:bg-[#222]'; 
  };

  return (
    <div className={`w-full h-full grid gap-1 touch-none ${trackType === 'drum' ? 'grid-cols-4 grid-rows-4' : 'grid-cols-5 grid-rows-5'}`}>
      {pads.map((pad) => (
        <button
          key={pad.id}
          className={`
            relative rounded-sm transition-all duration-75 flex flex-col items-center justify-center
            group touch-none select-none outline-none border border-transparent
            ${getPadColor(pad)}
            active:bg-daw-accent
          `}
          onPointerDown={(e) => handlePadDown(pad.note, e)}
          onPointerUp={(e) => handlePadUp(pad.note, e)}
          onPointerLeave={(e) => handlePadLeave(pad.note, e)}
        >
          {/* Label */}
          <span className={`text-xs font-bold ${pad.isRoot || trackType === 'drum' ? 'text-white' : 'text-gray-600 group-active:text-black'}`}>
            {pad.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default PadGrid;
