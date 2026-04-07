# Device Identification Management Platform

A full-stack device fingerprinting and identification management platform built with AI-assisted development.

## Documentation

- [`SPEC.md`](SPEC.md) — formal product specification
- [`docs/how-it-works.md`](docs/how-it-works.md) — end-to-end mental model: the "two voices" architecture, what each phase does, why each signal is included or excluded from the hash, scenario reference, and the false positive trade-off

## Tech Stack

- **Backend:** Java 25 + Spring Boot 4 + Gradle
- **Frontend:** React 19.2.4 + Material UI + Vite
- **Database:** H2 (embedded)

## Prerequisites

- Java 25
- Node.js 22+
- Gradle 9.0+

## Getting Started

### Backend

```bash
cd backend
./gradlew bootRun
```

Backend runs on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API requests to the backend.

### Seed Data

To populate the database with synthetic users and devices:

```bash
cd backend
SEED_DATA=true ./gradlew bootRun
```

## Testing

### Backend

```bash
cd backend
./gradlew build    # runs spotless, checkstyle, tests, coverage
```

### Frontend

```bash
cd frontend
npm run check          # lint + format check
npm run fix            # auto-fix lint + format
npm test               # Vitest unit tests
npm run test:coverage  # with coverage
npm run ci             # full CI: check + build + test:coverage
```

#### End-to-end tests (Playwright)

E2E tests exercise the full flow: browser → FingerprintJS → backend. They require the backend to be running:

```bash
# Terminal 1
cd backend && ./gradlew bootRun

# Terminal 2
cd frontend
npx playwright install chromium        # one-time browser install
npm run test:e2e                       # runs against chromium (default)
npm run test:e2e:all                   # runs across chromium + firefox + webkit
npm run test:e2e -- --project=firefox  # single non-default browser
```

##### Debugging E2E failures

```bash
npm run test:e2e -- --headed           # watch the browser run
npm run test:e2e -- --debug            # step through with Playwright Inspector
npm run test:e2e -- --ui               # interactive UI mode (best DX)

npx playwright show-report             # open the HTML report from the last run
npx playwright show-trace test-results/<name>/trace.zip  # view a recorded trace
```

On failure, the config automatically captures: trace (timeline + DOM snapshots + network), screenshot, and video. They land in `test-results/` and `playwright-report/`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Backend server port |
| `SEED_DATA` | `false` | Enable synthetic data seeding |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL for frontend proxy |
| `VITE_PORT` | `5173` | Frontend dev server port |
