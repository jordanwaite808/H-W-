import React, { useEffect, useState, useMemo } from 'react';
import { audioService } from './services/audioEngine';
import SessionView from './components/SessionView';
import InstrumentPanel from './components/InstrumentPanel';
import Mixer from './components/Mixer';
import MasterFXPanel from './components/MasterFXPanel';
import { Play, Pause, ArrowLeft, PlusCircle, Trash2, Folder, MoreVertical, LayoutGrid, SlidersHorizontal, RotateCcw, RotateCw, Copy, Edit2, Layers } from 'lucide-react';
import { Track, AppState, ViewMode, Clip, Project, NoteEvent, MasterState, MasterTab } from './types';

// --- DEFAULTS ---
const DEFAULT_MACROS = { filter: 0.8, reso: 0.1, space: 0.2, heat: 0.0 };

const DEFAULT_MASTER: MasterState = {
    volume: 0,
    dyn: { lowGain: 0.5, midGain: 0.5, highGain: 0.5, compHiPass: 0, release: 0.3, threshold: 0.8, outputGain: 0.5, dryWet: 0 },
    sat: { drive: 0, analogClip: 0, colorLow: 0, colorFreq: 0.5, colorWidth: 0, colorHi: 0, output: 0.5, dryWet: 0 }
};

