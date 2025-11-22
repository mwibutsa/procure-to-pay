# Complete Deployment Guide - Step by Step

This is a comprehensive guide to deploy the Procure-to-Pay system to a Contabo VPS with automated deployment via GitHub Actions.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Contabo VPS with Ubuntu 20.04+ (recommended: 22.04 LTS)
- [ ] SSH access to your VPS
- [ ] GitHub repository with your code
- [ ] Cloudinary account (for file uploads)
- [ ] Google Gemini API key (for document processing)
- [ ] Email service credentials (Gmail SMTP or similar)

**Note:** Domain name is optional. You can use your VPS IP address.

---

## Phase 1: Automated VPS Setup (One-Time)

### Step 1.1: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
# Or: ssh username@YOUR_VPS_IP
```

### Step 1.2: Run Automated Setup Script

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/vps-setup.sh -o vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh

# Or if script is in your repo, clone first:
git clone YOUR_REPO_URL /tmp/repo
chmod +x /tmp/repo/vps-setup.sh
/tmp/repo/vps-setup.sh
```

**This script automatically:**

- Updates system
- Installs Docker & Docker Compose
- Installs Nginx
- Configures firewall
- Creates app directory
- Generates SSH key for GitHub Actions

**After script completes, copy the SSH private key shown.**

---

## Phase 2: Repository Setup on VPS

### Step 2.1: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/procure-to-pay
sudo chown $USER:$USER /opt/procure-to-pay

# Clone your repository
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git procure-to-pay

# Or if using SSH:
git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git procure-to-pay

cd procure-to-pay
```

### Step 2.2: Create Production Environment File

```bash
# Create .env file for production
nano .env
```

**Add the following content (replace with your actual values):**

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-generate-this-randomly
DEBUG=False
ALLOWED_HOSTS=YOUR_VPS_IP
CORS_ALLOWED_ORIGINS=http://YOUR_VPS_IP

# Database (PostgreSQL in Docker)
DB_NAME=procure_to_pay
DB_USER=postgres
DB_PASSWORD=your-strong-database-password-change-this
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/1
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Sentry (optional, for error tracking)
SENTRY_DSN=your-sentry-dsn-if-using
```

**Generate a secure SECRET_KEY:**

```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 2.3: Create Frontend Environment File

```bash
# Create frontend .env.local
cd frontend
nano .env.local
```

**Add (replace YOUR_VPS_IP with your actual IP):**

```bash
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP/api
```

**Save and exit**

---

## Phase 3: Docker Configuration

### Step 3.1: Update docker-compose.yml for Production

The docker-compose.yml should already be configured, but verify it matches production needs:

```bash
cd /opt/procure-to-pay
cat docker-compose.yml
```

**Key points to verify:**

- Backend uses production image from GitHub Container Registry
- Environment variables are set correctly
- Volumes are configured for data persistence
- Services have restart policies

### Step 3.2: Create Frontend Dockerfile (if not exists)

```bash
cd /opt/procure-to-pay/frontend
nano Dockerfile
```

**Add:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]
```

**Save and exit**

### Step 3.3: Update docker-compose.yml to Include Frontend

```bash
cd /opt/procure-to-pay
nano docker-compose.yml
```

**Add frontend service (if not present):**

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  env_file:
    - ./frontend/.env.local
  environment:
    - NODE_ENV=production
  depends_on:
    - backend
  restart: unless-stopped
```

**Save and exit**

---

## Phase 4: Get Your VPS IP (No Domain Needed)

```bash
# Get your VPS IP address
curl -s ifconfig.me
# Or: hostname -I | awk '{print $1}'
```

**Save this IP - you'll use it in configuration.**

---

## Phase 5: Nginx Configuration

### Step 5.1: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/procure-to-pay
```

**Add (replace YOUR_VPS_IP with your actual IP):**

```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;

    client_max_body_size 10M;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save and exit**

### Step 5.2: Enable Nginx Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/procure-to-pay /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Phase 6: Initial Deployment (Automated via GitHub Actions)

**Skip manual deployment. After setting up GitHub Actions (Phase 7), push to main branch and it will deploy automatically.**

**For first-time setup only, run these once:**

```bash
cd /opt/procure-to-pay

# Clone repository (if not already cloned)
git clone YOUR_REPO_URL .

# Create .env file (see Phase 2.2)

# Build and start services
docker compose build
docker compose up -d

# Wait for database, then run migrations
sleep 10
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py collectstatic --noinput
```

---

## Phase 7: GitHub Actions Setup

### Step 7.1: Get SSH Key (Already Generated by Setup Script)

```bash
# Display private key (already generated by vps-setup.sh)
cat ~/.ssh/github_actions_deploy
# Copy this entire output - you'll add it to GitHub Secrets
```

### Step 7.2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

**VPS_HOST**

- Name: `VPS_HOST`
- Value: Your VPS IP address (e.g., `123.45.67.89`)

**VPS_USER**

- Name: `VPS_USER`
- Value: Your SSH username (e.g., `deploy` or `root`)

**VPS_SSH_KEY**

- Name: `VPS_SSH_KEY`
- Value: The private key you copied (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

### Step 7.3: Update GitHub Actions Workflow

The workflow file should already be configured, but verify `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/procure-to-pay
            git pull origin main
            docker compose pull backend frontend
            docker compose up -d --no-deps backend frontend
            docker compose exec -T backend python manage.py migrate
            docker compose exec -T backend python manage.py collectstatic --noinput
            docker compose restart backend frontend
