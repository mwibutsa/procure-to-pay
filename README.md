# Procure-to-Pay System

A comprehensive Purchase Request & Approval System built with Django REST Framework and Next.js.

## Features

- **Multi-tenant Architecture**: Organization-based isolation
- **Role-Based Access Control**: Staff, Approver (multi-level), Finance
- **Sequential Approval Workflow**: Configurable approval levels with sequential enforcement
- **AI-Powered Document Processing**: Google Gemini API for proforma, PO generation, and receipt validation
- **File Management**: Cloudinary integration for file uploads
- **Email Notifications**: Automated notifications for approval/rejection events
- **Caching**: Redis for performance optimization
- **API Documentation**: Swagger/OpenAPI documentation

## Tech Stack

### Backend

- Django 5.2.8
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- Google Gemini API
- Cloudinary

### Frontend

- Next.js 14+
- React Query (TanStack Query)
- Ant Design
- Tailwind CSS

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis
- Docker & Docker Compose (optional)

## Setup Instructions

### Backend Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd procure-to-pay
```

2. Create virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `.env` file in `backend/` directory:

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=procure_to_pay
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

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
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@procuretopay.com
```

5. Run migrations:

```bash
python manage.py migrate
```

6. Create superuser:

```bash
python manage.py createsuperuser
```

7. Run development server:

```bash
python manage.py runserver
```

8. Run Celery worker (in separate terminal):

```bash
celery -A config worker -l info
```

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

4. Run development server:

```bash
npm run dev
```

### Docker Setup

1. Create `.env` file in root directory (same as backend `.env`)

2. Build and run:

```bash
docker-compose up --build
```

3. Run migrations:

```bash
docker-compose exec backend python manage.py migrate
```

4. Create superuser:

```bash
docker-compose exec backend python manage.py createsuperuser
```

## API Documentation

Once the backend is running, access the API documentation at:

- Swagger UI: `http://localhost:8000/api/docs/`
- Schema: `http://localhost:8000/api/schema/`

## API Endpoints

### Authentication

- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/refresh/` - Refresh token
- `GET /api/auth/me/` - Get current user

### Purchase Requests

- `POST /api/requests/` - Create request (Staff)
- `GET /api/requests/` - List requests (filtered by role)
- `GET /api/requests/{id}/` - Get request details
- `PUT /api/requests/{id}/` - Update request (Staff, if pending)
- `PATCH /api/requests/{id}/approve/` - Approve request (Approver)
- `PATCH /api/requests/{id}/reject/` - Reject request (Approver)
- `POST /api/requests/{id}/submit-receipt/` - Submit receipt (Staff)

## User Roles

- **Staff**: Can create and view their own requests, submit receipts
- **Approver**: Can view pending requests at their level, approve/reject requests
- **Finance**: Can view approved requests

## Approval Workflow

1. Staff creates a purchase request
2. Request goes through sequential approval levels (configurable per organization)
3. Each approver at their level can approve or reject
4. If all levels approve, request is automatically approved and PO is generated
5. Staff can submit receipt after approval
6. Receipt is validated against PO, discrepancies are flagged

## Deployment

### GitHub Actions

The project includes a GitHub Actions workflow for automated deployment to VPS.

Required secrets:

- `VPS_HOST`: VPS hostname or IP
- `VPS_USER`: SSH username
- `VPS_SSH_KEY`: SSH private key

### Manual Deployment

1. Build Docker image:

```bash
docker build -t procure-to-pay-backend ./backend
```

2. Push to registry:

```bash
docker tag procure-to-pay-backend ghcr.io/username/procure-to-pay/backend:latest
docker push ghcr.io/username/procure-to-pay/backend:latest
```

3. On VPS, pull and run:

```bash
docker-compose pull
docker-compose up -d
```

## Environment Variables

See `.env.example` for all required environment variables.

## Testing

Run tests:

```bash
cd backend
python manage.py test
```

## License

This project is for assessment purposes.

## Contact

For issues or questions, please contact the development team.
