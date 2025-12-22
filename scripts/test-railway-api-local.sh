#!/bin/bash

# Test Railway API directly (works locally without Railway CLI login)
# Usage: ./scripts/test-railway-api-local.sh

set -e

echo "🧪 Testing Railway API Locally (Direct API Calls)"
echo "=================================================="
echo ""

# Set Railway credentials
export RAILWAY_TOKEN="871b792e-5fea-4ea9-a2b4-12d43e65cedc"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"

# Test PR number
export PR_NUMBER="999"
SERVICE_NAME="api-pr-${PR_NUMBER}"

RAILWAY_API="https://api.railway.app/v1"

echo "📋 Test Configuration:"
echo "  - Service Name: ${SERVICE_NAME}"
echo "  - Project ID: ${RAILWAY_PROJECT_ID}"
echo "  - PR Number: ${PR_NUMBER}"
echo "  - API Base: ${RAILWAY_API}"
echo ""

# Install jq if not present
if ! command -v jq &> /dev/null; then
    echo "📦 Installing jq..."
    sudo apt-get update && sudo apt-get install -y jq || {
        echo "⚠️ Could not install jq, some tests may fail"
    }
fi

# Test 1: Verify authentication by listing projects
echo "🔐 Test 1: Verifying Railway API authentication..."
PROJECTS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/projects" 2>&1)

HTTP_CODE=$(echo "$PROJECTS_RESPONSE" | tail -n1)
PROJECTS_JSON=$(echo "$PROJECTS_RESPONSE" | sed '$d')

echo "  HTTP Status: ${HTTP_CODE}"

if [ "$HTTP_CODE" == "200" ]; then
    echo "  ✅ Authentication successful!"
    PROJECT_NAME=$(echo "$PROJECTS_JSON" | jq -r ".[] | select(.id == \"${RAILWAY_PROJECT_ID}\") | .name" 2>/dev/null || echo "")
    if [ -n "$PROJECT_NAME" ]; then
        echo "  ✅ Found project: ${PROJECT_NAME}"
    fi
else
    echo "  ❌ Authentication failed"
    echo "  Response: ${PROJECTS_JSON}"
    exit 1
fi
echo ""

# Test 2: List services in project
echo "📋 Test 2: Listing services in project..."
SERVICES_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/projects/${RAILWAY_PROJECT_ID}/services" 2>&1)

HTTP_CODE=$(echo "$SERVICES_RESPONSE" | tail -n1)
SERVICES_JSON=$(echo "$SERVICES_RESPONSE" | sed '$d')

echo "  HTTP Status: ${HTTP_CODE}"

if [ "$HTTP_CODE" == "200" ]; then
    SERVICE_COUNT=$(echo "$SERVICES_JSON" | jq '. | length' 2>/dev/null || echo "0")
    echo "  ✅ Found ${SERVICE_COUNT} service(s)"
    
    # Check if test service exists
    SERVICE_EXISTS=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .name" 2>/dev/null || echo "")
    if [ -n "$SERVICE_EXISTS" ]; then
        SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .id" 2>/dev/null || echo "")
        echo "  ⚠️ Service ${SERVICE_NAME} already exists (ID: ${SERVICE_ID})"
    else
        echo "  ✅ Service ${SERVICE_NAME} does not exist (will be created)"
    fi
else
    echo "  ❌ Failed to list services"
    echo "  Response: ${SERVICES_JSON}"
    exit 1
fi
echo ""

# Test 3: Test service creation (optional)
echo "🔍 Test 3: Testing service creation..."
read -p "Do you want to test creating a service? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  🆕 Creating service ${SERVICE_NAME}..."
    
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"${SERVICE_NAME}\",\"projectId\":\"${RAILWAY_PROJECT_ID}\"}" \
      "${RAILWAY_API}/services" 2>&1)
    
    CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
    CREATE_JSON=$(echo "$CREATE_RESPONSE" | sed '$d')
    
    echo "  HTTP Status: ${CREATE_HTTP_CODE}"
    echo "  Response: ${CREATE_JSON}"
    
    if [ "$CREATE_HTTP_CODE" == "200" ] || [ "$CREATE_HTTP_CODE" == "201" ]; then
        SERVICE_ID=$(echo "$CREATE_JSON" | jq -r '.id // empty' 2>/dev/null || echo "")
        if [ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
            echo "  ✅ Service created successfully (ID: ${SERVICE_ID})"
            
            # Cleanup: Delete test service
            echo ""
            read -p "Delete test service? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
                  -X DELETE \
                  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
                  -H "Content-Type: application/json" \
                  "${RAILWAY_API}/services/${SERVICE_ID}" 2>&1)
                DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
                if [ "$DELETE_HTTP_CODE" == "200" ] || [ "$DELETE_HTTP_CODE" == "204" ]; then
                    echo "  ✅ Test service deleted"
                else
                    echo "  ⚠️ Could not delete test service (HTTP ${DELETE_HTTP_CODE})"
                fi
            fi
        else
            echo "  ⚠️ Service creation response missing ID"
        fi
    else
        echo "  ❌ Service creation failed"
    fi
else
    echo "  ⏭️ Skipping service creation test"
fi

echo ""
echo "✅ All API tests completed!"
echo ""
echo "💡 Summary:"
echo "   - Railway API authentication: ✅ Working"
echo "   - Can list services: ✅ Working"
echo "   - Ready to deploy via GitHub Actions"
echo ""
echo "📝 Note: Railway CLI requires interactive login locally,"
echo "   but GitHub Actions will work with RAILWAY_TOKEN env var."

