# Deployment Guide

This document explains how to set up and use the CI/CD pipeline for the EduMasters Backend project.

## Overview

The project uses GitHub Actions for continuous integration and deployment to a VPS server. When code is pushed to the `main` branch, the pipeline automatically:

1. Runs tests and linting
2. Builds the project
3. Deploys to the production server
4. Restarts the PM2 process

## Setup Instructions

### 1. Generate SSH Key Pair

On your local machine, generate a new SSH key pair for deployment:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key
```

This creates two files:
- `~/.ssh/github_deploy_key` (private key)
- `~/.ssh/github_deploy_key.pub` (public key)

### 2. Add Public Key to VPS

Copy the public key to your VPS:

```bash
# Copy the public key content
cat ~/.ssh/github_deploy_key.pub

# SSH to your VPS
ssh root@edumasters.abdusalomov.uz

# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 3. Configure GitHub Secrets

In your GitHub repository, go to Settings → Secrets and Variables → Actions, and add these secrets:

- `VPS_HOST`: `edumasters.abdusalomov.uz`
- `VPS_USERNAME`: `root`
- `VPS_PORT`: `22` (or your custom SSH port)
- `VPS_SSH_KEY`: Content of the private key (`~/.ssh/github_deploy_key`)

To get the private key content:
```bash
cat ~/.ssh/github_deploy_key
```

### 4. Prepare VPS for Automated Deployment

SSH to your VPS and make sure the project is set up correctly:

```bash
ssh root@edumasters.abdusalomov.uz

# Navigate to project directory
cd /root/edumasters-backend

# Make sure the deploy script is executable
chmod +x scripts/deploy.sh

# Test the deployment script manually
./scripts/deploy.sh
```

## Usage

### Automatic Deployment

Simply push your changes to the `main` branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Run tests and linting
2. Build the project
3. Deploy to your VPS
4. Restart the PM2 process

### Manual Deployment

You can also trigger deployment manually:

1. **Via GitHub Actions**: Go to Actions tab → Deploy to VPS → Run workflow
2. **Via SSH**: SSH to your VPS and run `./scripts/deploy.sh`
3. **Using the old alias**: SSH to your VPS and run `deploy` (if you still have the alias)

### Monitoring

You can monitor the deployment process:

1. **GitHub Actions**: Check the Actions tab in your repository
2. **PM2 Logs**: SSH to your VPS and run:
   ```bash
   pm2 logs edumasters
   pm2 monit
   ```

## Workflow Details

The GitHub Actions workflow (`.github/workflows/deploy.yml`) includes:

- **Trigger**: Pushes to `main` branch or manual trigger
- **Node.js Setup**: Uses Node.js 18 with npm caching
- **Quality Checks**: Runs linting and tests before deployment
- **Build**: Creates production build
- **Deploy**: Uses SSH to run deployment commands on VPS
- **Notifications**: Shows deployment status

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Check if the SSH key is correctly added to GitHub secrets
   - Verify the public key is in `~/.ssh/authorized_keys` on the VPS
   - Ensure SSH service is running on the VPS

2. **PM2 Process Not Found**
   - The deployment script will automatically start the process if it doesn't exist
   - Check PM2 status: `pm2 list`

3. **Build Failures**
   - Check the GitHub Actions logs for specific error messages
   - Ensure all dependencies are properly listed in `package.json`

4. **Database Issues**
   - Make sure Prisma schema is up to date
   - Run database migrations if needed: `npx prisma migrate deploy`

### Rollback

If you need to rollback to a previous version:

```bash
# SSH to your VPS
ssh root@edumasters.abdusalomov.uz
cd /root/edumasters-backend

# Reset to a specific commit
git reset --hard <commit-hash>

# Run deployment
./scripts/deploy.sh
```

## Security Notes

- The SSH private key should never be committed to the repository
- Use GitHub secrets to store sensitive information
- Regularly rotate SSH keys
- Consider using a dedicated deployment user instead of root
- Keep your VPS and dependencies updated

## Customization

You can customize the deployment process by modifying:

- `.github/workflows/deploy.yml`: GitHub Actions workflow
- `scripts/deploy.sh`: Deployment script
- `ecosystem.config.js`: PM2 configuration

## Support

If you encounter issues with the CI/CD pipeline, check:

1. GitHub Actions logs
2. VPS system logs: `journalctl -u ssh`
3. PM2 logs: `pm2 logs edumasters`
4. Application logs in the `logs/` directory
