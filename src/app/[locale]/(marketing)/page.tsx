import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MusicTestPage } from './MusicTest';

type IMusicTestProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IMusicTestProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'MusicTest',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function MusicTest(props: IMusicTestProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <MusicTestPage />;
}
