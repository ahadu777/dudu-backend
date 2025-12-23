#!/bin/bash

# Generate Railway public domain for a service
# Usage: ./scripts/generate-domain.sh <service-name> [port]
#        OR set SERVICE_NAME and PORT environment variables
# Example: ./scripts/generate-domain.sh api-pr-14 8080
#          SERVICE_NAME=api-pr-14 PORT=8080 ./scripts/generate-domain.sh

# Don't exit on error - we want to capture and show the error
set +e

# Allow service name and port to be passed as arguments or environment variables
SERVICE_NAME="${1:-${SERVICE_NAME}}"
PORT="${2:-${PORT:-8080}}"

# If PR_NUMBER is set, construct service name dynamically
if [ -z "$SERVICE_NAME" ] && [ -n "$PR_NUMBER" ]; then
  SERVICE_NAME="api-pr-${PR_NUMBER}"
fi

if [ -z "$SERVICE_NAME" ]; then
  echo "❌ Error: Service name is required"
  echo ""
  echo "Usage: $0 <service-name> [port]"
  echo "   OR: SERVICE_NAME=<name> PORT=<port> $0"
  echo "   OR: PR_NUMBER=<number> PORT=<port> $0"
  echo ""
  echo "Examples:"
  echo "  $0 api-pr-14 8080"
  echo "  SERVICE_NAME=api-pr-14 $0"
  echo "  PR_NUMBER=14 PORT=8080 $0"
  exit 1
fi

# Check if RAILWAY_TOKEN is set
if [ -z "$RAILWAY_TOKEN" ]; then
  echo "❌ Error: RAILWAY_TOKEN environment variable is not set"
  echo ""
  echo "Set it with: export RAILWAY_TOKEN='your-token-here'"
  exit 1
fi

echo "🔧 Generating public domain for service: ${SERVICE_NAME}"
echo "   Port: ${PORT}"
echo ""

# Export token for Railway CLI
export RAILWAY_TOKEN="${RAILWAY_TOKEN}"

# Create/update Railway CLI config file with token
# Railway CLI reads from ~/.railway/config.json or RAILWAY_TOKEN env var
echo "📝 Setting up Railway CLI authentication..."
mkdir -p ~/.railway

# Always update config file to ensure token is current
cat > ~/.railway/config.json << CONFIG_EOF
{
  "projects": {},
  "user": {
    "token": "${RAILWAY_TOKEN}"
  },
  "linkedFunctions": null
}
CONFIG_EOF
echo "✅ Railway CLI config file created/updated"

# Also ensure RAILWAY_TOKEN is exported (Railway CLI checks this too)
export RAILWAY_TOKEN="${RAILWAY_TOKEN}"
echo "✅ RAILWAY_TOKEN exported (length: ${#RAILWAY_TOKEN})"

# Verify Railway CLI can see the token
echo "🔍 Verifying Railway CLI authentication..."
WHOAMI_OUTPUT=$(railway whoami 2>&1 || echo "WHOAMI_FAILED")
if echo "$WHOAMI_OUTPUT" | grep -q "WHOAMI_FAILED\|Unauthorized\|login"; then
  echo "⚠️ Railway CLI authentication check failed"
  echo "   Output: ${WHOAMI_OUTPUT}"
  echo "   Note: This may be normal for Project Tokens - continuing anyway..."
else
  echo "✅ Railway CLI authentication verified"
  echo "   Output: ${WHOAMI_OUTPUT}"
fi
echo ""

# Verify Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "❌ Error: Railway CLI is not installed"
  echo ""
  echo "Install it with:"
  echo "  curl -fsSL https://railway.app/install.sh | sh"
  echo "  or"
  echo "  npm install -g @railway/cli"
  exit 1
fi

echo "✅ Railway CLI found: $(railway --version 2>&1 | head -1)"
echo ""

# Ensure railway.toml exists with project context (needed for Railway CLI)
if [ -n "$RAILWAY_PROJECT_ID" ] && [ ! -f railway.toml ]; then
  echo "📝 Creating railway.toml with project context..."
  printf 'project = "%s"\n\n[build]\nbuilder = "DOCKERFILE"\n\n[deploy]\nstartCommand = "npm start"\nhealthcheckPath = "/healthz"\n' "${RAILWAY_PROJECT_ID}" > railway.toml
  echo "✅ railway.toml created"
elif [ -f railway.toml ]; then
  echo "✅ railway.toml exists"
fi

# Try linking project if RAILWAY_PROJECT_ID is available
if [ -n "$RAILWAY_PROJECT_ID" ]; then
  echo "🔗 Attempting to link Railway project..."
  LINK_OUTPUT=$(railway link --project "${RAILWAY_PROJECT_ID}" 2>&1 || echo "LINK_FAILED")
  if echo "$LINK_OUTPUT" | grep -q "LINK_FAILED\|Error\|Unauthorized"; then
    echo "⚠️ Project linking failed or not needed"
    echo "   Output: ${LINK_OUTPUT}"
    echo "   Continuing with domain command..."
  else
    echo "✅ Project linked successfully"
  fi
fi

# Generate domain using Railway CLI
echo "📤 Running: railway domain -s ${SERVICE_NAME} --port ${PORT}"
echo ""

# Run Railway CLI command and capture both stdout and stderr
# Use a temporary file to ensure we capture all output even if command fails
TEMP_OUTPUT=$(mktemp)
railway domain -s "${SERVICE_NAME}" --port "${PORT}" > "${TEMP_OUTPUT}" 2>&1
EXIT_CODE=$?

# Read the output
DOMAIN_OUTPUT=$(cat "${TEMP_OUTPUT}")
rm -f "${TEMP_OUTPUT}"

# Always show the output for debugging
echo "═══════════════════════════════════════════════════════════"
echo "Railway CLI Command Output:"
echo "═══════════════════════════════════════════════════════════"
if [ -n "$DOMAIN_OUTPUT" ]; then
  echo "${DOMAIN_OUTPUT}"
else
  echo "(no output)"
fi
echo "═══════════════════════════════════════════════════════════"
echo "Exit code: ${EXIT_CODE}"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Domain generation successful!"
  echo ""
  echo "Output:"
  echo "${DOMAIN_OUTPUT}"
  echo ""
  
  # Extract domain from output
  # Format: "Service Domain created:\n🚀 https://api-pr-14-production.up.railway.app"
  DOMAIN=$(echo "$DOMAIN_OUTPUT" | grep -oE 'https?://[a-zA-Z0-9-]+-production\.up\.railway\.app' | head -n1 | sed 's|https\?://||' || echo "$DOMAIN_OUTPUT" | grep -oE '[a-zA-Z0-9-]+-production\.up\.railway\.app' | head -n1 || echo "")
  
  if [ -n "$DOMAIN" ]; then
    echo "✅ Public domain: ${DOMAIN}"
    echo "   Full URL: https://${DOMAIN}"
    echo ""
    echo "Domain generated successfully!"
    exit 0
  else
    echo "⚠️ Could not extract domain from output, but command succeeded"
    echo "   Check Railway dashboard to verify domain was created"
    exit 0
  fi
else
  echo "❌ Domain generation failed (exit code: ${EXIT_CODE})"
  echo ""
  echo "Error output:"
  echo "${DOMAIN_OUTPUT}"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   - Verify RAILWAY_TOKEN is valid"
  echo "   - Check if service '${SERVICE_NAME}' exists"
  echo "   - Ensure Railway CLI is authenticated: railway whoami"
  echo "   - Try linking project: railway link"
  exit 1
fi

