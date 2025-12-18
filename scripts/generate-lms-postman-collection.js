/**
 * Generate comprehensive LMS Postman collection with mock responses and Newman tests
 */

const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: 'LMS Complete Test Suite - With Mock Responses',
    description: `Comprehensive test suite for Loan Management System with mock responses, payload structures, and Newman tests.

Mock Behavior Rules:
- SSN ending 0000 = KYC FAILED
- SSN ending 1111 = KYC MANUAL_REVIEW  
- SSN ending 9999 = KYC EXPIRED
- Name containing BLOCKED = AML BLOCKED
- Name containing PEP = AML WATCHLIST_MATCH
- SSN last 4 determines credit score tier (8000-9999 = Super Prime, etc.)`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    _postman_id: 'lms-complete-suite-001'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:8080', type: 'string' },
    { key: 'borrowerId', value: '', type: 'string' },
    { key: 'applicationId', value: '', type: 'string' },
    { key: 'offerId', value: '', type: 'string' }
  ],
  item: []
};

// Helper to create request with mock response
function createRequest(name, method, path, body, tests, description, mockResponse) {
  const request = {
    name,
    request: {
      method,
      header: [
        {
          key: 'Content-Type',
          value: 'application/json'
        }
      ],
      url: {
        raw: `{{baseUrl}}${path}`,
        host: ['{{baseUrl}}'],
        path: path.split('/').filter(p => p)
      }
    },
    response: mockResponse ? [mockResponse] : [],
    event: tests ? [{
      listen: 'test',
      script: {
        exec: tests,
        type: 'text/javascript'
      }
    }] : []
  };

  if (body) {
    request.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    };
  }

  if (description) {
    request.request.description = description;
  }

  return request;
}

