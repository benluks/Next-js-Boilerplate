import type { RefObject } from 'react';
import type { StaffCoordinates } from '../utils/staffCoordinates';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Note } from '@/libs/Note';

/**
 * Drag state for mobile note dragging
 */
export type DragState = {
  isDragging: boolean;
  draggedNote: Note | null;
  dragStartPosition: StaffPosition | null;
  currentPosition: { x: number; y: number } | null;
  targetPosition: StaffPosition | null;
  isValidDrop: boolean;
  dragOffset: { x: number; y: number } | null; // Offset from touch to note center
};

/**
 * Configuration for mobile drag behavior
 */
export type DragConfig = {
  longPressDelay: number; // ms to hold before drag starts
  dragThreshold: number; // pixels to move before drag starts
  snapTolerance: number; // pixels from valid position to snap
  hapticFeedback: boolean;
};

const DEFAULT_DRAG_CONFIG: DragConfig = {
  longPressDelay: 500,
  dragThreshold: 10,
  snapTolerance: 20,
  hapticFeedback: true,
};

/**
 * Hook for managing mobile note dragging functionality
 */
export const useMobileNoteDrag = (
  containerRef: RefObject<HTMLDivElement | null>,
  staffCoordinatesRef: RefObject<StaffCoordinates | null>,
  selectedNotes: Note[],
  _onNoteMove: (oldNote: Note, newNote: Note) => void,
  onNoteDeselect: (note: Note) => void,
  onNoteSelect: (note: Note) => void,
  disabled: boolean = false,
  config: Partial<DragConfig> = {},
) => {
  const dragConfig = { ...DEFAULT_DRAG_CONFIG, ...config };

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNote: null,
    dragStartPosition: null,
    currentPosition: null,
    targetPosition: null,
    isValidDrop: false,
    dragOffset: null,
  });

  // Refs for touch tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Trigger haptic feedback if available
   */
  const triggerHapticFeedback = useCallback((pattern: number | number[] = 50) => {
    if (!dragConfig.hapticFeedback || !('vibrate' in navigator)) {
      return;
    }
    navigator.vibrate(pattern);
  }, [dragConfig.hapticFeedback]);

  /**
   * Find note at given screen coordinates
   */
  const findNoteAtPosition = useCallback((x: number, y: number): Note | null => {
    if (!staffCoordinatesRef.current) {
      return null;
    }

    // Convert screen coordinates to staff position
    const staffPosition = staffCoordinatesRef.current.getNearestStaffPosition(x, y);

    // Find matching note in selectedNotes
    return selectedNotes.find(note =>
      note.linePosition === staffPosition.linePosition,
    ) || null;
  }, [selectedNotes, staffCoordinatesRef]);

  /**
   * Validate if a position is a valid drop target
   */
  const validateDropPosition = useCallback((position: StaffPosition, draggedNote: Note): boolean => {
    if (!staffCoordinatesRef.current) {
      return false;
    }

    // Check if position is within staff bounds
    if (!staffCoordinatesRef.current.isWithinStaffArea(position.x, position.y)) {
      return false;
    }

    // Check if position conflicts with other selected notes (excluding dragged note)
    const conflictingNote = selectedNotes.find(note =>
      note !== draggedNote && note.linePosition === position.linePosition,
    );

    return !conflictingNote;
  }, [selectedNotes, staffCoordinatesRef]);

  /**
   * Start drag operation
   */
  const startDrag = useCallback((note: Note, touchPosition: { x: number; y: number }) => {
    if (!staffCoordinatesRef.current) {
      return;
    }

    // Calculate offset from touch point to note center
    const notePosition = staffCoordinatesRef.current.screenToStaffPosition(touchPosition.x, touchPosition.y);
    const dragOffset = {
      x: touchPosition.x - notePosition.x,
      y: touchPosition.y - notePosition.y,
    };

    setDragState({
      isDragging: true,
      draggedNote: note,
      dragStartPosition: notePosition,
      currentPosition: touchPosition,
      targetPosition: notePosition,
      isValidDrop: true,
      dragOffset,
    });

    // Trigger haptic feedback
    triggerHapticFeedback([50]);

    // Prevent scrolling during drag
    document.body.style.overflow = 'hidden';
  }, [staffCoordinatesRef, triggerHapticFeedback]);

  /**
   * Update drag position
   */
  const updateDrag = useCallback((touchPosition: { x: number; y: number }) => {
    if (!dragState.isDragging || !staffCoordinatesRef.current || !dragState.draggedNote) {
      return;
    }

    // Calculate target staff position
    const targetPosition = staffCoordinatesRef.current.getNearestStaffPosition(
      touchPosition.x - (dragState.dragOffset?.x || 0),
      touchPosition.y - (dragState.dragOffset?.y || 0),
    );

    // Validate drop position
    const isValidDrop = validateDropPosition(targetPosition, dragState.draggedNote);

    setDragState(prev => ({
      ...prev,
      currentPosition: touchPosition,
      targetPosition,
      isValidDrop,
    }));
  }, [dragState.isDragging, dragState.draggedNote, dragState.dragOffset, staffCoordinatesRef, validateDropPosition]);

  /**
   * End drag operation
   */
  const endDrag = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedNote) {
      return;
    }

    const { draggedNote, targetPosition, isValidDrop } = dragState;

    if (isValidDrop && targetPosition) {
      // Create new note at target position
      const newNote = new Note({
        noteClass: draggedNote.noteClass,
        octave: targetPosition.pitch.octave,
        accidental: draggedNote.accidental,
        linePosition: targetPosition.linePosition,
      });

      // Move the note
      onNoteDeselect(draggedNote);
      onNoteSelect(newNote);

      // Trigger success haptic feedback
      triggerHapticFeedback([50, 25, 50]);
    } else {
      // Snap back to original position - no action needed as note wasn't moved
      triggerHapticFeedback([100, 50, 100]);
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedNote: null,
      dragStartPosition: null,
      currentPosition: null,
      targetPosition: null,
      isValidDrop: false,
      dragOffset: null,
    });

    // Restore scrolling
    document.body.style.overflow = '';

    // Clear refs
    touchStartRef.current = null;
    dragStartPositionRef.current = null;
  }, [dragState, onNoteDeselect, onNoteSelect, triggerHapticFeedback]);

  /**
   * Cancel drag operation
   */
  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedNote: null,
      dragStartPosition: null,
      currentPosition: null,
      targetPosition: null,
      isValidDrop: false,
      dragOffset: null,
    });

    // Restore scrolling
    document.body.style.overflow = '';

    // Clear refs and timeouts
    touchStartRef.current = null;
    dragStartPositionRef.current = null;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || dragState.isDragging) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Find note at touch position
    const note = findNoteAtPosition(x, y);
    if (!note) {
      return;
    }

    // Store touch start info
    touchStartRef.current = { x, y, time: Date.now() };
    dragStartPositionRef.current = { x, y };

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (touchStartRef.current && dragStartPositionRef.current) {
        startDrag(note, dragStartPositionRef.current);
      }
    }, dragConfig.longPressDelay);
  }, [disabled, dragState.isDragging, containerRef, findNoteAtPosition, startDrag, dragConfig.longPressDelay]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (dragState.isDragging) {
      // Update drag position
      updateDrag({ x, y });
    } else {
      // Check if we've moved enough to cancel long press
      const distance = Math.sqrt(
        (x - touchStartRef.current.x) ** 2 + (y - touchStartRef.current.y) ** 2,
      );

      if (distance > dragConfig.dragThreshold) {
        // Cancel long press timer
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
        touchStartRef.current = null;
        dragStartPositionRef.current = null;
      }
    }

    // Prevent scrolling during drag
    if (dragState.isDragging) {
      event.preventDefault();
    }
  }, [containerRef, dragState.isDragging, updateDrag, dragConfig.dragThreshold]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((_event: React.TouchEvent<HTMLDivElement>) => {
    if (dragState.isDragging) {
      endDrag();
    } else {
      // Cancel long press timer if it's still running
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }

    // Clear refs
    touchStartRef.current = null;
    dragStartPositionRef.current = null;
  }, [dragState.isDragging, endDrag]);

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      document.body.style.overflow = '';
    };
  }, []);

  return {
    // Drag state
    dragState,

    // Event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,

    // Drag control
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
};
