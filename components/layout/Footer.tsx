'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Github, Twitter, Mail } from 'lucide-react';

export const Footer = () => {
    const t = useTranslations('Footer');
    return (
        <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold tracking-tighter">
                            QUANT<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">.LIVE</span>
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            <span dangerouslySetInnerHTML={{ __html: t.raw('tagline').replace('\n', '<br />') }} />
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold mb-4">{t('sections.product')}</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/#features" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    {t('links.features')}
                                </Link>
                            </li>
                        </ul>
                    </div>



                    {/* Social */}
                    <div>
                        <h4 className="font-bold mb-4">{t('sections.connect')}</h4>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-foreground transition-colors"
                            >
                                <Github size={20} />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-foreground transition-colors"
                            >
                                <Twitter size={20} />
                            </a>
                            <a
                                href="mailto:support@quantlive.com"
                                className="text-gray-400 hover:text-foreground transition-colors"
                            >
                                <Mail size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        {t('copyright')}
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                            {t('links.privacy')}
                        </Link>
                        <Link href="/terms" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                            {t('links.terms')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
