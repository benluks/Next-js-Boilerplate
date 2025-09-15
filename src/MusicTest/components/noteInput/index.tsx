'use client';

import type { RenderContext } from 'vexflow';
import type { StaffPosition } from '../../types/StaffInteraction';
import type { Staves } from '@/MusicTest/types/MusicTypes';
import type { ValidationResult as AnswerValidationResult } from '@/utils/AnswerValidation';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Renderer, Stave, StaveConnector } from 'vexflow';
import { Note } from '@/libs/Note';
import {
  useKeyboardNavigation,
  useNoteManagement,
  useNoteSelection,
  useStaffInteraction,
} from '@/MusicTest/hooks';
import { useMobileNoteDrag } from '@/MusicTest/hooks/useMobileNoteDrag';
import { getStaffAriaDescription, getStaffAriaLabel } from '@/MusicTest/utils/accessibility';

import { clearAndRedrawStaff, renderNotesOnStaff, renderPreviewNote } from '@/MusicTest/utils/noteRendering';
import { StaffCoordinates } from '@/MusicTest/utils/staffCoordinates';
import {
  AccessibilityAnnouncements,
  NoteContextMenu,
  ValidationDisplay,
  ValidationStats,
} from './sections';

const EMPTY_ARRAY: Note[] = [];
/**
 * Props for the ClickableNoteInput component
 */
export type ClickableNoteInputProps = {

  selectedNotes: Note[];
  onNoteSelect: (note: Note) => void;
  onNoteDeselect: (note: Note) => void;
  maxNotes: number;
  limitNotes: boolean;
  showCorrectAnswer?: boolean;
  correctNotes?: Note[];
  validationResult?: AnswerValidationResult;
  width: number;
  height: number;
  disabled?: boolean;
  className?: string;
  enableAudio?: boolean;
  audioMode?: 'mono' | 'poly';
  respectGamePhase?: boolean; // New prop to control phase restrictions
};

