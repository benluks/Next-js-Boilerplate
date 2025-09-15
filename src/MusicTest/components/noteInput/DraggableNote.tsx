import { motion } from 'framer-motion';
import type { Note } from '@/libs/Note';
import type { StaffPosition } from '@/MusicTest/types/StaffInteraction';

interface DraggableNoteProps {
  note: Note;
  position: StaffPosition;
  isDragging: boolean;
  onDragStart: (note: Note, position: StaffPosition) => void;
  onDragEnd: (note: Note, newPosition: StaffPosition) => void;
  children: React.ReactNode;
}

export const DraggableNote: React.FC<DraggableNoteProps> = ({
  note,
  position,
  isDragging,
  onDragStart,
  onDragEnd,
  children,
}) => {
  const handleDragStart = () => {
    onDragStart(note, position);
  };

  const handleDragEnd = (_event: any, info: any) => {
    // For now, just end the drag - we'll add position calculation in the next step
    onDragEnd(note, position);
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        opacity: isDragging ? 0.7 : 1,
        scale: isDragging ? 1.1 : 1,
        zIndex: isDragging ? 1000 : 1,
      }}
      whileDrag={{
        scale: 1.1,
        opacity: 0.7,
      }}
    >
      {children}
    </motion.div>
  );
};