const createDefaultProject = (id: string, name: string): Project => ({
  id,
  name,
  lastModified: Date.now(),
  bpm: 120,
  scale: "Minor",
  rootNote: "C",
  macros: DEFAULT_MACROS,
  master: DEFAULT_MASTER,
  tracks: [
    {
      id: 't1', type: 'synth', name: 'Glitch Poly', color: 'bg-rose-500', volume: -2, pan: 0, isMuted: false, isSoloed: false,
      clips: [
        { id: 'c1', name: 'Chord Loop', color: 'bg-rose-500', isPlaying: false, duration: 1, notes: [
            { note: "C4", velocity: 0.8, startTime: "0:0:0", step: 0, duration: "16n" },
            { note: "Eb4", velocity: 0.8, startTime: "0:0:0", step: 0, duration: "16n" },
            { note: "G4", velocity: 0.8, startTime: "0:0:4", step: 4, duration: "16n" }
        ]},
        { id: 'c2', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c3', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c4', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
      ]
    },
    {
      id: 't2', type: 'bass', name: 'Sub Bass', color: 'bg-amber-500', volume: -4, pan: 0, isMuted: false, isSoloed: false,
      clips: [
        { id: 'c5', name: 'Rumble', color: 'bg-amber-500', isPlaying: false, duration: 1, notes: [
             { note: "C2", velocity: 1, startTime: "0:0:0", step: 0, duration: "8n" },
             { note: "C2", velocity: 0.8, startTime: "0:0:8", step: 8, duration: "8n" }
        ]},
        { id: 'c6', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c7', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c8', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
      ]
    },
    {
      id: 't3', type: 'drum', name: 'Kit 909', color: 'bg-cyan-500', volume: -1, pan: 0, isMuted: false, isSoloed: false,
      clips: [
          { id: 'c9', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
          { id: 'c10', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
          { id: 'c11', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
          { id: 'c12', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
      ]
    }
  ]
});

// --- GENERATIVE ART COMPONENT ---
const ProjectThumbnail = ({ id }: { id: string }) => {
    const Art = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        const hue1 = Math.abs(hash % 360);
        const hue2 = Math.abs((hash >> 8) % 360);
        const type = hash % 3; // 0: circle, 1: rects, 2: gradient
        
        if (type === 0) {
            return (
                <svg viewBox="0 0 100 100" className="w-full h-full bg-[#111]">
                    <circle cx="50" cy="50" r="40" fill={`hsl(${hue1}, 70%, 60%)`} opacity="0.8" />
                    <circle cx="30" cy="30" r="20" fill={`hsl(${hue2}, 70%, 50%)`} opacity="0.6" />
                </svg>
            );
        } else if (type === 1) {
            return (
                <svg viewBox="0 0 100 100" className="w-full h-full bg-[#111]">
                   <rect x="10" y="10" width="80" height="80" fill={`hsl(${hue1}, 60%, 30%)`} />
                   <rect x="20" y="20" width="60" height="60" fill={`hsl(${hue2}, 60%, 50%)`} />
                   <rect x="30" y="30" width="40" height="40" fill={`hsl(${hue1}, 60%, 70%)`} />
                </svg>
            );
        } else {
             return (
                 <div className="w-full h-full" style={{ background: `linear-gradient(135deg, hsl(${hue1}, 70%, 20%), hsl(${hue2}, 70%, 50%))` }} />
             );
        }
    }, [id]);
    
    return Art;
};

// --- CONTEXT MENU COMPONENT ---
interface ContextMenuProps {
    type: 'clip' | 'track';
    x: number;
    y: number;
    data: any;
    onClose: () => void;
    onAction: (action: string, data: any) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ type, x, y, data, onClose, onAction }) => {
    const safeX = Math.min(x, window.innerWidth - 150);
    const safeY = Math.min(y, window.innerHeight - 200);

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:justify-start"
            onClick={onClose}
        >
            <div 
                className="bg-[#1a1a1a] border border-white/10 w-full sm:w-48 sm:rounded-lg rounded-t-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200"
                style={{ position: 'absolute', left: window.innerWidth > 640 ? safeX : 0, top: window.innerWidth > 640 ? safeY : 'auto', bottom: window.innerWidth > 640 ? 'auto' : 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{type === 'clip' ? data.clip.name || 'Clip' : data.name}</h3>
                </div>
                <div className="flex flex-col">
                    <button onClick={() => onAction('rename', data)} className="h-12 flex items-center px-4 gap-3 hover:bg-white/5 active:bg-white/10 text-sm font-bold">
                        <Edit2 size={16} /> Rename
                    </button>
                    <button onClick={() => onAction('duplicate', data)} className="h-12 flex items-center px-4 gap-3 hover:bg-white/5 active:bg-white/10 text-sm font-bold">
                        <Copy size={16} /> Duplicate
                    </button>
                    {type === 'track' && (
                         <button onClick={() => onAction('freeze', data)} className="h-12 flex items-center px-4 gap-3 hover:bg-white/5 active:bg-white/10 text-sm font-bold">
                            <Layers size={16} /> Freeze
                        </button>
                    )}
                    <button onClick={() => onAction('delete', data)} className="h-12 flex items-center px-4 gap-3 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 text-sm font-bold border-t border-white/5">
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // --- STATE ---
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('PROJECTS');
  
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [macros, setMacros] = useState(DEFAULT_MACROS);
  const [masterState, setMasterState] = useState<MasterState>(DEFAULT_MASTER);
  const [masterTab, setMasterTab] = useState<MasterTab>('MAIN');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ type: 'clip' | 'track', x: number, y: number, data: any } | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('haw-storage-v3'); 
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed.projects || {});
      } catch (e) {
        console.error("Load failed", e);
      }
    } else {
       const def = createDefaultProject('demo-v2', 'Demo Set');
       setProjects({ 'demo-v2': def });
    }
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;
    setProjects(prev => {
        const updated = {
            ...prev,
            [currentProjectId]: {
                ...prev[currentProjectId],
                tracks,
                macros,
                master: masterState,
                lastModified: Date.now()
            }
        };
        localStorage.setItem('haw-storage-v3', JSON.stringify({
            currentProjectId,
            projects: updated
        }));
        return updated;
    });
  }, [tracks, macros, masterState, currentProjectId]);

  // --- AUDIO SYNC ---
  useEffect(() => {
    audioService.setStepCallback(setCurrentStep);
  }, []);

  useEffect(() => {
    tracks.forEach(track => {
        audioService.registerTrack(track.id, track.type);
        audioService.setTrackVolume(track.id, track.volume);
        audioService.setTrackMute(track.id, track.isMuted);
        audioService.setTrackSolo(track.id, track.isSoloed);

        const playingClip = track.clips.find(c => c.isPlaying);
        if (playingClip && playingClip.notes.length > 0) {
            audioService.setClip(track.id, playingClip.notes);
        } else {
            audioService.stopTrack(track.id);
        }
    });
  }, [tracks]);

  useEffect(() => {
      audioService.setMasterVolume(masterState.volume);
      audioService.updateMasterFX(masterState);
  }, [masterState]);

  // --- ACTIONS ---

  const handleStartContext = async () => {
    await audioService.initialize();
    setIsAudioStarted(true);
    setViewMode('PROJECTS');
  };

  const createProject = () => {
      const id = Date.now().toString();
      const newProj = createDefaultProject(id, `Set ${Object.keys(projects).length + 400}`); 
      setProjects(prev => ({ ...prev, [id]: newProj }));
      loadProject(id);
  };

  const loadProject = (id: string) => {
      const p = projects[id];
      if (!p) return;
      setCurrentProjectId(id);
      setTracks(p.tracks);
      setMacros(p.macros);
      setMasterState(p.master || DEFAULT_MASTER);
      
      audioService.setFilterFrequency(p.macros.filter);
      audioService.setFilterResonance(p.macros.reso);
      audioService.setSpace(p.macros.space);
      audioService.setHeat(p.macros.heat);

      setViewMode('SESSION');
      setIsPlaying(false);
      audioService.stop();
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setProjects(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
      });
      if (currentProjectId === id) setCurrentProjectId(null);
  };

  const updateProjectBpm = (bpm: number) => {
    if (!currentProjectId) return;
    setProjects(prev => ({
        ...prev,
        [currentProjectId]: {
            ...prev[currentProjectId],
            bpm
        }
    }));
    audioService.setBpm(bpm);
  };

  // AUTO-PLAY ON EDIT
  const handleClipEdit = (trackId: string, clip: Clip) => {
    setActiveTrackId(trackId);
    setActiveClipId(clip.id);
    
    // Auto-Play Logic
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: track.clips.map(c => ({
            ...c,
            isPlaying: c.id === clip.id
        }))
      };
    }));
    
    // Ensure Transport is running
    if (!isPlaying) {
        setIsPlaying(true);
        audioService.togglePlayback();
    }

    if (clip.notes.length === 0) {
        updateClipData(trackId, clip.id, { 
            name: 'New Idea',
            color: 'bg-daw-surface' 
        });
    }
    setViewMode('INSTRUMENT');
  };

  const updateClipData = (trackId: string, clipId: string, data: Partial<Clip>) => {
    setTracks(prev => prev.map(track => {
        if (track.id !== trackId) return track;
        return {
            ...track,
            clips: track.clips.map(c => c.id === clipId ? { ...c, ...data } : c)
        };
    }));
  };

  const handleCapture = () => {
    if (!activeTrackId || !activeClipId) return;

    const activeTrack = tracks.find(t => t.id === activeTrackId);
    const clip = activeTrack?.clips.find(c => c.id === activeClipId);
    if (!activeTrack || !clip) return;

    if (clip.notes.length === 0) {
        // New Idea
        const result = audioService.analyzeTempoAndCapture();
        if (result.notes.length > 0) {
            updateProjectBpm(Math.round(result.bpm));
            updateClipData(activeTrackId, activeClipId, { notes: result.notes });
        }
    } else {
        // Overdub
        const captured = audioService.capturePerformance();
        if (captured.length > 0) {
            const newNotes = [...clip.notes];
            captured.forEach(n => {
                if (!newNotes.some(existing => existing.step === n.step && existing.note === n.note)) {
                    newNotes.push(n);
                }
            });
            updateClipData(activeTrackId, activeClipId, { notes: newNotes });
        }
    }
  };

  const handleBack = () => {
      if (viewMode === 'INSTRUMENT') {
          setViewMode('SESSION');
          setActiveTrackId(null);
          setActiveClipId(null);
      } else if (viewMode === 'SESSION' || viewMode === 'MIXER') {
          setViewMode('PROJECTS');
          setCurrentProjectId(null);
          setIsPlaying(false);
          audioService.stop();
      }
  };

  // --- CONTEXT MENU HANDLERS ---
  const handleContextMenuAction = (action: string, data: any) => {
      if (contextMenu?.type === 'clip') {
          const { trackId, clip } = data;
          if (action === 'delete') {
              updateClipData(trackId, clip.id, { notes: [], name: '', color: 'bg-transparent', isPlaying: false });
          } else if (action === 'duplicate') {
              // Implementation omitted for brevity
          }
      }
      setContextMenu(null);
  };

  // --- RENDER ---
  if (!isAudioStarted) return <StartScreen onStart={handleStartContext} />;

  if (viewMode === 'PROJECTS') {
      return (
          <div className="h-full bg-[#000] text-white flex flex-col font-sans">
              <div className="flex items-center justify-between px-6 py-6 bg-[#000]">
                  <h1 className="text-3xl font-bold">Sets</h1>
                  <button onClick={createProject} className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm hover:scale-105 transition-transform">
                      + New
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-10">
                  <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-500 mb-2 px-2 uppercase tracking-widest">Local</span>
                      {(Object.values(projects) as Project[]).sort((a,b) => b.lastModified - a.lastModified).map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => loadProject(p.id)} 
                            className="flex items-center gap-4 p-2 rounded-lg active:bg-white/10 transition-colors group"
                          >
                              <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-[#222]">
                                  <ProjectThumbnail id={p.id} />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                  <span className="font-bold text-lg leading-none">{p.name}</span>
                                  <span className="text-[12px] text-gray-500 mt-1">
                                    {new Date(p.lastModified).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : new Date(p.lastModified).toLocaleDateString()}
                                  </span>
                              </div>
                              <div className="flex items-center gap-4">
                                  <button onClick={() => loadProject(p.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                                      <Play size={14} fill="white" className="ml-0.5" />
                                  </button>
                                  <button onClick={(e) => deleteProject(e, p.id)} className="text-gray-600 hover:text-red-500 p-2">
                                      <MoreVertical size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  const activeTrack = tracks.find(t => t.id === activeTrackId);
  const activeClip = activeTrack?.clips.find(c => c.id === activeClipId);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 z-30 bg-[#0a0a0a] border-b border-white/5">
        <div className="w-20 flex items-center justify-start">
            {viewMode === 'INSTRUMENT' ? (
                <button onClick={handleBack} className="flex items-center gap-1 text-gray-400 hover:text-white">
                    <ArrowLeft size={20} />
                    <span className="text-sm font-bold">{activeTrack?.name}</span>
                </button>
            ) : (
                <button onClick={handleBack} className="flex items-center gap-1 text-gray-400 hover:text-white">
                     <ArrowLeft size={20} />
                     <span className="text-sm font-bold">Sets</span>
                </button>
            )}
        </div>
        <div className="flex flex-col items-center justify-center">
             <span className="text-sm font-bold text-white">
                {projects[currentProjectId || '']?.name}
             </span>
             <span className="text-[10px] text-daw-accent font-mono opacity-80">
                {projects[currentProjectId || '']?.bpm} BPM
             </span>
        </div>
        <div className="w-20 flex items-center justify-end">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111] text-gray-500">
                <div className="w-4 h-4 rounded-full border-2 border-current opacity-50" />
            </div>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* MIXER & MASTER FX */}
        {viewMode === 'MIXER' && (
             <div className="absolute inset-0 flex flex-col">
                 <div className="flex-1 overflow-hidden">
                     <Mixer 
                        tracks={tracks} 
                        setTracks={setTracks}
                        masterState={masterState}
                        setMasterState={setMasterState}
                        selectedMasterTab={masterTab}
                        onSelectMasterTab={setMasterTab}
                     />
                 </div>
                 {masterTab !== 'MAIN' && (
                     <div className="h-1/2 absolute bottom-0 left-0 right-0 z-40 border-t border-white/10">
                         <MasterFXPanel 
                            type={masterTab} 
                            state={masterState} 
                            setState={setMasterState}
                            onClose={() => setMasterTab('MAIN')} 
                         />
                     </div>
                 )}
             </div>
        )}

        {/* SESSION */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${viewMode === 'SESSION' ? 'translate-x-0' : viewMode === 'MIXER' ? '-translate-x-full' : '-translate-x-full'}`}>
             <SessionView 
                tracks={tracks} 
                currentStep={currentStep}
                setTracks={setTracks} 
                onEditClip={handleClipEdit}
                onOpenProjects={() => setViewMode('PROJECTS')}
                onContextMenu={(type, x, y, data) => setContextMenu({ type, x, y, data })}
             />
        </div>

        {/* INSTRUMENT */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${viewMode === 'INSTRUMENT' ? 'translate-x-0' : 'translate-x-full'}`}>
             {activeTrack && activeClip && (
                 <InstrumentPanel 
                    currentStep={currentStep} 
                    activeClipId={activeClip.id}
                    notes={activeClip.notes}
                    onUpdateNotes={(newNotes) => updateClipData(activeTrack.id, activeClip.id, { notes: newNotes })}
                    onUpdateBpm={updateProjectBpm}
                    macros={macros}
                    setMacros={setMacros}
                    activeTrack={activeTrack}
                 />
             )}
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="h-14 shrink-0 bg-[#0a0a0a] border-t border-[#222] flex items-center justify-around pb-safe z-50">
          
          {/* Contextual Left Button: CAPTURE if Instrument, Undo/Loop if Session? */}
          {viewMode === 'INSTRUMENT' ? (
              <button 
                onClick={handleCapture}
                className="w-12 h-12 flex items-center justify-center rounded-full text-daw-accent active:scale-95 transition-transform"
              >
                 <PlusCircle size={28} />
              </button>
          ) : (
            <button className="p-4 text-gray-500 active:text-white"><RotateCcw size={20} /></button>
          )}

          {/* View Toggles */}
          <button 
            onClick={() => setViewMode('SESSION')}
            className={`p-4 ${viewMode === 'SESSION' ? 'text-white' : 'text-gray-600'}`}
          >
              <LayoutGrid size={24} />
          </button>
          
          <button 
            onClick={() => setViewMode('MIXER')}
            className={`p-4 ${viewMode === 'MIXER' ? 'text-white' : 'text-gray-600'}`}
          >
              <SlidersHorizontal size={24} />
          </button>

          {/* Play Button */}
          <button
            onClick={() => {
                const p = audioService.togglePlayback();
                setIsPlaying(p);
                if (!p) setCurrentStep(-1);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-white text-black' : 'bg-[#222] text-white'}`}
          >
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="white" className="ml-1" />}
          </button>
      </div>

      {/* CONTEXT MENU OVERLAY */}
      {contextMenu && (
          <ContextMenu 
             type={contextMenu.type} 
             x={contextMenu.x} 
             y={contextMenu.y} 
             data={contextMenu.data} 
             onClose={() => setContextMenu(null)}
             onAction={handleContextMenuAction}
          />
      )}

    </div>
  );
};

const StartScreen = ({ onStart }: { onStart: () => void }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 text-center text-white">
        <h1 className="text-8xl font-black mb-2 tracking-tighter text-white">HÅW</h1>
        <p className="text-gray-600 mb-12 text-xs uppercase tracking-[0.6em]">Surgical Minimalism</p>
        <button onClick={onStart} className="px-8 py-3 rounded-full bg-white text-black font-bold flex items-center justify-center hover:scale-105 transition-transform">
          Start Audio Engine
        </button>
    </div>
);

export default App;