const ClickableNoteInput: React.FC<ClickableNoteInputProps> = ({
  selectedNotes,
  onNoteSelect,
  onNoteDeselect,
  maxNotes,
  limitNotes,
  showCorrectAnswer = false,
  correctNotes = EMPTY_ARRAY,
  validationResult,
  width,
  height,
  disabled = false,
  className = '',
  enableAudio = true,
  audioMode = 'mono',
  respectGamePhase: _respectGamePhase = true, // Default to respecting game phase
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const stavesRef = useRef<{
    treble?:
    Stave;
    bass?: Stave;
    brace?: StaveConnector;
    leftConnector?: StaveConnector;
    rightConnector?: StaveConnector;
  }>({});

  const staffCoordinatesRef = useRef<StaffCoordinates | null>(null);

  // Use note management hook
  const {
    toggleNote,
    canAddNote,
    removeNotes,
  } = useNoteManagement(selectedNotes, onNoteSelect, onNoteDeselect, maxNotes, limitNotes);

  // Use note selection hook
  const {
    contextMenuNote,
    contextMenuPosition,
    handleContextMenu,
    closeContextMenu,
    handleContextMenuAction,
    isNoteSelected: isInternallySelected,
  } = useNoteSelection(selectedNotes, onNoteDeselect, removeNotes);

  // Use mobile note drag hook
  const {
    dragState,
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
  } = useMobileNoteDrag({
    onNoteMove: (oldNote, newNote) => {
      onNoteDeselect(oldNote);
      onNoteSelect(newNote);
    },
    onDragStart: (note) => {
      console.log('Drag started for note:', note.toString());

      console.log('Note removed from selectedNotes, now rendering as preview');
    },
    onDragEnd: (note, finalPosition) => {
      if (finalPosition) {
        // Create new note at final position with updated pitch
        const newNote = new Note({
          ...note,
          linePosition: finalPosition.linePosition,
          // The pitch will be automatically calculated from linePosition
        });
        onNoteSelect(newNote);
        console.log('Note moved to:', finalPosition.linePosition, 'pitch:', newNote.toString());
      } else {
        // Snap back to original position
        onNoteSelect(note);
        console.log('Note snapped back to original position');
      }
    },
  }, selectedNotes, staffCoordinatesRef.current);

  // Handle note click from staff interaction
  const handleNoteClick = useCallback(async (position: StaffPosition & { contextMenu?: { x: number; y: number } }) => {
    if (disabled) {
      return;
    }

    // Check if this is a context menu request
    const { linePosition, pitch, contextMenu } = position;
    const existingNote = selectedNotes.find((note) => {
      return note.linePosition === linePosition;
    });
    const focusNote = existingNote || new Note({ ...pitch, linePosition });
    if (contextMenu) {
      handleContextMenu({
        clientX: contextMenu.x,
        clientY: contextMenu.y,
        preventDefault: () => { },
        stopPropagation: () => { },
      } as React.MouseEvent, focusNote);

      return;
    }
    toggleNote(focusNote);

    // Play audio for addition if enabled
  }, [disabled, selectedNotes, toggleNote, handleContextMenu]);

  // Handle accidental changes
  const handleAccidentalChange = useCallback((oldNote: Note, newNote: Note) => {
    if (disabled || oldNote === newNote) {
      return;
    }
    onNoteDeselect(oldNote);
    onNoteSelect(newNote);
  }, [disabled, onNoteDeselect, onNoteSelect]);

  // Use staff interaction hook
  const {
    handleMouseMove: staffHandleMouseMove,
    handleMouseClick: staffHandleMouseClick,
    handleMouseLeave: staffHandleMouseLeave,
    handleContextMenu: staffHandleContextMenu,
    handleTouchStart: staffHandleTouchStart,
    handleTouchMove: staffHandleTouchMove,
    handleTouchEnd: staffHandleTouchEnd,
    hoveredPosition,
    previewAnimation,
    isLongPressActive,
    isDragging: isStaffDragging,
    getCursorStyle,
    isOverInteractiveArea,
  } = useStaffInteraction(
    containerRef,
    staffCoordinatesRef,
    handleNoteClick,
    disabled,
    (_, position) => {
      // Handle long press - start drag
      const existingNote = selectedNotes.find(n => n.linePosition === position.linePosition);
      if (existingNote) {
        console.log('Found existing note:', existingNote.toString());
        console.log('Selected notes before deselect:', selectedNotes.length);
        // Remove note from selectedNotes so it can be rendered as preview
        onNoteDeselect(existingNote);
        console.log('Note deselected, starting drag...');
        // Start drag
        startDrag(existingNote, position);
      } else {
        console.log('No existing note found at position:', position.linePosition);
      }
    },
    (x, y, position, isValid) => {
      // Handle drag move
      updateDragPosition(x, y, position, isValid);
    },
    () => {
      // Handle drag end
      endDrag();
    },
  );

  const {
    focusedPosition,
    keyboardMode,
    disableKeyboardMode,
    handleMouseLeave: keyboardHandleMouseLeave,
  } = useKeyboardNavigation(
    containerRef,
    staffCoordinatesRef.current,
    handleNoteClick,
    () => {
      // Delete selected notes
      const selectedNotesToDelete = selectedNotes.filter(note => note);
      if (selectedNotesToDelete.length > 0) {
        selectedNotesToDelete.forEach(note => onNoteDeselect(note));
      }
    },
  );

  // Enhanced mouse handlers that also manage keyboard mode
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    staffHandleMouseMove(event);
    if (keyboardMode) {
      disableKeyboardMode();
    }
  }, [staffHandleMouseMove, keyboardMode, disableKeyboardMode]);

  const handleMouseClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    staffHandleMouseClick(event);
    if (keyboardMode) {
      disableKeyboardMode();
    }
  }, [staffHandleMouseClick, keyboardMode, disableKeyboardMode]);

  const handleMouseLeave = useCallback(() => {
    staffHandleMouseLeave();
    keyboardHandleMouseLeave();
  }, [staffHandleMouseLeave, keyboardHandleMouseLeave]);

  // Use keyboard navigation hook

  // Initialize VexFlow renderer and staff
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    try {
      const spacingBetweenLinesPx: number = 10;
      const SCALE = 1.4;

      containerRef.current.innerHTML = '';

      // Create VexFlow renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerRef.current.clientWidth, height);
      const context = renderer.getContext();

      context.scale(SCALE, SCALE);

      const { clientWidth, clientHeight } = containerRef.current;

      const stavesWidth = clientWidth / SCALE;
      const stavesX = 0;
      const stavesVerticalCenter = Math.floor(clientHeight / 4);

      const staveHeight = 4 * spacingBetweenLinesPx;

      const staveTreble = new Stave(
        stavesX,
        Math.floor(stavesVerticalCenter - (spacingBetweenLinesPx + staveHeight)),
        stavesWidth,
        { spacingBetweenLinesPx },
      );
      staveTreble.addClef('treble');
      staveTreble.setContext(context);
      staveTreble.draw();

      const staveBass = new Stave(
        stavesX,
        Math.floor(stavesVerticalCenter + spacingBetweenLinesPx),
        stavesWidth,
        { spacingBetweenLinesPx },
      );
      staveBass.addClef('bass');
      staveBass.setContext(context);
      staveBass.draw();

      const brace = new StaveConnector(staveTreble, staveBass);
      brace.setType('brace');
      brace.setContext(context);
      brace.draw();

      const leftConnector = new StaveConnector(staveTreble, staveBass);
      leftConnector.setType('singleLeft');
      leftConnector.setContext(context);
      leftConnector.draw();

      const rightConnector = new StaveConnector(staveTreble, staveBass);
      rightConnector.setType('boldDoubleRight');
      rightConnector.setContext(context);
      rightConnector.draw();

      // Store references
      rendererRef.current = renderer;

      stavesRef.current.treble = staveTreble; // a Vex.Flow.Stave
      stavesRef.current.bass = staveBass;
      stavesRef.current.brace = brace;
      stavesRef.current.leftConnector = leftConnector;
      stavesRef.current.rightConnector = rightConnector;

      staffCoordinatesRef.current = new StaffCoordinates({ treble: staveTreble, bass: staveBass, scale: SCALE });
    } catch (error) {
      console.error('Failed to initialize VexFlow:', error);
      // Fallback: show error message
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="p-4 text-red-500">Failed to load music notation</div>';
      }
    }
  }, [width, height]);

  // Generate accessibility announcements using utility functions
  const ariaLabel = getStaffAriaLabel(selectedNotes, maxNotes, keyboardMode);
  const ariaDescription = getStaffAriaDescription(
    selectedNotes,
    focusedPosition,
    hoveredPosition,
    keyboardMode,
    validationResult,
  );

  // Render selected notes on the staff
  useEffect(() => {
    try {
      const context = rendererRef.current?.getContext();

      if (!context) {
        console.error('Context is not initialized!');
        return;
      }
      if (!stavesRef.current) {
        console.error('stavesRef not initialized!');
        return;
      }

      clearAndRedrawStaff(stavesRef.current as Staves, context!);
      // Render selected notes
      if (selectedNotes.length > 0) {
        renderNotesOnStaff(
          stavesRef.current as Staves,
          context as RenderContext,
          selectedNotes,
          correctNotes,
          hoveredPosition?.pitch,
          showCorrectAnswer,
          validationResult,
        );
      }

      // Render preview note - prioritize hover over focus
      if (!keyboardMode && hoveredPosition && !selectedNotes.includes(hoveredPosition.pitch)) {
        renderPreviewNote(
          stavesRef.current as Staves,
          context,
          hoveredPosition.pitch,
          previewAnimation,
        );
      } else if (keyboardMode && focusedPosition && !selectedNotes.includes(focusedPosition.pitch)) {
        renderPreviewNote(
          stavesRef.current as Staves,
          context,
          focusedPosition.pitch,
          previewAnimation,
        );
      }

      // Render dragged note as preview note
      if (dragState.isDragging && dragState.draggedNote) {
        renderPreviewNote(
          stavesRef.current as Staves,
          context,
          dragState.draggedNote,
          'dragging' as any, // Use dragging animation state
        );
      }

      // Render ghost note at target position
      if (dragState.isDragging && dragState.targetPosition) {
        const animationState = dragState.isValidDrop ? 'ghost' : 'invalid';
        renderPreviewNote(
          stavesRef.current as Staves,
          context,
          dragState.targetPosition.pitch,
          animationState as any,
        );
      }
    } catch (error) {
      console.error('Failed to render notes:', error);
    }
  }, [
    selectedNotes,
    showCorrectAnswer,
    correctNotes,
    validationResult,
    hoveredPosition,
    previewAnimation,
    focusedPosition,
    keyboardMode,
    dragState,
  ]);

  return (
    <div className={`${className}`}>
      {/* Main staff container */}
      <div className="relative">
        <motion.div
          ref={containerRef}
          className={`
          h-full p-0 transition-all duration-200
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          ${isOverInteractiveArea() ? 'shadow-md' : ''}
          ${keyboardMode ? 'ring-2 ring-blue-500/50' : ''}
          ${disabled ? '' : hoveredPosition ? 'cursor-crosshair' : 'cursor-default'}
        `}
          animate={{
            scale: dragState.isDragging ? 1.02 : 1,
            opacity: dragState.isDragging ? 0.95 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.2,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleMouseClick}
          onTouchStart={staffHandleTouchStart}
          onTouchMove={staffHandleTouchMove}
          onTouchEnd={staffHandleTouchEnd}
          onKeyDown={(_) => { }}
          onContextMenu={staffHandleContextMenu}
          role="button"
          aria-label={ariaLabel}
          aria-describedby="staff-description"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          aria-keyshortcuts="Tab ArrowUp ArrowDown Enter Space Delete Escape"
          style={{
            cursor: getCursorStyle(),
          }}
        />

        {/* Context Menu - positioned relative to staff */}
        {contextMenuNote && contextMenuPosition && (
          <NoteContextMenu
            note={contextMenuNote}
            position={contextMenuPosition}
            isSelected={isInternallySelected(contextMenuNote)}
            onAction={handleContextMenuAction}
            onAccidentalChange={newNote => handleAccidentalChange(contextMenuNote, newNote)}
            onClose={closeContextMenu}
            showAccidentalOptions={true}
          />
        )}
      </div>

      {/* Hidden description for screen readers */}
      <div id="staff-description" className="sr-only">
        {ariaDescription}
      </div>

      {/* Accessibility Announcements */}
      <AccessibilityAnnouncements
        selectedNotes={selectedNotes}
        focusedPosition={focusedPosition}
        hoveredPosition={hoveredPosition}
        keyboardMode={keyboardMode}
        validationResult={validationResult}
        maxNotes={maxNotes}
      />

      {/* Validation Display */}
      <ValidationDisplay
        selectedNotes={selectedNotes}
        correctNotes={correctNotes}
        validationResult={validationResult}
        showCorrectAnswer={showCorrectAnswer}
      />

      {/* Validation Stats */}
      {
        (showCorrectAnswer || validationResult) && (
          <div className="mt-2 rounded border bg-gray-50 p-2">
            <ValidationStats
              validationResult={validationResult!}
            />
          </div>
        )
      }

      {/* Mobile Note Input */}

      {/* <MobileNoteInput
        selectedNotes={selectedNotes}
        onNoteSelect={onNoteSelect}
        onNoteDeselect={onNoteDeselect}
        disabled={disabled}
        className="mt-4 w-full px-2"
      /> */}

      {/* Audio Controls */}

      {/* Debug info */}
      <div className="mt-2 text-sm text-gray-600">
        Selected:
        {' '}
        {selectedNotes.length}
        {' '}
        /
        {' '}
        {maxNotes}
        {disabled && <span className="ml-2 text-red-500">(Disabled)</span>}
        {enableAudio && (
          <span className="ml-2 text-green-500">
            (Audio:
            {audioMode}
            )
          </span>
        )}
        {keyboardMode && <span className="ml-2 text-blue-500">(Keyboard Mode)</span>}
        {focusedPosition && keyboardMode && (
          <span className="ml-2 text-purple-500">
            {`Focus: ${focusedPosition.pitch.toString()} (line ${focusedPosition.linePosition})`}
          </span>
        )}
        {hoveredPosition && !keyboardMode && (
          <span className="ml-2 text-blue-500">
            {`Hover: ${hoveredPosition.pitch && hoveredPosition.pitch.toString()} (line ${hoveredPosition.linePosition})`}
          </span>
        )}
        {isLongPressActive && (
          <span className="ml-2 text-yellow-500">
            Long press active...
          </span>
        )}
        {dragState.isDragging && (
          <span className={`ml-2 ${dragState.isValidDrop ? 'text-green-500' : 'text-red-500'}`}>
            {`Dragging: ${dragState.draggedNote?.toString()} → ${dragState.targetPosition?.pitch.toString()} (${dragState.isValidDrop ? 'valid' : 'invalid'})`}
          </span>
        )}
      </div>
    </div>
  );
};

export default ClickableNoteInput;
