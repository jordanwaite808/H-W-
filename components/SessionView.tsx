import React from 'react';
import { Play, Plus, FolderOpen } from 'lucide-react';
import { Track, Clip } from '../types';

interface SessionViewProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  onEditClip: (trackId: string, clip: Clip) => void;
  onOpenProjects: () => void;
}

const SessionView: React.FC<SessionViewProps> = ({ tracks, setTracks, onEditClip, onOpenProjects }) => {

  const toggleClipPlayback = (e: React.MouseEvent, trackId: string, clipId: string) => {
    e.stopPropagation(); 
    
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          isPlaying: clip.id === clipId ? !clip.isPlaying : false
        }))
      };
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-daw-bg pb-20">
      {/* Session Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
        <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Session View</span>
        <button onClick={onOpenProjects} className="flex items-center gap-2 px-3 py-1.5 bg-[#222] rounded-full text-[10px] font-bold text-gray-300 active:bg-daw-accent active:text-black">
            <FolderOpen size={12} />
            PROJECTS
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 content-start">
            {tracks.map(track => (
            <div key={track.id} className="flex flex-col gap-2">
                
                {/* Track Header */}
                <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-bold text-daw-accent uppercase tracking-widest truncate">{track.name}</span>
                </div>

                {/* Clip Slots */}
                {track.clips.map(clip => {
                    const hasNotes = clip.notes.length > 0;
                    
                    return (
                    <div 
                        key={clip.id}
                        onClick={() => onEditClip(track.id, clip)}
                        className={`
                        w-full aspect-[16/9] rounded-lg relative flex items-center justify-center overflow-hidden
                        transition-all cursor-pointer active:scale-[0.98]
                        ${!hasNotes 
                            ? 'bg-[#151515] hover:bg-[#1a1a1a] border border-white/5' 
                            : `${clip.color} border-l-[6px] ${clip.color.replace('bg-', 'border-').replace('surface', 'accent')}`
                        }
                        ${clip.isPlaying ? 'shadow-[0_0_15px_rgba(255,95,0,0.3)] border-white ring-1 ring-white/20' : ''}
                        `}
                    >
                        {!hasNotes ? (
                            <Plus className="text-gray-700" size={24} />
                        ) : (
                            <>
                                <span className="absolute top-2 left-2 text-[10px] font-bold text-white/90 truncate max-w-[70%]">{clip.name}</span>
                                
                                {/* Mini Visualization of Notes */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none flex items-end pb-2 px-2 gap-[1px]">
                                    {clip.notes.sort((a,b) => a.step - b.step).map((n, i) => (
                                        <div key={i} className="bg-white w-1" style={{ height: `${n.velocity * 50}%` }} />
                                    ))}
                                </div>

                                {/* Stop Propagation on button to prevent opening edit view */}
                                <button 
                                    onClick={(e) => toggleClipPlayback(e, track.id, clip.id)}
                                    className={`
                                        absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center 
                                        transition-all hover:scale-110 active:scale-95 z-10
                                        ${clip.isPlaying ? 'bg-white text-black' : 'bg-black/40 text-white backdrop-blur-sm'}
                                    `}
                                >
                                    {clip.isPlaying ? (
                                        <Play size={14} fill="black" className="ml-0.5 animate-pulse" />
                                    ) : (
                                        <Play size={14} fill="currentColor" className="ml-0.5" />
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                    );
                })}
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SessionView;
