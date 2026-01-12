import React, { useState, useEffect } from 'react';
import { InstrumentTab, NoteEvent, Track } from '../types';
import PadGrid from './PadGrid';
import Knob from './Knob';
import ClipEditor from './ClipEditor';
import MiniTimeline from './MiniTimeline';
import { audioService } from '../services/audioEngine';
import { Grid3X3, Sliders } from 'lucide-react';

interface InstrumentPanelProps {
  currentStep: number;
  activeClipId: string;
  notes: NoteEvent[];
  onUpdateNotes: (notes: NoteEvent[]) => void;
  onUpdateBpm: (bpm: number) => void;
  macros: { filter: number; reso: number; space: number; heat: number };
  setMacros: (m: any) => void;
  activeTrack: Track;
}

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({ 
  currentStep, activeClipId, notes, onUpdateNotes, onUpdateBpm, macros, setMacros, activeTrack 
}) => {
  const [activeTab, setActiveTab] = useState<InstrumentTab>('PADS');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const isEmptyClip = notes.length === 0;

  // Reset interaction state when switching clips
  useEffect(() => {
    if (isEmptyClip) {
        audioService.clearBuffer();
        setHasInteracted(false);
    }
  }, [activeClipId, isEmptyClip]);

  const handlePadInteraction = () => {
      if (isEmptyClip && !hasInteracted) {
          setHasInteracted(true);
          audioService.clearBuffer(); 
      }
  };

  // Toggle Step Logic
  const toggleStep = (stepIndex: number) => {
      const root = activeTrack.type === 'bass' ? "C2" : (activeTrack.type === 'drum' ? "C2" : "C4");
      const existingAtIndex = notes.findIndex(n => n.step === stepIndex);
      
      if (existingAtIndex !== -1) {
          const newNotes = notes.filter(n => n.step !== stepIndex);
          onUpdateNotes(newNotes);
      } else {
          onUpdateNotes([...notes, {
              note: root,
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

  const currentClipColor = activeTrack.clips.find(c => c.id === activeClipId)?.color || 'bg-daw-accent';
  
  const activeSteps = new Array(16).fill(false);
  notes.forEach(n => { activeSteps[n.step] = true; });

  const activeClipName = activeTrack.clips.find(c => c.id === activeClipId)?.name || 'Untitled';
  const isDrum = activeTrack.type === 'drum';

  return (
    <div className="flex flex-col h-full bg-daw-bg relative">
      
      {/* 
         TOP SECTION: Clip Editor 
      */}
      <div className={`
        flex flex-col shrink-0 bg-[#0a0a0a] transition-all duration-300 ease-in-out relative
        ${isExpanded ? 'h-full z-40 absolute inset-0' : 'h-[45%]'}
      `}>
          <div className="flex-1 relative border-b border-white/5">
             <ClipEditor 
                notes={notes}
                currentStep={currentStep}
                color={currentClipColor}
                rootNote="C"
                scale={isDrum ? "Chromatic" : "Minor"} 
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                onUpdateNotes={onUpdateNotes}
                trackType={activeTrack.type}
             />

             {!isExpanded && (
                 <div className="absolute top-2 left-2 pointer-events-none">
                    <span className="text-[10px] text-gray-400 font-mono font-bold">{activeClipName}</span>
                    {hasInteracted && isEmptyClip && <span className="ml-2 text-daw-accent font-bold animate-pulse text-[10px]">LISTENING...</span>}
                 </div>
             )}
          </div>
      </div>

      {/* 
         BOTTOM SECTION: Pads / FX 
      */}
      <div className={`flex-1 flex flex-col relative bg-black overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         
         {isDrum && (
             <div className="h-8 bg-[#121212] flex items-center px-2 border-b border-white/5 shrink-0 z-20">
                 <MiniTimeline 
                   steps={activeSteps} 
                   currentStep={currentStep} 
                   onToggleStep={toggleStep} 
                 />
             </div>
         )}

         <div className="flex-1 relative">
            <div 
                className={`absolute inset-0 p-2 z-0 transition-opacity duration-200 ${activeTab === 'PADS' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onPointerDown={handlePadInteraction}
            >
                <PadGrid trackType={activeTrack.type} rootNote="C" scale="Minor" />
            </div>

            <div className={`absolute inset-0 bg-daw-bg p-8 z-0 transition-opacity duration-200 flex items-center justify-center ${activeTab === 'FX' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="grid grid-cols-2 gap-x-12 gap-y-12">
                    {isDrum ? (
                        <>
                            <Knob label="KICK" value={macros.filter} onChange={(v) => updateMacro('filter', audioService.setKickDecay.bind(audioService), v)} color="text-rose-500" />
                            <Knob label="SNARE" value={macros.reso} onChange={(v) => updateMacro('reso', audioService.setSnareTone.bind(audioService), v)} color="text-amber-500" />
                            <Knob label="HATS" value={macros.space} onChange={(v) => updateMacro('space', audioService.setHatDecay.bind(audioService), v)} color="text-cyan-500" />
                            <Knob label="DRIVE" value={macros.heat} onChange={(v) => updateMacro('heat', audioService.setDrumDrive.bind(audioService), v)} color="text-white" />
                        </>
                    ) : (
                        <>
                            <Knob label="FILTER" value={macros.filter} onChange={(v) => updateMacro('filter', audioService.setFilterFrequency.bind(audioService), v)} color="text-emerald-400" />
                            <Knob label="RESO" value={macros.reso} onChange={(v) => updateMacro('reso', audioService.setFilterResonance.bind(audioService), v)} color="text-amber-400" />
                            <Knob label="SPACE" value={macros.space} onChange={(v) => updateMacro('space', audioService.setSpace.bind(audioService), v)} color="text-sky-400" />
                            <Knob label="HEAT" value={macros.heat} onChange={(v) => updateMacro('heat', audioService.setHeat.bind(audioService), v)} color="text-rose-400" />
                        </>
                    )}
                </div>
            </div>
         </div>

         {/* Note: Footer Tabs removed here as they are global now in App.tsx or handled there */}
         {/* We keep the mode switcher here for internal tab (PAD/FX) */}
         <div className="shrink-0 bg-[#0a0a0a] border-t border-[#222] pb-safe z-20">
            <div className="h-14 flex items-center justify-center gap-12 px-8">
                <button 
                    onClick={() => setActiveTab('PADS')}
                    className={`flex flex-col items-center gap-1.5 transition-colors p-2 ${activeTab === 'PADS' ? 'text-daw-accent' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    <Grid3X3 size={20} />
                    <span className="text-[10px] font-bold tracking-wider">PADS</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab('FX')}
                    className={`flex flex-col items-center gap-1.5 transition-colors p-2 ${activeTab === 'FX' ? 'text-purple-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    <Sliders size={20} />
                    <span className="text-[10px] font-bold tracking-wider">FX</span>
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default InstrumentPanel;