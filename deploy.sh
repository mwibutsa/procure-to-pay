#!/bin/bash
# Automated deployment script (runs on VPS after git pull)
# This is called by GitHub Actions

set -e

cd /opt/procure-to-pay

# Pull latest images
docker compose pull backend frontend

# Start/update services
docker compose up -d --no-deps backend frontend

# Run migrations
docker compose exec -T backend python manage.py migrate

# Collect static files
docker compose exec -T backend python manage.py collectstatic --noinput

# Restart services
docker compose restart backend frontend

echo "✅ Deployment complete!"

