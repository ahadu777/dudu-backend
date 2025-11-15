#!/bin/bash

# Test Coverage Summary Tool
# Reads from actual docs/test-coverage/_index.yaml

COVERAGE_FILE="docs/test-coverage/_index.yaml"

echo "📊 PRD Test Coverage Overview"
echo "============================="

if [ ! -f "$COVERAGE_FILE" ]; then
    echo "❌ Coverage mapping file not found: $COVERAGE_FILE"
    echo "   Run: vim docs/test-coverage/_index.yaml"
    exit 1
fi

echo ""
echo "📋 Reading from: $COVERAGE_FILE"
echo ""

# Extract PRD sections and their status
while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*-[[:space:]]*prd_id:[[:space:]]*(.*)$ ]]; then
        PRD_ID="${BASH_REMATCH[1]}"
    elif [[ $line =~ ^[[:space:]]*title:[[:space:]]*\"(.*)\"$ ]]; then
        TITLE="${BASH_REMATCH[1]}"
    elif [[ $line =~ ^[[:space:]]*status:[[:space:]]*\"(.*)\"$ ]]; then
        STATUS="${BASH_REMATCH[1]}"

        # Determine status icon
        case "$STATUS" in
            "Mostly Covered") ICON="🟢" ;;
            "Partially Covered") ICON="🟠" ;;
            "Not Covered") ICON="🔴" ;;
            *) ICON="🟡" ;;
        esac

        echo "$ICON $PRD_ID: $TITLE ($STATUS)"

        # Extract test collections for this PRD and validate they exist
        echo "  Test Collections:"
        sed -n "/$PRD_ID/,/^[[:space:]]*-[[:space:]]*prd_id/p" "$COVERAGE_FILE" | \
        grep -E "^[[:space:]]*-[[:space:]]*\".*\.json\"$" | \
        sed 's/^[[:space:]]*-[[:space:]]*"//' | \
        sed 's/"$//' | \
        while read -r collection; do
            if [ -f "$collection" ]; then
                echo "    ✅ $collection"
            else
                echo "    ❌ $collection (FILE MISSING)"
            fi
        done

        # Extract coverage gaps
        GAPS=$(sed -n "/$PRD_ID/,/^[[:space:]]*-[[:space:]]*prd_id/p" "$COVERAGE_FILE" | \
               grep -A 10 "coverage_gaps:" | \
               grep "^[[:space:]]*-" | \
               head -3 | \
               sed 's/^[[:space:]]*-[[:space:]]*//' | \
               sed 's/"//g' | \
               tr '\n' ', ' | \
               sed 's/, $//')

        if [ -n "$GAPS" ]; then
            echo "  Gaps: $GAPS"
        fi
        echo ""
    fi
done < "$COVERAGE_FILE"

echo "⚠️  Critical Gaps (from YAML):"
grep -A 10 "critical_gaps:" "$COVERAGE_FILE" | \
grep "^[[:space:]]*-" | \
sed 's/^[[:space:]]*-[[:space:]]*/  • /' | \
sed 's/"//g'

echo ""
echo "🔧 Quick Commands:"
echo "  # Update mapping:"
echo "  vim $COVERAGE_FILE"
echo ""
echo "  # Run discovery analysis:"
echo "  node scripts/prd-test-mapper.mjs"
echo ""
echo "  # Validate a test collection exists:"
echo "  ls postman/auto-generated/*.json reports/collections/*.json"
echo ""
echo "  # Check if collections actually work:"
echo "  newman run postman/auto-generated/[collection-name].json"