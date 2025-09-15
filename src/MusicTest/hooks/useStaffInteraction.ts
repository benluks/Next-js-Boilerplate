import type { RefObject } from 'react';
import type { StaffCoordinates } from '../utils';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';
import { useCallback, useRef, useState } from 'react';
import { getTouchDistance, shouldStartDrag, triggerHapticFeedback } from '../utils/touchHandling';

/**
 * Hook for managing staff interaction (mouse and touch events)
 * Handles coordinate conversion, hit detection, and hover state management
 */
export const useStaffInteraction = (
  containerRef: RefObject<HTMLDivElement | null>,
  staffCoordinatesRef: RefObject<StaffCoordinates | null>,
  onNoteClick: (position: StaffPosition) => void,
  disabled: boolean = false,
  onLongPress?: (note: any, position: StaffPosition) => void,
  onDragMove?: (x: number, y: number, position: StaffPosition, isValid: boolean) => void,
  onDragEnd?: () => void,
) => {
  const [hoveredPosition, setHoveredPosition] = useState<StaffPosition | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [previewAnimation, setPreviewAnimation] = useState<'fadeIn' | 'fadeOut' | 'preview'>('preview');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Long press detection state
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ touch: Touch; position: StaffPosition; startTime: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLongPressActive, setIsLongPressActive] = useState(false);

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

    // Don't show context menu during long press or drag
    if (isLongPressActive || isDragging) {
      return;
    }

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
  }, [staffCoordinatesRef, disabled, containerRef, onNoteClick, isLongPressActive, isDragging]);

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
   * Check if mouse is currently over an interactive area
   */
  const isOverInteractiveArea = useCallback(() => {
    return hoveredPosition !== null;
  }, [hoveredPosition]);

  /**
   * Handle touch start events for long press detection
   */
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {

    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (staffCoordinatesRef.current.isWithinStaffArea(x, y)) {
      const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
      const startTime = Date.now();

      // Store touch start info for long press detection
      touchStartRef.current = { touch, position, startTime };
      setIsLongPressActive(true);

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current && onLongPress) {
          // Check if we're still on the same position (not moved too much)
          const currentTouch = event.touches[0];
          if (currentTouch) {
            const distance = getTouchDistance(touchStartRef.current.touch, currentTouch);

            if (distance < 10) { // Within 10px of start position
              triggerHapticFeedback([50, 50]); // Double vibration for drag start
              setIsDragging(true);
              onLongPress(touchStartRef.current.position.pitch, touchStartRef.current.position);
            }
          }
        }
        setIsLongPressActive(false);
      }, 500); // 500ms long press delay
    }
  }, [staffCoordinatesRef, disabled, containerRef, onLongPress]);

  /**
   * Handle touch move events
   */
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef || !staffCoordinatesRef.current || disabled) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Handle drag updates if we're dragging
    if (isDragging && onDragMove) {
      const position = staffCoordinatesRef.current.getNearestStaffPosition(x, y);
      const isValid = staffCoordinatesRef.current.isWithinStaffArea(x, y);
      onDragMove(x, y, position, isValid);
      return; // Skip normal hover handling when dragging
    }

    // Check if we should cancel long press due to movement
    if (touchStartRef.current) {
      const distance = getTouchDistance(touchStartRef.current.touch, touch!);
      const timeElapsed = Date.now() - touchStartRef.current.startTime;

      if (shouldStartDrag(distance, timeElapsed)) {
        // Cancel long press timer if moved too much
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        touchStartRef.current = null;
        setIsLongPressActive(false);
      }
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
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          setPreviewAnimation('preview');
        }, 150);
      }
    } else {
      // Touch is outside staff area
      if (isHovering) {
        setPreviewAnimation('fadeOut');
        setIsHovering(false);

        setHoveredPosition(null);

        // Clear hover position after fade out animation
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredPosition(null);
          setPreviewAnimation('preview');
        }, 150);
      }
    }
  }, [staffCoordinatesRef, disabled, containerRef, hoveredPosition, isHovering]);

  /**
   * Handle touch end events
   */
  const handleTouchEnd = useCallback((_event: React.TouchEvent<HTMLDivElement>) => {
    // Handle drag end if we were dragging
    if (isDragging && onDragEnd) {
      setIsDragging(false);
      onDragEnd();
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Clear touch start reference and long press state
    touchStartRef.current = null;
    setIsLongPressActive(false);

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
  }, [isHovering, isDragging, onDragEnd]);

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
    isLongPressActive,
    isDragging,

    // Utilities
    getCursorStyle,
    getCursorClass,
    isOverInteractiveArea,
  };
};
