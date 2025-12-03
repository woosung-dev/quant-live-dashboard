import { useEffect, useRef, useState } from 'react';
import { TradeData } from '@/types';

export const useWebSocket = (symbol: string = 'btcusdt') => {
    const [price, setPrice] = useState<number>(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

            socket.onopen = () => {
                setIsConnected(true);
                console.log('WebSocket Connected');
            };

            socket.onmessage = (event) => {
                const data: TradeData = JSON.parse(event.data);
                setPrice(parseFloat(data.p));
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
    }, [symbol]);

    return { price, isConnected };
};
