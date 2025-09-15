import { useState, useCallback } from 'react';
import type { Note } from '@/libs/Note';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';

interface DragState {
  isDragging: boolean;
  draggedNote: Note | null;
  dragPosition: { x: number; y: number } | null;
  originalPosition: StaffPosition | null;
}

export const useNoteDrag = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNote: null,
    dragPosition: null,
    originalPosition: null,
  });

  const startDrag = useCallback((note: Note, position: StaffPosition) => {
    setDragState({
      isDragging: true,
      draggedNote: note,
      dragPosition: { x: position.x, y: position.y },
      originalPosition: position,
    });
  }, []);

  const updateDrag = useCallback((x: number, y: number) => {
    setDragState(prev => prev.isDragging ? {
      ...prev,
      dragPosition: { x, y },
    } : prev);
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedNote: null,
      dragPosition: null,
      originalPosition: null,
    });
  }, []);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
  };
};
