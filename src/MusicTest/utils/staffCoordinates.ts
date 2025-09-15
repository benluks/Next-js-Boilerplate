import type { Stave } from 'vexflow';
import type { Octave } from '@/MusicTest/types/MusicTypes';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';
import { Note } from '@/libs/Note';
import { NOTE_CLASSES } from '@/utils/MusicConstants';

const MINIMUM_NOTE = -14;
/**
 * Utility class for converting between screen coordinates and staff positions
 */
export class StaffCoordinates {
  private staveTreble: Stave;
  private staveBass: Stave;
  private scale: number;
  private lineSpacing: number;
  private staffTop: number;
  private middleLine: number;
  private staffBottom: number;

  constructor(props: { treble: Stave; bass: Stave; scale: number }) {
    this.staveTreble = props.treble;
    this.staveBass = props.bass;
    this.scale = props.scale;
    this.lineSpacing = props.treble.getSpacingBetweenLines() * this.scale;
    this.staffTop = props.treble.getYForLine(0) * this.scale; // Top line of staff
    this.middleLine = props.treble.getYForLine(5) * this.scale;
    this.staffBottom = props.bass.getYForLine(4) * this.scale; // Bottom line of staff
  }

  linePositionToPitch(linePosition: number): Note {
    // C/4 is 0
    const noteClass = NOTE_CLASSES[((linePosition % 7) + 7) % 7]!;
    const octave = 4 + Math.floor(linePosition / 7) as Octave;

    return new Note({ noteClass, octave });
  }

  /**
   * Convert screen coordinates to staff position
   */
  screenToStaffPosition(x: number, y: number): StaffPosition {
    const linePosition = this.getLinePositionFromY(y);
    const pitch = this.linePositionToPitch(linePosition);
    const isLine = this.isOnStaffLine(linePosition);
    const requiresLedgerLine = this.requiresLedgerLine(linePosition);

    return {
      x,
      y: this.getYForLinePosition(linePosition),
      pitch,
      linePosition,
      isLine,
      requiresLedgerLine,
    };
  }

  /**
   * Convert staff position to screen coordinates
   */
  staffPositionToScreen(position: StaffPosition): { x: number; y: number } {
    return {
      x: position.x,
      y: this.getYForLinePosition(position.linePosition),
    };
  }

  /**
   * Snap coordinates to nearest staff line or space
   */
  getNearestStaffPosition(x: number, y: number): StaffPosition {
    const nearestLinePosition = this.getNearestLinePosition(y);
    const snappedY = this.getYForLinePosition(nearestLinePosition);

    return this.screenToStaffPosition(x, snappedY);
  }

  /**
   * Get line position from Y coordinate
   * Line positions: 0 = bottom line, 1 = first space, 2 = second line, etc.
   * Negative values are below staff, values > 8 are above staff
   */
  private getLinePositionFromY(y: number): number {
    // Calculate relative position from bottom of staff
    const relativeY = this.middleLine - y;
    const linePosition = Math.round(relativeY / (this.lineSpacing / 2));

    return Math.max(MINIMUM_NOTE, Math.min(14, linePosition));
  }

  /**
   * Get Y coordinate for a given line position
   */
  private getYForLinePosition(linePosition: number): number {
    return this.staffBottom - (linePosition * this.lineSpacing / 2);
  }

  /**
   * Get the nearest line position for snapping
   */
  private getNearestLinePosition(y: number): number {
    const exactPosition = (this.staffBottom - y) / (this.lineSpacing / 2);
    return Math.round(exactPosition);
  }

  private isOnStaffLine(linePosition: number): boolean {
    return linePosition % 2 === 0;
  }

  private requiresLedgerLine(linePosition: number): boolean {
    return linePosition < -10 || linePosition > 10;
  }

  isWithinStaffArea(x: number, y: number): boolean {
    const margin = this.lineSpacing * 3; // Allow 3 line spaces above/below
    const leftBound = this.staveTreble.getX();
    const rightBound = this.staveTreble.getX() + this.staveTreble.getWidth();
    const topBound = this.staffTop - margin;
    const bottomBound = this.staffBottom + margin;

    return x >= leftBound && x <= rightBound && y >= topBound && y <= bottomBound;
  }

  getStaffBounds(): { left: number; right: number; top: number; bottom: number } {
    const margin = this.lineSpacing * 3;
    return {
      left: this.staveTreble.getX(),
      right: this.staveTreble.getX() + this.staveTreble.getWidth(),
      top: this.staffTop - margin,
      bottom: this.staffBottom + margin,
    };
  }

  /**
   * Get all valid staff positions within the staff area
   * Useful for keyboard navigation
   */
  getAllValidPositions(): StaffPosition[] {
    const positions: StaffPosition[] = [];
    const staffX = this.staveTreble.getX() + this.staveTreble.getNoteStartX();

    // Only include positions that have actual pitch mappings
    const validLinePositions = [-6, -4, -2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14];

    for (const linePosition of validLinePositions) {
      const y = this.getYForLinePosition(linePosition);
      const position = this.screenToStaffPosition(staffX, y);
      positions.push(position);
    }

    return positions;
  }

  /**
   * Validate if a position is a valid drag target
   * Returns the nearest valid position if invalid
   */
  validateDragTarget(x: number, y: number, existingNotes: Note[]): {
    isValid: boolean;
    targetPosition: StaffPosition;
    reason?: string;
  } {
    // Check if position is within staff area
    if (!this.isWithinStaffArea(x, y)) {
      return {
        isValid: false,
        targetPosition: this.getNearestStaffPosition(x, y),
        reason: 'Outside staff area'
      };
    }

    const targetPosition = this.getNearestStaffPosition(x, y);
    
    // Check if there's already a note at this position
    const existingNote = existingNotes.find(note => 
      note.linePosition === targetPosition.linePosition
    );

    if (existingNote) {
      return {
        isValid: false,
        targetPosition,
        reason: 'Position occupied by existing note'
      };
    }

    return {
      isValid: true,
      targetPosition
    };
  }
}

export type SystemCoordinates = { treble: StaffCoordinates | null; bass: StaffCoordinates | null };
