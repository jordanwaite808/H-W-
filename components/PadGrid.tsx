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
      // Regenerate grid when scale changes
      const startOctave = trackType === 'bass' ? 1 : 3;
      setPads(generateIsomorphicGrid(rootNote, scale, startOctave));
  }, [rootNote, scale, trackType]);

  useEffect(() => {
      // Subscribe to audio engine visual updates
      audioService.setActiveNotesCallback((notes) => {
          setActiveNotes(new Set(notes));
      });
  }, []);

  const getEngineTrackType = () => (trackType === 'bass' ? 'bass' : 'synth');

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

  // Color logic for Isomorphic Layout
  const getPadColor = (pad: PadNote) => {
      if (activeNotes.has(pad.note)) return 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10'; // Sequence Follow / Playing
      if (pad.isRoot) return 'bg-[#8A2BE2]'; // HÅW Purple for Root
      // Scale Interval Colors:
      return 'bg-daw-surface hover:bg-[#222]'; 
  };

  return (
    <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1 touch-none">
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
          <span className={`text-xs font-bold ${pad.isRoot ? 'text-white' : 'text-gray-600 group-active:text-black'}`}>
            {pad.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default PadGrid;
