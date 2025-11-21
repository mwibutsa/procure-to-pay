# Local PostgreSQL & Redis Setup

Since you have PostgreSQL and Redis already installed locally, here's how to configure the project to use them instead of Docker.

## Current Status

✅ **PostgreSQL**: Running locally on port 5432  
✅ **Redis**: Running locally on port 6379 (valkey-server)  
✅ **Docker containers**: Stopped to avoid port conflicts

## Configuration Steps

### 1. Update Backend .env File

Edit `backend/.env` and update these values:

```bash
# Use your local PostgreSQL user (not 'postgres')
DB_NAME=procure_to_pay
DB_USER=mwibutsa          # Your macOS username
DB_PASSWORD=              # Leave empty if using peer authentication
DB_HOST=localhost
DB_PORT=5432

# Redis is already configured correctly
REDIS_URL=redis://127.0.0.1:6379/1
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
```

### 2. Create Database (if not already created)

```bash
# Database should already be created, but if needed:
createdb procure_to_pay

# Or using psql:
psql -U mwibutsa
CREATE DATABASE procure_to_pay;
\q
```

### 3. Run Migrations

```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

### 4. Start Services

**Backend:**

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Celery (optional, for async tasks):**

```bash
cd backend
source venv/bin/activate
celery -A config worker -l info
```

**Frontend:**

```bash
cd frontend
npm run dev
```

## Docker Compose Alternative

If you want to use Docker Compose but avoid port conflicts, you can:

1. **Stop local services temporarily:**

```bash
# Stop local PostgreSQL
brew services stop postgresql@15  # or your version

# Stop local Redis/Valkey
brew services stop valkey  # or redis
```

2. **Or use different ports in docker-compose.yml:**

```yaml
services:
  db:
    ports:
      - "5433:5432" # Use 5433 instead of 5432
  redis:
    ports:
      - "6380:6379" # Use 6380 instead of 6379
```

Then update `.env`:

```bash
DB_PORT=5433
REDIS_URL=redis://127.0.0.1:6380/1
```

## Current Configuration

Your setup is now using:

- **PostgreSQL**: Local instance (user: `mwibutsa`)
- **Redis**: Local instance (valkey-server on port 6379)
- **Database**: `procure_to_pay` (created)

You're all set! Just make sure your `backend/.env` has:

- `DB_USER=mwibutsa`
- `DB_PASSWORD=` (empty, using peer authentication)
