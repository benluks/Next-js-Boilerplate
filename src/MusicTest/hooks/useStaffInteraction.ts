import type { RefObject } from 'react';
import type { StaffCoordinates } from '../utils';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';
import { useCallback, useRef, useState } from 'react';
import { Note } from '@/libs/Note';

/**
 * Hook for managing staff interaction (mouse and touch events)
 * Handles coordinate conversion, hit detection, and hover state management
 */
export const useStaffInteraction = (
  containerRef: RefObject<HTMLDivElement | null>,
  staffCoordinatesRef: RefObject<StaffCoordinates | null>,
  onNoteClick: (position: StaffPosition) => void,
  disabled: boolean = false,
  onDragStart?: (note: Note, position: StaffPosition) => void,
) => {
  const [hoveredPosition, setHoveredPosition] = useState<StaffPosition | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [previewAnimation, setPreviewAnimation] = useState<'fadeIn' | 'fadeOut' | 'preview'>('preview');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchHandledRef = useRef<boolean>(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle mouse move events for hover preview with smooth transitions
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Clear any existing hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
      const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);

      // Only update if position actually changed to avoid unnecessary re-renders
      if (!hoveredPosition
        || hoveredPosition.pitch !== position.pitch
        || Math.abs(hoveredPosition.x - position.x) > 5) {
        if (!isHovering) {
          setIsHovering(true);
          setPreviewAnimation('fadeIn');
        }

        setHoveredPosition(position);

        // Clear animation state after animation completes
        hoverTimeoutRef.current = setTimeout(() => {
          setPreviewAnimation('preview');
        }, 150);
      }
    } else {
      // Mouse is outside staff area
      if (isHovering) {
        setPreviewAnimation('fadeOut');
        setIsHovering(false);

        setHoveredPosition(null);

        // Clear hover position after fade out animation
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredPosition(null);
          setPreviewAnimation('preview');
        }, 150);
      }
    }
  }, [staffCoordinatesRef, disabled, containerRef, hoveredPosition, isHovering]);

  /**
   * Handle mouse click events for note placement
   */
  const handleMouseClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    // Prevent context menu on right click - we'll handle it ourselves
    if (event.button > 2) {
      event.preventDefault();
      return;
    }

    // If we already handled this as a touch event, don't handle it as a mouse click
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
      const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
      onNoteClick(position);
    }
  }, [staffCoordinatesRef, disabled, containerRef, onNoteClick]);

  /**
   * Handle right-click events for context menu
   */
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent browser context menu

    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
      const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
      // Create a special position object with context menu coordinates
      const contextMenuPosition = {
        ...position,
        contextMenu: {
          x: event.clientX,
          y: event.clientY,
        },
      };
      onNoteClick(contextMenuPosition as any);
    }
  }, [staffCoordinatesRef, disabled, containerRef, onNoteClick]);

  /**
   * Handle mouse leave events to clear hover state with animation
   */
  const handleMouseLeave = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (isHovering) {
      setPreviewAnimation('fadeOut');
      setIsHovering(false);

      // Clear hover position after fade out animation
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredPosition(null);
        setPreviewAnimation('preview');
      }, 150);
    }
  }, [isHovering]);

  /**
   * Get cursor style based on interaction state
   */
  const getCursorStyle = useCallback(() => {
    if (disabled) {
      return 'not-allowed';
    }
    if (hoveredPosition) {
      return 'crosshair'; // More precise cursor for note placement
    }
    return 'default';
  }, [disabled, hoveredPosition]);

  /**
   * Get CSS class for cursor styling
   */
  const getCursorClass = useCallback(() => {
    if (disabled) {
      return 'cursorNotAllowed';
    }
    if (hoveredPosition) {
      return 'cursorCrosshair';
    }
    return 'cursorDefault';
  }, [disabled, hoveredPosition]);

  /**
   * Handle touch start events for mobile drag initiation
   */
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    // Prevent context menu on long press
    // event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, time: Date.now() };
    touchHandledRef.current = false;
    console.log('Touch start at:', { x, y });

    // Set up long press detection
    longPressTimeoutRef.current = setTimeout(() => {
      console.log('Long press detected!');
      
      // Check if there's a note at this position to drag
      if (staffCoordinatesRef.current && onDragStart) {
        const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
        
        // For now, we'll create a dummy note to test drag functionality
        // Later we'll need to find the actual note at this position
        const dummyNote = position.pitch;
        console.log('Starting drag for note at position:', position);
        onDragStart(dummyNote, position);
      }
    }, 500); // 500ms for long press
  }, [containerRef, staffCoordinatesRef, disabled]);

  /**
   * Handle touch move events for drag updates
   */
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check if this is a significant movement (start of drag)
    const deltaX = Math.abs(x - touchStartRef.current.x);
    const deltaY = Math.abs(y - touchStartRef.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      // Clear long press timeout since we're dragging
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      
      // This is a drag - we'll implement the actual drag logic in the next step
      console.log('Drag detected:', { deltaX, deltaY, x, y });
      // event.preventDefault();
    }
  }, [containerRef]);

  /**
   * Handle touch end events
   */
  const handleTouchEnd = useCallback((_event: React.TouchEvent<HTMLDivElement>) => {
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (!touchStartRef.current || !containerRef || !staffCoordinatesRef.current) {
      touchStartRef.current = null;
      return;
    }

    const touchDuration = Date.now() - touchStartRef.current.time;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touchStartRef.current.x;
    const y = touchStartRef.current.y;

    // If it's a quick tap (not a drag), treat it as a click
    if (touchDuration < 300) {
      console.log('Quick tap detected');
      if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
        const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
        onNoteClick(position);
        touchHandledRef.current = true;
      }
    } else if (touchDuration < 500) {
      console.log('Medium touch detected (300-500ms)');
      // This is a touch that was longer than a quick tap but shorter than long press
      // We'll treat this as a click for now
      if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
        const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
        onNoteClick(position);
        touchHandledRef.current = true;
      }
    } else {
      console.log('Long touch ended (500ms+)');
      // This was a long press that ended - we'll handle drag initiation here later
    }

    touchStartRef.current = null;
  }, [containerRef, staffCoordinatesRef, onNoteClick]);

  /**
   * Check if mouse is currently over an interactive area
   */
  const isOverInteractiveArea = useCallback(() => {
    return hoveredPosition !== null;
  }, [hoveredPosition]);

  return {
    // Event handlers
    handleMouseMove,
    handleMouseClick,
    handleMouseLeave,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // State
    hoveredPosition,
    isHovering,
    previewAnimation,

    // Utilities
    getCursorStyle,
    getCursorClass,
    isOverInteractiveArea,
  };
};
