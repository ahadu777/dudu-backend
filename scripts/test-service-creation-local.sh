#!/bin/bash

# Test Railway service creation locally
# Usage: ./scripts/test-service-creation-local.sh

set -e

export RAILWAY_TOKEN="9a4d3ecb-da9a-4fd0-a229-cd986e091302"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"
SERVICE_NAME="api-pr-test-local-$(date +%s)"

echo "🧪 Testing Railway Service Creation Locally"
echo "==========================================="
echo ""
echo "Service Name: ${SERVICE_NAME}"
echo "Project ID: ${RAILWAY_PROJECT_ID}"
echo ""

# Create railway.toml
cat > railway.toml << EOF
project = "${RAILWAY_PROJECT_ID}"

[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "npm start"
healthcheckPath = "/healthz"
EOF

echo "✅ Created railway.toml"
echo ""

# Test 1: Check Railway CLI status
echo "🔍 Test 1: Railway CLI Status"
echo "-----------------------------"
railway status 2>&1 | head -10 || echo "Status check failed"
echo ""

# Test 2: Try railway service add
echo "🔍 Test 2: Try 'railway service add'"
echo "-------------------------------------"
railway service add "$SERVICE_NAME" 2>&1 || {
    echo "⚠️ 'railway service add' failed or doesn't exist"
}
echo ""

# Test 3: Try railway up with non-existent service
echo "🔍 Test 3: Try 'railway up --service' with non-existent service"
echo "----------------------------------------------------------------"
echo "Command: railway up --service \"${SERVICE_NAME}\" --detach"
echo ""
read -p "Do you want to actually try deploying? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway up --service "$SERVICE_NAME" --detach 2>&1 || {
        echo ""
        echo "❌ Deployment failed - service doesn't exist"
        echo "💡 This confirms Railway CLI doesn't auto-create services"
    }
else
    echo "⏭️ Skipped actual deployment"
fi

echo ""
echo "📋 Summary:"
echo "==========="
echo "Railway CLI 'railway up --service' requires the service to exist first."
echo "Services must be created via:"
echo "  1. Railway Dashboard (manual)"
echo "  2. Railway API/GraphQL (programmatic)"
echo "  3. Railway CLI 'service add' (if it exists)"
echo ""
echo "💡 Solution: Create service via Railway API before deploying"

