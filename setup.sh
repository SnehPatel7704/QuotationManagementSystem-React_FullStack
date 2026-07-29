#!/bin/bash
set -e

echo "📦 Setting up Quotation Management System..."

# 1. Setup backend dependencies
echo "📂 Setting up Backend..."
cd backend
npm install
echo "⚙️ Generating Prisma client..."
npm run prisma:generate

# 2. Setup frontend dependencies
echo "📂 Setting up Frontend..."
cd ../frontend
npm install

echo "✅ Dependencies and client generated successfully!"
echo "👉 Make sure you configure backend/.env with your database URL."
echo "👉 Then, to initialize the database schema and seed data, run: cd backend && npm run prisma:push && npm run prisma:seed"
