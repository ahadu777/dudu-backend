# How to Verify Railway Token Type

## Step 1: Check Token in Railway Dashboard

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app/project/89630eec-a911-452b-ac20-051982c8ec61/settings/tokens

2. **Check Existing Tokens:**
   - Look at the list of tokens
   - See if token starting with `871b792e-5fea-4ea9-a2b4-12d43e65cedc` exists
   - Check the token type (Account Token vs Project Token)

## Step 2: Generate a New Project Token (Recommended)

If you don't have a Project Token:

1. **In Railway Dashboard:**
   - Go to: https://railway.app/project/89630eec-a911-452b-ac20-051982c8ec61/settings/tokens
   - Click **"Generate Token"** or **"New Token"**
   - Select **"Project Token"** (not Account Token)
   - Copy the token immediately (you won't see it again)

2. **Update GitHub Secret:**
   - Go to: https://github.com/ahadu777/dudu-backend/settings/secrets/actions
   - Find `RAILWAY_TOKEN` secret
   - Click **"Update"**
   - Paste the new Project Token
   - Save

## Step 3: Verify Token Works

After updating the token, test it:

```bash
export RAILWAY_TOKEN="your-new-project-token"
railway whoami
```

If it works, you should see your Railway account info.

## Token Types Explained

- **Account Token**: Works for `railway whoami`, can list all projects
- **Project Token**: Works for specific project operations, required for CI/CD

For GitHub Actions, you need a **Project Token**.

