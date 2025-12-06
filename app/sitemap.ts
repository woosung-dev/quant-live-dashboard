import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Add all static routes here
    const routes = ['', '/login', '/signup', '/about'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // If you want to include localized versions (e.g. /en, /ko) explicitly,
    // you might want to expand this list. 
    // For now, we list the base paths which might be redirected or handled by middleware.
    // Ideally, you should generate a sitemap for each locale or one large one.
    // Given the structure app/[locale], Next.js sitemap generation needs to care about locales.
    // Let's assume for now we list the locale-prefixed URLs if we knew the locales.
    // Since we have 'en' and 'ko' as locales:

    const locales = ['en', 'ko'];
    const sitemapRoutes: MetadataRoute.Sitemap = [];

    locales.forEach(locale => {
        routes.forEach(route => {
            // Handle root specially if needed, but usually it's /en, /ko
            // If route is empty string '', it becomes /en, /ko
            const path = route.url === baseUrl ? `/${locale}` : `/${locale}${route.url.replace(baseUrl, '')}`;

            sitemapRoutes.push({
                url: `${baseUrl}${path}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: route.priority
            })
        })
    });

    return sitemapRoutes;
}
