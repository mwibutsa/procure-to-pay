# Deployment Guide

This guide covers deploying the Procure-to-Pay system to a Contabo VPS.

## Prerequisites

- Contabo VPS with Ubuntu 20.04 or later
- Domain name (optional, for SSL)
- SSH access to VPS

## VPS Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. Setup Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4. Clone Repository

```bash
cd /opt
sudo git clone <your-repo-url> procure-to-pay
cd procure-to-pay
```

### 5. Configure Environment

```bash
# Create .env file
sudo nano .env

# Add all required environment variables (see README.md)
```

### 6. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Configure Nginx

Create `/etc/nginx/sites-available/procure-to-pay`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

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

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/procure-to-pay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Deploy Application

```bash
cd /opt/procure-to-pay

# Build and start services
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### 9. Setup Systemd Service (Optional)

Create `/etc/systemd/system/procure-to-pay.service`:

```ini
[Unit]
Description=Procure-to-Pay Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/procure-to-pay
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl enable procure-to-pay
sudo systemctl start procure-to-pay
```

## Monitoring

### Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery
```

### Health Checks

```bash
# Check if services are running
docker-compose ps

# Check backend health
curl http://localhost:8000/api/docs/
```

## Updates

When deploying updates via GitHub Actions:

```bash
cd /opt/procure-to-pay
git pull
docker-compose pull
docker-compose up -d --no-deps backend
docker-compose exec backend python manage.py migrate
docker-compose restart backend
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs db

# Test connection
docker-compose exec backend python manage.py dbshell
```

### Redis Connection Issues

```bash
# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Celery Not Processing Tasks

```bash
# Check Celery logs
docker-compose logs celery

# Restart Celery
docker-compose restart celery
```

## Backup

### Database Backup

```bash
# Create backup
docker-compose exec db pg_dump -U postgres procure_to_pay > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T db psql -U postgres procure_to_pay < backup_20240101.sql
```

## Security Considerations

1. Keep system updated: `sudo apt update && sudo apt upgrade`
2. Use strong passwords for database and services
3. Regularly rotate secrets and API keys
4. Monitor logs for suspicious activity
5. Use firewall to restrict access
6. Enable fail2ban for SSH protection
