#!/bin/bash

echo "🚀 Setting up Smart College Timetable Generator..."

# Create project structure
mkdir -p server/models server/controllers server/routes server/middleware
mkdir -p client/src/components client/src/pages client/src/redux/slices client/src/hooks client/src/utils

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install

# Create environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please update with your configuration."
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../client
npm install

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your MongoDB connection string"
echo "2. Start the backend: cd server && npm run dev"
echo "3. Start the frontend: cd client && npm run dev"
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "🔧 Default credentials:"
echo "   Email: admin@example.com"
echo "   Password: password"