# Quick Start Guide

This guide will help you get the Procure-to-Pay system up and running locally.

## Prerequisites Check

First, verify you have the required tools:

```bash
# Check Python version (should be 3.11+)
python3 --version

# Check Node.js version (should be 18+)
node --version

# Check if PostgreSQL is installed (optional - we can use SQLite for quick testing)
psql --version

# Check if Redis is installed (optional - caching will be disabled if not available)
redis-cli --version
```

## Option 1: Quick Start with Docker Compose (Easiest)

### Step 1: Start PostgreSQL and Redis with Docker

```bash
# From project root
docker-compose up -d db redis

# Wait a few seconds for services to start
sleep 5

# Verify services are running
docker-compose ps
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=procure_to_pay
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
GEMINI_API_KEY=your-gemini-api-key
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
```

### Step 3: Run Migrations

```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser (follow prompts)
python manage.py createsuperuser
```

### Step 4: Start Backend Server

```bash
# Run development server
python manage.py runserver
```

The backend should now be running at `http://localhost:8000`

### Step 5: Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

# Start development server
npm run dev
```

The frontend should now be running at `http://localhost:3000`

## Option 2: Full Setup with PostgreSQL and Redis

### Step 1: Start PostgreSQL and Redis

Using Docker Compose (easiest):

```bash
# From project root
docker-compose up -d db redis

# Wait a few seconds for services to start
docker-compose ps
```

Or install locally:

- PostgreSQL: Follow your OS instructions
- Redis: `brew install redis` (Mac) or `sudo apt install redis` (Linux)

### Step 2: Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file with PostgreSQL settings
# Update DATABASES in settings.py to use PostgreSQL
```

### Step 3: Database Setup

```bash
# Create database (PostgreSQL)
createdb procure_to_pay

# Or using psql:
psql -U postgres
CREATE DATABASE procure_to_pay;
\q

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Step 4: Start Services

```bash
# Terminal 1: Django server
python manage.py runserver

# Terminal 2: Celery worker (optional, for async tasks)
celery -A config worker -l info

# Terminal 3: Celery beat (optional, for scheduled tasks)
celery -A config beat -l info
```

### Step 5: Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Testing the Application

### 1. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Documentation: http://localhost:8000/api/docs/
- Django Admin: http://localhost:8000/admin/

### 2. Create Test Data

#### Option A: Using Django Admin

1. Go to http://localhost:8000/admin/
2. Login with superuser credentials
3. Create an Organization:
   - Name: "Test Company"
   - Slug: "test-company"
   - Settings: `{"approval_levels_count": 2, "finance_can_see_all": false, "email_notifications_enabled": true}`
4. Create Users:
   - Staff user: email="staff@test.com", role=STAFF, organization=Test Company
   - Approver Level 1: email="approver1@test.com", role=APPROVER, approval_level=1, organization=Test Company
   - Approver Level 2: email="approver2@test.com", role=APPROVER, approval_level=2, organization=Test Company
   - Finance user: email="finance@test.com", role=FINANCE, organization=Test Company

#### Option B: Using Django Shell

```bash
python manage.py shell
```

```python
from organizations.models import Organization
from users.models import User

# Create organization
org = Organization.objects.create(
    name="Test Company",
    settings={
        "approval_levels_count": 2,
        "finance_can_see_all": False,
        "email_notifications_enabled": True
    }
)

# Create users
staff = User.objects.create_user(
    email="staff@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.STAFF
)

approver1 = User.objects.create_user(
    email="approver1@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.APPROVER,
    approval_level=1
)

approver2 = User.objects.create_user(
    email="approver2@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.APPROVER,
    approval_level=2
)

finance = User.objects.create_user(
    email="finance@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.FINANCE
)

print("Users created successfully!")
```

### 3. Test the Workflow

1. **Login as Staff**:

   - Go to http://localhost:3000/login
   - Login with: `staff@test.com` / `testpass123`
   - Should redirect to Staff Dashboard

2. **Create a Purchase Request**:

   - Click "Create Request"
   - Fill in title, description, amount
   - (Optional) Add proforma file URL
   - Submit

3. **Login as Approver Level 1**:

   - Logout and login as: `approver1@test.com` / `testpass123`
   - Should see pending requests
   - Click on a request and approve it

4. **Login as Approver Level 2**:

   - Logout and login as: `approver2@test.com` / `testpass123`
   - Should see the request (after level 1 approved)
   - Approve it (this should auto-generate PO)

5. **Login as Finance**:
   - Logout and login as: `finance@test.com` / `testpass123`
   - Should see approved requests

## Troubleshooting

### Backend Issues

**Database connection error:**

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check database exists
psql -U postgres -l | grep procure_to_pay
```

**Migration errors:**

```bash
# Reset migrations (careful - deletes data!)
python manage.py migrate --run-syncdb
```

**Import errors:**

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

**API connection error:**

- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running on port 8000
- Check CORS settings in backend

**Build errors:**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Common Issues

1. **Port already in use:**

   - Backend: Change port `python manage.py runserver 8001`
   - Frontend: Change port `npm run dev -- -p 3001`

2. **Redis connection error:**

   - If Redis is not available, caching will fail but app should still work
   - Comment out Redis cache in settings.py if needed

3. **Cloudinary/Gemini API errors:**
   - These are optional for basic testing
   - File uploads won't work without Cloudinary
   - Document processing won't work without Gemini API key

## Next Steps

Once everything is running:

1. Test the complete approval workflow
2. Test file uploads (requires Cloudinary setup)
3. Test document processing (requires Gemini API key)
4. Check API documentation at `/api/docs/`
5. Review logs for any errors

## Environment Variables Reference

Required for full functionality:

- `SECRET_KEY` - Django secret key
- `GEMINI_API_KEY` - For document processing
- `CLOUDINARY_*` - For file uploads
- `EMAIL_*` - For email notifications

Optional:

- `REDIS_URL` - For caching (app works without it)
- `SENTRY_DSN` - For error tracking (production only)
