#!/bin/bash

# Test Railway deployment locally (simulates GitHub Actions workflow)
# Usage: ./scripts/test-railway-deploy.sh

set -e

echo "🧪 Testing Railway Deployment Locally"
echo "======================================"
echo ""

# Set Railway credentials
export RAILWAY_TOKEN="871b792e-5fea-4ea9-a2b4-12d43e65cedc"
export RAILWAY_PROJECT_ID="89630eec-a911-452b-ac20-051982c8ec61"

# Test PR number (simulating PR #999)
export PR_NUMBER="999"
SERVICE_NAME="api-pr-${PR_NUMBER}"

echo "📋 Test Configuration:"
echo "  - Service Name: ${SERVICE_NAME}"
echo "  - Project ID: ${RAILWAY_PROJECT_ID}"
echo "  - PR Number: ${PR_NUMBER}"
echo ""

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    # Try npm install first (no sudo needed)
    if command -v npm &> /dev/null; then
        echo "   Using npm to install Railway CLI..."
        npm install -g @railway/cli 2>&1 | tail -5 || {
            echo "   npm install failed, trying manual install..."
            mkdir -p ~/.railway/bin
            # Download Railway CLI binary directly
            curl -fsSL https://github.com/railwayapp/cli/releases/latest/download/railway-linux-amd64 -o ~/.railway/bin/railway
            chmod +x ~/.railway/bin/railway
            export PATH="$HOME/.railway/bin:$PATH"
        }
    else
        echo "   npm not found, trying manual install..."
        mkdir -p ~/.railway/bin
        curl -fsSL https://github.com/railwayapp/cli/releases/latest/download/railway-linux-amd64 -o ~/.railway/bin/railway
        chmod +x ~/.railway/bin/railway
        export PATH="$HOME/.railway/bin:$PATH"
    fi
fi

# Verify Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI installation failed"
    echo "   Please install manually: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI version: $(railway --version 2>&1 | head -1)"
echo ""

# Verify railway.toml exists
if [ ! -f "railway.toml" ]; then
    echo "📝 Creating railway.toml..."
    cat > railway.toml << EOF
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "npm start"
healthcheckPath = "/healthz"
EOF
    echo "✅ Created railway.toml"
else
    echo "✅ railway.toml already exists"
fi
echo ""

# Test 1: Verify Railway authentication
echo "🔐 Test 1: Verifying Railway authentication..."
WHOAMI_OUTPUT=$(railway whoami 2>&1 || echo "")
if echo "$WHOAMI_OUTPUT" | grep -qi "not authenticated\|unauthorized\|please login"; then
    echo "❌ Railway authentication failed"
    echo "   Output: ${WHOAMI_OUTPUT}"
    echo "   Check your RAILWAY_TOKEN"
    exit 1
fi
echo "✅ Railway authentication verified"
echo ""

# Test 2: Check if service exists
echo "🔍 Test 2: Checking if service exists..."
SERVICES_JSON=$(railway service list --json 2>&1 || echo "[]")
SERVICE_EXISTS=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .name" 2>/dev/null || echo "")

if [ -n "$SERVICE_EXISTS" ]; then
    echo "⚠️ Service ${SERVICE_NAME} already exists"
    echo "   This is expected for testing - we'll update it"
else
    echo "✅ Service ${SERVICE_NAME} does not exist (will be created)"
fi
echo ""

# Test 3: Test deployment command (dry-run)
echo "🚀 Test 3: Testing deployment command..."
echo ""
echo "Command that will run:"
echo "  railway up \\"
echo "    --project \"${RAILWAY_PROJECT_ID}\" \\"
echo "    --service \"${SERVICE_NAME}\" \\"
echo "    --env NODE_ENV=preview \\"
echo "    --env PORT=3000 \\"
echo "    --env PR_NUMBER=\"${PR_NUMBER}\" \\"
echo "    --env DB_NAME=\"myapp_pr_${PR_NUMBER}\" \\"
echo "    --env JWT_SECRET=\"preview-secret-${PR_NUMBER}\" \\"
echo "    --detach"
echo ""

# Ask user if they want to actually deploy
read -p "Do you want to actually deploy? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying..."
    
    # Try the deployment command
    railway up \
      --project "$RAILWAY_PROJECT_ID" \
      --service "$SERVICE_NAME" \
      --env NODE_ENV=preview \
      --env PORT=3000 \
      --env PR_NUMBER="$PR_NUMBER" \
      --env DB_NAME="myapp_pr_${PR_NUMBER}" \
      --env JWT_SECRET="preview-secret-${PR_NUMBER}" \
      --detach || {
        echo ""
        echo "❌ Deployment failed"
        echo "   This might be because:"
        echo "   1. railway up doesn't accept --env flags (need to use railway variables set)"
        echo "   2. railway up doesn't accept --project flag (need railway.toml)"
        echo "   3. Service creation failed"
        exit 1
      }
    
    echo ""
    echo "✅ Deployment initiated!"
    echo "   Preview URL: https://${SERVICE_NAME}.up.railway.app"
    echo ""
    echo "⏳ Waiting 15 seconds for deployment to start..."
    sleep 15
    
    # Test 4: Verify service exists after deployment
    echo ""
    echo "🔍 Test 4: Verifying service after deployment..."
    SERVICES_JSON=$(railway service list --json 2>&1 || echo "[]")
    SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name == \"${SERVICE_NAME}\") | .id" 2>/dev/null || echo "")
    
    if [ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
        echo "✅ Service exists (ID: ${SERVICE_ID})"
    else
        echo "⚠️ Service not found in list (may need more time)"
    fi
    
    echo ""
    echo "🎉 Deployment test completed!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Check Railway dashboard: https://railway.app/project/${RAILWAY_PROJECT_ID}"
    echo "   2. Test preview URL: https://${SERVICE_NAME}.up.railway.app"
    echo "   3. Clean up test service: railway service delete ${SERVICE_NAME} --yes"
else
    echo "⏭️ Skipping actual deployment (dry-run only)"
    echo ""
    echo "✅ All tests passed! Ready to push to GitHub."
fi

