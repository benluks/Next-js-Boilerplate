import { useTranslations } from 'next-intl';

export const Footer: React.FC = () => {
  const t = useTranslations('MusicTest');
  return (
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
  );
};
