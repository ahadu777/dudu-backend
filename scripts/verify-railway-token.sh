#!/bin/bash

# Verify Railway Token Type
# Usage: ./scripts/verify-railway-token.sh

set -e

echo "🔍 Verifying Railway Token Type"
echo "================================="
echo ""

# Set your token
export RAILWAY_TOKEN="${RAILWAY_TOKEN:-871b792e-5fea-4ea9-a2b4-12d43e65cedc}"
export RAILWAY_PROJECT_ID="${RAILWAY_PROJECT_ID:-89630eec-a911-452b-ac20-051982c8ec61}"

echo "📋 Token Info:"
echo "  - Token (first 10 chars): ${RAILWAY_TOKEN:0:10}..."
echo "  - Token length: ${#RAILWAY_TOKEN}"
echo "  - Project ID: ${RAILWAY_PROJECT_ID}"
echo ""

# Test 1: Check Railway CLI authentication
echo "🔐 Test 1: Railway CLI Authentication"
echo "--------------------------------------"
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found: $(railway --version)"
    
    # Try whoami (works with Account Token)
    echo ""
    echo "Testing 'railway whoami' (requires Account Token)..."
    WHOAMI_OUTPUT=$(railway whoami 2>&1 || echo "FAILED")
    
    if echo "$WHOAMI_OUTPUT" | grep -qi "not authenticated\|unauthorized\|please login"; then
        echo "  ❌ Railway CLI authentication failed"
        echo "  Output: ${WHOAMI_OUTPUT}"
        echo "  💡 This suggests the token might not be an Account Token"
    else
        echo "  ✅ Railway CLI authenticated successfully"
        echo "  Output: ${WHOAMI_OUTPUT}"
        echo "  💡 This suggests you have an Account Token"
    fi
else
    echo "⚠️ Railway CLI not found, installing..."
    npm install -g @railway/cli 2>&1 | tail -5 || echo "Installation failed"
fi
echo ""

# Test 2: Test Railway API directly
echo "🌐 Test 2: Railway API Authentication"
echo "--------------------------------------"
RAILWAY_API="https://api.railway.app/v1"

echo "Testing API authentication..."

# Try to get user info (Account Token)
echo ""
echo "Testing GET /user (requires Account Token)..."
USER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/user" 2>&1)

USER_HTTP_CODE=$(echo "$USER_RESPONSE" | tail -n1)
USER_JSON=$(echo "$USER_RESPONSE" | sed '$d')

echo "  HTTP Status: ${USER_HTTP_CODE}"
if [ "$USER_HTTP_CODE" == "200" ]; then
    echo "  ✅ Account Token works! (can access user info)"
    USER_EMAIL=$(echo "$USER_JSON" | jq -r '.email // empty' 2>/dev/null || echo "")
    if [ -n "$USER_EMAIL" ]; then
        echo "  📧 User Email: ${USER_EMAIL}"
    fi
else
    echo "  ❌ Account Token failed (HTTP ${USER_HTTP_CODE})"
    echo "  Response: ${USER_JSON}"
fi

# Try to get project info (Project Token)
echo ""
echo "Testing GET /projects/${RAILWAY_PROJECT_ID} (requires Project Token)..."
PROJECT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/projects/${RAILWAY_PROJECT_ID}" 2>&1)

PROJECT_HTTP_CODE=$(echo "$PROJECT_RESPONSE" | tail -n1)
PROJECT_JSON=$(echo "$PROJECT_RESPONSE" | sed '$d')

echo "  HTTP Status: ${PROJECT_HTTP_CODE}"
if [ "$PROJECT_HTTP_CODE" == "200" ]; then
    echo "  ✅ Project Token works! (can access project)"
    PROJECT_NAME=$(echo "$PROJECT_JSON" | jq -r '.name // empty' 2>/dev/null || echo "")
    if [ -n "$PROJECT_NAME" ]; then
        echo "  📦 Project Name: ${PROJECT_NAME}"
    fi
else
    echo "  ❌ Project Token failed (HTTP ${PROJECT_HTTP_CODE})"
    echo "  Response: ${PROJECT_JSON}"
fi

# Try to list projects (Account Token)
echo ""
echo "Testing GET /projects (requires Account Token)..."
PROJECTS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RAILWAY_API}/projects" 2>&1)

PROJECTS_HTTP_CODE=$(echo "$PROJECTS_RESPONSE" | tail -n1)
PROJECTS_JSON=$(echo "$PROJECTS_RESPONSE" | sed '$d')

echo "  HTTP Status: ${PROJECTS_HTTP_CODE}"
if [ "$PROJECTS_HTTP_CODE" == "200" ]; then
    PROJECT_COUNT=$(echo "$PROJECTS_JSON" | jq '. | length' 2>/dev/null || echo "0")
    echo "  ✅ Account Token works! (can list projects)"
    echo "  📊 Found ${PROJECT_COUNT} project(s)"
else
    echo "  ❌ Account Token failed (HTTP ${PROJECTS_HTTP_CODE})"
fi

echo ""
echo "📋 Summary:"
echo "==========="

if [ "$USER_HTTP_CODE" == "200" ] || [ "$PROJECTS_HTTP_CODE" == "200" ]; then
    echo "✅ Token Type: ACCOUNT TOKEN"
    echo "   - Can access user info and list projects"
    echo "   - May not work for Railway CLI in CI"
    echo ""
    echo "💡 Recommendation:"
    echo "   1. Go to Railway Dashboard → Your Project → Settings → Tokens"
    echo "   2. Generate a PROJECT TOKEN (not Account Token)"
    echo "   3. Update GitHub Secret RAILWAY_TOKEN with the Project Token"
elif [ "$PROJECT_HTTP_CODE" == "200" ]; then
    echo "✅ Token Type: PROJECT TOKEN"
    echo "   - Can access specific project"
    echo "   - Should work for Railway CLI in CI"
    echo ""
    echo "✅ Your token is correct! The issue might be elsewhere."
else
    echo "❌ Token Type: UNKNOWN or INVALID"
    echo "   - Token doesn't authenticate with Railway API"
    echo ""
    echo "💡 Recommendation:"
    echo "   1. Verify token is correct"
    echo "   2. Generate a new Project Token from Railway Dashboard"
    echo "   3. Update GitHub Secret RAILWAY_TOKEN"
fi

echo ""
echo "🔗 How to Generate Project Token:"
echo "   1. Go to: https://railway.app/project/${RAILWAY_PROJECT_ID}/settings/tokens"
echo "   2. Click 'Generate Token'"
echo "   3. Copy the token"
echo "   4. Update GitHub Secret: Settings → Secrets → Actions → RAILWAY_TOKEN"

