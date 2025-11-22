# Quick Deployment Guide (No Domain)

## Automated Setup - 3 Steps

### 1. One-Time VPS Setup (5 minutes)

```bash
# SSH to your VPS
ssh root@YOUR_VPS_IP

# Run automated setup
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/vps-setup.sh -o setup.sh
chmod +x setup.sh && ./setup.sh

# Copy the SSH private key shown at the end
```

### 2. Configure GitHub Secrets

Add these in GitHub → Settings → Secrets:

- `VPS_HOST`: Your VPS IP
- `VPS_USER`: Your SSH username
- `VPS_SSH_KEY`: Private key from step 1

### 3. Clone Repo & Create .env

```bash
cd /opt/procure-to-pay
git clone YOUR_REPO_URL .
nano .env  # Add all your production secrets
nano frontend/.env.local  # Add: NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP/api
```

### 4. Push to Main = Auto Deploy

```bash
git push origin main
# GitHub Actions automatically builds and deploys
```

**That's it!** After first push, all future deployments are automatic.
