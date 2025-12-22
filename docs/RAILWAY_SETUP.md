# Railway PR Preview Setup Guide

This guide explains how to set up automatic Preview Environments for Pull Requests using Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway Project**: Create a new project or use an existing one
3. **GitHub Repository**: This repository

## Setup Steps

### 1. Install Railway CLI (Local Setup)

```bash
curl -fsSL https://railway.app/install.sh | sh
```

### 2. Get Railway Token

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your profile → **Settings** → **Tokens**
3. Click **New Token**
4. Give it a name (e.g., "GitHub Actions PR Preview")
5. Copy the token (you'll only see it once!)

### 3. Get Railway Project ID

1. Go to your Railway project dashboard
2. Click on **Settings** → **General**
3. Copy the **Project ID** (UUID format)

### 4. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `RAILWAY_TOKEN` | Your Railway token | Authentication token for Railway CLI |
| `RAILWAY_PROJECT_ID` | Your project UUID | Railway project where services will be created |

### 5. Verify Setup

1. **You create a test PR:**
   - Create a Pull Request
   - The workflow should automatically:
     - Create a Railway service named `api-pr-<PR_NUMBER>`
     - Deploy your Express app
     - Comment on the PR with the preview URL

2. **Team member creates a PR:**
   - Any collaborator creates a PR
   - Same workflow runs automatically
   - They get their own preview environment
   - Preview URL appears in their PR comments
   - No additional setup needed for team members

**Note:** Team members don't need Railway accounts or tokens - everything uses the shared repository secrets.

## How It Works

### Team-Wide Support ✅

**This workflow works for ALL team members:**
- ✅ Any collaborator with write access can create PRs
- ✅ Every PR automatically gets its own preview environment
- ✅ Each PR is isolated (separate Railway service)
- ✅ Preview URLs appear in PR comments automatically
- ✅ No manual steps required for anyone

**Important:**
- All PRs use the same Railway project (shared `RAILWAY_PROJECT_ID`)
- Each PR gets its own isolated service: `api-pr-<PR_NUMBER>`
- Services don't interfere with each other
- All team members see preview URLs in their PR comments

### Deployment Workflow (`.github/workflows/pr-preview.yml`)

**Triggers:**
- PR opened (by any team member)
- PR synchronized (new commits pushed)
- PR reopened

**Actions:**
1. Checks out PR branch code (from any collaborator)
2. Authenticates with Railway (using shared token)
3. Creates or updates service `api-pr-<PR_NUMBER>`
4. Sets PR-scoped environment variables
5. Deploys using Railway's Docker build
6. Comments on PR with preview URL (visible to all)

### Cleanup Workflow (`.github/workflows/pr-preview-cleanup.yml`)

**Triggers:**
- PR closed (merged or not)

**Actions:**
1. Authenticates with Railway
2. Deletes service `api-pr-<PR_NUMBER>`
3. Comments on PR confirming cleanup

## Environment Variables

Each preview environment automatically gets:

### Mandatory Variables
- `NODE_ENV=preview`
- `PORT=3000`
- `PR_NUMBER=<pull request number>`

### PR-Scoped Variables
- `DB_NAME=myapp_pr_<PR_NUMBER>`
- `JWT_SECRET=preview-secret-<PR_NUMBER>`

### Additional Variables
You can add more variables in the workflow file under the "Set environment variables" step:

```yaml
railway variables set YOUR_VAR_NAME="your_value_${PR_NUMBER}"
```

## Service Naming

- Format: `api-pr-<PR_NUMBER>`
- Example: `api-pr-142` for PR #142
- Each PR gets its own isolated service

## Preview URLs

Railway automatically generates HTTPS URLs for each service:
- Format: `https://api-pr-<PR_NUMBER>.up.railway.app`
- Or custom domain if configured

## Troubleshooting

### Workflow fails with "Railway login failed"
- Verify `RAILWAY_TOKEN` secret is correct
- Token may have expired - generate a new one

### Service creation fails
- Check Railway project limits
- Verify `RAILWAY_PROJECT_ID` is correct
- Ensure Railway account has sufficient credits

### Preview URL not accessible
- Wait 1-2 minutes after deployment
- Check Railway dashboard for service status
- Verify service is running (not crashed)

### Cleanup doesn't work
- Service may have been manually deleted
- Check Railway logs for errors
- Verify token has delete permissions

## Cost Considerations

- Railway offers a free tier with usage limits
- Each preview environment counts as a separate service
- Services are automatically destroyed on PR close
- Monitor usage in Railway dashboard

## Advanced Configuration

### Custom Environment Variables

Edit `.github/workflows/pr-preview.yml` and add to the "Set environment variables" step:

```yaml
railway variables set CUSTOM_VAR="value_${PR_NUMBER}"
```

### Custom Service Names

Change the service name format in both workflow files:

```yaml
SERVICE_NAME="custom-prefix-pr-${{ github.event.pull_request.number }}"
```

### Database per PR

If you need a database per PR, add to the workflow:

```yaml
railway variables set DB_HOST="db-pr-${PR_NUMBER}.railway.app"
railway variables set DB_PORT="5432"
```

## Support

For issues:
1. Check GitHub Actions logs
2. Check Railway dashboard logs
3. Verify secrets are set correctly
4. Ensure Railway account is active

