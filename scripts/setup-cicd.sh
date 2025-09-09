#!/bin/bash

# CI/CD Setup Script for EduMasters Backend
# This script helps set up the CI/CD pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}"
    echo "=================================="
    echo "   EduMasters CI/CD Setup"
    echo "=================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_header

echo "This script will help you set up CI/CD for your EduMasters Backend project."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "ecosystem.config.js" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_step "Step 1: Generate SSH Key Pair for Deployment"
echo ""

KEY_PATH="$HOME/.ssh/github_deploy_key"

if [ -f "$KEY_PATH" ]; then
    print_warning "SSH key already exists at $KEY_PATH"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ $overwrite =~ ^[Yy]$ ]]; then
        rm -f "$KEY_PATH" "$KEY_PATH.pub"
    else
        print_info "Using existing SSH key"
    fi
fi

if [ ! -f "$KEY_PATH" ]; then
    print_info "Generating new SSH key pair..."
    ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f "$KEY_PATH" -N ""
    print_success "SSH key pair generated successfully!"
fi

echo ""
print_step "Step 2: Display Public Key (Add this to your VPS)"
echo ""
print_info "Copy the following public key and add it to your VPS ~/.ssh/authorized_keys:"
echo ""
echo -e "${YELLOW}$(cat $KEY_PATH.pub)${NC}"
echo ""

read -p "Press Enter when you've added the public key to your VPS..."

echo ""
print_step "Step 3: Display Private Key (Add this to GitHub Secrets)"
echo ""
print_info "Copy the following private key and add it to GitHub Secrets as 'VPS_SSH_KEY':"
echo ""
print_warning "IMPORTANT: Keep this private key secure and never commit it to your repository!"
echo ""
echo -e "${YELLOW}$(cat $KEY_PATH)${NC}"
echo ""

read -p "Press Enter when you've added the private key to GitHub Secrets..."

echo ""
print_step "Step 4: GitHub Secrets Configuration"
echo ""
print_info "Make sure you have added these secrets to your GitHub repository:"
print_info "Go to: Settings → Secrets and Variables → Actions"
echo ""
echo "Required secrets:"
echo "• VPS_HOST: edumasters.abdusalomov.uz"
echo "• VPS_USERNAME: root"
echo "• VPS_PORT: 22"
echo "• VPS_SSH_KEY: (the private key you just copied)"
echo ""

read -p "Press Enter when you've configured all GitHub Secrets..."

echo ""
print_step "Step 5: Test SSH Connection"
echo ""
print_info "Testing SSH connection to your VPS..."

if ssh -i "$KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@edumasters.abdusalomov.uz "echo 'SSH connection successful!'" 2>/dev/null; then
    print_success "SSH connection to VPS successful!"
else
    print_error "SSH connection failed. Please check:"
    echo "  • Public key is added to VPS ~/.ssh/authorized_keys"
    echo "  • SSH service is running on VPS"
    echo "  • Firewall allows SSH connections"
    echo "  • VPS hostname is correct"
fi

echo ""
print_step "Step 6: Prepare VPS for Deployment"
echo ""
print_info "Copying deployment script to VPS and setting up project..."

if ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no root@edumasters.abdusalomov.uz "
    cd /root/edumasters-backend &&
    git pull origin main &&
    chmod +x scripts/deploy.sh &&
    echo 'VPS preparation complete!'
" 2>/dev/null; then
    print_success "VPS prepared successfully!"
else
    print_warning "Could not prepare VPS automatically. Please do this manually:"
    echo "  1. SSH to your VPS: ssh root@edumasters.abdusalomov.uz"
    echo "  2. cd /root/edumasters-backend"
    echo "  3. git pull origin main"
    echo "  4. chmod +x scripts/deploy.sh"
fi

echo ""
print_step "Setup Complete! 🎉"
echo ""
print_success "Your CI/CD pipeline is now configured!"
echo ""
print_info "Next steps:"
echo "1. Push your changes to the main branch"
echo "2. Check GitHub Actions tab to see the deployment in action"
echo "3. Monitor your application at: https://edumasters.abdusalomov.uz"
echo ""
print_info "For troubleshooting, check the DEPLOYMENT.md file"
echo ""
print_warning "Security reminder: Keep your SSH private key secure and never share it!"
