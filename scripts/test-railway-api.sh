#!/bin/bash

# Test Railway API calls locally
# Usage: ./scripts/test-railway-api.sh

set -e

echo "🧪 Testing Railway API Integration"
echo "=================================="
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

echo "✅ RAILWAY_TOKEN is set (length: ${#RAILWAY_TOKEN})"
echo "✅ RAILWAY_PROJECT_ID: ${RAILWAY_PROJECT_ID}"
echo ""

# Test service name
SERVICE_NAME="api-pr-test-$(date +%s)"
PROJECT_ID="$RAILWAY_PROJECT_ID"
RAILWAY_API="https://api.railway.app/v1"

echo "🔍 Test Configuration:"
echo "  - Service Name: ${SERVICE_NAME}"
echo "  - Project ID: ${PROJECT_ID}"
echo "  - API Base: ${RAILWAY_API}"
echo ""

# Test 1: List services
echo "📋 Test 1: Listing services..."
SERVICES_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/projects/${PROJECT_ID}/services" 2>&1)

HTTP_CODE=$(echo "$SERVICES_RESPONSE" | tail -n1)
SERVICES_JSON=$(echo "$SERVICES_RESPONSE" | sed '$d')

echo "  HTTP Status: ${HTTP_CODE}"
if [ "$HTTP_CODE" == "200" ]; then
    echo "  ✅ Successfully listed services"
    SERVICE_COUNT=$(echo "$SERVICES_JSON" | jq '. | length' 2>/dev/null || echo "0")
    echo "  📊 Found ${SERVICE_COUNT} service(s)"
    if [ "$SERVICE_COUNT" -gt 0 ]; then
        echo "  Services:"
        echo "$SERVICES_JSON" | jq -r '.[] | "    - \(.name) (ID: \(.id))"' 2>/dev/null || echo "    (Could not parse service list)"
    fi
else
    echo "  ❌ Failed to list services"
    echo "  Response: ${SERVICES_JSON}"
    exit 1
fi
echo ""

# Test 2: Create a test service
echo "🆕 Test 2: Creating test service..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${SERVICE_NAME}\",\"projectId\":\"${PROJECT_ID}\"}" \
  "${RAILWAY_API}/services" 2>&1)

CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
CREATE_JSON=$(echo "$CREATE_RESPONSE" | sed '$d')

echo "  HTTP Status: ${CREATE_HTTP_CODE}"
echo "  Response: ${CREATE_JSON}"

if [ "$CREATE_HTTP_CODE" == "200" ] || [ "$CREATE_HTTP_CODE" == "201" ]; then
    SERVICE_ID=$(echo "$CREATE_JSON" | jq -r '.id // empty' 2>/dev/null || echo "")
    if [ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ] && [ "$SERVICE_ID" != "" ]; then
        echo "  ✅ Successfully created service"
        echo "  Service ID: ${SERVICE_ID}"
        
        # Test 3: Verify service exists
        echo ""
        echo "🔍 Test 3: Verifying service exists..."
        sleep 2
        VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
          -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
          -H "Content-Type: application/json" \
          "${RAILWAY_API}/projects/${PROJECT_ID}/services" 2>&1)
        
        VERIFY_HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
        VERIFY_JSON=$(echo "$VERIFY_RESPONSE" | sed '$d')
        
        VERIFY_SERVICE_ID=$(echo "$VERIFY_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .id" 2>/dev/null || echo "")
        
        if [ "$VERIFY_SERVICE_ID" == "$SERVICE_ID" ]; then
            echo "  ✅ Service verified successfully"
        else
            echo "  ⚠️ Service created but not found in list (might need more time)"
        fi
        
        # Test 4: Cleanup - Delete test service
        echo ""
        echo "🗑️  Test 4: Cleaning up test service..."
        DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
          -X DELETE \
          -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
          -H "Content-Type: application/json" \
          "${RAILWAY_API}/services/${SERVICE_ID}" 2>&1)
        
        DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
        
        if [ "$DELETE_HTTP_CODE" == "200" ] || [ "$DELETE_HTTP_CODE" == "204" ]; then
            echo "  ✅ Successfully deleted test service"
        else
            echo "  ⚠️ Could not delete test service (HTTP ${DELETE_HTTP_CODE})"
            echo "  You may need to delete it manually: ${SERVICE_NAME}"
        fi
    else
        echo "  ❌ Service creation response missing ID"
        echo "  Full response: ${CREATE_JSON}"
        exit 1
    fi
else
    echo "  ❌ Failed to create service"
    echo "  Full response: ${CREATE_JSON}"
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "💡 Your Railway credentials are working correctly."
echo "   You can now push to GitHub and the workflow should work."

