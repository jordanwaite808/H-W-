import React from 'react';
import Knob from './Knob';
import { MasterState } from '../types';
import { audioService } from '../services/audioEngine';
import { X, Check } from 'lucide-react';

interface MasterFXPanelProps {
    type: 'DYN' | 'SAT';
    state: MasterState;
    setState: React.Dispatch<React.SetStateAction<MasterState>>;
    onClose: () => void;
}

const MasterFXPanel: React.FC<MasterFXPanelProps> = ({ type, state, setState, onClose }) => {
    
    const update = (module: 'dyn' | 'sat', param: string, val: number) => {
        setState(prev => {
            const next = {
                ...prev,
                [module]: {
                    ...prev[module],
                    [param]: val
                }
            };
            audioService.updateMasterFX(next);
            return next;
        });
    };

    const renderKnob = (label: string, val: number, fn: (v: number) => void, color: string) => (
        <Knob label={label} value={val} onChange={fn} color={color} />
    );

    return (
        <div className="h-full w-full bg-[#050505] flex flex-col">
            {/* Header / Toolbar */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]">
                <button onClick={onClose} className="text-red-500 font-bold text-xs uppercase">Delete</button>
                <span className="text-sm font-bold text-gray-200">{type === 'DYN' ? 'Punch Glue' : 'Analog Clip'}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-xs uppercase">Done</button>
            </div>

            {/* Grid */}
            <div className="flex-1 p-6">
                {type === 'DYN' ? (
                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        {renderKnob("Low Gain", state.dyn.lowGain, (v) => update('dyn', 'lowGain', v), "text-white")}
                        {renderKnob("Mid Gain", state.dyn.midGain, (v) => update('dyn', 'midGain', v), "text-white")}
                        {renderKnob("High Gain", state.dyn.highGain, (v) => update('dyn', 'highGain', v), "text-white")}
                        {renderKnob("Comp HP", state.dyn.compHiPass, (v) => update('dyn', 'compHiPass', v), "text-gray-400")}
                        
                        {renderKnob("Release", state.dyn.release, (v) => update('dyn', 'release', v), "text-white")}
                        {renderKnob("Thresh", state.dyn.threshold, (v) => update('dyn', 'threshold', v), "text-white")}
                        {renderKnob("Out Gain", state.dyn.outputGain, (v) => update('dyn', 'outputGain', v), "text-white")}
                        {renderKnob("Dry/Wet", state.dyn.dryWet, (v) => update('dyn', 'dryWet', v), "text-white")}
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        {renderKnob("Drive", state.sat.drive, (v) => update('sat', 'drive', v), "text-white")}
                        {renderKnob("Clip", state.sat.analogClip, (v) => update('sat', 'analogClip', v), "text-gray-400")}
                        {renderKnob("Col Lo", state.sat.colorLow, (v) => update('sat', 'colorLow', v), "text-gray-400")}
                        {renderKnob("Col Freq", state.sat.colorFreq, (v) => update('sat', 'colorFreq', v), "text-white")}
                        
                        {renderKnob("Col Wid", state.sat.colorWidth, (v) => update('sat', 'colorWidth', v), "text-gray-400")}
                        {renderKnob("Col Hi", state.sat.colorHi, (v) => update('sat', 'colorHi', v), "text-gray-400")}
                        {renderKnob("Output", state.sat.output, (v) => update('sat', 'output', v), "text-white")}
                        {renderKnob("Dry/Wet", state.sat.dryWet, (v) => update('sat', 'dryWet', v), "text-white")}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterFXPanel;
