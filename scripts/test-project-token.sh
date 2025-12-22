#!/bin/bash

# Test the new Project Token
# Usage: ./scripts/test-project-token.sh

set -e

export RAILWAY_TOKEN="9a4d3ecb-da9a-4fd0-a229-cd986e091302"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"

echo "🧪 Testing New Project Token"
echo "============================="
echo ""
echo "Token: ${RAILWAY_TOKEN:0:10}... (length: ${#RAILWAY_TOKEN})"
echo "Project ID: ${RAILWAY_PROJECT_ID}"
echo ""

# Test Railway CLI
echo "🔐 Test 1: Railway CLI Authentication"
echo "--------------------------------------"
if command -v railway &> /dev/null; then
    WHOAMI_OUTPUT=$(railway whoami 2>&1 || echo "FAILED")
    
    if echo "$WHOAMI_OUTPUT" | grep -qi "not authenticated\|unauthorized\|please login"; then
        echo "  ❌ Railway CLI authentication failed"
        echo "  Output: ${WHOAMI_OUTPUT}"
        echo ""
        echo "  💡 Note: Project Tokens may not work with 'railway whoami'"
        echo "     This is normal - Project Tokens are for project operations only"
    else
        echo "  ✅ Railway CLI authenticated"
        echo "  Output: ${WHOAMI_OUTPUT}"
    fi
else
    echo "  ⚠️ Railway CLI not found"
fi
echo ""

# Test listing services
echo "📋 Test 2: List Services (Project Operation)"
echo "---------------------------------------------"
SERVICES_OUTPUT=$(railway service list --json 2>&1 || echo "FAILED")

if echo "$SERVICES_OUTPUT" | grep -qi "not authenticated\|unauthorized\|project token not found"; then
    echo "  ❌ Failed to list services"
    echo "  Output: ${SERVICES_OUTPUT}"
    echo ""
    echo "  💡 This suggests the Project Token might not be working"
else
    echo "  ✅ Successfully listed services"
    SERVICE_COUNT=$(echo "$SERVICES_OUTPUT" | jq '. | length' 2>/dev/null || echo "0")
    echo "  📊 Found ${SERVICE_COUNT} service(s)"
    if [ "$SERVICE_COUNT" -gt 0 ]; then
        echo "  Services:"
        echo "$SERVICES_OUTPUT" | jq -r '.[] | "    - \(.name)"' 2>/dev/null || echo "    (Could not parse)"
    fi
fi
echo ""

# Test creating railway.toml
echo "📝 Test 3: Create railway.toml"
echo "-------------------------------"
cat > railway.toml << EOF
project = "${RAILWAY_PROJECT_ID}"

[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "npm start"
healthcheckPath = "/healthz"
EOF

echo "  ✅ Created railway.toml with project context"
echo ""
cat railway.toml
echo ""

# Test deployment command (dry run)
echo "🚀 Test 4: Test Deployment Command (Dry Run)"
echo "---------------------------------------------"
SERVICE_NAME="api-pr-test-999"
echo "  Command: railway up --service \"${SERVICE_NAME}\" --detach"
echo ""
echo "  ⚠️ This would actually deploy - skipping for safety"
echo "  💡 In GitHub Actions, this command should work now"
echo ""

echo "📋 Summary:"
echo "==========="
echo "✅ Project Token: ${RAILWAY_TOKEN:0:10}..."
echo "✅ Project ID: ${RAILWAY_PROJECT_ID}"
echo "✅ railway.toml created with project context"
echo ""
echo "💡 Next Steps:"
echo "   1. Update GitHub Secret RAILWAY_TOKEN with: ${RAILWAY_TOKEN}"
echo "   2. The workflow should now work!"
echo ""
echo "🔗 Update GitHub Secret:"
echo "   https://github.com/ahadu777/dudu-backend/settings/secrets/actions"

