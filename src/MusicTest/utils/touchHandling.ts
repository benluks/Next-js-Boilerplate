import type { TouchConfig } from '@/MusicTest/types/StaffInteraction';

/**
 * Utility functions for handling touch events and mobile interactions
 * Will be implemented in task 8.1
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
 * Convert touch event to screen coordinates
 * Implementation will be added in task 8.1
 */
export const getTouchPosition = (touch: Touch, element: HTMLElement): { x: number; y: number } => {
  // Placeholder implementation
  const rect = element.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
};

/**
 * Provide haptic feedback if available
 * Implementation will be added in task 8.2
 */
export const triggerHapticFeedback = (pattern: number | number[] = 50): void => {
  // Placeholder implementation
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Check if touch target is large enough for accessibility
 * Implementation will be added in task 8.1
 */
export const isValidTouchTarget = (width: number, height: number, config: TouchConfig = DEFAULT_TOUCH_CONFIG): boolean => {
  // Placeholder implementation
  return width >= config.minTouchTarget && height >= config.minTouchTarget;
};

/**
 * Detect if enough time has passed for a long press
 */
export const detectLongPress = (startTime: number, currentTime: number, config: TouchConfig = DEFAULT_TOUCH_CONFIG): boolean => {
  return currentTime - startTime >= config.longPressDelay;
};

/**
 * Calculate distance between two touch points
 */
export const getTouchDistance = (start: Touch, current: Touch): number => {
  const dx = current.clientX - start.clientX;
  const dy = current.clientY - start.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Determine if touch movement is significant enough to start drag
 */
export const shouldStartDrag = (distance: number, timeElapsed: number, _config: TouchConfig = DEFAULT_TOUCH_CONFIG): boolean => {
  const minDistance = 10; // pixels
  const minTime = 100; // ms
  return distance > minDistance && timeElapsed > minTime;
};

/**
 * Throttle function for touch move events
 */
export const throttleTouchMove = (callback: Function, delay: number = 16): Function => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: any[]) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      callback(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};
