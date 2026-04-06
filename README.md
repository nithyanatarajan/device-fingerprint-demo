# Device Identification Management Platform

A full-stack device fingerprinting and identification management platform built with AI-assisted development.

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
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # Vitest
npm run test:coverage  # with coverage
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Backend server port |
| `SEED_DATA` | `false` | Enable synthetic data seeding |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL for frontend proxy |
| `VITE_PORT` | `5173` | Frontend dev server port |
