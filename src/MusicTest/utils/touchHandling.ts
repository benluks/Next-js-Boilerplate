import type { TouchConfig } from '@/MusicTest/types/StaffInteraction';

/**
 * Utility functions for handling touch events and mobile interactions
 */

/**
 * Default touch configuration
 */
export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  minTouchTarget: 44, // 44px minimum touch target size
  longPressDelay: 500, // 500ms for long press
  hapticFeedback: true,
};

/**
 * Convert touch event to screen coordinates relative to element
 */
export const getTouchPosition = (touch: Touch, element: HTMLElement): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
};

/**
 * Convert mouse event to screen coordinates relative to element
 */
export const getMousePosition = (event: React.MouseEvent<HTMLElement>): { x: number; y: number } => {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

/**
 * Provide haptic feedback if available
 */
export const triggerHapticFeedback = (pattern: number | number[] = 50): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Check if touch target is large enough for accessibility
 */
export const isValidTouchTarget = (width: number, height: number, config: TouchConfig = DEFAULT_TOUCH_CONFIG): boolean => {
  return width >= config.minTouchTarget && height >= config.minTouchTarget;
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (point1: { x: number; y: number }, point2: { x: number; y: number }): number => {
  return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
};

/**
 * Check if a touch has moved beyond the drag threshold
 */
export const hasMovedBeyondThreshold = (
  startPosition: { x: number; y: number },
  currentPosition: { x: number; y: number },
  threshold: number,
): boolean => {
  return calculateDistance(startPosition, currentPosition) > threshold;
};

/**
 * Debounce function for touch events
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for touch events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Prevent default touch behaviors that interfere with dragging
 */
export const preventTouchBehaviors = (element: HTMLElement): void => {
  element.addEventListener('touchstart', (e) => {
    // Prevent scrolling during touch
    if (e.touches.length === 1) {
      e.preventDefault();
    }
  }, { passive: false });

  element.addEventListener('touchmove', (e) => {
    // Prevent scrolling during touch
    if (e.touches.length === 1) {
      e.preventDefault();
    }
  }, { passive: false });
};

/**
 * Restore default touch behaviors
 */
export const restoreTouchBehaviors = (element: HTMLElement): void => {
  element.removeEventListener('touchstart', preventTouchBehaviors);
  element.removeEventListener('touchmove', preventTouchBehaviors);
};
