'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { TouchDragState } from '@/MusicTest/utils/touchHandling';

interface MotionStaffWrapperProps {
  children: React.ReactNode;
  dragState: TouchDragState;
  className?: string;
}

export const MotionStaffWrapper: React.FC<MotionStaffWrapperProps> = ({ 
  children, 
  dragState, 
  className = '' 
}) => {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        scale: dragState.isDragging ? 1.02 : 1,
        opacity: dragState.isDragging ? 0.95 : 1
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.2
      }}
    >
      {children}
      
      {/* Drag overlay with animations */}
      <AnimatePresence>
        {dragState.isDragging && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Drag indicator */}
            <motion.div
              className="absolute w-2 h-2 bg-blue-500 rounded-full"
              style={{
                left: dragState.currentPosition?.x || 0,
                top: dragState.currentPosition?.y || 0,
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            
            {/* Drop zone indicator */}
            {dragState.targetPosition && (
              <motion.div
                className={`absolute w-8 h-8 rounded-full border-2 ${
                  dragState.isValidDrop 
                    ? 'border-green-500 bg-green-100' 
                    : 'border-red-500 bg-red-100'
                }`}
                style={{
                  left: dragState.targetPosition.x - 16,
                  top: dragState.targetPosition.y - 16,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
