import { useTranslations } from 'next-intl';

type NavbarProps = {
  activeTab: any;
  setActiveTab: any;
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const t = useTranslations('MusicTest');
  return (
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
  );
};
