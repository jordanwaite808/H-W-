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
      if (trackType === 'drum') {
          // Standardized 4x4 Drum Rack Layout (Bottom Left Anchor)
          // Visual Layout (Top to Bottom in DOM = Row 4 to Row 1)
          const drumPads: PadNote[] = [
              // Row 4 (Top) - Cymbals & Accents
              { id: 12, note: "C#3", label: "Crash 1", isRoot: false, intervalIndex: 0 },
              { id: 13, note: "E3", label: "Crash 2", isRoot: false, intervalIndex: 0 },
              { id: 14, note: "F3", label: "Bell", isRoot: false, intervalIndex: 0 },
              { id: 15, note: "G3", label: "China", isRoot: false, intervalIndex: 0 },
              
              // Row 3 - Toms & Ride
              { id: 8, note: "D3", label: "Tom Hi", isRoot: false, intervalIndex: 0 },
              { id: 9, note: "B2", label: "Tom Mid", isRoot: false, intervalIndex: 0 },
              { id: 10, note: "G2", label: "Tom Lo", isRoot: false, intervalIndex: 0 },
              { id: 11, note: "D#3", label: "Ride", isRoot: false, intervalIndex: 0 },

              // Row 2 - Hats & Perc
              { id: 4, note: "F#2", label: "CH", isRoot: false, intervalIndex: 0 },
              { id: 5, note: "A#2", label: "OH", isRoot: false, intervalIndex: 0 },
              { id: 6, note: "G#2", label: "Cowbell", isRoot: false, intervalIndex: 0 },
              { id: 7, note: "D#2", label: "Clap", isRoot: false, intervalIndex: 0 },

              // Row 1 (Bottom) - Foundation
              { id: 0, note: "C2", label: "KICK", isRoot: true, intervalIndex: 0 },
              { id: 1, note: "D2", label: "SNARE", isRoot: false, intervalIndex: 0 },
              { id: 2, note: "C#2", label: "Rim", isRoot: false, intervalIndex: 0 },
              { id: 3, note: "B1", label: "Sub", isRoot: false, intervalIndex: 0 },
          ];
          setPads(drumPads); 
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
          if (pad.note === "C2" || pad.note === "B1") return 'bg-rose-600'; // Kicks
          if (pad.note === "D2" || pad.note === "D#2" || pad.note === "C#2") return 'bg-amber-500'; // Snares/Claps
          if (pad.note.includes("#2")) return 'bg-cyan-600'; // Hats (roughly)
          if (pad.label.includes("Crash") || pad.label.includes("Ride") || pad.label.includes("China") || pad.label.includes("Bell")) return 'bg-yellow-600'; // Cymbals
          if (pad.label.includes("Tom")) return 'bg-purple-600'; // Toms
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
          <span className={`text-[10px] font-bold ${pad.isRoot || trackType === 'drum' ? 'text-white' : 'text-gray-600 group-active:text-black'} text-center leading-tight`}>
            {pad.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default PadGrid;