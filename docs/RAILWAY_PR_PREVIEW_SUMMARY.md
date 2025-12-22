# Railway PR Preview - Implementation Summary

## ✅ Implementation Complete

Automatic Preview Environments for Pull Requests using Railway have been implemented.

## Files Created/Modified

### 1. Dockerfile (Updated)
- ✅ Uses `PORT` environment variable (defaults to 3000)
- ✅ Health check uses dynamic PORT
- ✅ Production-ready multi-stage build

### 2. GitHub Actions Workflows

#### `.github/workflows/pr-preview.yml`
**Purpose:** Deploy preview environment on PR open/update

**Triggers:**
- `pull_request.opened`
- `pull_request.synchronize` 
- `pull_request.reopened`

**Actions:**
1. Authenticates with Railway
2. Creates/updates service `api-pr-<PR_NUMBER>`
3. Sets PR-scoped environment variables
4. Deploys Express app
5. Comments on PR with preview URL

#### `.github/workflows/pr-preview-cleanup.yml`
**Purpose:** Clean up preview environment on PR close

**Triggers:**
- `pull_request.closed`

**Actions:**
1. Authenticates with Railway
2. Deletes service `api-pr-<PR_NUMBER>`
3. Comments on PR confirming cleanup

### 3. Environment Configuration

#### `src/config/env.ts` (Updated)
- ✅ Added `preview` to NODE_ENV choices
- ✅ Added `PR_NUMBER` environment variable support

## Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway authentication token |
| `RAILWAY_PROJECT_ID` | Railway project UUID |

## Environment Variables Set Automatically

Each preview environment gets:

```bash
NODE_ENV=preview
PORT=3000
PR_NUMBER=<PR_NUMBER>
DB_NAME=myapp_pr_<PR_NUMBER>
JWT_SECRET=preview-secret-<PR_NUMBER>
USE_DATABASE=false
SWAGGER_ENABLED=true
```

## Service Naming Convention

- Format: `api-pr-<PR_NUMBER>`
- Example: PR #142 → `api-pr-142`
- Each PR gets isolated service

## Preview URL Format

Railway generates URLs like:
- `https://api-pr-<PR_NUMBER>.up.railway.app`
- Or custom domain if configured

## Example PR Comment

When a PR is opened/updated, it receives:

```markdown
## 🚀 Preview Environment Deployed

**Preview API URL:** https://api-pr-142.up.railway.app

**PR Details:**
- PR #142
- Branch: `feature/new-api`

**Environment:**
- NODE_ENV: `preview`
- PORT: `3000`
- PR_NUMBER: `142`
- DB_NAME: `myapp_pr_142`

**⚠️ Important Notes:**
- This is an ephemeral preview environment
- Data is isolated per PR and will be destroyed when PR is closed
- The environment is automatically updated on each push to this PR
- Access expires when PR is closed or merged

**Testing:**
- API Base URL: https://api-pr-142.up.railway.app
- Health Check: https://api-pr-142.up.railway.app/healthz
- Swagger Docs: https://api-pr-142.up.railway.app/docs
```

## Setup Instructions

1. **Get Railway Token:**
   - Railway Dashboard → Settings → Tokens → New Token

2. **Get Project ID:**
   - Railway Dashboard → Project Settings → General → Project ID

3. **Add GitHub Secrets:**
   - Repository → Settings → Secrets → Actions
   - Add `RAILWAY_TOKEN` and `RAILWAY_PROJECT_ID`

4. **Test:**
   - Create a test PR
   - Workflow should automatically deploy
   - Check PR comments for preview URL

## Workflow Behavior

### On PR Open/Update:
1. ✅ Creates Railway service (if new PR)
2. ✅ Updates service (if PR updated)
3. ✅ Sets environment variables
4. ✅ Deploys Express app
5. ✅ Comments on PR with URL

### On PR Close:
1. ✅ Deletes Railway service
2. ✅ Comments on PR confirming cleanup

## Troubleshooting

### Workflow Fails
- Verify secrets are set correctly
- Check Railway token is valid
- Ensure Railway project ID is correct

### Service Not Created
- Check Railway account limits
- Verify project has available resources
- Check Railway dashboard for errors

### URL Not Accessible
- Wait 1-2 minutes after deployment
- Check Railway service logs
- Verify service is running (not crashed)

## Next Steps

1. Add Railway secrets to GitHub
2. Create a test PR
3. Verify deployment works
4. Test preview URL
5. Close PR to verify cleanup

## Support

See `docs/RAILWAY_SETUP.md` for detailed setup guide.

