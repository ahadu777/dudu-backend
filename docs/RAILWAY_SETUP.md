# Railway PR Preview Setup Guide

This guide explains how to set up automatic Preview Environments for Pull Requests using Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway Project**: Create a new project or use an existing one
3. **GitHub Repository**: This repository

## Setup Steps

### 1. Install Railway CLI (Local Setup - Optional)

```bash
curl -fsSL https://railway.app/install.sh | sh
```

### 2. Get Railway Account Token (REQUIRED)

**⚠️ IMPORTANT: You MUST use an Account Token (not a Project Token)**

**Account Tokens** can:
- ✅ Create services via API
- ✅ Deploy to any project
- ✅ Manage projects and services

**Project Tokens** can:
- ❌ Cannot create services via API
- ✅ Can only deploy to the specific project
- ❌ Limited permissions

**Steps to get Account Token:**

1. Go to [Railway Account Settings](https://railway.app/account/tokens)
2. Click **New Token**
3. Give it a name (e.g., "GitHub Actions PR Preview")
4. **Copy the token immediately** (you'll only see it once!)
5. This is your **Account Token** - use this for `RAILWAY_TOKEN`

**Alternative: Get from Dashboard**
- Go to [Railway Dashboard](https://railway.app/dashboard)
- Click your profile icon (top right)
- Click **Account Settings**
- Go to **Tokens** tab
- Click **New Token**

### 3. Get Railway Project ID

1. Go to your Railway project dashboard: `https://railway.app/project/<your-project-id>`
2. Click on **Settings** → **General**
3. Copy the **Project ID** (UUID format, e.g., `89630eec-a911-452b-ac20-051982c8ec61`)

**Or get it from URL:**
- The Project ID is in the URL: `https://railway.app/project/89630eec-a911-452b-ac20-051982c8ec61`
- Copy the UUID part

### 4. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `RAILWAY_TOKEN` | Your **Account Token** | ⚠️ Must be Account Token (not Project Token) |
| `RAILWAY_PROJECT_ID` | Your project UUID | Railway project where services will be created |

**How to add secrets:**
1. Click **New repository secret**
2. Name: `RAILWAY_TOKEN`
3. Value: Paste your Account Token
4. Click **Add secret**
5. Repeat for `RAILWAY_PROJECT_ID`

### 5. Verify Token Type (Optional Test)

You can verify your token is an Account Token by running locally:

```bash
export RAILWAY_TOKEN="your-token-here"
railway whoami
```

If it shows your account email, it's an Account Token ✅

### 6. Test the Workflow

1. **Create a test PR:**
   - Create a Pull Request
   - The workflow should automatically:
     - Create a Railway service named `api-pr-<PR_NUMBER>`
     - Deploy your Express app
     - Comment on the PR with the preview URL

2. **Check GitHub Actions:**
   - Go to **Actions** tab
   - Click on the workflow run
   - Should see "✅ Service created successfully"

3. **Verify Deployment:**
   - Check Railway Dashboard
   - You should see a new service `api-pr-<PR_NUMBER>`
   - Service should be deploying

## How It Works

### On PR Open/Sync/Reopen

1. GitHub Actions workflow triggers
2. Creates Railway service via GraphQL API (requires Account Token)
3. Deploys Express app using Dockerfile
4. Sets environment variables:
   - `NODE_ENV=preview`
   - `PORT=3000`
   - `PR_NUMBER=<PR number>`
   - `DB_NAME=myapp_pr_<PR_NUMBER>`
   - `JWT_SECRET=preview-secret-<PR_NUMBER>`
5. Comments PR with preview URL: `https://api-pr-<PR_NUMBER>.up.railway.app`

### On PR Close/Merge

1. Cleanup workflow triggers
2. Deletes the Railway service
3. Frees up resources

## Troubleshooting

### Error: "Service not found"

**Cause:** Project Token cannot create services via API

**Solution:**
1. Get an Account Token (see step 2 above)
2. Update GitHub Secret `RAILWAY_TOKEN` with Account Token
3. Re-run the workflow

### Error: "Not Authorized" in GraphQL API

**Cause:** Using Project Token instead of Account Token

**Solution:**
- Use Account Token from [railway.app/account/tokens](https://railway.app/account/tokens)
- Update GitHub Secret `RAILWAY_TOKEN`

### Error: "Cannot find module /app/scripts/start.js"

**Cause:** Railway trying to run `npm start` which calls `scripts/start.js` (not in Docker)

**Solution:** Already fixed - `railway.toml` uses `node dist/index.js` directly

### Error: "EACCES: permission denied, mkdir 'logs'"

**Cause:** Non-root user cannot create directories

**Solution:** Already fixed - file logging disabled in production, logs directory created in Dockerfile

### Error: "ERR_REQUIRE_ESM: require() of ES Module nanoid"

**Cause:** nanoid v5+ is ESM-only, but TypeScript compiles to CommonJS

**Solution:** Already fixed - using dynamic import() for nanoid

## Environment Variables

Each PR preview environment gets:

- `NODE_ENV=preview`
- `PORT=3000`
- `PR_NUMBER=<pull request number>`
- `DB_NAME=myapp_pr_<PR_NUMBER>`
- `JWT_SECRET=preview-secret-<PR_NUMBER>`

## Manual Service Creation (Fallback)

If you must use a Project Token, you can manually create services:

1. Go to Railway Dashboard: `https://railway.app/project/<PROJECT_ID>`
2. Click **New Service**
3. Name it: `api-pr-<PR_NUMBER>` (e.g., `api-pr-7`)
4. Then re-run the GitHub Actions workflow

⚠️ **Not recommended** - defeats the purpose of automation!

## Cleanup

Services are automatically deleted when PRs are closed/merged via `.github/workflows/pr-preview-cleanup.yml`.

You can also manually delete services from Railway Dashboard if needed.

## Security Notes

- **Account Tokens** have broader permissions - use with caution
- Tokens are stored as GitHub Secrets (encrypted)
- Each PR gets an isolated environment
- Services are automatically cleaned up on PR close

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Check Railway deployment logs
3. Verify token type (Account Token vs Project Token)
4. Ensure Project ID is correct
