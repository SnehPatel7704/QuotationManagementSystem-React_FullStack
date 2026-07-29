#!/bin/bash

# Function to clean up background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting both backend and frontend servers..."

# Start backend in background
./start-backend.sh &
BACKEND_PID=$!

# Start frontend in background
./start-frontend.sh &
FRONTEND_PID=$!

# Keep script running to trap signals
wait
