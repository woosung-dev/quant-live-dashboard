import { createAdminClient } from '@/lib/supabase/admin';
import { ServerSecurity } from '@/lib/security/server';
import { ExchangeService } from '@/features/trade/lib/exchange';
import { runPineScript } from '@/features/backtest/lib/pine/runner';
import { TIMEFRAME_MAP, Timeframe } from '@/features/backtest/types';
import { fetchCandles, getClosePrices, getHighPrices, getLowPrices, getOpenPrices, getVolumes } from '@/features/backtest/lib/engine';
import { Strategy } from '@/types';

// Types representing DB rows
interface BotInstance {
    id: string;
    user_id: string;
    strategy_id: string;
    config: {
        symbol: string;
        timeframe: Timeframe;
        initialCapital: number;
    };
    status: 'ACTIVE' | 'PAUSED' | 'ERROR';
}

interface BotState {
    last_check_at: string;
    last_signal_at: string;
    position: 'LONG' | 'SHORT' | 'NONE';
    entry_price: number;
    pnl: number;
}

export class ServerBotRunner {
    private exchangeService: ExchangeService;

    constructor() {
        this.exchangeService = new ExchangeService();
    }

    /**
     * Executes a single tick for a specific bot
     */
    async executeTick(bot: BotInstance, state: BotState | null) {
        const supabase = createAdminClient();

        console.log(`[Bot ${bot.id}] Executing tick for ${bot.config.symbol}`);

        // 1. Fetch User Keys (Decrypted)
        const { data: keys } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', bot.user_id)
            .single();

        if (!keys) {
            console.error(`[Bot ${bot.id}] No API keys found`);
            return;
        }

        try {
            // Decrypt keys
            // Note: api_key_encrypted is "iv:tag:ciphertext" or similar handled by ServerSecurity
            // wait, we used "bundled" in iv column, and stored "iv:tag:ciphertext" in text column. 
            // ServerSecurity.decrypt expects "enc:tag" and separate IV as args in current implementation?
            // Let's check ServerSecurity implementation again.

            // Code I wrote:
            /*
            static decrypt(encryptedWithTag: string, ivHex: string): string {
                 const [encrypted, tag] = encryptedWithTag.split(':');
                 // ... uses ivHex
            }
            */
            // And in route.ts:
            /*
            const apiKeyFinal = `${keyPackage.iv}:${keyPackage.encrypted}`; // iv:enc:tag
            */

            // So apiKeyFinal stored in DB is "IV:ENC:TAG".
            // Implementation of `decrypt` expects (enc:tag, iv).
            // So we need to parse the stored string.

            const [keyIv, keyEnc, keyTag] = keys.api_key_encrypted.split(':');
            const [secretIv, secretEnc, secretTag] = keys.secret_encrypted.split(':');

            const realApiKey = ServerSecurity.decrypt(`${keyEnc}:${keyTag}`, keyIv);
            const realSecret = ServerSecurity.decrypt(`${secretEnc}:${secretTag}`, secretIv);

            // 2. Connect to Exchange
            const connected = await this.exchangeService.connect({
                id: keys.exchange as any,
                apiKey: realApiKey,
                secret: realSecret,
                testnet: false // TODO: Store testnet flag in keys table?
            });

            if (!connected) {
                console.error(`[Bot ${bot.id}] Failed to connect to exchange`);
                return;
            }

            // 3. Fetch Market Data
            const candles = await fetchCandles(
                bot.config.symbol,
                bot.config.timeframe,
                200 // Lookback
            );

            // 4. Run Strategy (Pine Script)
            // Need the strategy code from DB
            const { data: strategy } = await supabase
                .from('strategies')
                .select('code, type, id')
                .eq('id', bot.strategy_id)
                .single();

            if (!strategy) {
                console.error(`[Bot ${bot.id}] Strategy not found`);
                return;
            }

            // Execute Pine Script
            // Note: runPineScript logic
            // We need to determine execution logic similar to engine.ts
            let signals: any[] = [];

            if (strategy.code) { // Assuming Pine Script for now
                const result = runPineScript(strategy.code, candles);
                signals = result.signals;
            }

            // 5. Check for NEW Signals since last_signal_at
            const lastSignalTime = state?.last_signal_at ? new Date(state.last_signal_at).getTime() : 0;
            const newSignals = signals.filter(s => s.time * 1000 > lastSignalTime); // signal.time is seconds usually in our engine? 
            // engine.ts: signal.time is number. fetchCandles returns seconds. 
            // wait, fetchCandles in engine.ts returns seconds (transformKlineToCandle line 168).
            // Pine Script engine uses seconds for index.
            // DB stores timestamptz.

            if (newSignals.length > 0) {
                const latestSignal = newSignals[newSignals.length - 1]; // Take latest
                console.log(`[Bot ${bot.id}] New Signal: ${latestSignal.type} at ${latestSignal.time}`);

                // 6. Execute Trade
                // Simple logic: Always fixed amount for MVP? `bot.config.initialCapital`?
                // Or min amount.
                const amount = 0.001; // HARDCODED for Safety in MVP.

                await this.exchangeService.createMarketOrder(
                    bot.config.symbol,
                    latestSignal.type,
                    amount
                );

                // 7. Update State
                await supabase
                    .from('bot_state')
                    .upsert({
                        bot_id: bot.id,
                        last_check_at: new Date().toISOString(),
                        last_signal_at: new Date(latestSignal.time * 1000).toISOString(),
                        position: latestSignal.type === 'buy' ? 'LONG' : 'SHORT', // Simplified
                        // entry_price...
                    });
            } else {
                // Update Check Time only
                await supabase
                    .from('bot_state')
                    .upsert({
                        bot_id: bot.id,
                        ...state,
                        last_check_at: new Date().toISOString()
                    });
            }

        } catch (e) {
            console.error(`[Bot ${bot.id}] Execution Error:`, e);
        }
    }
}
