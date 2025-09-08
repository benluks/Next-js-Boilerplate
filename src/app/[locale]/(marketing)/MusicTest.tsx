'use client';

import type { GameSettings } from '@/libs/SettingsManager';
import React, { useCallback, useEffect, useState } from 'react';
import { settingsManager } from '@/libs/SettingsManager';
import { SettingsPanel } from '@/MusicTest/components/settingsPanel';
import MusicTestController from '@/MusicTest/Controller';
// import { StatisticsDisplay } from './StatisticsDisplay';

type TabType = 'game' | 'settings' | 'statistics';

export function MusicTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const [gameSettings, setGameSettings] = useState<GameSettings>(settingsManager.getDefaults());

  // Handle settings changes
  const handleSettingsChange = useCallback((newSettings: GameSettings) => {
    setGameSettings(newSettings);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab navigation with Alt + number keys
      if (event.altKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('game');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('settings');
            break;
          case '3':
            event.preventDefault();
            setActiveTab('statistics');
            break;
        }
      }

      // Tab navigation with arrow keys when focused on tab bar
      if (event.target instanceof HTMLElement && event.target.closest('[role="tablist"]')) {
        const tabs: TabType[] = ['game', 'settings', 'statistics'];
        const currentIndex = tabs.indexOf(activeTab);

        switch (event.key) {
          case 'ArrowLeft': {
            event.preventDefault();
            setActiveTab((prev) => {
              if (!tabs.length) {
                return prev;
              }
              const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              const candidate = tabs[nextIndex];
              return candidate ?? prev;
            });
            break;
          }
          case 'ArrowRight': {
            event.preventDefault();
            setActiveTab((prev) => {
              if (!tabs.length) {
                return prev;
              }
              const nextIndex = (currentIndex + 1) % tabs.length;
              const candidate = tabs[nextIndex];
              return candidate ?? prev;
            });
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'game':
        return (
          <div className="min-h-[600px]">
            <MusicTestController initialSettings={gameSettings} />
          </div>
        );
      case 'settings':
        return (
          <div className="mx-auto max-w-2xl">
            <SettingsPanel
              onSettingsChange={handleSettingsChange}
              className="rounded-lg border bg-white p-6 shadow-sm"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
          className="focus:outline-none"
          tabIndex={0}
        >
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
