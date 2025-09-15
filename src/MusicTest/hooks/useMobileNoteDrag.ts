import type { Note } from '@/libs/Note';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';
import { useCallback, useRef, useState } from 'react';

/**
 * Validate if a drop position is valid
 */
const validateDropPosition = (
  targetPosition: StaffPosition,
  selectedNotes: Note[],
  draggedNote: Note,
  staffCoordinates?: any
): boolean => {
  // Check if position is within staff bounds
  if (staffCoordinates && !staffCoordinates.isWithinStaffArea(targetPosition.x, targetPosition.y)) {
    return false;
  }
  
  // Check for conflicts with existing notes (excluding the dragged note)
  const hasConflict = selectedNotes.some(note => 
    note.linePosition === targetPosition.linePosition && note.id !== draggedNote.id
  );
  
  if (hasConflict) {
    return false;
  }
  
  // Additional validation could go here (e.g., game rules, musical validity)
  
  return true;
};

export interface DragState {
  isDragging: boolean;
  draggedNote: Note | null;
  dragStartPosition: StaffPosition | null;
  currentDragPosition: { x: number; y: number } | null;
  targetPosition: StaffPosition | null;
  isValidDrop: boolean;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedNote: null,
  dragStartPosition: null,
  currentDragPosition: null,
  targetPosition: null,
  isValidDrop: false,
};

export interface DragCallbacks {
  onNoteMove: (oldNote: Note, newNote: Note) => void;
  onDragStart: (note: Note) => void;
  onDragEnd: (note: Note, finalPosition: StaffPosition | null) => void;
}

export const useMobileNoteDrag = (
  callbacks: DragCallbacks,
  selectedNotes: Note[] = [],
  staffCoordinates?: any
) => {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const lastLogTimeRef = useRef<number>(0);

  const startDrag = useCallback((note: Note, startPosition: StaffPosition) => {
    setDragState({
      isDragging: true,
      draggedNote: note,
      dragStartPosition: startPosition,
      currentDragPosition: { x: startPosition.x, y: startPosition.y },
      targetPosition: startPosition,
      isValidDrop: true,
    });
    
    callbacks.onDragStart(note);
  }, [callbacks]);

  const updateDragPosition = useCallback((x: number, y: number, targetPosition: StaffPosition, isWithinBounds: boolean) => {
    if (!dragState.draggedNote) return;
    
    const isValidDrop = isWithinBounds && validateDropPosition(
      targetPosition,
      selectedNotes,
      dragState.draggedNote,
      staffCoordinates
    );
    
    // Log position updates during drag (throttled to every 100ms)
    const now = Date.now();
    if (now - lastLogTimeRef.current > 100) {
      console.log(`Drag position: (${x.toFixed(1)}, ${y.toFixed(1)}) → ${targetPosition.pitch.toString()} (line ${targetPosition.linePosition}) - ${isValidDrop ? 'VALID' : 'INVALID'}`);
      lastLogTimeRef.current = now;
    }
    
    setDragState(prev => ({
      ...prev,
      currentDragPosition: { x, y },
      targetPosition,
      isValidDrop,
    }));
  }, [dragState.draggedNote, selectedNotes, staffCoordinates]);

  const endDrag = useCallback(() => {
    if (!dragState.draggedNote) return;

    let finalPosition: StaffPosition | null = null;
    
    if (dragState.isValidDrop && dragState.targetPosition) {
      // Use the snapped position from targetPosition
      finalPosition = dragState.targetPosition;
    } else if (dragState.dragStartPosition) {
      // Snap back to original position
      finalPosition = dragState.dragStartPosition;
    }
    
    callbacks.onDragEnd(dragState.draggedNote, finalPosition);
    
    setDragState(initialDragState);
  }, [dragState, callbacks]);

  const cancelDrag = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  return {
    dragState,
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
  };
};