// Mock response examples
const mockResponses = {
  borrowerCreated: {
    name: 'Borrower Created Success',
    originalRequest: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-123-4567',
          ssn: '123456789',
          date_of_birth: '1990-01-15',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            country: 'US'
          }
        }, null, 2)
      },
      url: { raw: '{{baseUrl}}/lms/borrowers', host: ['{{baseUrl}}'], path: ['lms', 'borrowers'] }
    },
    status: 'Created',
    code: 201,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        id: 'borrower-uuid-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        ssn_last_four: '6789',
        ssn_hash: 'hashed-ssn-value',
        date_of_birth: '1990-01-15',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        status: 'pending',
        kyc_status: 'pending',
        aml_status: 'pending',
        created_at: '2025-01-15T10:30:00.000Z',
        updated_at: '2025-01-15T10:30:00.000Z'
      },
      request_id: 'req-uuid-123',
      timestamp: '2025-01-15T10:30:00.000Z'
    }, null, 2)
  },
  kycVerified: {
    name: 'KYC Verified Success',
    originalRequest: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify({ ssn: '123456789' }, null, 2)
      },
      url: { raw: '{{baseUrl}}/lms/borrowers/{{borrowerId}}/kyc', host: ['{{baseUrl}}'], path: ['lms', 'borrowers', '{{borrowerId}}', 'kyc'] }
    },
    status: 'OK',
    code: 200,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        request_id: 'kyc-req-uuid-123',
        borrower_id: 'borrower-uuid-123',
        status: 'verified',
        verified_at: '2025-01-15T10:35:00.000Z',
        provider: 'mock-kyc-provider',
        identity_match_score: 95,
        address_match: true,
        ssn_match: true,
        dob_match: true,
        expires_at: '2026-01-15T10:35:00.000Z'
      },
      request_id: 'req-uuid-456',
      timestamp: '2025-01-15T10:35:00.000Z'
    }, null, 2)
  },
  amlClear: {
    name: 'AML Clear Success',
    originalRequest: {
      method: 'POST',
      header: [],
      url: { raw: '{{baseUrl}}/lms/borrowers/{{borrowerId}}/aml', host: ['{{baseUrl}}'], path: ['lms', 'borrowers', '{{borrowerId}}', 'aml'] }
    },
    status: 'OK',
    code: 200,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        request_id: 'aml-req-uuid-123',
        borrower_id: 'borrower-uuid-123',
        status: 'clear',
        screened_at: '2025-01-15T10:40:00.000Z',
        provider: 'mock-aml-provider',
        watchlist_hits: [],
        risk_score: 5,
        pep_check: false,
        sanctions_check: false,
        adverse_media_check: false
      },
      request_id: 'req-uuid-789',
      timestamp: '2025-01-15T10:40:00.000Z'
    }, null, 2)
  },
  creditReport: {
    name: 'Credit Report Success',
    originalRequest: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify({ ssn: '123456789', pull_type: 'soft' }, null, 2)
      },
      url: { raw: '{{baseUrl}}/lms/borrowers/{{borrowerId}}/credit', host: ['{{baseUrl}}'], path: ['lms', 'borrowers', '{{borrowerId}}', 'credit'] }
    },
    status: 'OK',
    code: 200,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        request_id: 'credit-req-uuid-123',
        borrower_id: 'borrower-uuid-123',
        pulled_at: '2025-01-15T10:45:00.000Z',
        provider: 'mock-credit-bureau',
        pull_type: 'soft',
        credit_score: 780,
        score_model: 'FICO Score 8',
        score_factors: [
          { code: 'PAY01', description: 'Excellent payment history', impact: 'positive' },
          { code: 'UTL01', description: 'Low credit utilization', impact: 'positive' },
          { code: 'AGE01', description: 'Long credit history', impact: 'positive' }
        ],
        tradelines: [
          {
            creditor: 'Chase Bank',
            account_type: 'Credit Card',
            balance: 500,
            credit_limit: 10000,
            payment_status: 'Current',
            opened_date: '2020-03-15',
            months_reviewed: 48
          }
        ],
        inquiries: [
          { creditor: 'Chase', date: '2024-12-01', type: 'hard' }
        ],
        public_records: [],
        summary: {
          total_accounts: 2,
          open_accounts: 2,
          total_balance: 15500,
          total_credit_limit: 10000,
          utilization_ratio: 5,
          derogatory_count: 0,
          collections_count: 0,
          public_record_count: 0,
          oldest_account_months: 48
        }
      },
      request_id: 'req-uuid-101',
      timestamp: '2025-01-15T10:45:00.000Z'
    }, null, 2)
  },
  applicationCreated: {
    name: 'Application Created Success',
    originalRequest: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          borrower_id: 'borrower-uuid-123',
          loan_type: 'personal',
          requested_amount: 15000,
          requested_term_months: 36,
          purpose: 'Debt consolidation',
          employment_status: 'employed',
          annual_income: 75000,
          monthly_housing_payment: 1500
        }, null, 2)
      },
      url: { raw: '{{baseUrl}}/lms/applications', host: ['{{baseUrl}}'], path: ['lms', 'applications'] }
    },
    status: 'Created',
    code: 201,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        id: 'app-uuid-123',
        borrower_id: 'borrower-uuid-123',
        loan_type: 'personal',
        requested_amount: 15000,
        requested_term_months: 36,
        purpose: 'Debt consolidation',
        employment_status: 'employed',
        annual_income: 75000,
        monthly_housing_payment: 1500,
        status: 'submitted',
        created_at: '2025-01-15T10:50:00.000Z',
        updated_at: '2025-01-15T10:50:00.000Z'
      },
      request_id: 'req-uuid-202',
      timestamp: '2025-01-15T10:50:00.000Z'
    }, null, 2)
  },
  decisionApproved: {
    name: 'Decision Approved Success',
    originalRequest: {
      method: 'POST',
      header: [],
      url: { raw: '{{baseUrl}}/lms/applications/{{applicationId}}/decision', host: ['{{baseUrl}}'], path: ['lms', 'applications', '{{applicationId}}', 'decision'] }
    },
    status: 'OK',
    code: 200,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: {
        decision_id: 'decision-uuid-123',
        application_id: 'app-uuid-123',
        decision: 'approved',
        decided_at: '2025-01-15T10:55:00.000Z',
        decided_by: 'system',
        credit_score: 780,
        dti_ratio: 28.5,
        risk_tier: 'super_prime',
        approved_amount: 15000,
        approved_rate: 0.0799,
        approved_term: 36,
        adverse_action_required: false
      },
      request_id: 'req-uuid-303',
      timestamp: '2025-01-15T10:55:00.000Z'
    }, null, 2)
  },
  offerGenerated: {
    name: 'Offer Generated Success',
    originalRequest: {
      method: 'GET',
      header: [],
      url: { raw: '{{baseUrl}}/lms/applications/{{applicationId}}/offers', host: ['{{baseUrl}}'], path: ['lms', 'applications', '{{applicationId}}', 'offers'] }
    },
    status: 'OK',
    code: 200,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      success: true,
      data: [
        {
          id: 'offer-uuid-123',
          application_id: 'app-uuid-123',
          borrower_id: 'borrower-uuid-123',
          principal_amount: 15000,
          interest_rate: 0.0799,
          term_months: 36,
          monthly_payment: 468.75,
          apr: 0.0849,
          total_interest: 1875,
          total_payments: 16875,
          origination_fee: 300,
          status: 'pending',
          expires_at: '2025-02-14T10:55:00.000Z',
          created_at: '2025-01-15T10:55:00.000Z'
        }
      ],
      meta: { total: 1 }
    }, null, 2)
  }
};

