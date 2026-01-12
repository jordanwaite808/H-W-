import React, { useEffect, useRef, useState } from 'react';
import { Clip } from '../types';
import { Play, Square, Plus } from 'lucide-react';
import { NOTES } from '../constants';

const getHexColor = (bgClass: string) => {
    if (bgClass.includes('rose')) return '#f43f5e';
    if (bgClass.includes('amber')) return '#f59e0b';
    if (bgClass.includes('cyan')) return '#06b6d4';
    if (bgClass.includes('emerald')) return '#10b981';
    if (bgClass.includes('purple')) return '#a855f7';
    if (bgClass.includes('blue')) return '#3b82f6';
    return '#2dd4bf'; // teal default
};

interface SessionClipTileProps {
    clip: Clip;
    trackColor: string;
    isPlaying: boolean;
    currentStep: number;
    onTogglePlayback: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onContextMenu: (e: React.PointerEvent) => void;
}

const SessionClipTile: React.FC<SessionClipTileProps> = ({
    clip, trackColor, isPlaying, currentStep, onTogglePlayback, onEdit, onContextMenu
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasNotes = clip.notes.length > 0;
    const hexColor = getHexColor(trackColor);

    // --- LONG PRESS LOGIC ---
    const [isPressed, setIsPressed] = useState(false);
    const pressTimer = useRef<number | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsPressed(true);
        // Start 500ms timer
        pressTimer.current = window.setTimeout(() => {
            // Haptic Tick (if supported)
            if (navigator.vibrate) navigator.vibrate(50);
            onContextMenu(e);
            setIsPressed(false); // Reset press state so we don't trigger click
        }, 500);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (pressTimer.current) {
            window.clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        if (isPressed) {
            // Short tap detected
            if (hasNotes) {
                onTogglePlayback(e as any);
            } else {
                onEdit();
            }
        }
        setIsPressed(false);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // If moved significantly, cancel long press
        // For prototype we just cancel on any move to be safe
        if (pressTimer.current) {
            // Optional: calculate distance
            // clearTimeout(pressTimer.current);
            // pressTimer.current = null;
            // setIsPressed(false);
        }
    };
    
    // Cleanup
    useEffect(() => {
        return () => {
             if (pressTimer.current) window.clearTimeout(pressTimer.current);
        };
    }, []);


    // --- CANVAS DRAWING (Same as before) ---
    useEffect(() => {
        if (!hasNotes) return;
        
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const noteMidis = clip.notes.map(n => {
            const match = n.note.match(/([A-G][#b]?)(-?\d+)/);
            if (!match) return 60;
            const noteName = match[1];
            const octave = parseInt(match[2]);
            const semitone = NOTES.indexOf(noteName);
            return (octave + 1) * 12 + semitone;
        });

        const minMidi = Math.min(...noteMidis);
        const maxMidi = Math.max(...noteMidis);
        const range = Math.max(12, maxMidi - minMidi + 4); 
        const bottomMidi = minMidi - 2;

        const width = rect.width;
        const height = rect.height;

        ctx.fillStyle = hexColor;
        ctx.globalAlpha = 0.8; 

        clip.notes.forEach(note => {
             const stepWidth = width / 16;
             const x = note.step * stepWidth;
             const w = stepWidth - 2;

             const match = note.note.match(/([A-G][#b]?)(-?\d+)/);
             if (!match) return;
             const noteName = match[1];
             const octave = parseInt(match[2]);
             const semitone = NOTES.indexOf(noteName);
             const midi = (octave + 1) * 12 + semitone;

             const normalizedPitch = (midi - bottomMidi) / range;
             const y = height - (normalizedPitch * height);
             const h = Math.max(4, height / range * 0.8); 

             ctx.beginPath();
             if (typeof (ctx as any).roundRect === 'function') {
                 (ctx as any).roundRect(x, y - h, w, h, 2);
             } else {
                 ctx.rect(x, y - h, w, h);
             }
             ctx.fill();
        });

        if (isPlaying && currentStep >= 0) {
            const x = (currentStep / 16) * width;
            const gradient = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - 4, 0, 8, height); 
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, 0, 1.5, height); 
        }

    }, [clip.notes, currentStep, isPlaying, hasNotes, hexColor]);


    // --- EMPTY STATE ---
    if (!hasNotes) {
        return (
            <div 
                className="w-full aspect-[16/9] rounded-xl bg-[#0f0f0f] border border-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-all group hover:border-white/10 hover:bg-[#151515] touch-none"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDoubleClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
                <Plus size={16} className="text-[#333] group-hover:text-[#555] transition-colors" />
            </div>
        );
    }

    // --- FILLED STATE ---
    return (
        <div 
            ref={containerRef}
            className={`
                w-full aspect-[16/9] rounded-xl relative overflow-hidden group cursor-pointer transition-all touch-none
                bg-[#1a1a1a] select-none
                ${isPlaying ? 'ring-1 ring-white/50 shadow-[0_0_15px_rgba(0,0,0,0.6)]' : ''}
                ${isPressed ? 'scale-105 shadow-2xl brightness-125 z-50' : ''}
            `}
            style={{ 
                borderLeft: `4px solid ${hexColor}`
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
            onDoubleClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 pointer-events-none" />

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                 <span className="text-[10px] font-bold text-white/90 truncate max-w-[70%] shadow-black drop-shadow-md">
                    {clip.name || "Untitled"}
                 </span>
                 <span className="text-[9px] font-mono text-white/50">
                    1 BAR
                 </span>
            </div>

            <div className={`
                absolute inset-0 flex items-center justify-center 
                opacity-0 group-hover:opacity-100 transition-opacity z-20
                ${isPlaying ? 'bg-black/20' : 'bg-black/10'}
            `}>
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                     {isPlaying ? <Square size={12} fill="black" /> : <Play size={12} fill="black" className="ml-0.5" />}
                </div>
            </div>
        </div>
    );
};

export default SessionClipTile;