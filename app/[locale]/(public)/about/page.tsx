import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('HomePage');

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-6">{t('about')}</h1>
            <div className="prose dark:prose-invert max-w-none">
                <p className="text-xl text-gray-600 dark:text-gray-300">
                    This needs to be filled with actual content about the Quant Live Dashboard.
                </p>
            </div>
        </div>
    );
}
