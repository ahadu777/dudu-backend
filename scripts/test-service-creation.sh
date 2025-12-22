#!/bin/bash

# Test Railway service creation locally (simulates GitHub Actions workflow)
# Usage: ./scripts/test-service-creation.sh

set -e

echo "🧪 Testing Railway Service Creation (Local)"
echo "==========================================="
echo ""

# Check if required environment variables are set
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ ERROR: RAILWAY_TOKEN environment variable is not set"
    echo "   Set it with: export RAILWAY_TOKEN='your-token-here'"
    exit 1
fi

if [ -z "$RAILWAY_PROJECT_ID" ]; then
    echo "❌ ERROR: RAILWAY_PROJECT_ID environment variable is not set"
    echo "   Set it with: export RAILWAY_PROJECT_ID='your-project-id-here'"
    exit 1
fi

# Install Railway CLI via npm if not present
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI via npm..."
    npm install -g @railway/cli 2>&1 | tail -5 || {
        echo "⚠️ npm install failed, trying npx..."
        # Use npx as fallback
        alias railway="npx @railway/cli"
    }
fi

# Verify Railway CLI is available
if ! command -v railway &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Railway CLI not found and npx not available"
    echo "   Please install manually: npm install -g @railway/cli"
    exit 1
fi

# Use npx if railway command not found
if ! command -v railway &> /dev/null; then
    echo "ℹ️ Using npx to run Railway CLI"
    railway() {
        npx @railway/cli "$@"
    }
fi

echo "✅ RAILWAY_TOKEN is set (length: ${#RAILWAY_TOKEN})"
echo "✅ RAILWAY_PROJECT_ID: ${RAILWAY_PROJECT_ID}"
echo "✅ Railway CLI version: $(railway --version 2>&1 | head -1)"
echo ""

# Test service name (using PR number 999 for testing)
SERVICE_NAME="api-pr-999"
PROJECT_ID="$RAILWAY_PROJECT_ID"

echo "🔍 Test Configuration:"
echo "  - Service Name: ${SERVICE_NAME}"
echo "  - Project ID: ${PROJECT_ID}"
echo ""

# Verify authentication
echo "🔐 Step 1: Verifying Railway authentication..."
WHOAMI_OUTPUT=$(railway whoami 2>&1 || echo "")
if echo "$WHOAMI_OUTPUT" | grep -qi "not authenticated\|unauthorized\|error"; then
    echo "❌ Railway authentication failed"
    echo "   Output: ${WHOAMI_OUTPUT}"
    echo "   Check your RAILWAY_TOKEN"
    exit 1
fi
echo "✅ Railway authentication verified"
echo ""

# List services
echo "📋 Step 2: Listing services..."
SERVICES_JSON=$(railway service list --json 2>&1)
echo "Services response: ${SERVICES_JSON}"
echo ""

# Check for errors
if echo "$SERVICES_JSON" | grep -qi "error\|unauthorized\|not found\|not authenticated"; then
    echo "❌ Railway CLI error: ${SERVICES_JSON}"
    exit 1
fi

# Parse JSON safely
if [ -z "$SERVICES_JSON" ] || [ "$SERVICES_JSON" == "[]" ] || [ "$SERVICES_JSON" == "null" ]; then
    echo "📋 No services found"
    SERVICES_JSON="[]"
else
    SERVICE_COUNT=$(echo "$SERVICES_JSON" | jq '. | length' 2>/dev/null || echo "0")
    echo "✅ Found ${SERVICE_COUNT} service(s)"
fi
echo ""

# Check if test service exists
SERVICE_ID=""
if echo "$SERVICES_JSON" | jq -e ".[] | select(.name == \"${SERVICE_NAME}\")" > /dev/null 2>&1; then
    SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .id")
    echo "✅ Service ${SERVICE_NAME} already exists (ID: ${SERVICE_ID})"
else
    # Create new service
    echo "🆕 Step 3: Creating service ${SERVICE_NAME}..."
    SERVICE_OUTPUT=$(railway service create --name "${SERVICE_NAME}" --json 2>&1)
    echo "CLI create output: ${SERVICE_OUTPUT}"
    
    SERVICE_ID=$(echo "$SERVICE_OUTPUT" | jq -r '.id // empty' 2>/dev/null || echo "")
    
    # If creation failed, try without --json flag
    if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" == "null" ] || [ "$SERVICE_ID" == "" ]; then
        echo "⚠️ JSON creation failed, trying without --json flag..."
        railway service create "${SERVICE_NAME}" 2>&1 || echo "Create command executed"
        sleep 5
        # List again to get the service ID
        SERVICES_JSON=$(railway service list --json 2>&1 || echo "[]")
        SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .id" 2>/dev/null || echo "")
    fi
    
    if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" == "null" ] || [ "$SERVICE_ID" == "" ]; then
        echo "❌ ERROR: Could not create service ${SERVICE_NAME}"
        echo "📋 Debug info:"
        echo "  - Project ID: ${PROJECT_ID}"
        echo "  - Service Name: ${SERVICE_NAME}"
        echo "  - CLI Output: ${SERVICE_OUTPUT}"
        echo "  - Services List: ${SERVICES_JSON}"
        exit 1
    else
        echo "✅ Created service ${SERVICE_NAME} (ID: ${SERVICE_ID})"
    fi
fi
echo ""

# Verify SERVICE_ID is set
if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" == "null" ] || [ "$SERVICE_ID" == "" ]; then
    echo "❌ CRITICAL: SERVICE_ID is empty!"
    exit 1
fi

echo "✅ Final SERVICE_ID: ${SERVICE_ID}"
echo ""
echo "🎉 Test passed! Service creation works correctly."
echo ""
echo "💡 Next steps:"
echo "  1. Push your changes to GitHub"
echo "  2. Create a test PR"
echo "  3. The workflow should work the same way"
echo ""
echo "🗑️  To clean up, delete the test service:"
echo "   railway service delete ${SERVICE_ID} --yes"

