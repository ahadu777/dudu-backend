# Testing Railway API Locally

This guide helps you test Railway API integration locally before pushing to GitHub.

## Prerequisites

1. **Railway Token**: Your Railway API token
2. **Railway Project ID**: Your Railway project UUID
3. **jq**: JSON processor (install with `sudo apt-get install jq` or `brew install jq`)

## Quick Test

```bash
# Set your Railway credentials
export RAILWAY_TOKEN="871b792e-5fea-4ea9-a2b4-12d43e65cedc"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"

# Run the test script
./scripts/test-railway-api.sh
```

## What the Test Does

1. **Lists Services**: Tests if you can list services in your Railway project
2. **Creates Service**: Tests if you can create a new service via API
3. **Verifies Service**: Confirms the service was created successfully
4. **Cleans Up**: Deletes the test service

## Expected Output

If everything works, you should see:

```
🧪 Testing Railway API Integration
==================================

✅ RAILWAY_TOKEN is set (length: 36)
✅ RAILWAY_PROJECT_ID: 89630eec-a911-452b-ac20-051982c8ec61

🔍 Test Configuration:
  - Service Name: api-pr-test-1234567890
  - Project ID: 89630eec-a911-452b-ac20-051982c8ec61
  - API Base: https://api.railway.app/v1

📋 Test 1: Listing services...
  HTTP Status: 200
  ✅ Successfully listed services
  📊 Found X service(s)

🆕 Test 2: Creating test service...
  HTTP Status: 201
  ✅ Successfully created service
  Service ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

🔍 Test 3: Verifying service exists...
  ✅ Service verified successfully

🗑️  Test 4: Cleaning up test service...
  ✅ Successfully deleted test service

✅ All tests passed!
```

## Troubleshooting

### Error: HTTP 401 (Unauthorized)
- Your `RAILWAY_TOKEN` is invalid or expired
- Generate a new token from Railway dashboard

### Error: HTTP 404 (Not Found)
- Your `RAILWAY_PROJECT_ID` is incorrect
- Check your Railway project URL: `https://railway.app/project/<PROJECT_ID>`

### Error: HTTP 403 (Forbidden)
- Your token doesn't have permission to create services
- Check your Railway account permissions

### Error: jq command not found
- Install jq: `sudo apt-get install jq` (Linux) or `brew install jq` (Mac)

## Manual API Test

You can also test manually with curl:

```bash
# List services
curl -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  "https://api.railway.app/v1/projects/${RAILWAY_PROJECT_ID}/services" | jq

# Create a service
curl -X POST \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-service","projectId":"'${RAILWAY_PROJECT_ID}'"}' \
  "https://api.railway.app/v1/services" | jq
```

## Next Steps

Once the local test passes:
1. ✅ Verify your GitHub secrets are set correctly
2. ✅ Push your changes to GitHub
3. ✅ Create a test PR
4. ✅ Check the GitHub Actions logs

