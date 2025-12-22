import { useEffect, useRef, useState } from 'react';

interface TradeData {
    e: string; // Event type
    E: number; // Event time
    s: string; // Symbol
    t: number; // Trade ID
    p: string; // Price
    q: string; // Quantity
    b: number; // Buyer order ID
    a: number; // Seller order ID
    T: number; // Trade time
    m: boolean; // Is the buyer the market maker?
    M: boolean; // Ignore
}

interface CombinedStreamData {
    stream: string;
    data: TradeData;
}

export const useWebSocket = (symbols: string | string[] = 'btcusdt') => {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const ws = useRef<WebSocket | null>(null);

    // Normalize symbols to array
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    const isSingle = !Array.isArray(symbols);

    useEffect(() => {
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let isUnmounting = false;

        const connect = () => {
            if (isUnmounting) return;

            // Construct Combined Stream URL
            // Format: wss://stream.binance.com:9443/stream?streams=<streamName1>/<streamName2>/...
            // Stream name: <symbol>@trade
            const streams = symbolList.map(s => `${s.toLowerCase()}@trade`).join('/');
            const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

            const socket = new WebSocket(url);

            socket.onopen = () => {
                setIsConnected(true);
                console.log('WebSocket Connected');
            };

            socket.onmessage = (event) => {
                try {
                    const message: CombinedStreamData = JSON.parse(event.data);
                    const tradeData = message.data;

                    if (tradeData && tradeData.s && tradeData.p) {
                        setPrices(prev => ({
                            ...prev,
                            [tradeData.s.toLowerCase()]: parseFloat(tradeData.p)
                        }));
                    }
                } catch (e) {
                    console.warn('Error parsing WS message', e);
                }
            };

            socket.onclose = (event) => {
                setIsConnected(false);
                // Only log and reconnect if not intentionally closing
                if (!isUnmounting) {
                    // Don't spam console on navigation/refresh
                    if (event.code !== 1000 && event.code !== 1001) {
                        console.log('WebSocket Disconnected, reconnecting...');
                    }
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };

            socket.onerror = () => {
                // Errors are already handled by onclose, just silence the error event
                // This prevents console spam during page navigation/refresh
            };

            ws.current = socket;
        };

        connect();

        return () => {
            isUnmounting = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (ws.current) {
                ws.current.close(1000, 'Component unmounting');
            }
        };
    }, [JSON.stringify(symbolList)]); // Re-connect if symbol list changes

    // Backward compatibility: return 'price' of the first symbol
    const primarySymbol = symbolList[0].toLowerCase();
    const price = prices[primarySymbol] || 0;

    return { price, prices, isConnected };
};
