import React, { useMemo } from 'react';
import { NoteEvent } from '../types';
import { NOTES } from '../constants';

interface ClipOverviewProps {
  notes: NoteEvent[];
  currentStep: number;
  duration?: number; // bars
  color: string;
}

const ClipOverview: React.FC<ClipOverviewProps> = ({ notes, currentStep, duration = 1, color }) => {
  // Parse note pitch to Y position (0-100%)
  // Range: C2 (36) to C6 (84) approx
  const getNoteY = (noteStr: string) => {
      // Basic parser
      const octave = parseInt(noteStr.slice(-1));
      const noteName = noteStr.slice(0, -1);
      const semitone = NOTES.indexOf(noteName);
      const midi = (octave + 1) * 12 + semitone;
      
      const minMidi = 36; // C2
      const maxMidi = 84; // C6
      const range = maxMidi - minMidi;
      const normalized = Math.max(0, Math.min(1, (midi - minMidi) / range));
      return (1 - normalized) * 100; // Invert for CSS top
  };

  const getNoteX = (startTime: string) => {
      // Parse "0:0:X"
      const parts = startTime.split(':').map(Number);
      const sixteenths = (parts[0] * 16) + (parts[1] * 4) + parts[2];
      return (sixteenths / 16) * 100;
  };

  const playheadX = (currentStep / 16) * 100;

  return (
    <div className="w-full h-full bg-[#111] relative overflow-hidden border-b border-white/5">
        {/* Grid Background */}
        <div className="absolute inset-0 flex">
            {Array.from({length: 16}).map((_, i) => (
                <div key={i} className={`flex-1 border-r ${i % 4 === 0 ? 'border-white/10' : 'border-white/5'}`} />
            ))}
        </div>

        {/* Notes */}
        {notes.map((n, i) => (
            <div 
                key={i}
                className={`absolute h-1.5 min-w-[6px] rounded-full ${color.replace('bg-', 'bg-').replace('surface', 'clip')}`}
                style={{
                    left: `${getNoteX(n.startTime)}%`,
                    top: `${getNoteY(n.note)}%`,
                    width: '5.5%' // Approx 1/16th
                }}
            />
        ))}

        {/* Playhead */}
        {currentStep >= 0 && (
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-10 transition-all duration-75 ease-linear"
                style={{ left: `${playheadX}%` }}
            />
        )}
    </div>
  );
};

export default ClipOverview;
