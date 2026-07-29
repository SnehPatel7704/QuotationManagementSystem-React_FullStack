#!/bin/bash

# Load environment variables from backend/.env file if it exists
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

echo "🚀 Starting backend server..."
cd backend && npm run dev
