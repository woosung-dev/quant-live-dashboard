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
        const connect = () => {
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
                    console.error('Error parsing WS message', e);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                console.log('WebSocket Disconnected');
                // Simple reconnection logic
                setTimeout(connect, 3000);
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
            };

            ws.current = socket;
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [JSON.stringify(symbolList)]); // Re-connect if symbol list changes

    // Backward compatibility: return 'price' of the first symbol
    const primarySymbol = symbolList[0].toLowerCase();
    const price = prices[primarySymbol] || 0;

    return { price, prices, isConnected };
};