```

### Step 7.4: Update docker-compose.yml to Use Images

```bash
cd /opt/procure-to-pay
nano docker-compose.yml
```

**Update backend and frontend services to use images:**

```yaml
backend:
  image: ghcr.io/YOUR_USERNAME/YOUR_REPO_NAME/backend:latest
  # Remove or comment out the build section
  # build:
  #   context: ./backend
  #   dockerfile: Dockerfile
  # ... rest of config

frontend:
  image: ghcr.io/YOUR_USERNAME/YOUR_REPO_NAME/frontend:latest
  # Remove or comment out the build section
  # build:
  #   context: ./frontend
  #   dockerfile: Dockerfile
  # ... rest of config
```

**Replace `YOUR_USERNAME/YOUR_REPO_NAME` with your actual GitHub username and repository name.**

---

## Phase 8: Test Automated Deployment

### Step 8.1: Make a Test Change

```bash
# On your local machine
# Make a small change to README.md
echo "# Test deployment" >> README.md

# Commit and push
git add README.md
git commit -m "Test deployment"
git push origin main
```

### Step 8.2: Monitor GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. Watch the deployment workflow run
4. Check for any errors

### Step 8.3: Verify Deployment on VPS

```bash
# SSH into VPS
ssh user@YOUR_VPS_IP

# Check if new containers are running
cd /opt/procure-to-pay
docker compose ps

# Check logs
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

---

## Phase 9: Post-Deployment Configuration

### Step 9.1: Set Up Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot should auto-renew, but verify the timer
sudo systemctl status certbot.timer
```

### Step 9.2: Set Up Log Rotation

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/procure-to-pay
```

**Add:**

```
/opt/procure-to-pay/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
}
```

### Step 9.3: Set Up Monitoring (Optional)

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Check system resources
htop
```

### Step 9.4: Configure Fail2ban (Security)

```bash
# Fail2ban should already be installed
# Check status
sudo systemctl status fail2ban

# View active jails
sudo fail2ban-client status
```

---

## Phase 10: Verification Checklist

### ✅ Application Access

- [ ] Frontend accessible at `https://yourdomain.com` (or `http://YOUR_IP`)
- [ ] Backend API accessible at `https://yourdomain.com/api/docs/`
- [ ] Can login with superuser credentials
- [ ] Can create organizations and users
- [ ] File uploads work (test with a small file)

### ✅ Services Running

```bash
# Check all services
docker compose ps
# All should show "Up" status

# Check logs for errors
docker compose logs --tail=100
```

### ✅ Database

```bash
# Test database connection
docker compose exec backend python manage.py dbshell

# Should connect successfully
# Type \q to exit
```

### ✅ Redis

```bash
# Test Redis connection
docker compose exec redis redis-cli ping
# Should return: PONG
```

### ✅ Celery

```bash
# Check Celery worker
docker compose logs celery --tail=50

# Should show worker started
```

---

## Troubleshooting

### Issue: Services won't start

```bash
# Check logs
docker compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(3000|8000|5432|6379)'

# Restart Docker
sudo systemctl restart docker
```

### Issue: Database connection errors

```bash
# Check database logs
docker compose logs db

# Check database is accessible
docker compose exec db psql -U postgres -c "SELECT version();"
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if backend/frontend are running
docker compose ps

# Check backend logs
docker compose logs backend

# Test backend directly
curl http://localhost:8000/api/docs/
```

### Issue: SSL certificate errors

```bash
# Check certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

### Issue: GitHub Actions deployment fails

1. Check GitHub Actions logs for specific error
2. Verify SSH key is correct in GitHub Secrets
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy user@YOUR_VPS_IP
   ```
4. Verify VPS has enough disk space:
   ```bash
   df -h
   ```

---

## Maintenance

### Regular Updates

1. Push changes to `main` branch
2. GitHub Actions automatically deploys
3. Monitor deployment in Actions tab

### Manual Updates (if needed)

```bash
cd /opt/procure-to-pay
git pull
docker compose pull
docker compose up -d --no-deps backend frontend
docker compose exec backend python manage.py migrate
docker compose restart
```

### Database Backups

```bash
# Create backup script
nano /opt/procure-to-pay/backup.sh
```

**Add:**

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T db pg_dump -U postgres procure_to_pay | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

**Make executable:**

```bash
chmod +x /opt/procure-to-pay/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/procure-to-pay/backup.sh
```

---

## Security Checklist

- [ ] Changed default database password
- [ ] Set `DEBUG=False` in production
- [ ] Using strong `SECRET_KEY`
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (UFW)
- [ ] Fail2ban configured
- [ ] SSH key authentication (disable password auth)
- [ ] Regular system updates scheduled
- [ ] Database backups configured
- [ ] API keys stored securely (not in code)

---

## Next Steps

1. ✅ Test all functionality
2. ✅ Set up monitoring/alerting (optional)
3. ✅ Configure automated backups
4. ✅ Set up error tracking (Sentry)
5. ✅ Document your specific configuration

---

## Quick Reference Commands

```bash
# View logs
docker compose logs -f [service_name]

# Restart services
docker compose restart [service_name]

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Check service status
docker compose ps

# Access backend shell
docker compose exec backend python manage.py shell

# Run migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser
```

---

**Congratulations! Your Procure-to-Pay system should now be deployed and running on your Contabo VPS! 🎉**
