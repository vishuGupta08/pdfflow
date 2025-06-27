#!/bin/bash

# PDFFlow Railway Deployment Script
echo "🚀 Starting PDFFlow deployment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --legacy-peer-deps

# Build the server
echo "🔨 Building server..."
npm run build

# Start the server
echo "✅ Starting server..."
npm start 