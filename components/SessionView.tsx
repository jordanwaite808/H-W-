import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Track, Clip } from '../types';
import SessionClipTile from './SessionClipTile';

interface SessionViewProps {
  tracks: Track[];
  currentStep: number;
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  onEditClip: (trackId: string, clip: Clip) => void;
  onOpenProjects: () => void;
  onContextMenu: (type: 'clip' | 'track', x: number, y: number, data: any) => void;
}

const SessionView: React.FC<SessionViewProps> = ({ 
    tracks, currentStep, setTracks, onEditClip, onOpenProjects, onContextMenu 
}) => {

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
      <div className="flex items-center justify-between px-4 py-4 bg-[#0a0a0a] border-b border-white/5">
        <span className="text-sm font-bold text-gray-200 tracking-wider">Session View</span>
        <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:text-white">
                <MoreHorizontal size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
            {tracks.map(track => (
            <div key={track.id} className="flex flex-col gap-2">
                
                {/* Track Header */}
                <div 
                    className="flex items-center justify-between px-1 mb-1 cursor-pointer"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onContextMenu('track', e.clientX, e.clientY, track);
                    }}
                >
                     <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${track.color.replace('bg-', 'text-')}`}>
                         {track.name}
                     </span>
                </div>

                {/* Clip Slots */}
                {track.clips.map(clip => (
                    <SessionClipTile
                        key={clip.id}
                        clip={clip}
                        trackColor={track.color}
                        isPlaying={clip.isPlaying}
                        currentStep={currentStep}
                        onTogglePlayback={(e) => toggleClipPlayback(e, track.id, clip.id)}
                        onEdit={() => onEditClip(track.id, clip)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onContextMenu('clip', e.clientX, e.clientY, { trackId: track.id, clip });
                        }}
                    />
                ))}
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SessionView;
