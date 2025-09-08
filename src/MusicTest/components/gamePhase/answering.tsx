import type { Note } from '@/libs/Note';
import type { MusicCallback } from '@/MusicTest/types/game';
import type { GameSettings } from '@/MusicTest/types/MusicTypes';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { GAME_CONFIG } from '@/config/gameConfig';
import ClickableNoteInput from '@/MusicTest/components/noteInput';

type AnsweringProps = {
  settings: GameSettings;
  noteHandlers: any;
  isPlaying: boolean;
  replayNotes: MusicCallback;
  submitAnswer: MusicCallback;
  selectedNotes: Note[];
  currentNotes: Note[];
  limitNotes: boolean;

};

export const Answering: React.FC<AnsweringProps> = ({ selectedNotes, currentNotes, limitNotes, settings, noteHandlers, isPlaying, replayNotes, submitAnswer }) => {
  const t = useTranslations('MusicTest');
  return (
    <>
      <div className="px-4 text-center">
        <h1 className="text-3xl leading-tight font-semibold">{t('instructions')}</h1>
      </div>

      <div className="flex justify-center pt-4 pb-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="flex h-24 w-24 items-center justify-center rounded-full border border-black/15 shadow-sm"
          aria-label="Play chord"
          onClick={replayNotes}
          disabled={isPlaying}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7-11-7z" />
          </svg>
        </motion.button>
      </div>

      <div className="flex justify-center gap-4">

      </div>

      <ClickableNoteInput
        selectedNotes={selectedNotes}
        onNoteSelect={noteHandlers.select}
        onNoteDeselect={noteHandlers.deselect}
        maxNotes={currentNotes.length}
        limitNotes={limitNotes}
        enableAudio={true}
        audioMode={settings.audioMode}
        width={GAME_CONFIG.STAFF_WIDTH}
        height={GAME_CONFIG.STAFF_HEIGHT}
        respectGamePhase={false}
      />
      {/* Submit */}
      <div className="p-4 w-full inset-x-0 fixed bottom-0">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="h-12 w-full rounded-2xl bg-black text-base font-medium text-white shadow-md"
          onClick={submitAnswer}
        >
          Submit
        </motion.button>
      </div>
    </>
  );
};
