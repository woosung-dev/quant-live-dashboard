'use client';

import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

export const Footer = () => {
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
                            실시간 퀀트 트레이딩 플랫폼
                            <br />
                            전략 검증부터 자동 매매까지
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold mb-4">Product</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/#features" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/docs" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    Documentation
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/about" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-sm text-gray-400 hover:text-foreground transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h4 className="font-bold mb-4">Connect</h4>
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
                        © 2025 QUANT.LIVE. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
