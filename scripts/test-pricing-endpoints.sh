#!/bin/bash

# Test script for Complex Pricing Engine endpoints
# Following Definition of Done workflow

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "🧪 Testing Complex Pricing Engine Endpoints"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -n "Testing: $name... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        if [ -n "$body" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        ((FAILED++))
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 1: Get pricing rules for product 106
echo "1. GET /pricing/rules/:product_id"
test_endpoint "Get pricing rules for product 106" "GET" "/pricing/rules/106" "" 200
echo ""

# Test 2: Get pricing rules for invalid product
test_endpoint "Get pricing rules for non-existent product" "GET" "/pricing/rules/999" "" 404
echo ""

# Test 3: Calculate pricing - 2 adults on weekday
echo "2. POST /pricing/calculate"
test_endpoint "2 adults on weekday (Product 106)" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-11-10"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 2}
  ]
}' 200
echo ""

# Test 4: Calculate pricing - 2 adults on weekend
test_endpoint "2 adults on weekend (Product 106)" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-11-15"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 2}
  ]
}' 200
echo ""

# Test 5: Calculate pricing - mixed customer types
test_endpoint "Mixed: 1 adult, 2 children on weekday" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-11-10"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 1},
    {"customer_type": "child", "count": 2}
  ]
}' 200
echo ""

# Test 6: Calculate pricing with addons
test_endpoint "2 adults with addon (Plan A)" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-11-10"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 2}
  ],
  "addons": [
    {"addon_id": "tokens-plan-a", "quantity": 1}
  ]
}' 200
echo ""

# Test 7: Special date pricing
test_endpoint "Special date (2025-12-31)" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-12-31"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 1}
  ]
}' 200
echo ""

# Test 8: Product 107 (Pet Plan) - flat rate
test_endpoint "Pet Plan - 2 adults" "POST" "/pricing/calculate" '{
  "product_id": 107,
  "booking_dates": ["2025-11-15"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 2}
  ]
}' 200
echo ""

# Test 9: Product 108 (Deluxe Tea Set)
test_endpoint "Deluxe Tea Set - 1 adult on weekend" "POST" "/pricing/calculate" '{
  "product_id": 108,
  "booking_dates": ["2025-11-15"],
  "customer_breakdown": [
    {"customer_type": "adult", "count": 1}
  ]
}' 200
echo ""

# Test 10: Error cases
echo "3. Error Handling"
test_endpoint "Missing product_id" "POST" "/pricing/calculate" '{
  "booking_dates": ["2025-11-10"],
  "customer_breakdown": [{"customer_type": "adult", "count": 1}]
}' 400
echo ""

test_endpoint "Invalid customer type" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["2025-11-10"],
  "customer_breakdown": [{"customer_type": "invalid", "count": 1}]
}' 422
echo ""

test_endpoint "Invalid date format" "POST" "/pricing/calculate" '{
  "product_id": 106,
  "booking_dates": ["invalid-date"],
  "customer_breakdown": [{"customer_type": "adult", "count": 1}]
}' 422
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

