import React from 'react';
import { SEQUENCER_STEPS } from '../constants';

interface MiniTimelineProps {
  steps: boolean[];
  currentStep: number;
  onToggleStep: (index: number) => void;
}

const MiniTimeline: React.FC<MiniTimelineProps> = ({ steps, currentStep, onToggleStep }) => {
  return (
    <div className="w-full h-12 flex items-center justify-between px-1 gap-1 bg-black/20 rounded-lg">
      {steps.map((isActive, index) => {
        const isCurrent = currentStep === index;
        return (
          <div
            key={index}
            onPointerDown={() => onToggleStep(index)}
            className={`
              flex-1 h-6 rounded-sm cursor-pointer transition-all duration-75 relative
              ${isActive ? 'bg-daw-accent shadow-[0_0_8px_rgba(255,95,0,0.5)]' : 'bg-daw-surface hover:bg-daw-muted'}
            `}
          >
             {/* Playhead indicator */}
             {isCurrent && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
             )}
          </div>
        );
      })}
    </div>
  );
};

export default MiniTimeline;
