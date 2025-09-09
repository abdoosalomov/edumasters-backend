#!/bin/bash

# Deployment script for EduMasters Backend
# This script can be run manually or via CI/CD

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "ecosystem.config.js" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_step "Starting deployment process..."

# Pull latest code
print_step "Pulling latest code from repository"
if git pull origin main; then
    print_success "Code pulled successfully"
else
    print_error "Failed to pull latest code"
    exit 1
fi

# Install dependencies
print_step "Installing/updating dependencies"
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Generate Prisma client
print_step "Generating Prisma client"
if npx prisma generate; then
    print_success "Prisma client generated successfully"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Build the project
print_step "Building the project"
if npm run build; then
    print_success "Project built successfully"
else
    print_error "Failed to build project"
    exit 1
fi

# Check if PM2 process exists
print_step "Checking PM2 process status"
if pm2 describe edumasters > /dev/null 2>&1; then
    print_step "Restarting PM2 process"
    if pm2 restart edumasters; then
        print_success "PM2 process restarted successfully"
    else
        print_error "Failed to restart PM2 process"
        exit 1
    fi
else
    print_warning "PM2 process 'edumasters' not found, starting new process"
    if pm2 start ecosystem.config.js; then
        print_success "PM2 process started successfully"
    else
        print_error "Failed to start PM2 process"
        exit 1
    fi
fi

# Save PM2 configuration
print_step "Saving PM2 configuration"
pm2 save

# Show PM2 status
print_step "Current PM2 status:"
pm2 list

print_success "🚀 Deployment completed successfully!"
print_step "Application is running at: https://edumasters.abdusalomov.uz"
