import type { RenderContext } from 'vexflow';
import type { Note } from '@/libs/Note';
import type { Clef, Staves } from '@/MusicTest/types/MusicTypes';
import type {
  AnimationState,
  CreateAndRenderProps,
  NoteMap,
  NoteStyle,
  RenderProps,
  StaveNoteProps,
} from '@/MusicTest/types/StaffInteraction';
import type { ValidationResult as AnswerValidationResult } from '@/utils/AnswerValidation';
import { Accidental, Formatter, StaveNote, Voice } from 'vexflow';
import { ACCIDENTALS_MAP } from '@/utils/MusicConstants';
import { toVexFlowFormat } from '@/utils/musicUtils';

/**
 * Default note styles with enhanced hover and animation support
 */
export const NOTE_STYLES = {
  default: { fillStyle: '#000000', strokeStyle: '#000000', opacity: 1 },
  selected: { fillStyle: '#3b82f6', strokeStyle: '#3b82f6', opacity: 1 },
  correct: { fillStyle: '#00ff00', strokeStyle: '#00ff00', opacity: 1 }, // Bright green for debugging
  incorrect: { fillStyle: '#dc2626', strokeStyle: '#dc2626', opacity: 1 }, // Darker red for better visibility
  hovered: { fillStyle: '#6b7280', strokeStyle: '#6b7280', opacity: 0.6 },
  preview: { fillStyle: '#9ca3af', strokeStyle: '#9ca3af', opacity: 0.5 },
  fadeIn: { fillStyle: '#9ca3af', strokeStyle: '#9ca3af', opacity: 0.6 },
  fadeOut: { fillStyle: '#9ca3af', strokeStyle: '#9ca3af', opacity: 0.3 },
} as const satisfies Record<string, NoteStyle>;

export type NoteStyleKey = keyof typeof NOTE_STYLES;

export const getNoteStyles = (
  selectedNotes: Note[],
  hoveredNote?: Note,
  animationState?: AnimationState,
  showCorrectAnswer: boolean = false,
  correctNotes?: Note[],
  validationResult?: AnswerValidationResult,
): NoteStyleKey[] => {
  const noteStyles = selectedNotes.map((note) => {
    if (hoveredNote?.linePosition === note.linePosition) {
      return 'hovered';
    }
    if (animationState) {
      return animationState;
    }
    return 'default';
  });

  return noteStyles;
};

const addAccidentalsToStaveNote = (keys: Note[], staveNote: StaveNote) => {
  keys.forEach((note, index) => {
    if (note.accidental !== 'natural') {
      const acc = note.accidental as keyof typeof ACCIDENTALS_MAP;
      staveNote.addModifier(new Accidental(ACCIDENTALS_MAP[acc].vexFlowSymbol), index);
    }
  });

  return staveNote;
};

export const createStaveNote = ({ notes, staves, clef, hoveredNote, animationState }: StaveNoteProps): StaveNote => {
  const keys = notes.map(toVexFlowFormat);
  const staveNote = new StaveNote({
    keys,
    duration: 'q',
    clef,
  });

  addAccidentalsToStaveNote(notes, staveNote);
  const noteStyles = getNoteStyles(notes, hoveredNote, animationState);
  noteStyles.forEach((style, i) => staveNote.setKeyStyle(i, NOTE_STYLES[style]));

  staveNote.setStave(staves[clef]);

  return staveNote;
};

/**
 * Get validation state for a note
 */
export const getNoteValidationState = (
  pitch: Note,
  selectedNotes: Note[],
  correctNotes: Note[],
  validationResult?: AnswerValidationResult,
): 'correct' | 'incorrect' | 'missing' | 'neutral' => {
  const isSelected = selectedNotes.includes(pitch);
  const isCorrect = correctNotes.includes(pitch);

  if (!validationResult) {
    return 'neutral';
  }

  if (isSelected && isCorrect) {
    return 'correct';
  } else if (isSelected && !isCorrect) {
    return 'incorrect';
  } else if (!isSelected && isCorrect) {
    return 'missing';
  }

  return 'neutral';
};

export const createAndRenderStaveNotes = (
  { staves, context, noteMaps, hoveredNote, offset, animationState }: CreateAndRenderProps,
) => {
  // Store original note start positions to restore later
  const originalTrebleStartX = staves.treble.getNoteStartX();
  const originalBassStartX = staves.bass.getNoteStartX();

  const staveNotes = noteMaps.map(noteMap => createStaveNote({ ...noteMap, staves, hoveredNote, animationState }));
  const voices = staveNotes.map((staveNote) => {
    const voice = new Voice({
      numBeats: 1,
      beatValue: 4,
    });
    voice.addTickables([staveNote]);
    return voice;
  });

  // Format and draw
  const formatter = new Formatter();
  formatter.joinVoices(voices);

  formatter.format(voices, staves.treble.getWidth());
  if (offset) {
    const startX = staves.treble.getNoteStartX();
    staves.treble.setNoteStartX(startX + offset);
    staves.bass.setNoteStartX(startX + offset);
  }

  voices.forEach((voice, i) => voice.draw(context, staves[noteMaps[i]?.clef as Clef]));

  // Restore original positions to prevent drift
  staves.treble.setNoteStartX(originalTrebleStartX);
  staves.bass.setNoteStartX(originalBassStartX);
};

export const renderNoteGroup = (
  { staves, context, selectedNotes, hoveredNote, offset }: RenderProps,
): void => {
  if (selectedNotes && selectedNotes[0]) {
    const trebleNotes = selectedNotes.filter(n => n.octave >= 4);
    const bassNotes = selectedNotes.filter(n => n.octave < 4);

    const noteMaps: NoteMap[] = [];
    if (trebleNotes.length) {
      noteMaps.push({ clef: 'treble', notes: trebleNotes });
    }
    if (bassNotes.length) {
      noteMaps.push({ clef: 'bass', notes: bassNotes });
    }

    createAndRenderStaveNotes({ staves, context, noteMaps, hoveredNote, offset });
  }
};

/**
 * Render notes on a staff with validation support
 */
export const renderNotesOnStaff = (
  staves: Staves,
  context: RenderContext, // VexFlow RenderContext
  selectedNotes: Note[],
  correctNotes: Note[],
  hoveredNote?: Note,
  showCorrectAnswer: boolean = false,
  validationResult?: AnswerValidationResult,
): void => {
  if (selectedNotes.length > 0) {
    renderNoteGroup(
      { staves, context, selectedNotes, hoveredNote },
    );
  }
  if (showCorrectAnswer) {
    renderNoteGroup({ staves, context, selectedNotes: correctNotes, offset: 24 });
  }
};

export const renderPreviewNote = (
  staves: Staves, // VexFlow Stave
  context: RenderContext, // VexFlow RenderContext
  note: Note,
  animationState?: AnimationState,
): void => {
  const clef: Clef = note.octave < 4 ? 'bass' : 'treble';
  const noteMaps = [{ clef, notes: [note] }];
  createAndRenderStaveNotes({ staves, context, noteMaps, animationState });
};

export const clearAndRedrawStaff = (
  staves: Staves, // VexFlow Stave
  context: RenderContext, // VexFlow RenderContext
): void => {
  context.clear();
  Object.values(staves).forEach((stave) => {
    stave.setContext(context);
    stave.draw();
  });
};
