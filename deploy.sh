#!/bin/bash

# PDFFlow Railway Deployment Script (Server Only)
echo "🚀 Starting PDFFlow backend deployment..."

# Install server dependencies only
echo "📦 Installing server dependencies..."
cd server
npm install --legacy-peer-deps

# Build the server only
echo "🔨 Building server..."
npm run build

# Start the server
echo "✅ Starting server..."
npm start 