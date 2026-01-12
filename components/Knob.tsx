import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  value: number; // 0 to 1
  onChange: (value: number) => void;
  color?: string;
}

const Knob: React.FC<KnobProps> = ({ label, value, onChange, color = 'text-daw-accent' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY;
    // Sensitivity: 200px for full range
    const change = deltaY / 200;
    const newValue = Math.min(Math.max(startValue.current + change, 0), 1);
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Calculate arc for SVG
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  // Arc should be about 270 degrees (0.75 of circle)
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength * (1 - value);
  const rotation = 135; // Start from bottom left

  return (
    <div 
      className="flex flex-col items-center gap-2 cursor-ns-resize touch-none select-none group"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
        <div className="relative w-12 h-12">
            {/* Background Track */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    fill="none"
                    stroke="#333"
                    strokeWidth="3"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
                />
                {/* Active Value */}
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={`${color}`}
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
                />
            </svg>
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  );
};

export default Knob;
