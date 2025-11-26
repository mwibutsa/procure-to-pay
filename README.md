# Procure-to-Pay System

A purchase request and approval workflow system with AI-powered document processing.

## Live Demo

- **Frontend:** http://161.97.80.247
- **API Docs:** http://161.97.80.247/api/docs/
- **Admin:** http://161.97.80.247/admin/

## Tech Stack

**Backend:** Django 5.2, Django REST Framework, PostgreSQL, Redis, Celery  
**Frontend:** Next.js 16, React 19, Ant Design, TailwindCSS, TanStack Query  
**AI:** Google Gemini API for document extraction  
**File Storage:** Cloudinary

## Quick Start (Docker)

### 1. Clone & Setup Environment

```bash
git clone <repository-url>
cd procure-to-pay
cp .env.example .env
```

### 2. Configure `.env`

```env
# Database
DB_NAME=procure_to_pay
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=db
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,161.97.80.247

# CORS & CSRF
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://161.97.80.247
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://161.97.80.247

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google AI (document processing)
GEMINI_API_KEY=your_gemini_api_key

# Frontend
NEXT_PUBLIC_API_URL=http://161.97.80.247/api
```

### 3. Run with Docker

```bash
docker-compose up --build
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/api/docs/

### 4. Create Initial Users

```bash
docker-compose exec backend python manage.py createsuperuser
```

Or via Django Admin at http://localhost:8000/admin/

## User Roles

| Role | Permissions |
|------|-------------|
| **Staff** | Create requests, upload receipts, view own requests |
| **Approver Level 1** | Approve/reject requests (first level) |
| **Approver Level 2** | Approve/reject requests (final level) |
| **Finance** | View approved requests, manage documents |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/requests/` | List requests |
| POST | `/api/requests/` | Create request |
| GET | `/api/requests/{id}/` | Request details |
| PUT | `/api/requests/{id}/` | Update request |
| PATCH | `/api/requests/{id}/approve/` | Approve request |
| PATCH | `/api/requests/{id}/reject/` | Reject request |
| POST | `/api/requests/{id}/submit-receipt/` | Submit receipt |
| GET | `/api/requests/statistics/` | Dashboard stats |

Full API documentation available at `/api/docs/` (Swagger UI).

## Approval Workflow

1. Staff creates purchase request with optional proforma invoice
2. Level 1 approver reviews and approves/rejects
3. Level 2 approver gives final approval
4. Upon final approval, Purchase Order is auto-generated
5. Staff uploads receipt after purchase
6. System validates receipt against PO (AI-powered)

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

## VPS Deployment

### 1. Setup Nginx

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/procure-to-pay
sudo ln -s /etc/nginx/sites-available/procure-to-pay /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t && sudo systemctl reload nginx
```

### 2. Deploy with Docker

```bash
cd /opt/procure-to-pay
docker-compose up -d --build
```

### 3. Create Admin User

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Project Structure

```
├── backend/
│   ├── config/          # Django settings
│   ├── users/           # Authentication & user management
│   ├── purchase_requests/  # Core business logic
│   ├── documents/       # AI document processing
│   ├── organizations/   # Multi-tenancy
│   └── notifications/   # Email notifications
├── frontend/
│   ├── app/            # Next.js pages
│   ├── components/     # Reusable UI components
│   └── lib/            # API, queries, utilities
└── docker-compose.yml
```

## License

MIT
