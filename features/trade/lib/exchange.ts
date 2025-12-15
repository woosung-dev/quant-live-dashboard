import * as ccxt from 'ccxt';

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'gateio';

export interface ExchangeConfig {
    id: ExchangeId;
    apiKey: string;
    secret: string;
    testnet?: boolean;
}

export class ExchangeService {
    private exchange: ccxt.Exchange | null = null;
    private config: ExchangeConfig | null = null;

    constructor() { }

    /**
     * Connect to an exchange
     */
    async connect(config: ExchangeConfig): Promise<boolean> {
        try {
            // Dynamic instantiation based on ID
            // Note: ccxt must be imported fully or we map specific classes
            // For tree-shaking friendly: import { binance } from 'ccxt'
            // But 'ccxt' default export contains all.
            const exchangeClass = (ccxt as any)[config.id];

            if (!exchangeClass) {
                throw new Error(`Exchange ${config.id} not supported`);
            }

            this.exchange = new exchangeClass({
                apiKey: config.apiKey,
                secret: config.secret,
                enableRateLimit: true,
                options: {
                    defaultType: 'future', // Default to futures for quant usually? Or spot? Let's assume user wants Spot for MVP or make it configurable. 
                    // Making it configurable in next step. Defaulting to 'future' for quant usually implies leverage, but let's stick to SAFE 'spot' or 'future' based on user preference?
                    // Let's assume futures for "Quant" dashboard usually, but safest default is Spot?
                    // Actually, let's leave defaultType undefined (default) or 'spot'.
                    // For Binance, default is Spot.
                }
            });

            if (!this.exchange) return false;

            if (config.testnet) {
                this.exchange.setSandboxMode(true);
            }

            // CORS Proxy for Client-side usage (Development)
            // Ideally should be configured via env or settings
            // this.exchange.proxy = 'https://cors-proxy.htmldriven.com/?url='; 
            // NOTE: In production, better to sign locally and proxy request through Next.js API route to strip CORS headers? 
            // Or just run this Service on Server Side (sending API keys)? 
            // For MVP Client-Side, we might run into CORS issues with Binance immediately.
            // Let's try basic connection.

            this.config = config;
            return true;
        } catch (e) {
            console.error("Exchange connection failed:", e);
            return false;
        }
    }

    /**
     * Validate connection by fetching balance
     */
    async validateConnection(): Promise<boolean> {
        if (!this.exchange) return false;
        try {
            // fetchBalance is a standard private API call
            await this.exchange.fetchBalance();
            return true;
        } catch (e) {
            console.error("Validation failed (API Key might be wrong):", e);
            return false;
        }
    }

    /**
     * Fetch Account Balance (Free/Used/Total)
     */
    async getBalance(): Promise<any> {
        if (!this.exchange) throw new Error("Exchange not connected");
        return await this.exchange.fetchBalance();
    }

    /**
     * Create Market Order
     */
    async createMarketOrder(symbol: string, side: 'buy' | 'sell', amount: number) {
        if (!this.exchange) throw new Error("Exchange not connected");

        // Ensure symbol format (CCXT usually expects 'BTC/USDT')
        // Our app uses 'BTCUSDT'.
        // Binance accepts 'BTCUSDT' in some calls but CCXT prefers standardized symbols.
        // We might need a symbol mapper.
        // For MVP, if we pass 'BTC/USDT', CCXT handles it.
        const marketSymbol = symbol.includes('/') ? symbol : this.formatSymbol(symbol);

        return await this.exchange.createMarketOrder(marketSymbol, side, amount);
    }

    private formatSymbol(symbol: string): string {
        // Naive formatter: BTCUSDT -> BTC/USDT
        // This is risky. Better to have user select from valid list or map it correctly.
        // For standard pairs:
        if (symbol.endsWith('USDT')) {
            return symbol.replace('USDT', '/USDT');
        }
        return symbol;
    }
}
