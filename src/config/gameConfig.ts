import type { MidiNote } from 'tone/build/esm/core/type/NoteUnits';
import { RuntimeError } from 'vexflow';
import { Note } from '@/libs/Note';

// Note range configuration
export const NOTE_CONFIG = {

  DEFAULT_MIN_PITCH: new Note({ noteClass: 'C', octave: 2, accidental: 'natural' }),
  DEFAULT_MAX_PITCH: new Note({ noteClass: 'C', octave: 6, accidental: 'natural' }),

  MIN_PITCH_MIDI: 36,
  MAX_PITCH_MIDI: 84,

  MIN_NOTES: 1,
  MAX_NOTES: 8,

  // Default note range
  DEFAULT_MIN_NOTES: 3,
  DEFAULT_MAX_NOTES: 5,
} as const;

// Audio configuration
export const AUDIO_CONFIG = {
  // Volume constraints
  MIN_VOLUME: 0,
  MAX_VOLUME: 1,
  VOLUME_STEP: 0.1,
  DEFAULT_VOLUME: 0.7,

  // Audio modes
  AUDIO_MODES: ['mono', 'poly'] as const,
  DEFAULT_AUDIO_MODE: 'mono' as 'mono' | 'poly',

  // Timing
  NOTE_PLAY_DURATION: 2000, // milliseconds
  AUDIO_BUFFER_TIME: 100, // extra time for audio processing
} as const;

// Game behavior configuration
export const GAME_CONFIG = {
  // Default settings
  DEFAULT_AUTO_REPLAY: false,
  DEFAULT_LIMIT_NOTES: false,
  DEFAULT_INCLUDE_ACCIDENTALS: true,

  // UI constraints
  STAFF_WIDTH: 400,
  STAFF_HEIGHT: 250,

  // Difficulty options (for backward compatibility)
  DIFFICULTY_OPTIONS: Array.from({ length: NOTE_CONFIG.MAX_NOTES - NOTE_CONFIG.MIN_NOTES + 1 }, (_, i) => NOTE_CONFIG.MIN_NOTES + i),

  // Chromatic options
  ACCIDENTAL_MODES: ['none', 'sharps', 'flats', 'both'] as const,
} as const;

// Settings validation rules
export const VALIDATION_CONFIG = {
  NOTE_COUNT: {
    min: NOTE_CONFIG.MIN_NOTES,
    max: NOTE_CONFIG.MAX_NOTES,
    step: 1,
  },
  VOLUME: {
    min: AUDIO_CONFIG.MIN_VOLUME,
    max: AUDIO_CONFIG.MAX_VOLUME,
    step: AUDIO_CONFIG.VOLUME_STEP,
  },
} as const;

// Default game settings (used by SettingsManager)
export const DEFAULT_GAME_SETTINGS = {
  minNotes: NOTE_CONFIG.DEFAULT_MIN_NOTES,
  maxNotes: NOTE_CONFIG.DEFAULT_MAX_NOTES,
  volume: AUDIO_CONFIG.DEFAULT_VOLUME,
  autoReplay: GAME_CONFIG.DEFAULT_AUTO_REPLAY,
  startingOctave: 4,
  audioMode: 'mono',
} as const;

// Game-specific settings (session-only, not persisted)
export const DEFAULT_SESSION_SETTINGS = {
  limitNotes: GAME_CONFIG.DEFAULT_LIMIT_NOTES,
  audioMode: AUDIO_CONFIG.DEFAULT_AUDIO_MODE,
  enableAudio: true,
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Slider configuration
  DUAL_RANGE_SLIDER: {
    min: NOTE_CONFIG.MIN_NOTES,
    max: NOTE_CONFIG.MAX_NOTES,
    step: VALIDATION_CONFIG.NOTE_COUNT.step,
    label: 'Number of Notes',
  },

  // Volume slider configuration
  VOLUME_SLIDER: {
    min: AUDIO_CONFIG.MIN_VOLUME,
    max: AUDIO_CONFIG.MAX_VOLUME,
    step: AUDIO_CONFIG.VOLUME_STEP,
    label: 'Volume',
    formatValue: (value: number) => `${Math.round(value * 100)}%`,
  },

  // Dropdown options
  DIFFICULTY_OPTIONS: GAME_CONFIG.DIFFICULTY_OPTIONS.map(num => ({
    value: num,
    label: num.toString(),
  })),

  AUDIO_MODE_OPTIONS: [
    { value: 'mono', label: 'Individual notes' },
    { value: 'poly', label: 'All notes as chord' },
  ] as const,

  ACCIDENTAL_MODE_OPTIONS: [
    { value: 'none', label: 'Natural notes only' },
    { value: 'sharps', label: 'Include sharps (♯)' },
    { value: 'flats', label: 'Include flats (♭)' },
    { value: 'both', label: 'Include sharps & flats' },
  ] as const,
} as const;

