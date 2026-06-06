# TradeIQ Academy — Local Setup Guide

Everything runs inside Docker. You need **Docker Desktop** (or Docker Engine + Compose) — no Python or Node installation required.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Docker Desktop | 4.x+ | https://www.docker.com/products/docker-desktop |
| Git | any | https://git-scm.com |

Verify Docker is running:
```bash
docker --version        # Docker version 24+
docker compose version  # v2.x
```

---

## 1. Clone the repository

```bash
git clone https://github.com/instituteofdigitalrisk-cpu/SalesTrading.git
cd SalesTrading
```

---

## 2. Create the backend environment file

The backend needs a `.env` file at `backend/.env`. Create it:

```bash
cp backend/.env.example backend/.env   # if the example exists, otherwise create manually
```

Or create `backend/.env` manually with this content:

```env
FLASK_ENV=development
SECRET_KEY=change-me-in-production
JWT_SECRET_KEY=change-me-jwt-secret
DB_HOST=mysql
DB_PORT=3306
DB_NAME=tradeiq
DB_USER=root
DB_PASSWORD=
```

> **Note:** `DB_HOST` must be `mysql` (the Docker container name). `DB_PASSWORD` is empty because the MySQL container uses `MYSQL_ALLOW_EMPTY_PASSWORD=yes` for local dev.

---

## 3. Start all services

From the project root:

```bash
docker compose up --build
```

This starts three containers:

| Container | Service | Port |
|-----------|---------|------|
| `tradeiq-mysql` | MySQL 8.0 database | 3306 |
| `tradeiq-backend` | Flask REST API | 5000 |
| `tradeiq-frontend` | Expo web app | 8081 |

First run takes **3–5 minutes** (downloads base images, installs npm packages and Python dependencies).

The backend waits for MySQL to be ready automatically before starting Flask.

---

## 4. Verify everything is running

```bash
# Backend health
curl http://localhost:5000/health
# Expected: {"app": "TradeIQ Academy", "status": "ok"}

# Frontend
open http://localhost:8081
```

---

## 5. Open the app

Go to **http://localhost:8081** in your browser.

- Click **Get Started** → fill in the registration form → complete onboarding
- Or click **Log In** with an existing account

---

## 6. Stop the stack

```bash
docker compose down          # stop containers, keep database data
docker compose down -v       # stop containers AND delete database (clean slate)
```

---

## Development workflow

### Backend changes (Python/Flask)

After editing any file in `backend/`:

```bash
docker compose up --build -d backend
```

The container rebuilds in ~20 seconds (deps are cached unless `requirements.txt` changes).

### Frontend changes (TypeScript/Expo)

After editing any file in `frontend/DRA App/src/`:

```bash
docker compose up --build -d frontend
```

Or for faster iteration, run the frontend **outside Docker** while the backend runs inside:

```bash
# Terminal 1 — backend + database in Docker
docker compose up mysql backend

# Terminal 2 — frontend hot-reload on host
cd "frontend/DRA App"
npm install
EXPO_PUBLIC_API_URL=http://localhost:5000 npx expo start --web
```

The Expo dev server at `http://localhost:8081` now hot-reloads on every save.

---

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | Flask environment mode |
| `SECRET_KEY` | — | Flask session secret (any random string) |
| `JWT_SECRET_KEY` | — | JWT signing secret (any random string) |
| `DB_HOST` | `mysql` | MySQL host — use `mysql` inside Docker, `localhost` outside |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `tradeiq` | Database name |
| `DB_USER` | `root` | Database user |
| `DB_PASSWORD` | *(empty)* | Database password |
| `EXPO_PUBLIC_API_URL` | `http://localhost:5000` | Backend URL seen by the frontend |

---

## API endpoints (quick reference)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, get JWT |
| GET | `/portfolio/summary/:id` | JWT | Portfolio value & P&L |
| GET | `/portfolio/trades/:id` | JWT | Trade history |
| POST | `/portfolio/trade` | JWT | Execute BUY/SELL |
| GET | `/market/price/:ticker` | JWT | Live stock price |
| GET | `/market/search?q=` | JWT | Search stocks by name/ticker |
| GET | `/analytics/leaderboard` | JWT | Weekly rankings |
| GET | `/analytics/scores/:id` | JWT | User weekly scores |

---

## Troubleshooting

**Backend exits immediately**
```bash
docker compose logs backend
```
Usually means `DB_HOST` is wrong or `backend/.env` is missing.

**Port already in use**
```bash
# Find what's using the port
lsof -i :5000
lsof -i :8081
lsof -i :3306
```
Stop the conflicting process or change the host port in `docker-compose.yml`.

**Database schema missing**
The schema is auto-applied from `backend/migrations/schema.sql` on first MySQL startup. If you reset the volume (`docker compose down -v`) and restart, it re-applies automatically.

**yfinance / stock price errors**
Stock price data comes from Yahoo Finance. If a ticker returns "Could not fetch price", check:
- The ticker format: use `INFY.NS` for NSE, `RELIANCE.NS` for Reliance, `AAPL` for US stocks
- Your internet connection from inside Docker: `docker compose exec backend python3 -c "import yfinance as yf; print(yf.Ticker('AAPL').history(period='1d'))"`
