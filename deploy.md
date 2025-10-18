# DigitalOcean Deployment Guide

## Prerequisites

1. **DigitalOcean Account Setup**
   - Create a DigitalOcean account
   - Set up billing

2. **DigitalOcean Resources**
   - Container Registry
   - App Platform or Droplet
   - Managed MySQL Database (optional)

## Setup Steps

### 1. Install DigitalOcean CLI (doctl)
```bash
# macOS
brew install doctl

# Linux/WSL
snap install doctl

# Authenticate
doctl auth init
```

### 2. Create Container Registry
```bash
doctl registry create ticketing-registry
```

### 3. Create Database (Optional)
```bash
doctl databases create ticketing-db --engine mysql --region nyc1
```

### 4. Configure GitHub Secrets

Add these secrets to your GitHub repository:

- `DIGITALOCEAN_ACCESS_TOKEN`: Your DO API token
- `DO_REGISTRY_NAME`: Your registry name (e.g., ticketing-registry)
- `DO_APP_ID`: Your App Platform app ID (after creating app)
- `DB_HOST`: Database host
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name
- `JWT_SECRET`: Secret key for JWT

### 5. Deploy Using App Platform

#### Option A: Via CLI
```bash
doctl apps create --spec app.yaml
```

#### Option B: Via GitHub Actions
Push to main branch and the workflow will deploy automatically

### 6. Manual Docker Deployment (Alternative)

```bash
# Build locally
docker build -t ticketing-api .

# Tag for registry
docker tag ticketing-api registry.digitalocean.com/YOUR_REGISTRY/ticketing-api:latest

# Push to registry
docker push registry.digitalocean.com/YOUR_REGISTRY/ticketing-api:latest

# Deploy to droplet
ssh root@your-droplet-ip
docker pull registry.digitalocean.com/YOUR_REGISTRY/ticketing-api:latest
docker run -d -p 8080:8080 --env-file .env registry.digitalocean.com/YOUR_REGISTRY/ticketing-api:latest
```

## Monitoring

### Health Checks
- `/healthz` - Liveness probe
- `/version` - Version info

### Logs
```bash
doctl apps logs APP_ID --follow
```

## Scaling

### Horizontal Scaling
```bash
doctl apps update APP_ID --spec=- <<EOF
services:
- name: api
  instance_count: 3
EOF
```

### Vertical Scaling
```bash
doctl apps update APP_ID --spec=- <<EOF
services:
- name: api
  instance_size_slug: professional-xs
EOF
```

## Troubleshooting

### Check deployment status
```bash
doctl apps get APP_ID
```

### Check logs
```bash
doctl apps logs APP_ID --type=run
```

### SSH into container (if using Droplet)
```bash
docker exec -it CONTAINER_ID /bin/sh
```