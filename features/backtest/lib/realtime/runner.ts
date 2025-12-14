
import { BacktestConfig, Signal, Strategy, Candle } from "@/types";
import { fetchCandles } from "../engine";
import { runPineScript } from "../pine/runner";
import { AlertConfig, sendAlert } from "./notification";

export interface RealtimeConfig extends BacktestConfig {
    intervalSeconds?: number;
}

export type RealtimeStatus = 'idle' | 'running' | 'error';

export interface RealtimeState {
    status: RealtimeStatus;
    lastCandleTime: number;
    lastSignalTime: number;
    logs: string[];
}

type VerificationCallback = (log: string) => void;

export class RealtimeRunner {
    private intervalId: NodeJS.Timeout | null = null;
    private config: RealtimeConfig | null = null;
    private strategy: Strategy | null = null;
    private params: Record<string, any> = {};
    private alertConfig: AlertConfig | null = null;

    private state: RealtimeState = {
        status: 'idle',
        lastCandleTime: 0,
        lastSignalTime: 0,
        logs: []
    };

    private onUpdate: ((state: RealtimeState) => void) | null = null;

    constructor(onUpdate?: (state: RealtimeState) => void) {
        this.onUpdate = onUpdate || null;
    }

    public start(
        config: RealtimeConfig,
        strategy: Strategy,
        params: Record<string, any>,
        alertConfig?: AlertConfig
    ) {
        if (this.intervalId) this.stop();

        this.config = config;
        this.strategy = strategy;
        this.params = params;
        this.alertConfig = alertConfig || null;

        this.state = {
            status: 'running',
            lastCandleTime: 0,
            lastSignalTime: 0,
            logs: [`Started strategy: ${strategy.name} on ${config.symbol}`]
        };
        this.notifyUpdate();

        // Initial run
        this.tick();

        // Polling interval (default 60s for 1m candle, but we might want faster checks)
        // For Real-time, we usually check slightly faster than timeframe, or just fixed 5s-10s.
        const intervalMs = (config.intervalSeconds || 10) * 1000;
        this.intervalId = setInterval(() => this.tick(), intervalMs);
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.state.status = 'idle';
        this.log("Stopped.");
        this.notifyUpdate();
    }

    private async tick() {
        if (!this.config || !this.strategy) return;

        try {
            // 1. Fetch latest data (limit 200 is enough for indicators usually)
            // We fetch up to 'now'.
            const candles = await fetchCandles(
                this.config.symbol,
                this.config.timeframe,
                200
            );

            if (candles.length === 0) return;

            const lastCandle = candles[candles.length - 1];

            // Check if we have new data
            // Note: 'time' is usually open time. 
            // If we are in 'confirmed' mode, we might wait for current candle to close (start of next).
            // But usually signals are generated on close.
            // Let's assume we run on the latest available data.

            this.state.lastCandleTime = lastCandle.time;

            // 2. Execute Strategy
            let signals: Signal[] = [];

            if (this.strategy.id === 'pine-script' || this.strategy.id === 'custom') {
                const code = this.params.code || "";
                if (code) {
                    const result = runPineScript(code, candles);
                    signals = result.signals;
                }
            } else {
                // Not supported yet for non-pine in this specific runner wrapper unless we adapt them
                // But generally strategy.execute(candles) works
                // Wait, strategy.execute returns { signals }.
                const result = this.strategy.execute(candles, this.params);
                signals = result.signals;
            }

            // 3. Process Signals
            if (signals.length > 0) {
                const lastSignal = signals[signals.length - 1];

                // Only alert if it's a NEW signal
                if (lastSignal.time > this.state.lastSignalTime) {
                    this.state.lastSignalTime = lastSignal.time;
                    this.log(`New Signal: ${lastSignal.type.toUpperCase()} @ ${lastSignal.price}`);


                    // Send Alert
                    if (this.alertConfig) {
                        await sendAlert(this.alertConfig, {
                            strategyName: this.strategy.name,
                            symbol: this.config.symbol,
                            timeframe: this.config.timeframe,
                            type: lastSignal.type,
                            price: lastSignal.price,
                            time: lastSignal.time
                        });
                        this.log(`Alert sent.`);
                    }

                }
            }

            this.notifyUpdate();

        } catch (error) {
            console.error("Realtime Tick Error:", error);
            this.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private log(msg: string) {
        const timestamp = new Date().toLocaleTimeString();
        this.state.logs = [`[${timestamp}] ${msg}`, ...this.state.logs].slice(0, 50); // Keep last 50
    }

    private notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate({ ...this.state });
        }
    }
}
