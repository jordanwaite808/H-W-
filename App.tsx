import React, { useEffect, useState } from 'react';
import { audioService } from './services/audioEngine';
import SessionView from './components/SessionView';
import InstrumentPanel from './components/InstrumentPanel';
import { Play, Pause, ArrowLeft, Plus, Trash2, Folder } from 'lucide-react';
import { Track, AppState, ViewMode, Clip, Project, NoteEvent } from './types';

// --- DEFAULTS ---
const DEFAULT_MACROS = { filter: 0.8, reso: 0.1, space: 0.2, heat: 0.0 };

const createDefaultProject = (id: string, name: string): Project => ({
  id,
  name,
  lastModified: Date.now(),
  bpm: 120,
  scale: "Minor",
  rootNote: "C",
  macros: DEFAULT_MACROS,
  tracks: [
    {
      id: 't1', type: 'synth', name: 'Glitch Poly',
      clips: [
        { id: 'c1', name: 'Chord Loop', color: 'bg-daw-surface', isPlaying: false, duration: 1, notes: [
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
      id: 't2', type: 'bass', name: 'Sub Bass',
      clips: [
        { id: 'c5', name: 'Rumble', color: 'bg-daw-surface', isPlaying: false, duration: 1, notes: [
             { note: "C2", velocity: 1, startTime: "0:0:0", step: 0, duration: "8n" },
             { note: "C2", velocity: 0.8, startTime: "0:0:8", step: 8, duration: "8n" }
        ]},
        { id: 'c6', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c7', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
        { id: 'c8', name: '', color: 'bg-transparent', isPlaying: false, duration: 1, notes: [] },
      ]
    }
  ]
});

const App: React.FC = () => {
  // --- STATE ---
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('SESSION');
  
  // Project Management
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Active Project State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [macros, setMacros] = useState(DEFAULT_MACROS);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('haw-storage-v2'); // Bump version for new data structure
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed.projects || {});
        if (parsed.currentProjectId && parsed.projects[parsed.currentProjectId]) {
           setCurrentProjectId(parsed.currentProjectId);
           const p = parsed.projects[parsed.currentProjectId];
           setTracks(p.tracks);
           setMacros(p.macros);
        } else {
           const defId = 'demo-v2';
           if (!parsed.projects?.[defId]) {
               const def = createDefaultProject(defId, 'Demo V2');
               setProjects({ [defId]: def });
           }
        }
      } catch (e) {
        console.error("Load failed", e);
      }
    } else {
       const def = createDefaultProject('demo-v2', 'Demo V2');
       setProjects({ 'demo-v2': def });
       setCurrentProjectId('demo-v2');
       setTracks(def.tracks);
    }
  }, []);

  // Autosave
  useEffect(() => {
    if (!currentProjectId) return;

    setProjects(prev => {
        const updated = {
            ...prev,
            [currentProjectId]: {
                ...prev[currentProjectId],
                tracks,
                macros,
                lastModified: Date.now()
            }
        };
        localStorage.setItem('haw-storage-v2', JSON.stringify({
            currentProjectId,
            projects: updated
        }));
        return updated;
    });
  }, [tracks, macros, currentProjectId]);

  // --- AUDIO SYNC ---
  useEffect(() => {
    audioService.setStepCallback(setCurrentStep);
  }, []);

  useEffect(() => {
    tracks.forEach(track => {
        audioService.registerTrack(track.id, track.type);
        const playingClip = track.clips.find(c => c.isPlaying);
        
        if (playingClip && playingClip.notes.length > 0) {
            audioService.setClip(track.id, playingClip.notes);
        } else {
            audioService.stopTrack(track.id);
        }
    });
  }, [tracks]);

  // --- ACTIONS ---

  const handleStartContext = async () => {
    await audioService.initialize();
    audioService.setFilterFrequency(macros.filter);
    audioService.setFilterResonance(macros.reso);
    audioService.setSpace(macros.space);
    audioService.setHeat(macros.heat);
    setIsAudioStarted(true);
  };

  const createProject = () => {
      const id = Date.now().toString();
      const newProj = createDefaultProject(id, `Project ${Object.keys(projects).length + 1}`);
      setProjects(prev => ({ ...prev, [id]: newProj }));
      loadProject(id);
  };

  const loadProject = (id: string) => {
      const p = projects[id];
      if (!p) return;
      setCurrentProjectId(id);
      setTracks(p.tracks);
      setMacros(p.macros);
      setViewMode('SESSION');
      setIsPlaying(false);
      audioService.togglePlayback(); // Stop if playing
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

  const handleClipEdit = (trackId: string, clip: Clip) => {
    setActiveTrackId(trackId);
    setActiveClipId(clip.id);
    
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

  const handleBack = () => {
      if (viewMode === 'INSTRUMENT') {
          setViewMode('SESSION');
          setActiveTrackId(null);
          setActiveClipId(null);
      } else if (viewMode === 'SESSION') {
          setViewMode('PROJECTS');
      }
  };

  // --- RENDER ---
  if (!isAudioStarted) return <StartScreen onStart={handleStartContext} />;

  if (viewMode === 'PROJECTS') {
      return (
          <div className="h-full bg-black text-white p-6 flex flex-col">
              <h1 className="text-4xl font-black mb-8">Projects</h1>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={createProject} className="aspect-square bg-[#222] rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-[#444] active:bg-[#333]">
                      <Plus size={32} className="text-daw-accent" />
                      <span className="mt-2 font-bold text-sm">NEW</span>
                  </button>
                  {(Object.values(projects) as Project[]).sort((a,b) => b.lastModified - a.lastModified).map(p => (
                      <div key={p.id} onClick={() => loadProject(p.id)} className="aspect-square bg-daw-panel rounded-xl p-4 flex flex-col justify-between border border-white/5 relative group active:scale-95 transition-transform">
                          <Folder className="text-gray-600" />
                          <div>
                              <div className="font-bold text-lg leading-tight">{p.name}</div>
                              <div className="text-[10px] text-gray-500 mt-1">{new Date(p.lastModified).toLocaleDateString()}</div>
                          </div>
                          <button onClick={(e) => deleteProject(e, p.id)} className="absolute top-2 right-2 text-red-900 p-2 z-10">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const activeTrack = tracks.find(t => t.id === activeTrackId);
  const activeClip = activeTrack?.clips.find(c => c.id === activeClipId);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden font-sans">
      <div className="h-14 shrink-0 flex items-center justify-between px-4 z-30 bg-[#0a0a0a] border-b border-white/5">
        <div className="w-20 flex items-center justify-start">
            {viewMode === 'INSTRUMENT' ? (
                <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>
            ) : (
                <span className="font-black text-xl tracking-tight text-white">HÅW</span>
            )}
        </div>
        <div className="flex flex-col items-center justify-center">
             <span className="text-xs font-bold tracking-widest uppercase text-gray-300">
                {viewMode === 'INSTRUMENT' && activeTrack ? activeTrack.name : projects[currentProjectId || '']?.name}
             </span>
             <span className="text-[10px] text-daw-accent font-mono opacity-80">120.00</span>
        </div>
        <div className="w-20 flex items-center justify-end">
             <button
                onClick={() => {
                    const p = audioService.togglePlayback();
                    setIsPlaying(p);
                    if (!p) setCurrentStep(-1);
                }}
                className={`
                    h-9 w-9 rounded-full flex items-center justify-center transition-all
                    ${isPlaying ? 'bg-daw-accent text-black shadow-lg shadow-orange-500/20' : 'bg-[#222] text-gray-400'}
                `}
                >
                {isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${viewMode === 'SESSION' ? 'translate-x-0' : '-translate-x-full'}`}>
             <SessionView 
                tracks={tracks} 
                setTracks={setTracks} 
                onEditClip={handleClipEdit}
                onOpenProjects={() => setViewMode('PROJECTS')}
             />
        </div>

        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${viewMode === 'INSTRUMENT' ? 'translate-x-0' : 'translate-x-full'}`}>
             {activeTrack && activeClip && (
                 <InstrumentPanel 
                    currentStep={currentStep} 
                    activeClipId={activeClip.id}
                    notes={activeClip.notes}
                    onUpdateNotes={(newNotes) => updateClipData(activeTrack.id, activeClip.id, { notes: newNotes })}
                    macros={macros}
                    setMacros={setMacros}
                    activeTrack={activeTrack}
                 />
             )}
        </div>
      </div>
    </div>
  );
};

const StartScreen = ({ onStart }: { onStart: () => void }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 text-center text-white">
        <h1 className="text-8xl font-black mb-2 tracking-tighter text-white">HÅW</h1>
        <p className="text-gray-600 mb-12 text-xs uppercase tracking-[0.6em]">Surgical Minimalism</p>
        <button onClick={onStart} className="w-20 h-20 rounded-full bg-daw-accent text-black flex items-center justify-center hover:scale-110 transition-transform">
          <Play fill="black" size={32} className="ml-1" />
        </button>
    </div>
);

export default App;