// Build collection items
const items = [];

// 00 - Health & Setup
items.push({
  name: '00 - Health & Setup',
  item: [
    createRequest(
      'Health Check',
      'GET',
      '/lms/health',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Service is healthy', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.service).to.eql('lms');",
        "  pm.expect(json.status).to.eql('healthy');",
        "});"
      ],
      'Health check endpoint for LMS service'
    ),
    createRequest(
      'Reset LMS Store',
      'POST',
      '/lms/reset',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Store reset successfully', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "});"
      ],
      'Reset LMS store for testing (clears all data)'
    )
  ]
});

// 01 - Borrower Registration
items.push({
  name: '01 - Borrower Registration',
  item: [
    createRequest(
      'Register Borrower - Happy Path',
      'POST',
      '/lms/borrowers',
      {
        first_name: 'John',
        last_name: 'GoodCredit',
        email: 'john.goodcredit@example.com',
        phone: '555-123-4567',
        ssn: '123455678',
        date_of_birth: '1985-06-15',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        }
      },
      [
        "pm.test('Status code is 201', () => {",
        "  pm.response.to.have.status(201);",
        "});",
        "",
        "pm.test('Borrower created with pending status', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.id).to.be.a('string');",
        "  pm.expect(json.data.status).to.eql('pending');",
        "  pm.expect(json.data.kyc_status).to.eql('pending');",
        "  pm.expect(json.data.aml_status).to.eql('pending');",
        "  pm.expect(json.data.ssn_last_four).to.eql('5678');",
        "  ",
        "  pm.collectionVariables.set('borrowerId', json.data.id);",
        "});"
      ],
      'Register a new borrower with valid data',
      mockResponses.borrowerCreated
    ),
    createRequest(
      'Register Borrower - Missing Required Fields',
      'POST',
      '/lms/borrowers',
      { first_name: 'Jane' },
      [
        "pm.test('Status code is 400', () => {",
        "  pm.response.to.have.status(400);",
        "});",
        "",
        "pm.test('Error message indicates missing fields', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.false;",
        "  pm.expect(json.error).to.include('Missing required fields');",
        "});"
      ],
      'Test validation for missing required fields'
    ),
    createRequest(
      'Register Borrower - Invalid SSN Format',
      'POST',
      '/lms/borrowers',
      {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '555-000-0000',
        ssn: '12345',
        date_of_birth: '1990-01-01',
        address: {
          street: '456 Oak Ave',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        }
      },
      [
        "pm.test('Status code is 400', () => {",
        "  pm.response.to.have.status(400);",
        "});",
        "",
        "pm.test('Error message indicates invalid SSN', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.false;",
        "  pm.expect(json.error).to.include('Invalid SSN format');",
        "});"
      ],
      'Test SSN format validation (must be 9 digits)'
    ),
    createRequest(
      'Get Borrower by ID',
      'GET',
      '/lms/borrowers/{{borrowerId}}',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Borrower data is returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.id).to.eql(pm.collectionVariables.get('borrowerId'));",
        "});"
      ],
      'Retrieve borrower details by ID'
    ),
    createRequest(
      'List All Borrowers',
      'GET',
      '/lms/borrowers',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Borrowers array returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data).to.be.an('array');",
        "  pm.expect(json.meta.total).to.be.a('number');",
        "});"
      ],
      'List all registered borrowers'
    )
  ]
});

