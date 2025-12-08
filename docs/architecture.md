# Project Architecture

## Overview
This project uses a **Feature-Based Architecture** within a Next.js application. This approach isolates feature-specific logic, components, and types creating a modular and scalable codebase.

## Directory Structure

### `app/` (Next.js App Router)
- Responsibilities: Routing, Pages, Layouts, Global Providers.
- **Rule**: Keep logic minimal. Import features from `src/features`.
- Example: `app/[locale]/dashboard/strategy-lab/page.tsx` acts as a composition layer for the Backtest feature.

### `features/` (Feature Modules)
Each major feature has its own directory containing all necessary code.

#### `features/backtest/`
Example of a self-contained feature module:
- **`components/`**: UI components specific to this feature (e.g., `BacktestChart`, `ParameterForm`).
- **`lib/`**: Core domain logic (e.g., `engine.ts` for backtesting engine, `indicators.ts`).
- **`strategies/`**: Pluggable strategies logic (e.g., `rsi-divergence.ts`, `macd.ts`).
- **`types.ts`**: Feature-specific TypeScript definitions.

### `lib/` (Shared Utilities)
- Responsibilities: Generic utilities used across multiple features (e.g., database clients, formatting helpers).

### `components/` (Shared UI)
- Responsibilities: Reusable UI primitives (e.g., buttons, inputs, cards) that are feature-agnostic.

## Import Patterns
- **Internal Feature Imports**: Use relative paths (e.g., `../lib/engine`).
- **External Imports**: Use alias `@/features/[feature-name]/...`.

## Benefits
1.  **Scalability**: New features don't clutter a global `components` or `lib` folder.
2.  **Maintainability**: Related code is co-located. Deleting a feature is as simple as deleting the folder.
3.  **Encapsulation**: Clear boundaries between domain domains.
