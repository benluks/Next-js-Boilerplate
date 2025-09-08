import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { routing } from '@/libs/I18nRouting';
import '@/styles/global.css';

export const metadata: Metadata = {
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png',
    },
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <PostHogProvider>
            <div
              className="flex flex-col bg-white text-black"
            >
              {/* Top Bar */}
              <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-white p-4">
                <button
                  type="button"
                  aria-label="Back"
                  className="rounded-xl p-2 transition hover:bg-black/5 active:scale-95"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Volume"
                    className="rounded-xl p-2 transition hover:bg-black/5"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5l-5 4H3v6h3l5 4V5z" />
                      <path d="M19 12a7 7 0 0 0-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Options"
                    className="rounded-xl p-2 transition hover:bg-black/5"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                </div>
              </header>
              {/* Content with top margin to account for fixed header */}
              <div className="pt-16">
                {props.children}
              </div>
            </div>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
