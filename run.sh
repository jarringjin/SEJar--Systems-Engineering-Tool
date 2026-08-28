#!/usr/bin/env bash
# SEJar launcher for macOS/Linux - starts backend and frontend together.
set -e
cd "$(dirname "$0")"

echo "================================================"
echo "  SEJar - starting backend + frontend"
echo "================================================"

PYTHON_CMD="python3"
command -v python3 >/dev/null 2>&1 || PYTHON_CMD="python"
if ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
    echo "[ERROR] Python was not found. Install Python 3.10+ and re-run this script."
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm was not found. Install Node.js LTS (https://nodejs.org) and re-run this script."
    exit 1
fi

# ---------------------------------------------------------- backend setup
cd backend
if [ ! -d venv ]; then
    echo "[backend] Creating virtual environment - first run only..."
    "$PYTHON_CMD" -m venv venv
fi
echo "[backend] Installing/checking dependencies..."
venv/bin/python -m pip install -q -r requirements.txt

echo "[backend] Starting FastAPI server on http://127.0.0.1:8000 ..."
(source venv/bin/activate && uvicorn app.main:app --reload) &
BACKEND_PID=$!
cd ..

# ---------------------------------------------------------- frontend setup
cd frontend
if [ ! -d node_modules ]; then
    echo "[frontend] Installing npm dependencies - first run only..."
    npm install
fi
echo "[frontend] Starting Vite dev server on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
cd ..

sleep 4
if command -v open >/dev/null 2>&1; then
    open http://localhost:5173   # macOS
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:5173  # Linux
fi

echo ""
echo "================================================"
echo "SEJar is running. Press Ctrl+C to stop both servers."
echo "================================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
