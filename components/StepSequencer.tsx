import React, { useEffect, useState, useRef } from 'react';
import { audioService } from '../services/audioEngine';
import { SEQUENCER_STEPS } from '../constants';

interface StepSequencerProps {
  currentStep: number;
}

const StepSequencer: React.FC<StepSequencerProps> = ({ currentStep }) => {
  // Local state for the pattern (16 booleans)
  const [steps, setSteps] = useState<boolean[]>(new Array(SEQUENCER_STEPS).fill(false));

  const toggleStep = (index: number) => {
    const newSteps = [...steps];
    newSteps[index] = !newSteps[index];
    setSteps(newSteps);
    
    // Sync with audio engine
    // audioService.updateSequencerPattern(newSteps);
  };

  return (
    <div className="w-full h-full p-4 flex items-center justify-center bg-daw-panel">
      <div className="grid grid-cols-4 gap-3 w-full max-w-md aspect-square">
        {steps.map((isActive, index) => {
          const isCurrent = currentStep === index;
          
          return (
            <button
              key={index}
              onClick={() => toggleStep(index)}
              className={`
                relative w-full h-full rounded-sm transition-all duration-100
                border-2
                ${isActive 
                  ? 'bg-daw-secondary border-daw-secondary shadow-[0_0_10px_rgba(251,191,36,0.4)]' 
                  : 'bg-daw-surface border-transparent'
                }
                ${isCurrent 
                  ? 'border-white !bg-white/20' 
                  : ''
                }
              `}
            >
              {/* Step Number Indicator (Subtle) */}
              <span className={`absolute top-1 left-1 text-[9px] ${isActive ? 'text-black font-bold' : 'text-zinc-600'}`}>
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepSequencer;