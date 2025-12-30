# LMS Routes - Quick Reference

## Base URL
All LMS routes are prefixed with `/lms`

## Routes with Mock Response Examples

### 1. Create Borrower
**Route**: `POST /lms/borrowers`
**Mock Response**: Included in collection
**Test it**:
```bash
curl -X POST http://localhost:8080/lms/borrowers \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### 2. KYC Verification
**Route**: `POST /lms/borrowers/:id/kyc`
**Mock Response**: Included in collection
**Test it**:
```bash
# First create a borrower, then use the borrower_id
curl -X POST http://localhost:8080/lms/borrowers/{borrowerId}/kyc \
  -H "Content-Type: application/json" \
  -d '{"ssn": "123456789"}'
```

### 3. AML Screening
**Route**: `POST /lms/borrowers/:id/aml`
**Mock Response**: Included in collection
**Test it**:
```bash
curl -X POST http://localhost:8080/lms/borrowers/{borrowerId}/aml
```

### 4. Credit Report
**Route**: `POST /lms/borrowers/:id/credit`
**Mock Response**: Included in collection
**Test it**:
```bash
curl -X POST http://localhost:8080/lms/borrowers/{borrowerId}/credit \
  -H "Content-Type: application/json" \
  -d '{"ssn": "123456789", "pull_type": "soft"}'
```

### 5. Create Application
**Route**: `POST /lms/applications`
**Mock Response**: Included in collection
**Test it**:
```bash
curl -X POST http://localhost:8080/lms/applications \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_id": "{borrowerId}",
    "loan_type": "personal",
    "requested_amount": 15000,
    "requested_term_months": 36,
    "purpose": "Debt consolidation",
    "employment_status": "employed",
    "annual_income": 75000,
    "monthly_housing_payment": 1500
  }'
```

### 6. Credit Decision
**Route**: `POST /lms/applications/:id/decision`
**Mock Response**: Included in collection
**Test it**:
```bash
curl -X POST http://localhost:8080/lms/applications/{applicationId}/decision
```

### 7. Get Offers
**Route**: `GET /lms/applications/:id/offers`
**Mock Response**: Included in collection
**Test it**:
```bash
curl http://localhost:8080/lms/applications/{applicationId}/offers
```

## All Available Routes

### Health & Admin
- `GET /lms/health` - Health check
- `POST /lms/reset` - Reset store (testing)
- `GET /lms/stats` - System statistics

### Borrowers
- `POST /lms/borrowers` - Create borrower
- `GET /lms/borrowers` - List all borrowers
- `GET /lms/borrowers/:id` - Get borrower by ID

### KYC
- `POST /lms/borrowers/:id/kyc` - Run KYC verification
- `GET /lms/borrowers/:id/kyc` - Get KYC status

### AML
- `POST /lms/borrowers/:id/aml` - Run AML screening
- `GET /lms/borrowers/:id/aml` - Get AML status

### Credit
- `POST /lms/borrowers/:id/credit` - Pull credit report
- `GET /lms/borrowers/:id/credit` - Get credit report

### Applications
- `POST /lms/applications` - Create application
- `GET /lms/applications/:id` - Get application

### Decisions & Offers
- `POST /lms/applications/:id/decision` - Run credit decision
- `GET /lms/applications/:id/offers` - Get offers
- `POST /lms/offers/:id/accept` - Accept offer

### Audit
- `GET /lms/audit` - Get audit log
- `GET /lms/audit?entity_type=borrower` - Filtered audit log

## Quick Test Sequence

1. **Health Check**:
   ```bash
   curl http://localhost:8080/lms/health
   ```

2. **Create Borrower**:
   ```bash
   curl -X POST http://localhost:8080/lms/borrowers \
     -H "Content-Type: application/json" \
     -d @- <<EOF
   {
     "first_name": "John",
     "last_name": "GoodCredit",
     "email": "john.goodcredit@example.com",
     "phone": "555-123-4567",
     "ssn": "123455678",
     "date_of_birth": "1985-06-15",
     "address": {
       "street": "123 Main St",
       "city": "San Francisco",
       "state": "CA",
       "zip": "94102",
       "country": "US"
     }
   }
   EOF
   ```
   Save the `id` from response as `BORROWER_ID`

3. **Run KYC**:
   ```bash
   curl -X POST http://localhost:8080/lms/borrowers/$BORROWER_ID/kyc \
     -H "Content-Type: application/json" \
     -d '{"ssn": "123455678"}'
   ```

4. **Run AML**:
   ```bash
   curl -X POST http://localhost:8080/lms/borrowers/$BORROWER_ID/aml
   ```

5. **Pull Credit**:
   ```bash
   curl -X POST http://localhost:8080/lms/borrowers/$BORROWER_ID/credit \
     -H "Content-Type: application/json" \
     -d '{"ssn": "123455678", "pull_type": "soft"}'
   ```

6. **Create Application**:
   ```bash
   curl -X POST http://localhost:8080/lms/applications \
     -H "Content-Type: application/json" \
     -d "{
       \"borrower_id\": \"$BORROWER_ID\",
       \"loan_type\": \"personal\",
       \"requested_amount\": 15000,
       \"requested_term_months\": 36,
       \"purpose\": \"Debt consolidation\",
       \"employment_status\": \"employed\",
       \"annual_income\": 75000,
       \"monthly_housing_payment\": 1500
     }"
   ```
   Save the `id` from response as `APPLICATION_ID`

7. **Run Decision**:
   ```bash
   curl -X POST http://localhost:8080/lms/applications/$APPLICATION_ID/decision
   ```

8. **Get Offers**:
   ```bash
   curl http://localhost:8080/lms/applications/$APPLICATION_ID/offers
   ```

## Using Postman

1. Import the collection: `postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json`
2. Set `baseUrl` variable to `http://localhost:8080`
3. Open any request and click "Examples" tab to see mock responses
4. Click "Send" to test the actual API

## Using Newman

```bash
# Run all tests
node scripts/run-lms-tests.js

# Or directly
npx newman run postman/LMS-COMPLETE-TEST-SUITE.postman_collection.json
```



