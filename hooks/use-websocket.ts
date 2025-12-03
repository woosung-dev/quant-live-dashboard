import { useEffect, useRef, useState } from 'react'

export const useWebSocket = (url: string) => {
    const [data, setData] = useState<any>(null)
    const ws = useRef<WebSocket | null>(null)

    useEffect(() => {
        if (!url) return

        ws.current = new WebSocket(url)

        ws.current.onopen = () => {
            console.log('WebSocket Connected')
        }

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)
                setData(message)
            } catch (error) {
                console.error('WebSocket Parse Error:', error)
            }
        }

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error)
        }

        return () => {
            ws.current?.close()
        }
    }, [url])

    return data
}
