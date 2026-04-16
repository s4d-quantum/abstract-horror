# Testing

## Prerequisites
- Node.js LTS (24.x recommended)
- Dependencies installed at repo root, `server`, and `client`
- Playwright Chromium installed once via:
  - `npx playwright install chromium`
- A dedicated test database configured in `server/.env` via:
  - `TEST_DB_HOST`
  - `TEST_DB_PORT`
  - `TEST_DB_USER`
  - `TEST_DB_PASSWORD`
  - `TEST_DB_NAME`
  - expected test DB name for this setup: `plasma_test`

The backend test harness refuses to run if it detects a non-test DB name without explicit `TEST_DB_*` configuration.

## Commands
- Run backend + frontend Vitest suites:
  - `npm test`
- Run Vitest in watch mode:
  - `npm run test:watch`
- Run Playwright smoke tests:
  - `npm run test:e2e`

## Test Layout
- Backend API tests: `tests/backend/`
- Frontend component tests: `tests/frontend/`
- End-to-end smoke tests: `tests/e2e/`

## Notes
- Backend tests isolate state by truncating affected tables between tests.
- Playwright tests run against a local Vite dev server and mock API responses for deterministic smoke coverage.