// 02 - KYC Verification
items.push({
  name: '02 - KYC Verification',
  item: [
    createRequest(
      'KYC - Success (Verified)',
      'POST',
      '/lms/borrowers/{{borrowerId}}/kyc',
      { ssn: '123455678' },
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('KYC status is verified', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.status).to.eql('verified');",
        "  pm.expect(json.data.identity_match_score).to.be.at.least(90);",
        "  pm.expect(json.data.ssn_match).to.be.true;",
        "});"
      ],
      'Run KYC verification for borrower',
      mockResponses.kycVerified
    ),
    createRequest(
      'Get KYC Status',
      'GET',
      '/lms/borrowers/{{borrowerId}}/kyc',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('KYC result is returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.status).to.be.oneOf(['verified', 'pending', 'failed', 'manual_review']);",
        "});"
      ],
      'Get current KYC status for borrower'
    )
  ]
});

// 03 - AML Screening
items.push({
  name: '03 - AML Screening',
  item: [
    createRequest(
      'AML - Clear',
      'POST',
      '/lms/borrowers/{{borrowerId}}/aml',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('AML status is clear', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.status).to.eql('clear');",
        "  pm.expect(json.data.risk_score).to.be.below(20);",
        "});"
      ],
      'Run AML screening for borrower',
      mockResponses.amlClear
    ),
    createRequest(
      'Get AML Status',
      'GET',
      '/lms/borrowers/{{borrowerId}}/aml',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('AML result is returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.status).to.be.oneOf(['clear', 'pending', 'blocked', 'watchlist_match']);",
        "});"
      ],
      'Get current AML status for borrower'
    )
  ]
});

// 04 - Credit Bureau
items.push({
  name: '04 - Credit Bureau',
  item: [
    createRequest(
      'Pull Credit Report',
      'POST',
      '/lms/borrowers/{{borrowerId}}/credit',
      { ssn: '123455678', pull_type: 'soft' },
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Credit report returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.credit_score).to.be.a('number');",
        "  pm.expect(json.data.credit_score).to.be.within(300, 850);",
        "  pm.expect(json.data.tradelines).to.be.an('array');",
        "  pm.expect(json.data.summary).to.be.an('object');",
        "});"
      ],
      'Pull credit report from mock credit bureau',
      mockResponses.creditReport
    ),
    createRequest(
      'Get Credit Report',
      'GET',
      '/lms/borrowers/{{borrowerId}}/credit',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Credit report is returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  if (json.data) {",
        "    pm.expect(json.data.credit_score).to.be.a('number');",
        "  }",
        "});"
      ],
      'Get latest credit report for borrower'
    )
  ]
});

// 05 - Loan Application
items.push({
  name: '05 - Loan Application',
  item: [
    createRequest(
      'Create Loan Application',
      'POST',
      '/lms/applications',
      {
        borrower_id: '{{borrowerId}}',
        loan_type: 'personal',
        requested_amount: 15000,
        requested_term_months: 36,
        purpose: 'Debt consolidation',
        employment_status: 'employed',
        annual_income: 75000,
        monthly_housing_payment: 1500
      },
      [
        "pm.test('Status code is 201', () => {",
        "  pm.response.to.have.status(201);",
        "});",
        "",
        "pm.test('Application created', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.id).to.be.a('string');",
        "  pm.expect(json.data.status).to.eql('submitted');",
        "  ",
        "  pm.collectionVariables.set('applicationId', json.data.id);",
        "});"
      ],
      'Create a new loan application',
      mockResponses.applicationCreated
    ),
    createRequest(
      'Get Application',
      'GET',
      '/lms/applications/{{applicationId}}',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Application data returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.id).to.eql(pm.collectionVariables.get('applicationId'));",
        "});"
      ],
      'Get application details by ID'
    )
  ]
});

