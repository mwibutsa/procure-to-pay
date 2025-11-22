#!/bin/bash
# Automated VPS Setup Script for Procure-to-Pay
# Run this once on your VPS to set up everything

set -e

echo "🚀 Starting automated VPS setup..."

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano ufw fail2ban

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if needed)
if ! command -v docker compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Configure Firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/procure-to-pay
sudo chown $USER:$USER /opt/procure-to-pay

# Generate SSH key for GitHub Actions
echo "🔑 Generating SSH key for GitHub Actions..."
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your private SSH key:"
echo "   cat ~/.ssh/github_actions_deploy"
echo ""
echo "2. Add GitHub Secrets:"
echo "   - VPS_HOST: $(curl -s ifconfig.me)"
echo "   - VPS_USER: $USER"
echo "   - VPS_SSH_KEY: (paste the private key from step 1)"
echo ""
echo "3. Clone your repository:"
echo "   cd /opt/procure-to-pay"
echo "   git clone YOUR_REPO_URL ."
echo ""
echo "4. Create .env file with your production settings"
echo "5. Push to main branch - deployment will be automatic!"