// Storage configuration
export const STORAGE_CONFIG = {
  SETTINGS_KEY: 'music-test-settings',
  STORAGE_TEST_KEY: '__storage_test__',
  SETTINGS_VERSION: '1.0.0', // Increment this when defaults change
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUDIO_NOT_SUPPORTED: 'Your browser doesn\'t support the Web Audio API required for this application. Please try using a modern browser like Chrome, Firefox, or Safari.',
  AUDIO_PLAYBACK_FAILED: 'Failed to play audio',
  SETTINGS_SAVE_FAILED: 'Failed to save settings',
  STORAGE_NOT_AVAILABLE: 'Local storage is not available. Settings will not be saved between sessions.',
  INVALID_NOTE_COUNT: (min: number, max: number) => `Note count must be between ${min} and ${max}`,
  INVALID_VOLUME: (min: number, max: number) => `Volume must be between ${min} and ${max}`,
  MIN_GREATER_THAN_MAX: 'Minimum notes must be less than or equal to maximum notes',
} as const;

// Type exports for better type safety
export type AudioMode = typeof AUDIO_CONFIG.AUDIO_MODES[number];
export type DifficultyOption = typeof GAME_CONFIG.DIFFICULTY_OPTIONS[number];
export type AccidentalMode = typeof GAME_CONFIG.ACCIDENTAL_MODES[number];

// Helper functions
export const CONFIG_HELPERS = {
  /**
   * Get formatted volume percentage
   */
  formatVolumePercentage: (volume: number): string => {
    return UI_CONFIG.VOLUME_SLIDER.formatValue(volume);
  },

  /**
   * Validate note count range
   */
  isValidNoteCount: (count: number): boolean => {
    return count >= NOTE_CONFIG.MIN_NOTES && count <= NOTE_CONFIG.MAX_NOTES;
  },

  /**
   * Validate volume range
   */
  isValidVolume: (volume: number): boolean => {
    return volume >= AUDIO_CONFIG.MIN_VOLUME && volume <= AUDIO_CONFIG.MAX_VOLUME;
  },

  /**
   * Validate min/max note relationship
   */
  isValidNoteRange: (minNotes: number, maxNotes: number): boolean => {
    return minNotes <= maxNotes
      && CONFIG_HELPERS.isValidNoteCount(minNotes)
      && CONFIG_HELPERS.isValidNoteCount(maxNotes);
  },

  /**
   * Get total play time including buffer
   */
  getTotalPlayTime: (): number => {
    return AUDIO_CONFIG.NOTE_PLAY_DURATION + AUDIO_CONFIG.AUDIO_BUFFER_TIME;
  },

  /**
   * Get available notes based on accidental settings
   */

  getMidiNoteRange: (minPitch: Note = NOTE_CONFIG.DEFAULT_MIN_PITCH, maxPitch: Note = NOTE_CONFIG.DEFAULT_MAX_PITCH): MidiNote[] => {
    const [minMidiNumber, maxMidiNumber] = [minPitch, maxPitch].map(pitch => pitch.midiNumber);
    if (!(minMidiNumber && maxMidiNumber)) {
      throw new RuntimeError('At least one of the midi numbers is not defined', JSON.stringify([minMidiNumber, maxMidiNumber]));
    }
    return Array.from({ length: maxMidiNumber - minMidiNumber + 1 }, (_, i) => minMidiNumber + i) as MidiNote[];
  },
};
