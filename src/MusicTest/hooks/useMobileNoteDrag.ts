import { useCallback, useRef, useState } from 'react';
import type { Note } from '@/libs/Note';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';

interface DragState {
  isDragging: boolean;
  draggedNote: Note | null;
  originalPosition: StaffPosition | null;
  currentPosition: StaffPosition | null;
}

export const useMobileNoteDrag = (
  _selectedNotes: Note[],
  onNoteSelect: (note: Note) => void,
  onNoteDeselect: (note: Note) => void,
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNote: null,
    originalPosition: null,
    currentPosition: null,
  });
  
  const dragStartTimeRef = useRef<number>(0);

  const startDrag = useCallback((note: Note, position: StaffPosition) => {
    console.log("startDrag called with note:", note.toString());
    // Record the start time
    dragStartTimeRef.current = Date.now();
    
    // Remove note from selectedNotes
    onNoteDeselect(note);
    
    setDragState({
      isDragging: true,
      draggedNote: note,
      originalPosition: position,
      currentPosition: position,
    });
    console.log("startDrag: dragState set to isDragging: true");
  }, [onNoteDeselect]);

  const updateDragPosition = useCallback((position: StaffPosition) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      currentPosition: position,
    }));
  }, [dragState.isDragging]);

  const endDrag = useCallback(() => {
    console.log("endDrag called, dragState.isDragging:", dragState.isDragging);
    if (!dragState.isDragging || !dragState.draggedNote) return;
    
    // Check if enough time has passed since drag start (prevent immediate end)
    const timeSinceStart = Date.now() - dragStartTimeRef.current;
    console.log("Time since drag start:", timeSinceStart, "ms");
    
    if (timeSinceStart < 100) {
      console.log("Drag ended too quickly, ignoring");
      return;
    }
    
    // For now, just snap back to original position
    onNoteSelect(dragState.draggedNote);
    
    setDragState({
      isDragging: false,
      draggedNote: null,
      originalPosition: null,
      currentPosition: null,
    });
    console.log("endDrag: dragState set to isDragging: false");
  }, [dragState, onNoteSelect]);

  return { dragState, startDrag, updateDragPosition, endDrag };
};
