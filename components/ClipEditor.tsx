import React, { useEffect, useRef, useState, useMemo } from 'react';
import { NoteEvent } from '../types';
import { getScaleNotes } from '../constants';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ClipEditorProps {
    notes: NoteEvent[];
    currentStep: number;
    color: string;
    rootNote: string;
    scale: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdateNotes: (notes: NoteEvent[]) => void;
    trackType: 'synth' | 'bass' | 'drum';
}

const ClipEditor: React.FC<ClipEditorProps> = ({ 
    notes, currentStep, color, rootNote, scale, isExpanded, onToggleExpand, onUpdateNotes, trackType 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- VIEW LOGIC ---

    // 1. Determine Scale Range
    const scaleRows = useMemo(() => {
        const fullScale = getScaleNotes(rootNote, scale, 1, 6);
        
        if (isExpanded) {
            return fullScale.filter(n => n.midi >= 36 && n.midi <= 84); // C2 to C6
        } else {
            // AUTO-ZOOM (Mini Mode)
            if (notes.length === 0) {
                // Default view centered around C3
                return fullScale.filter(n => n.midi >= 48 && n.midi <= 72);
            }
            
            const noteMidis = notes.map(n => {
                const match = n.note.match(/([A-G][#b]?)(-?\d+)/);
                if (!match) return 60;
                // Try to match midi from note name
                const fsNode = fullScale.find(fs => fs.note === n.note);
                if (fsNode) return fsNode.midi;
                
                // Fallback calc
                // C4 = 60? No C4=72 in some standards, lets stick to Tone.js standard (C4=72 approx or 60)
                // We'll trust string matching for now
                return 60; 
            });

            const min = Math.min(...noteMidis);
            const max = Math.max(...noteMidis);

            const minIndex = fullScale.findIndex(n => n.midi === max); // High midi is low index in our sorted array
            const maxIndex = fullScale.findIndex(n => n.midi === min);

            const start = Math.max(0, minIndex - 2);
            const end = Math.min(fullScale.length, maxIndex + 3);

            return fullScale.slice(start, end);
        }
    }, [rootNote, scale, isExpanded, notes]);

    // --- RENDER LOOP ---

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Resize handling
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const rowHeight = height / scaleRows.length;
        const colWidth = width / 16;

        // 1. Draw Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Grid & Labels
        ctx.lineWidth = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 10px monospace';
        
        // Rows
        scaleRows.forEach((row, i) => {
            const y = i * rowHeight;
            // Root note highlight
            ctx.fillStyle = row.isRoot ? 'rgba(255, 255, 255, 0.08)' : (i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent');
            ctx.fillRect(0, y, width, rowHeight);
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            if (isExpanded || scaleRows.length < 15) {
                ctx.fillStyle = row.isRoot ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
                ctx.fillText(row.note, 4, y + rowHeight / 2);
            }
        });

        // Cols (16th notes)
        for (let i = 0; i <= 16; i++) {
            const x = i * colWidth;
            ctx.beginPath();
            ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 3. Draw Notes
        let noteColor = '#2dd4bf'; // Default teal
        if (color.includes('rose')) noteColor = '#f43f5e';
        if (color.includes('amber')) noteColor = '#f59e0b';
        if (color.includes('cyan')) noteColor = '#06b6d4';
        if (color.includes('emerald')) noteColor = '#10b981';

        notes.forEach(note => {
            // Find row index
            const rowIndex = scaleRows.findIndex(r => r.note === note.note);
            if (rowIndex === -1) return; // Note not in view (folded out)

            const x = note.step * colWidth;
            const y = rowIndex * rowHeight;
            
            // Draw Note Rect
            ctx.fillStyle = noteColor;
            
            const padding = 1;
            ctx.fillRect(x + padding, y + padding, colWidth - (padding*2), rowHeight - (padding*2));

            // Velocity Opacity
            ctx.fillStyle = `rgba(0,0,0, ${1 - note.velocity})`; // Darken based on velocity
            ctx.fillRect(x + padding, y + padding, colWidth - (padding*2), rowHeight - (padding*2));
        });

        // 4. Draw Playhead
        if (currentStep >= 0) {
            const x = currentStep * colWidth;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(x, 0, 2, height);
            
            // Glow
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
            ctx.fillRect(x, 0, 2, height);
            ctx.shadowBlur = 0;
        }

    }, [scaleRows, notes, currentStep, color, isExpanded]);

    // --- INTERACTION ---

    const handlePointerDown = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rowHeight = rect.height / scaleRows.length;
        const colWidth = rect.width / 16;

        const step = Math.floor(x / colWidth);
        const rowIndex = Math.floor(y / rowHeight);
        
        // Safety check
        if (rowIndex < 0 || rowIndex >= scaleRows.length) return;
        if (step < 0 || step >= 16) return;

        const targetNote = scaleRows[rowIndex].note;

        // Toggle Logic
        const existingIndex = notes.findIndex(n => n.step === step && n.note === targetNote);
        
        if (existingIndex !== -1) {
            // Remove
            const newNotes = [...notes];
            newNotes.splice(existingIndex, 1);
            onUpdateNotes(newNotes);
        } else {
            // Add
            const newNote: NoteEvent = {
                note: targetNote,
                startTime: `0:0:${step}`,
                step: step,
                duration: '16n',
                velocity: 0.8
            };
            onUpdateNotes([...notes, newNote]);
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full relative group">
            <canvas 
                ref={canvasRef}
                className="w-full h-full touch-none cursor-pointer"
                onPointerDown={handlePointerDown}
            />
            
            {/* Expand Toggle */}
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 z-20"
            >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
        </div>
    );
};

export default ClipEditor;
