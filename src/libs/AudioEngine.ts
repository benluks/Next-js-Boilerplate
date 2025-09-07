import type { Note } from '@/libs/Note';
import type { HiddenNote } from '@/MusicTest/types/MusicTypes';
import * as Tone from 'tone';
import { CONFIG_HELPERS } from '@/config/gameConfig';
import { midiNumberToNote } from '@/utils/musicUtils';

export class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeSampler();
  }

  /**
   * Initialize the Tone.js sampler with piano samples
   */
  private initializeSampler(): void {
    try {
      // Create a sampler with piano samples from Tone.js
      this.sampler = new Tone.Sampler({
        urls: {
          C4: 'C4.mp3',
        },
        release: 1,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
      }).toDestination();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio sampler:', error);
      this.sampler = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if audio is supported
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false; // Server-side environment
    }
    return this.isInitialized && this.sampler !== null;
  }

  /**
   * Generate a random set of notes for the game
   */
  public generateNoteSet(count: number): HiddenNote[] {
    if (count < 1) {
      throw new Error('Must be a positive integer');
    }

    // Import the helper function dynamically to avoid circular imports
    const availableNotes = CONFIG_HELPERS.getMidiNoteRange();

    // Shuffle available notes and take the first 'count' notes
    const shuffled = [...availableNotes].sort(() => Math.random() - 0.5);
    const generatedNotesMidiNumbers = shuffled.slice(0, count);
    return generatedNotesMidiNumbers.map(midiNumber => ({
      midiNumber,
      note: midiNumberToNote(midiNumber),
    }));
  }

  /**
   * Play multiple notes simultaneously
   */
  public async playNotes(notes: Note[]): Promise<void> {
    if (!this.isSupported() || !this.sampler) {
      throw new Error('Audio engine is not initialized');
    }

    if (notes.length === 0) {
      throw new Error('At least one note must be provided');
    }

    try {
      // Start Tone.js audio context if needed
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }

      // Wait for samples to load
      await Tone.loaded();

      // Convert notes to Tone.js format and play them
      const toneNotes = notes.map(note => note.toString());
      this.sampler.triggerAttackRelease(toneNotes, '2n');
    } catch (error) {
      console.error('Failed to play notes:', error);
      throw new Error('Failed to play audio');
    }
  }

  /**
   * Stop all currently playing notes
   */
  public stopNotes(): void {
    if (this.sampler) {
      this.sampler.releaseAll();
    }
  }

  /**
   * Set the volume (0-1)
   */
  public setVolume(volume: number): void {
    if (volume < 0 || volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }

    if (this.sampler) {
      this.sampler.volume.value = Tone.gainToDb(volume);
    }
  }

  /**
   * Get current volume (0-1)
   */
  public getVolume(): number {
    if (this.sampler) {
      return Tone.dbToGain(this.sampler.volume.value);
    }
    return 0.7; // Default volume
  }

  /**
   * Dispose of the audio engine and clean up resources
   */
  public dispose(): void {
    this.stopNotes();

    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }

    this.isInitialized = false;
  }
}

// Export a singleton instance
export const audioEngine = new AudioEngine();
