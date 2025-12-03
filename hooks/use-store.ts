import { create } from 'zustand'

interface SimulationState {
    isRunning: boolean
    strategy: string
    balance: number
    pnl: number
    startSimulation: () => void
    stopSimulation: () => void
    setStrategy: (strategy: string) => void
    updatePnl: (pnl: number) => void
}

export const useStore = create<SimulationState>((set) => ({
    isRunning: false,
    strategy: '',
    balance: 10000, // Initial balance
    pnl: 0,
    startSimulation: () => set({ isRunning: true }),
    stopSimulation: () => set({ isRunning: false }),
    setStrategy: (strategy) => set({ strategy }),
    updatePnl: (pnl) => set((state) => ({ pnl, balance: state.balance + pnl })),
}))
