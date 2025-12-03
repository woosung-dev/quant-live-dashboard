import { calculateSimulation } from '../lib/simulation';

const prices = [
    100, 101, 102, 103, 104, 105, 106, 107, 108, 109, // 0-9
    110, 111, 112, 113, 114, 115, 116, 117, 118, 119, // 10-19
    120, 119, 118, 117, 116, 115, 114, 113, 112, 111, // 20-29 (Downtrend)
    110, 109, 108, 107, 106, 105, 104, 103, 102, 101  // 30-39
];

// Fast: 5, Slow: 10
const result = calculateSimulation(prices, 5, 10);

console.log('Simulation Result:', JSON.stringify(result, null, 2));

if (result.trades >= 0) {
    console.log('✅ Simulation ran successfully');
} else {
    console.error('❌ Simulation failed');
}
