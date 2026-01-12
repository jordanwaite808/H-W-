import React, { useState } from 'react';
import { InstrumentTab, NoteEvent, Track } from '../types';
import PadGrid from './PadGrid';
import Knob from './Knob';
import { audioService } from '../services/audioEngine';
import { Grid3X3, Sliders, Activity } from 'lucide-react';

interface InstrumentPanelProps {
  currentStep: number;
  activeClipId: string;
  notes: NoteEvent[];
  onUpdateNotes: (notes: NoteEvent[]) => void;
  macros: { filter: number; reso: number; space: number; heat: number };
  setMacros: (m: any) => void;
  activeTrack: Track;
}

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({ 
  currentStep, activeClipId, notes, onUpdateNotes, macros, setMacros, activeTrack 
}) => {
  const [showSequencer, setShowSequencer] = useState(false);

  const handleCapture = () => {
      const captured = audioService.capturePerformance();
      if (captured.length > 0) {
          onUpdateNotes([...notes, ...captured]);
      }
  };

  const toggleStep = (stepIndex: number) => {
      // Simple sequencer toggle for prototype
      const existingAtIndex = notes.findIndex(n => n.step === stepIndex);
      if (existingAtIndex !== -1) {
          const newNotes = [...notes];
          newNotes.splice(existingAtIndex, 1);
          onUpdateNotes(newNotes);
      } else {
          // Add default note
          onUpdateNotes([...notes, {
              note: activeTrack.type === 'bass' ? "C2" : "C4",
              velocity: 0.8,
              startTime: `0:0:${stepIndex}`,
              step: stepIndex,
              duration: "16n"
          }]);
      }
  };

  const updateMacro = (key: keyof typeof macros, fn: (v: number) => void, val: number) => {
      setMacros((prev: any) => ({ ...prev, [key]: val }));
      fn(val);
  };

  return (
    <div className="flex flex-col h-full bg-daw-bg relative">
      
      {/* 1. Macro Strip */}
      <div className="shrink-0 px-4 py-4 flex justify-between items-center bg-[#111] border-b border-white/5 z-20">
         <Knob label="FILTER" value={macros.filter} onChange={(v) => updateMacro('filter', audioService.setFilterFrequency.bind(audioService), v)} />
         <Knob label="RESO" value={macros.reso} onChange={(v) => updateMacro('reso', audioService.setFilterResonance.bind(audioService), v)} />
         <Knob label="SPACE" value={macros.space} onChange={(v) => updateMacro('space', audioService.setSpace.bind(audioService), v)} />
         <Knob label="HEAT" value={macros.heat} onChange={(v) => updateMacro('heat', audioService.setHeat.bind(audioService), v)} />
      </div>

      {/* 2. Main Performance Area */}
      <div className="flex-1 relative bg-black">
         
         {/* Layer A: Pads */}
         <div className="absolute inset-0 p-2 z-0">
             <PadGrid trackType={activeTrack.type} rootNote="C" scale="Minor" />
         </div>

         {/* Layer B: Sequencer Overlay (Ghost Layer) */}
         {showSequencer && (
             <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm p-4 grid grid-cols-4 grid-rows-4 gap-2">
                 {Array.from({length: 16}).map((_, i) => {
                     const hasNote = notes.some(n => n.step === i);
                     const isCurrent = currentStep === i;
                     return (
                         <button
                            key={i}
                            onPointerDown={() => toggleStep(i)}
                            className={`
                                rounded-md border-2 transition-all
                                ${hasNote ? 'bg-daw-clip border-daw-clip' : 'bg-transparent border-white/10'}
                                ${isCurrent ? 'border-white brightness-150 scale-105' : ''}
                            `}
                         />
                     )
                 })}
             </div>
         )}
         
         {/* Capture Button Floating */}
         <button 
            onClick={handleCapture}
            className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-daw-accent text-black font-black flex items-center justify-center shadow-[0_0_30px_rgba(255,95,0,0.4)] active:scale-95 z-30"
         >
             <div className="w-4 h-4 rounded-full bg-black animate-pulse" />
         </button>

      </div>

      {/* 3. Bottom Tab Bar */}
      <div className="h-14 shrink-0 bg-[#0a0a0a] flex items-center justify-center gap-12 border-t border-[#222] pb-safe z-20">
          <button 
            onClick={() => setShowSequencer(false)}
            className={`flex flex-col items-center gap-1 transition-colors ${!showSequencer ? 'text-daw-accent' : 'text-gray-600'}`}
          >
            <Grid3X3 size={20} />
            <span className="text-[9px] font-bold">PADS</span>
          </button>
          
          <button 
             onClick={() => setShowSequencer(true)}
             className={`flex flex-col items-center gap-1 transition-colors ${showSequencer ? 'text-daw-clip' : 'text-gray-600'}`}
          >
            <Activity size={20} />
            <span className="text-[9px] font-bold">SEQ</span>
          </button>
      </div>
    </div>
  );
};

export default InstrumentPanel;
