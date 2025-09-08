import type { Note } from '@/libs/Note';
import type { MusicCallback } from '@/MusicTest/types/game';
import type { ValidationResult } from '@/utils/AnswerValidation';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from '@/config/gameConfig';
import ClickableNoteInput from '@/MusicTest/components/noteInput';

type ValidationProps = {
  validationResult: ValidationResult;
  selectedNotes: Note[];
  currentNotes: Note[];
  isPlaying: boolean;
  startNewRound: MusicCallback;
  resetGame: MusicCallback;
  replayNotes: MusicCallback;
};

export const Validation: React.FC<ValidationProps> = ({ validationResult, selectedNotes, currentNotes, startNewRound }) => {
  return (
    <div>
      {/* Show comparison between user answer and correct answer */}
      <div className="mb-6">
        <h3 className="mb-6 text-center text-xl font-semibold">
          {validationResult.isCorrect ? '✅ Correct Answer!' : '📝 Compare Your Answer'}
        </h3>

        {/* Legend */}
        <div className="mb-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span>Your Answer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600"></div>
            <span>Correct Answer</span>
          </div>
        </div>

        <ClickableNoteInput
          selectedNotes={selectedNotes}
          onNoteSelect={() => { }}
          onNoteDeselect={() => { }}
          maxNotes={Math.max(selectedNotes.length, currentNotes.length)}
          limitNotes={false}
          showCorrectAnswer={true}
          correctNotes={currentNotes}
          validationResult={validationResult}
          disabled={true}
          audioMode="poly"
          width={GAME_CONFIG.STAFF_WIDTH * 1.5}
          height={GAME_CONFIG.STAFF_HEIGHT}
        />

        <div className="mt-2 flex justify-center gap-8 text-sm text-gray-600">
          <span>
            Your:
            {' '}
            {selectedNotes.length}
            {' '}
            note
            {selectedNotes.length !== 1 ? 's' : ''}
          </span>
          <span>
            Correct:
            {' '}
            {currentNotes.length}
            {' '}
            note
            {currentNotes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 w-full p-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="h-12 w-full rounded-2xl bg-black text-base font-medium text-white shadow-md"
          onClick={startNewRound}
        >
          Next Round
        </motion.button>
      </div>
    </div>
  );
};
