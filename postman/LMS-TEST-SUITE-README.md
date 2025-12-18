# LMS Complete Test Suite - Postman Collection

## Overview

This Postman collection provides comprehensive test coverage for the Loan Management System (LMS) API with mock responses, payload structures, and Newman test assertions.

## Collection File

- **File**: `LMS-COMPLETE-TEST-SUITE.postman_collection.json`
- **Location**: `postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json`

## Running Tests

### Using Newman CLI

```bash
# Run all LMS tests
node scripts/run-lms-tests.js

# Or directly with Newman
npx newman run postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json
```

### Using Postman App

1. Import the collection: `postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json`
2. Set the `baseUrl` variable (default: `http://localhost:8080`)
3. Run the collection or individual folders

## Collection Structure

### 00 - Health & Setup
- **Health Check**: Verify LMS service is running
- **Reset LMS Store**: Clear all data for testing

### 01 - Borrower Registration
- **Register Borrower - Happy Path**: Create borrower with valid data
- **Register Borrower - Missing Required Fields**: Test validation
- **Register Borrower - Invalid SSN Format**: Test SSN format validation
- **Get Borrower by ID**: Retrieve borrower details
- **List All Borrowers**: Get all registered borrowers

### 02 - KYC Verification
- **KYC - Success (Verified)**: Run KYC verification
- **Get KYC Status**: Check current KYC status

### 03 - AML Screening
- **AML - Clear**: Run AML screening
- **Get AML Status**: Check current AML status

### 04 - Credit Bureau
- **Pull Credit Report**: Request credit report from mock bureau
- **Get Credit Report**: Retrieve latest credit report

### 05 - Loan Application
- **Create Loan Application**: Submit new loan application
- **Get Application**: Retrieve application details

### 06 - Credit Decision
- **Run Credit Decision**: Execute automated credit decision
- **Get Offers**: Retrieve loan offers for application
- **Accept Offer**: Accept a loan offer

### 07 - Audit Trail
- **Get Full Audit Log**: Retrieve complete audit log
- **Get Audit Log Filtered by Entity**: Filter audit entries

### 08 - Stats
- **Get LMS Stats**: Retrieve system statistics

## Mock Response Examples

The collection includes mock response examples for key endpoints:

### Borrower Created Response
```json
{
  "success": true,
  "data": {
    "id": "borrower-uuid-123",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567",
    "ssn_last_four": "6789",
    "status": "pending",
    "kyc_status": "pending",
    "aml_status": "pending",
    "created_at": "2025-01-15T10:30:00.000Z"
  },
  "request_id": "req-uuid-123",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### KYC Verified Response
```json
{
  "success": true,
  "data": {
    "request_id": "kyc-req-uuid-123",
    "borrower_id": "borrower-uuid-123",
    "status": "verified",
    "provider": "mock-kyc-provider",
    "identity_match_score": 95,
    "address_match": true,
    "ssn_match": true,
    "dob_match": true
  }
}
```

### Credit Report Response
```json
{
  "success": true,
  "data": {
    "request_id": "credit-req-uuid-123",
    "credit_score": 780,
    "score_model": "FICO Score 8",
    "score_factors": [
      {
        "code": "PAY01",
        "description": "Excellent payment history",
        "impact": "positive"
      }
    ],
    "tradelines": [...],
    "summary": {
      "total_accounts": 2,
      "utilization_ratio": 5,
      "derogatory_count": 0
    }
  }
}
```

## Payload Structures

### Create Borrower Request
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "ssn": "123456789",
  "date_of_birth": "1990-01-15",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  }
}
```

### Create Loan Application Request
```json
{
  "borrower_id": "borrower-uuid-123",
  "loan_type": "personal",
  "requested_amount": 15000,
  "requested_term_months": 36,
  "purpose": "Debt consolidation",
  "employment_status": "employed",
  "annual_income": 75000,
  "monthly_housing_payment": 1500
}
```

### KYC Verification Request
```json
{
  "ssn": "123456789"
}
```

### Credit Pull Request
```json
{
  "ssn": "123456789",
  "pull_type": "soft"
}
```

## Mock Behavior Rules

The LMS uses deterministic mock providers for testing:

### KYC Provider
- **SSN ending in "0000"** → `FAILED` (identity not verified)
- **SSN ending in "1111"** → `MANUAL_REVIEW` (partial match)
- **SSN ending in "9999"** → `EXPIRED` (verification expired)
- **All other SSNs** → `VERIFIED`

### AML Provider
- **Name containing "BLOCKED"** → `BLOCKED` (sanctions match)
- **Name containing "PEP"** → `WATCHLIST_MATCH` (Politically Exposed Person)
- **Name containing "SANCTIONS"** → `WATCHLIST_MATCH`
- **All other names** → `CLEAR`

### Credit Bureau Provider
Credit score is determined by SSN last 4 digits:
- **8000-9999** → Super Prime (750-850)
- **6000-7999** → Prime (700-749)
- **4000-5999** → Near Prime (650-699)
- **2000-3999** → Subprime (580-649)
- **0000-1999** → Deep Subprime (300-579)

## Test Assertions

Each request includes Newman test assertions that verify:
- HTTP status codes
- Response structure
- Data types and values
- Business logic validation
- Error handling

## Variables

The collection uses the following variables:
- `baseUrl`: API base URL (default: `http://localhost:8080`)
- `borrowerId`: Auto-set after creating a borrower
- `applicationId`: Auto-set after creating an application
- `offerId`: Auto-set after retrieving offers

## Generating the Collection

To regenerate the collection:

```bash
node scripts/generate-lms-postman-collection.js
```

This will update `postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json` with the latest structure and mock responses.

## Test Reports

Newman test reports are saved to:
- **JUnit XML**: `reports/newman/lms-complete-test-suite.xml`
- **CLI Output**: Console output during test execution

## Integration with CI/CD

The collection can be integrated into CI/CD pipelines:

```bash
# Example GitHub Actions
- name: Run LMS Tests
  run: |
    npm install -g newman
    node scripts/run-lms-tests.js
```

## Troubleshooting

### Tests Failing
1. Ensure the LMS service is running on `http://localhost:8080`
2. Check that the `baseUrl` variable is set correctly
3. Verify all required environment variables are set

### Collection Not Found
Run the generator script:
```bash
node scripts/generate-lms-postman-collection.js
```

### Mock Responses Not Showing
Mock responses are included in the collection file. In Postman, click on a request and check the "Examples" tab.

