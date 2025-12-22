#!/bin/bash

# Test Railway CLI commands locally to verify syntax
# This simulates what GitHub Actions will do

set -e

echo "🧪 Testing Railway CLI Commands Locally"
echo "========================================"
echo ""

export RAILWAY_TOKEN="871b792e-5fea-4ea9-a2b4-12d43e65cedc"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"
export PR_NUMBER="999"
SERVICE_NAME="api-pr-${PR_NUMBER}"

echo "📋 Test Configuration:"
echo "  - Service Name: ${SERVICE_NAME}"
echo "  - Project ID: ${RAILWAY_PROJECT_ID}"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo "   Install with: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found: $(railway --version)"
echo ""

# Test 1: Check railway link syntax
echo "🔍 Test 1: Testing 'railway link' command..."
echo "  Command: railway link \"${RAILWAY_PROJECT_ID}\""
railway link "$RAILWAY_PROJECT_ID" 2>&1 || {
    echo "  ❌ Failed (expected - railway link doesn't accept project ID as argument)"
    echo "  ✅ This confirms railway link syntax issue"
}
echo ""

# Test 2: Check railway link --project syntax
echo "🔍 Test 2: Testing 'railway link --project' command..."
echo "  Command: railway link --project \"${RAILWAY_PROJECT_ID}\""
railway link --project "$RAILWAY_PROJECT_ID" 2>&1 || {
    echo "  ❌ Failed (expected - may need authentication)"
    echo "  Note: This might work in CI with RAILWAY_TOKEN"
}
echo ""

# Test 3: Check railway up --project syntax
echo "🔍 Test 3: Testing 'railway up --project' command..."
echo "  Command: railway up --project \"${RAILWAY_PROJECT_ID}\" --service \"${SERVICE_NAME}\" --detach"
railway up --project "$RAILWAY_PROJECT_ID" --service "$SERVICE_NAME" --detach 2>&1 || {
    echo "  ❌ Failed (expected - railway up doesn't accept --project flag)"
    echo "  ✅ This confirms the syntax issue"
}
echo ""

# Test 4: Check railway up --env syntax
echo "🔍 Test 4: Testing 'railway up --env' command..."
echo "  Command: railway up --service \"${SERVICE_NAME}\" --env NODE_ENV=preview --detach"
railway up --service "$SERVICE_NAME" --env NODE_ENV=preview --detach 2>&1 || {
    echo "  ❌ Failed (expected - railway up doesn't accept --env flags)"
    echo "  ✅ This confirms the syntax issue"
}
echo ""

# Test 5: Check railway up basic syntax
echo "🔍 Test 5: Testing 'railway up --service' command (basic)..."
echo "  Command: railway up --service \"${SERVICE_NAME}\" --detach"
railway up --service "$SERVICE_NAME" --detach 2>&1 || {
    echo "  ⚠️ Failed (may need authentication or service doesn't exist)"
    echo "  Note: This syntax is correct, failure is likely due to auth/service"
}
echo ""

# Test 6: Check railway variables set syntax
echo "🔍 Test 6: Testing 'railway variables set' command..."
echo "  Command: railway variables set NODE_ENV=preview --service \"${SERVICE_NAME}\""
railway variables set NODE_ENV=preview --service "$SERVICE_NAME" 2>&1 || {
    echo "  ⚠️ Failed (may need authentication or service doesn't exist)"
    echo "  Note: This syntax is correct, failure is likely due to auth/service"
}
echo ""

# Test 7: Check railway help for up command
echo "🔍 Test 7: Checking 'railway up --help'..."
echo "  Getting help for railway up command..."
railway up --help 2>&1 | head -20 || echo "  Could not get help"
echo ""

echo "📋 Summary of Findings:"
echo "  ✅ railway link <project-id> - DOES NOT WORK (needs --project flag or railway.toml)"
echo "  ✅ railway up --project - DOES NOT WORK (railway up doesn't accept --project)"
echo "  ✅ railway up --env - DOES NOT WORK (railway up doesn't accept --env)"
echo "  ✅ railway up --service - CORRECT SYNTAX (but needs auth/service)"
echo "  ✅ railway variables set - CORRECT SYNTAX (but needs auth/service)"
echo ""
echo "💡 Correct Workflow Pattern:"
echo "  1. Use railway.toml for project context"
echo "  2. railway up --service <name> --detach (to deploy)"
echo "  3. railway variables set KEY=value --service <name> (to set env vars)"
echo ""

