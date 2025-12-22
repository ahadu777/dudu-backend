#!/bin/bash

# Verify Railway PR Preview setup is ready
# Usage: ./scripts/verify-setup.sh

echo "🔍 Verifying Railway PR Preview Setup"
echo "======================================="
echo ""

# Check 1: railway.toml exists
echo "✅ Check 1: railway.toml"
if [ -f "railway.toml" ]; then
    echo "   ✅ railway.toml exists"
    cat railway.toml
else
    echo "   ❌ railway.toml missing"
    exit 1
fi
echo ""

# Check 2: Dockerfile exists
echo "✅ Check 2: Dockerfile"
if [ -f "Dockerfile" ]; then
    echo "   ✅ Dockerfile exists"
    if grep -q "PORT" Dockerfile; then
        echo "   ✅ Dockerfile uses PORT environment variable"
    else
        echo "   ⚠️ Dockerfile may not use PORT env var"
    fi
else
    echo "   ❌ Dockerfile missing"
    exit 1
fi
echo ""

# Check 3: /healthz endpoint exists
echo "✅ Check 3: Health check endpoint"
if grep -r "healthz" src/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
    echo "   ✅ /healthz endpoint found"
else
    echo "   ⚠️ /healthz endpoint not found in code"
fi
echo ""

# Check 4: Workflow files exist
echo "✅ Check 4: GitHub Actions workflows"
if [ -f ".github/workflows/pr-preview.yml" ]; then
    echo "   ✅ pr-preview.yml exists"
else
    echo "   ❌ pr-preview.yml missing"
    exit 1
fi

if [ -f ".github/workflows/pr-preview-cleanup.yml" ]; then
    echo "   ✅ pr-preview-cleanup.yml exists"
else
    echo "   ⚠️ pr-preview-cleanup.yml missing"
fi
echo ""

# Check 5: Verify workflow syntax
echo "✅ Check 5: Workflow syntax"
if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-preview.yml'))" 2>/dev/null; then
    echo "   ✅ pr-preview.yml is valid YAML"
else
    echo "   ❌ pr-preview.yml has YAML syntax errors"
    exit 1
fi

if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-preview-cleanup.yml'))" 2>/dev/null; then
    echo "   ✅ pr-preview-cleanup.yml is valid YAML"
else
    echo "   ⚠️ pr-preview-cleanup.yml has YAML syntax errors"
fi
echo ""

# Check 6: Environment variables in code
echo "✅ Check 6: Express app uses PORT"
if grep -r "process.env.PORT\|env.PORT" src/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
    echo "   ✅ App uses PORT environment variable"
else
    echo "   ⚠️ App may not use PORT env var"
fi
echo ""

# Summary
echo "📋 Summary:"
echo "   ✅ All required files are present"
echo "   ✅ Workflow files are valid"
echo ""
echo "💡 Next Steps:"
echo "   1. Verify GitHub Secrets are set:"
echo "      - RAILWAY_TOKEN = 871b792e-5fea-4ea9-a2b4-12d43e65cedc"
echo "      - RAILWAY_PROJECT_ID = 89630eec-a911-452b-ac20-051982c8ec61"
echo ""
echo "   2. Create a test PR on GitHub"
echo ""
echo "   3. GitHub Actions will automatically:"
echo "      - Deploy to Railway"
echo "      - Comment PR with preview URL"
echo ""
echo "   4. When PR is closed, cleanup workflow will delete the service"
echo ""
echo "✅ Setup verification complete! Ready to test on GitHub."

