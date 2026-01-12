import React, { useEffect, useRef, useState } from 'react';
import { Track, MasterState } from '../types';
import { audioService } from '../services/audioEngine';
import { Grid3X3, Waves, Keyboard } from 'lucide-react';

interface MixerProps {
    tracks: Track[];
    setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
    masterState: MasterState;
    setMasterState: React.Dispatch<React.SetStateAction<MasterState>>;
    selectedMasterTab: 'MAIN' | 'DYN' | 'SAT';
    onSelectMasterTab: (tab: 'MAIN' | 'DYN' | 'SAT') => void;
}

const Mixer: React.FC<MixerProps> = ({ 
    tracks, setTracks, masterState, setMasterState, selectedMasterTab, onSelectMasterTab 
}) => {
    
    // --- Metering Animation Loop ---
    const requestRef = useRef<number>(0);
    const [meterLevels, setMeterLevels] = useState<Record<string, number>>({});

    useEffect(() => {
        const animate = () => {
            const trackIds = tracks.map(t => t.id);
            const levels = audioService.getMeterValues(trackIds);
            setMeterLevels(levels);
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [tracks]);

    // --- Actions ---

    const updateTrack = (id: string, updates: Partial<Track>) => {
        setTracks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const newTrack = { ...t, ...updates };
            // Sync Audio Engine
            if (updates.volume !== undefined) audioService.setTrackVolume(id, updates.volume);
            if (updates.isMuted !== undefined) audioService.setTrackMute(id, updates.isMuted);
            if (updates.isSoloed !== undefined) audioService.setTrackSolo(id, updates.isSoloed);
            return newTrack;
        }));
    };

    const updateMasterVol = (vol: number) => {
        setMasterState(prev => ({ ...prev, volume: vol }));
        audioService.setMasterVolume(vol);
    };

    // --- Helpers ---
    const dbToPercent = (db: number) => {
        const range = 66; 
        const normalized = (db + 60) / range;
        return Math.max(0, Math.min(1, normalized)) * 100;
    };

    const percentToDb = (pct: number) => {
        const range = 66;
        return (pct * range) - 60;
    };

    // --- Renderers ---

    const renderChannelStrip = (
        id: string, 
        name: string, 
        color: string, 
        volume: number, 
        isMuted: boolean, 
        isSoloed: boolean, 
        type: 'synth' | 'drum' | 'bass' | 'master',
        onChangeVolume: (val: number) => void
    ) => {
        const heightPct = dbToPercent(volume);
        const levelDb = meterLevels[id] || -100;
        const meterHeight = Math.max(0, Math.min(100, ((levelDb + 60) / 66) * 100));

        // Touch Drag Logic
        const handleMove = (e: React.PointerEvent) => {
            if (e.buttons !== 1) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const h = rect.height;
            const pct = 1 - (y / h); // Inverted Y
            onChangeVolume(percentToDb(pct));
        };

        const Icon = type === 'drum' ? Grid3X3 : (type === 'bass' ? Waves : Keyboard);

        return (
            <div key={id} className="flex-1 flex flex-col items-center h-full border-r border-[#222] min-w-[70px]">
                {/* Header */}
                <div className="h-24 w-full flex flex-col items-center justify-between py-3 bg-[#0a0a0a]">
                    <Icon size={18} className={type === 'master' ? 'text-gray-400' : (color.replace('bg-', 'text-'))} />
                    
                    {type !== 'master' ? (
                        <>
                            <button 
                                onClick={() => updateTrack(id, { isMuted: !isMuted })}
                                className={`text-[10px] font-bold w-full py-1 ${isMuted ? 'text-amber-500 bg-amber-500/10' : 'text-gray-600 hover:text-white'}`}
                            >
                                M
                            </button>
                            <button 
                                onClick={() => updateTrack(id, { isSoloed: !isSoloed })}
                                className={`text-[10px] font-bold w-full py-1 ${isSoloed ? 'text-blue-500 bg-blue-500/10' : 'text-gray-600 hover:text-white'}`}
                            >
                                S
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-2 w-full px-2">
                             <button 
                                onClick={() => onSelectMasterTab(selectedMasterTab === 'DYN' ? 'MAIN' : 'DYN')}
                                className={`text-[9px] font-bold py-1 w-full text-center rounded ${selectedMasterTab === 'DYN' ? 'bg-white text-black' : 'text-gray-500 bg-[#222]'}`}
                             >
                                 DYN
                             </button>
                             <button 
                                onClick={() => onSelectMasterTab(selectedMasterTab === 'SAT' ? 'MAIN' : 'SAT')}
                                className={`text-[9px] font-bold py-1 w-full text-center rounded ${selectedMasterTab === 'SAT' ? 'bg-white text-black' : 'text-gray-500 bg-[#222]'}`}
                             >
                                 SAT
                             </button>
                        </div>
                    )}
                </div>

                {/* Fader Area */}
                <div 
                    className="flex-1 w-full relative bg-[#151515] touch-none cursor-ns-resize group select-none"
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleMove(e); }}
                    onPointerMove={handleMove}
                >
                    {/* Liquid Infill */}
                    {type !== 'master' && (
                        <div 
                            className={`absolute bottom-0 left-0 right-0 transition-all duration-75 ease-out ${color} opacity-80 pointer-events-none`}
                            style={{ height: `${heightPct}%` }}
                        />
                    )}

                    {/* Master is special: Grey BG */}
                    {type === 'master' && (
                        <div 
                             className="absolute bottom-0 left-0 right-0 bg-white/10 pointer-events-none"
                             style={{ height: `${heightPct}%` }}
                        />
                    )}

                    {/* Fader Cap Line */}
                    <div 
                        className="absolute left-0 right-0 h-[2px] bg-white z-10 pointer-events-none shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                        style={{ bottom: `${heightPct}%` }}
                    />

                    {/* Dual Lane Meter (Overlay) */}
                    <div className="absolute inset-0 flex justify-center gap-[2px] pointer-events-none opacity-60 mix-blend-screen z-0">
                        <div className="w-[3px] bg-black/50 h-full flex items-end">
                            <div 
                                className={`w-full transition-all duration-75 ease-linear bg-white`} 
                                style={{ height: `${meterHeight}%` }} 
                            />
                        </div>
                        <div className="w-[3px] bg-black/50 h-full flex items-end">
                             <div 
                                className={`w-full transition-all duration-75 ease-linear bg-white`} 
                                style={{ height: `${meterHeight * 0.95}%` }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Footer dB */}
                <div className={`h-10 w-full flex items-center justify-center bg-[#0a0a0a] border-t border-white/5 ${type === 'master' ? 'bg-[#1a1a1a]' : color}`}>
                    <span className={`text-[10px] font-bold font-mono ${type === 'master' ? 'text-white' : 'text-black'}`}>
                        {volume <= -60 ? '-inf' : `${volume.toFixed(1)} dB`}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex w-full h-full overflow-hidden select-none">
            {tracks.map(t => renderChannelStrip(
                t.id, t.name, t.color, t.volume, t.isMuted, t.isSoloed, t.type,
                (v) => updateTrack(t.id, { volume: v })
            ))}
            {/* Master Strip */}
            {renderChannelStrip(
                'master', 'Main', 'bg-gray-200', masterState.volume, false, false, 'master',
                (v) => updateMasterVol(v)
            )}
        </div>
    );
};

export default Mixer;
