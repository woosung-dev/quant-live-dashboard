export default function PricingPage() {
    return (
        <div className="container mx-auto py-20 px-4">
            <h1 className="text-4xl font-bold text-center mb-10">Pricing Plans</h1>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Free Plan */}
                <div className="border rounded-xl p-8 flex flex-col">
                    <h2 className="text-2xl font-bold mb-4">Free</h2>
                    <p className="text-4xl font-bold mb-6">$0<span className="text-base font-normal text-gray-500">/mo</span></p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li>✓ 1 Active Bot</li>
                        <li>✓ Basic Backtesting</li>
                        <li>✓ Daily Data Updates</li>
                    </ul>
                    <button className="w-full py-3 rounded-lg border border-primary text-primary font-bold hover:bg-primary/10 transition">
                        Get Started
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="border-2 border-primary rounded-xl p-8 flex flex-col relative bg-primary/5">
                    <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                    <h2 className="text-2xl font-bold mb-4">Pro</h2>
                    <p className="text-4xl font-bold mb-6">$29<span className="text-base font-normal text-gray-500">/mo</span></p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li>✓ 10 Active Bots</li>
                        <li>✓ High-speed Backtesting</li>
                        <li>✓ Real-time Data</li>
                        <li>✓ Priority Support</li>
                    </ul>
                    <button className="w-full py-3 rounded-lg bg-primary text-black font-bold hover:bg-opacity-90 transition">
                        Subscribe
                    </button>
                </div>

                {/* Enterprise Plan */}
                <div className="border rounded-xl p-8 flex flex-col">
                    <h2 className="text-2xl font-bold mb-4">Enterprise</h2>
                    <p className="text-4xl font-bold mb-6">Custom</p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li>✓ Unlimited Bots</li>
                        <li>✓ Dedicated Server</li>
                        <li>✓ Custom Integration</li>
                    </ul>
                    <button className="w-full py-3 rounded-lg border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        Contact Us
                    </button>
                </div>
            </div>
        </div>
    );
}
