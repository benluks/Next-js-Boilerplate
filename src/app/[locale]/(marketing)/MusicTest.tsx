'use client';

import type { GameSettings } from '@/libs/SettingsManager';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useState } from 'react';
import { settingsManager } from '@/libs/SettingsManager';
import { SettingsPanel } from '@/MusicTest/components/settingsPanel';
import MusicTestController from '@/MusicTest/Controller';
// import { StatisticsDisplay } from './StatisticsDisplay';

type TabType = 'game' | 'settings' | 'statistics';

export function MusicTestPage() {
  const t = useTranslations('MusicTest');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900">
                {t('page_title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('page_description')}
              </p>
            </div>

            {/* Quick access info */}
            <div className="text-center text-xs text-gray-500 sm:text-right">
              <div>Keyboard shortcuts:</div>
              <div>Alt+1: Game • Alt+2: Settings • Alt+3: Statistics</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-200 bg-white" aria-label="Music test navigation">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'game' as TabType, label: t('tab_game'), icon: '🎵' },
              { id: 'settings' as TabType, label: t('tab_settings'), icon: '⚙️' },
              { id: 'statistics' as TabType, label: t('tab_statistics'), icon: '📊' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-base" role="img" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
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

      {/* Footer with accessibility info */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              {t('accessibility_info')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span>• Screen reader compatible</span>
              <span>• Keyboard navigation supported</span>
              <span>• High contrast mode friendly</span>
              <span>• Touch-friendly on mobile</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
