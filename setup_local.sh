#!/bin/bash

# Quick setup script for local development
# This sets up SQLite for easy testing without PostgreSQL

echo "🚀 Setting up Procure-to-Pay for local development..."

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=procure_to_pay
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
REDIS_URL=redis://127.0.0.1:6379/1
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@procuretopay.com
EOF
    echo "✅ .env file created. Please update with your API keys."
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
# Note: User should have PostgreSQL running or use docker-compose

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Backend setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure PostgreSQL is running (docker-compose up -d db)"
echo "2. Create database if needed: createdb procure_to_pay"
echo "3. Create a superuser: python manage.py createsuperuser"
echo "4. Start backend: python manage.py runserver"
echo ""
cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
    echo "✅ .env.local file created."
fi

echo "✅ Frontend setup complete!"
echo ""
echo "📝 To start the application:"
echo "1. Backend: cd backend && source venv/bin/activate && python manage.py runserver"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "🎉 Setup complete! See QUICK_START.md for detailed instructions."

