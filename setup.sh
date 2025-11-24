#!/bin/bash

# Poe Talk Extension - Quick Start Script

echo "🚀 Poe Talk Extension Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if Raycast CLI is available
if ! command -v ray &> /dev/null; then
    echo "⚠️  Raycast CLI not found. Installing it may be helpful for development."
    echo "   The extension can still work without it."
    echo ""
fi

# Build the extension
echo "🔨 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Extension built successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Get your Poe API key from: https://poe.com/api_key"
    echo "   2. Open Raycast preferences (⌘ + ,)"
    echo "   3. Navigate to Extensions → Poe Talk"
    echo "   4. Enter your API key and configure bot settings"
    echo "   5. Try the extension:"
    echo "      - Open Raycast (⌘ + Space)"
    echo "      - Type 'Ask Poe AI'"
    echo "      - Enter your message"
    echo ""
    echo "📚 Documentation:"
    echo "   - README.md - Main documentation"
    echo "   - USAGE.md - User guide"
    echo "   - ARCHITECTURE.md - Technical details"
    echo ""
    echo "🔧 Development:"
    echo "   - Run 'npm run dev' for development mode with hot reload"
    echo ""
else
    echo ""
    echo "❌ Build failed. Check the errors above."
    exit 1
fi
