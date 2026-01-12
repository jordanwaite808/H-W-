import { PadNote } from './types';

export const SEQUENCER_STEPS = 16;
export const DEFAULT_BPM = 120;

// --- SCALE ENGINE ---

export const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export const SCALES: Record<string, number[]> = {
    "Minor": [0, 2, 3, 5, 7, 8, 10], // Natural Minor
    "Major": [0, 2, 4, 5, 7, 9, 11],
    "Dorian": [0, 2, 3, 5, 7, 9, 10],
    "Phrygian": [0, 1, 3, 5, 7, 8, 10],
    "Lydian": [0, 2, 4, 6, 7, 9, 11],
    "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "Locrian": [0, 1, 3, 5, 6, 8, 10],
    "Minor Pentatonic": [0, 3, 5, 7, 10], // 5 notes
};

const getMidiNote = (root: string, octave: number): number => {
    const noteIndex = NOTES.indexOf(root);
    if (noteIndex === -1) return 60; // Default Middle C
    return noteIndex + (octave + 1) * 12;
};

const getNoteName = (midi: number): string => {
    const note = NOTES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
};

// Generate a linear array of notes in scale for the Piano Roll
export const getScaleNotes = (root: string, scaleName: string = "Minor", minOctave: number = 1, maxOctave: number = 6): { note: string, midi: number, isRoot: boolean }[] => {
    const scaleIntervals = SCALES[scaleName] || SCALES["Minor"];
    const rootIndex = NOTES.indexOf(root);
    const notes = [];

    for (let oct = minOctave; oct <= maxOctave; oct++) {
        for (let i = 0; i < scaleIntervals.length; i++) {
            const semitoneOffset = scaleIntervals[i];
            const midi = (rootIndex + semitoneOffset) + ((oct + 1) * 12);
            const noteName = getNoteName(midi);
            
            notes.push({
                note: noteName,
                midi: midi,
                isRoot: semitoneOffset === 0
            });
        }
    }
    return notes.sort((a, b) => b.midi - a.midi); // High pitch first (Top of screen)
};

// Formula: f(x, y) = Root + Scale[Index(x, y) % ScaleLength] + 12 * floor(Index / ScaleLength)
// Index(x, y) = x + (y * 3)
export const generateIsomorphicGrid = (root: string, scaleName: string = "Minor", startOctave: number = 2): PadNote[] => {
    const scaleIntervals = SCALES[scaleName] || SCALES["Minor"];
    const scaleLength = scaleIntervals.length;
    const rootMidi = getMidiNote(root, startOctave);
    
    const pads: PadNote[] = [];

    for (let cssRow = 0; cssRow < 5; cssRow++) {
        for (let cssCol = 0; cssCol < 5; cssCol++) {
            // Logical coordinates
            const x = cssCol; // 0..4 (Left to Right)
            const y = 4 - cssRow; // 4..0 (Top to Bottom) - so Top is High Y

            // Isomorphic Index
            const index = x + (y * 3);
            
            // Calculate Pitch
            const degreeIndex = index % scaleLength;
            const octaveShift = Math.floor(index / scaleLength);
            
            const semitoneOffset = scaleIntervals[degreeIndex];
            const midiNote = rootMidi + semitoneOffset + (octaveShift * 12);
            
            const noteName = getNoteName(midiNote);
            const label = noteName.replace(/[0-9]/g, ''); // just note name

            pads.push({
                id: cssRow * 5 + cssCol, // for react key
                note: noteName,
                label: label,
                isRoot: semitoneOffset === 0,
                intervalIndex: degreeIndex
            });
        }
    }
    return pads;
};
