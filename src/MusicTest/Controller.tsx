'use client';

import type { NoteHandlers } from './types/game';
import type { Note } from '@/libs/Note';
import type { GameControllerProps, GameSettings, GameState } from '@/MusicTest/types/MusicTypes';
import type { ValidationResult } from '@/utils/AnswerValidation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONFIG_HELPERS,
  DEFAULT_SESSION_SETTINGS,
  ERROR_MESSAGES,
} from '@/config/gameConfig';
import { audioEngine } from '@/libs/AudioEngine';
import { settingsManager } from '@/libs/SettingsManager';
import { statisticsTracker } from '@/libs/StatisticsTracker';
import { EMPTY_OBJECT } from '@/MusicTest/types/MusicTypes';
import { validateAnswer } from '@/utils/AnswerValidation';
import { GameError } from './components/error';
import { GamePhase } from './components/gamePhase';

const MusicTestController: React.FC<GameControllerProps> = ({
  initialSettings = EMPTY_OBJECT,
}) => {
  // Load settings from SettingsManager
  const [settings, setSettings] = useState(() => {
    const savedSettings = settingsManager.loadSettings();
    return {
      ...savedSettings,
      ...DEFAULT_SESSION_SETTINGS, // Game-specific settings not in SettingsManager
      ...initialSettings, // Allow override from props
    };
  });

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    currentNotes: [],
    selectedNotes: [],
    gamePhase: 'setup',
    score: 0,
    totalAttempts: 0,
    difficulty: settings.maxNotes, // Use maxNotes as the base difficulty
    limitNotes: settings.limitNotes,
  });

  // Audio and UI state
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Handle settings changes and sync with SettingsManager
  const handleSettingsChange = useCallback((newSettings: Partial<GameSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Save to SettingsManager (excluding game-specific settings)
    const { ...settingsToSave } = updatedSettings;
    settingsManager.saveSettings(settingsToSave);
  }, [settings]);

  // Listen for external settings changes (e.g., from SettingsPanel)
  useEffect(() => {
    const handleStorageChange = () => {
      const newSettings = settingsManager.loadSettings();
      setSettings(prev => ({
        ...prev,
        ...newSettings,
      }));
    };

    // Listen for storage events (when settings change in another tab/component)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Initialize audio engine and check support
  useEffect(() => {
    const handler = (supported: boolean) => setIsAudioSupported(supported);
    const checkAudioSupport = () => {
      const supported = audioEngine.isSupported();
      handler(supported);
      if (supported) {
        audioEngine.setVolume(settings.volume);
      }
    };

    checkAudioSupport();
  }, [settings.volume]);

  // Start a new round
  const startNewRound = useCallback(async () => {
    try {
      setAudioError(null);
      // Generate random number of notes within the min/max range
      const noteCount = Math.floor(Math.random() * (settings.maxNotes - settings.minNotes + 1)) + settings.minNotes;
      const standardNotes = audioEngine.generateNoteSet(
        noteCount,
      );

      setGameState(prev => ({
        ...prev,
        currentNotes: standardNotes,
        selectedNotes: [],
        gamePhase: 'listening',
      }));

      // Play the notes using standard format
      setIsPlaying(true);
      await audioEngine.playNotes(standardNotes.map(n => n.note));

      // Transition to answering phase after notes finish playing
      setIsPlaying(false);
      setGameState(prev => ({
        ...prev,
        gamePhase: 'answering',
      }));
    } catch (error) {
      console.error('Failed to start new round:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to play audio');
      setIsPlaying(false);

      // Reset to setup phase on error
      setGameState(prev => ({
        ...prev,
        gamePhase: 'setup',
      }));
    }
  }, [settings.maxNotes, settings.minNotes]);

  // Replay current notes
  const replayNotes = useCallback(async () => {
    if (gameState.currentNotes.length === 0) {
      return;
    }

    try {
      setAudioError(null);
      setIsPlaying(true);

      await audioEngine.playNotes(gameState.currentNotes.map(n => n.note));

      setTimeout(() => {
        setIsPlaying(false);
      }, CONFIG_HELPERS.getTotalPlayTime());
    } catch (error) {
      console.error('Failed to replay notes:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to replay audio');
      setIsPlaying(false);
    }
  }, [gameState.currentNotes]);

  const handleAudioPlayback = useCallback(async (newNote?: Note) => {
    if (!settings.enableAudio || !audioEngine.isSupported()) {
      return;
    }

    try {
      if (settings.audioMode === 'poly') {
        await audioEngine.playNotes([...gameState.selectedNotes]);
      } else if (settings.audioMode === 'mono') {
        newNote && await audioEngine.playNotes([newNote]);
      }
    } catch (error) {
      console.warn('Failed to play audio:', error);
    }
  }, [settings.enableAudio, settings.audioMode, gameState.selectedNotes]);

  const noteHandlers = useMemo<NoteHandlers>(() => ({
    select: (note: Note) => {
      setGameState(prev => ({
        ...prev,
        selectedNotes: [...prev.selectedNotes, note],
      }));

      handleAudioPlayback(note);
    },

    deselect: (note: Note) => {
      setGameState((prev: GameState) => {
        if (prev.gamePhase !== 'answering') {
          return prev;
        }
        return {
          ...prev,
          selectedNotes: prev.selectedNotes.filter(n => n.id !== note.id),
        };
      });
      handleAudioPlayback();
    },
  }), [handleAudioPlayback]);

  // Submit answer and show feedback
  const submitAnswer = useCallback(() => {
    if (gameState.gamePhase !== 'answering' || gameState.selectedNotes.length === 0) {
      return;
    }

    const result = validateAnswer(gameState.currentNotes, gameState.selectedNotes);
    setValidationResult(result);

    statisticsTracker.recordSession(
      gameState.difficulty,
      result.isCorrect,
      gameState.currentNotes,
      gameState.selectedNotes,
    );

    // Update game state with results
    setGameState(prev => ({
      ...prev,
      gamePhase: 'feedback',
      score: result.isCorrect ? prev.score + 1 : prev.score,
      totalAttempts: prev.totalAttempts + 1,
    }));
  }, [gameState.gamePhase, gameState.selectedNotes, gameState.currentNotes, gameState.difficulty]);

  // Reset game to setup phase
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentNotes: [],
      selectedNotes: [],
      gamePhase: 'setup',
    }));
    setAudioError(null);
    setIsPlaying(false);
    setValidationResult(null);
  }, []);

  // Render audio error message
  if (!isAudioSupported) {
    return (
      <div className="flex flex-col items-center p-8">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-800">
            Audio Not Supported
          </h2>
          <p className="text-red-600">
            {ERROR_MESSAGES.AUDIO_NOT_SUPPORTED}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* <Dashboard {...{ gameState, settings, handleSettingsChange }} /> */}
      {audioError && <GameError {...{ errorType: 'audio', dismiss: () => setAudioError(null), message: audioError }} />}
      <GamePhase
        settings={settings}
        isPlaying={isPlaying}
        gamePhase={gameState.gamePhase}
        replayNotes={replayNotes}
        submitAnswer={submitAnswer}
        resetGame={resetGame}
        startNewRound={startNewRound}
        validationResult={validationResult}
        selectedNotes={gameState.selectedNotes}
        currentNotes={gameState.currentNotes.map(note => note.note)}
        limitNotes={gameState.limitNotes}
        noteHandlers={noteHandlers}
      />
    </div>
  );
};

export default MusicTestController;
