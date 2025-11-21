# 🚀 Start Here - Quick Setup Guide

Follow these steps to get the Procure-to-Pay system running locally.

## Step 1: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Activate virtual environment (if you created one)
source venv/bin/activate  # On Mac/Linux
# OR
venv\Scripts\activate  # On Windows

# If virtual environment doesn't exist, create it:
python3 -m venv venv
source venv/bin/activate  # Then activate it

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Configure Environment

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << 'EOF'
SECRET_KEY=django-insecure-change-this-in-production-$(openssl rand -hex 32)
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
```

**Note:** Make sure PostgreSQL is running before starting the backend.

## Step 3: Setup PostgreSQL Database

### Option A: Using Docker Compose (Recommended)

```bash
# From project root directory
docker-compose up -d db

# Wait a few seconds for PostgreSQL to start
sleep 5

# Verify it's running
docker-compose ps
```

### Option B: Using Local PostgreSQL

```bash
# Create database
createdb procure_to_pay

# Or using psql:
psql -U postgres
CREATE DATABASE procure_to_pay;
\q
```

## Step 4: Run Database Migrations

```bash
# Make sure you're in backend/ with venv activated
python manage.py makemigrations
python manage.py migrate
```

## Step 5: Create Superuser

```bash
python manage.py createsuperuser
# Follow prompts to create admin user
```

## Step 6: Start Backend Server

```bash
python manage.py runserver
```

✅ Backend should now be running at **http://localhost:8000**

You can verify by visiting:
- API Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

## Step 7: Frontend Setup (New Terminal)

Open a **new terminal window** and:

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already done)
npm install

# Create environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

# Start development server
npm run dev
```

✅ Frontend should now be running at **http://localhost:3000**

## Step 8: Create Test Data

### Option A: Using Django Admin (Easiest)

1. Go to http://localhost:8000/admin/
2. Login with your superuser credentials
3. Create an **Organization**:
   - Click "Organizations" → "Add Organization"
   - Name: `Test Company`
   - Slug: `test-company` (auto-generated)
   - Settings (JSON):
     ```json
     {
       "approval_levels_count": 2,
       "finance_can_see_all": false,
       "email_notifications_enabled": true
     }
     ```
   - Save

4. Create **Users** (click "Users" → "Add User"):
   - **Staff User:**
     - Email: `staff@test.com`
     - Password: `testpass123` (set password)
     - Organization: `Test Company`
     - Role: `STAFF`
     - Save
   
   - **Approver Level 1:**
     - Email: `approver1@test.com`
     - Password: `testpass123`
     - Organization: `Test Company`
     - Role: `APPROVER`
     - Approval Level: `1`
     - Save
   
   - **Approver Level 2:**
     - Email: `approver2@test.com`
     - Password: `testpass123`
     - Organization: `Test Company`
     - Role: `APPROVER`
     - Approval Level: `2`
     - Save
   
   - **Finance User:**
     - Email: `finance@test.com`
     - Password: `testpass123`
     - Organization: `Test Company`
     - Role: `FINANCE`
     - Save

### Option B: Using Django Shell (Faster)

```bash
# In backend directory with venv activated
python manage.py shell
```

Then paste this:

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
User.objects.create_user(
    email="staff@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.STAFF
)

User.objects.create_user(
    email="approver1@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.APPROVER,
    approval_level=1
)

User.objects.create_user(
    email="approver2@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.APPROVER,
    approval_level=2
)

User.objects.create_user(
    email="finance@test.com",
    password="testpass123",
    organization=org,
    role=User.Role.FINANCE
)

print("✅ Test users created!")
print("Staff: staff@test.com / testpass123")
print("Approver 1: approver1@test.com / testpass123")
print("Approver 2: approver2@test.com / testpass123")
print("Finance: finance@test.com / testpass123")
```

Type `exit()` to leave the shell.

## Step 9: Test the Application

1. **Open Frontend**: http://localhost:3000

2. **Login as Staff**:
   - Email: `staff@test.com`
   - Password: `testpass123`
   - Should redirect to Staff Dashboard

3. **Create a Purchase Request**:
   - Click "Create Request"
   - Fill in:
     - Title: `Office Supplies`
     - Description: `Need to purchase office supplies for Q1`
     - Amount: `1500.00`
   - Click "Submit"
   - Should see success message and redirect to dashboard

4. **Test Approval Workflow**:
   - Logout
   - Login as `approver1@test.com` / `testpass123`
   - Should see the pending request
   - Click on it, then click "Approve"
   - Logout
   - Login as `approver2@test.com` / `testpass123`
   - Should see the request (after level 1 approved)
   - Approve it (this triggers PO generation)

5. **Test Finance View**:
   - Logout
   - Login as `finance@test.com` / `testpass123`
   - Should see approved requests

## What's Working vs What Needs Configuration

### ✅ Working Now (No Additional Setup):
- User authentication (login/logout)
- Role-based dashboards
- Purchase request creation
- Approval workflow (sequential)
- Request listing and filtering
- API endpoints
- Swagger documentation

### ⚙️ Needs Configuration (Optional):
- **File Uploads**: Requires Cloudinary account and API keys
- **Document Processing**: Requires Google Gemini API key
- **Email Notifications**: Requires SMTP configuration
- **Redis Caching**: Requires Redis server (app works without it)

## Troubleshooting

### Backend won't start:
```bash
# Check for errors
python manage.py check

# Verify migrations
python manage.py showmigrations

# If issues, try:
python manage.py migrate --run-syncdb
```

### Frontend won't connect to backend:
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Verify backend is running on port 8000
- Check browser console for CORS errors

### Can't login:
- Verify user exists in database
- Check user is active: `python manage.py shell` → `User.objects.get(email='staff@test.com').is_active = True`

## Next Steps

1. ✅ Test basic workflow (create request, approve, view)
2. ⚙️ Set up Cloudinary for file uploads
3. ⚙️ Get Gemini API key for document processing
4. ⚙️ Configure email for notifications
5. 🚀 Deploy to production (see DEPLOYMENT.md)

## Quick Commands Reference

```bash
# Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm run dev

# Create test data
python manage.py shell
# (paste the Python code from Step 7)

# Check API
curl http://localhost:8000/api/docs/
```

## Need Help?

- Check `QUICK_START.md` for detailed instructions
- Check `README.md` for full documentation
- Check `DEPLOYMENT.md` for production setup
- Review API docs at http://localhost:8000/api/docs/

