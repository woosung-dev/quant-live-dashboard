export const Footer = () => {
    return (
        <footer className="py-12 px-4 border-t border-white/5 bg-black">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-2xl font-bold tracking-tighter">
                    QUANT<span className="text-primary">LIVE</span>
                </div>

                <div className="flex gap-8 text-gray-400 text-sm">
                    <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                    <a href="#" className="hover:text-primary transition-colors">Documentation</a>
                </div>

                <div className="text-gray-600 text-sm">
                    © 2024 QuantLive. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