// 06 - Credit Decision
items.push({
  name: '06 - Credit Decision',
  item: [
    createRequest(
      'Run Credit Decision',
      'POST',
      '/lms/applications/{{applicationId}}/decision',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Decision is returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.decision).to.be.oneOf(['approved', 'declined', 'counter_offer', 'manual_review']);",
        "  pm.expect(json.data.credit_score).to.be.a('number');",
        "  pm.expect(json.data.risk_tier).to.be.oneOf(['super_prime', 'prime', 'near_prime', 'subprime', 'deep_subprime']);",
        "});"
      ],
      'Run automated credit decision on application',
      mockResponses.decisionApproved
    ),
    createRequest(
      'Get Offers',
      'GET',
      '/lms/applications/{{applicationId}}/offers',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Offers array returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data).to.be.an('array');",
        "  ",
        "  if (json.data.length > 0) {",
        "    pm.collectionVariables.set('offerId', json.data[0].id);",
        "    pm.expect(json.data[0].principal_amount).to.be.a('number');",
        "    pm.expect(json.data[0].interest_rate).to.be.a('number');",
        "  }",
        "});"
      ],
      'Get loan offers for application',
      mockResponses.offerGenerated
    ),
    createRequest(
      'Accept Offer',
      'POST',
      '/lms/offers/{{offerId}}/accept',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Offer accepted', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.status).to.eql('accepted');",
        "  pm.expect(json.data.accepted_at).to.be.a('string');",
        "});"
      ],
      'Accept a loan offer'
    )
  ]
});

// 07 - Audit Trail
items.push({
  name: '07 - Audit Trail',
  item: [
    createRequest(
      'Get Full Audit Log',
      'GET',
      '/lms/audit',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Audit entries returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data).to.be.an('array');",
        "  ",
        "  if (json.data.length > 0) {",
        "    const entry = json.data[0];",
        "    pm.expect(entry.id).to.be.a('string');",
        "    pm.expect(entry.entity_type).to.be.a('string');",
        "    pm.expect(entry.action).to.be.a('string');",
        "    pm.expect(entry.timestamp).to.be.a('string');",
        "  }",
        "});"
      ],
      'Get complete audit log'
    ),
    createRequest(
      'Get Audit Log Filtered by Entity',
      'GET',
      '/lms/audit?entity_type=borrower',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Filtered audit entries returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data).to.be.an('array');",
        "  ",
        "  json.data.forEach(entry => {",
        "    pm.expect(entry.entity_type).to.eql('borrower');",
        "  });",
        "});"
      ],
      'Get audit log filtered by entity type'
    )
  ]
});

// 08 - Stats
items.push({
  name: '08 - Stats',
  item: [
    createRequest(
      'Get LMS Stats',
      'GET',
      '/lms/stats',
      null,
      [
        "pm.test('Status code is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test('Stats returned', () => {",
        "  const json = pm.response.json();",
        "  pm.expect(json.success).to.be.true;",
        "  pm.expect(json.data.borrowers).to.be.a('number');",
        "  pm.expect(json.data.applications).to.be.a('number');",
        "});"
      ],
      'Get LMS system statistics'
    )
  ]
});

collection.item = items;

// Write collection to file
const outputPath = path.join(__dirname, '..', 'postman', 'LMS-COMPLETE-TEST-SUITE.postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
console.log(`✅ Generated Postman collection: ${outputPath}`);
console.log(`   Total endpoints: ${items.reduce((sum, item) => sum + item.item.length, 0)}`);

