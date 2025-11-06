---
card: "OTA Pre-made Ticket Management - Bulk Generation and B2B2C Activation"
slug: ota-premade-tickets
team: "A - Commerce"
oas_paths: ["/api/ota/tickets/bulk-generate", "/api/ota/tickets/:code/activate"]
migrations: ["db/migrations/0012_pre_generated_tickets.sql", "src/migrations/006-create-ota-ticket-batches.ts"]
status: "Ready"
readiness: "mvp"
branch: "init-ai"
pr: ""
newman_report: "reports/newman/ota-premade-tickets.xml"
last_update: "2025-11-04T16:40:00+08:00"
related_stories: ["US-012"]
relationships:
  depends_on: ["ota-channel-management"]
  triggers: ["order-create"]
  data_dependencies: ["PreGeneratedTicket", "OtaOrder", "ChannelReservation", "OTATicketBatch"]
  integration_points:
    data_stores: ["ota.repository.ts"]
    external_apis: ["OTA Partner Platforms"]
---

# OTA Pre-made Ticket Management — Dev Notes

## Status & Telemetry
- Status: Done
- Readiness: mvp
- Spec Paths: /api/ota/tickets/bulk-generate, /api/ota/tickets/:code/activate
- Migrations: db/migrations/0012_pre_generated_tickets.sql
- Newman: Tested • reports/newman/ota-premade-tickets.xml
- Last Update: 2025-11-04T16:40:00+08:00

## 0) Prerequisites
- ota-channel-management card implemented (inventory management)
- order-create card implemented (order creation patterns)
- Product catalog with function definitions available
- Database with pre_generated_tickets table

## 1) API Sequence (Context)
```mermaid
sequenceDiagram
  actor OTA as OTA Platform
  participant AUTH as Auth Middleware
  participant SERVICE as OTA Service
  participant DB as Database

  OTA->>+AUTH: POST /api/ota/tickets/bulk-generate
  AUTH->>+SERVICE: bulkGenerateTickets(product_id, quantity, batch_id)
  SERVICE->>+DB: Create pre-generated tickets with PRE_GENERATED status
  DB-->>-SERVICE: Ticket records with QR codes
  SERVICE-->>-AUTH: Batch response with tickets[]
  AUTH-->>-OTA: 201 {batch_id, tickets[], total_generated}

  OTA->>+AUTH: POST /api/ota/tickets/:code/activate
  AUTH->>+SERVICE: activatePreMadeTicket(code, customer_details)
  SERVICE->>+DB: Update status PRE_GENERATED → ACTIVE, create order
  DB-->>-SERVICE: Updated ticket + order record
  SERVICE-->>-AUTH: Activation confirmation
  AUTH-->>-OTA: 200 {ticket_code, order_id, status: "ACTIVE"}
```

## 2) Contract (OAS 3.0.3)
```yaml
paths:
  /api/ota/tickets/bulk-generate:
    post:
      tags: ["OTA Integration"]
      summary: Generate pre-made tickets for OTA sales
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [product_id, quantity, batch_id]
              properties:
                product_id:
                  type: integer
                  description: Package product ID
                  example: 106
                quantity:
                  type: integer
                  minimum: 1
                  maximum: 100
                  description: Number of pre-made tickets to generate
                  example: 50
                batch_id:
                  type: string
                  description: Batch identifier for tracking
                  example: "BATCH_2025_Q1_001"
                distribution_mode:
                  type: string
                  enum: [direct_sale, reseller_batch]
                  description: Distribution strategy for batch
                  default: direct_sale
                  example: "reseller_batch"
                reseller_metadata:
                  type: object
                  description: Required for reseller_batch mode
                  properties:
                    intended_reseller:
                      type: string
                      description: Reseller company/partner name
                      example: "Travel Agency ABC"
                    batch_purpose:
                      type: string
                      description: Purpose of this reseller batch
                      example: "Q1 2025 Spring Campaign"
                    distribution_notes:
                      type: string
                      description: Additional distribution information
                      example: "For regional cruise promotion"
      responses:
        201:
          description: Pre-made tickets successfully generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  batch_id:
                    type: string
                    example: "BATCH_2025_Q1_001"
                  distribution_mode:
                    type: string
                    example: "reseller_batch"
                  reseller_metadata:
                    type: object
                    properties:
                      intended_reseller:
                        type: string
                        example: "Travel Agency ABC"
                      batch_purpose:
                        type: string
                        example: "Q1 2025 Spring Campaign"
                  expires_at:
                    type: string
                    format: date-time
                    description: Batch expiry (extended for reseller_batch)
                  pricing_snapshot:
                    type: object
                    description: Locked pricing captured at generation time
                    properties:
                      base_price:
                        type: number
                        example: 288
                      customer_type_pricing:
                        type: array
                        items:
                          type: object
                          properties:
                            customer_type:
                              type: string
                              enum: [adult, child, elderly]
                            unit_price:
                              type: number
                            discount_applied:
                              type: number
                      currency:
                        type: string
                        example: "HKD"
                      captured_at:
                        type: string
                        format: date-time
                  tickets:
                    type: array
                    items:
                      type: object
                      properties:
                        ticket_code:
                          type: string
                          example: "CRUISE-2025-FERRY-1762274285982"
                        qr_code:
                          type: string
                          description: Base64 encoded QR code
                        status:
                          type: string
                          enum: [PRE_GENERATED]
                        entitlements:
                          type: array
                          items:
                            type: object
                            properties:
                              function_code:
                                type: string
                              remaining_uses:
                                type: integer
                  total_generated:
                    type: integer
                    example: 50

  /api/ota/tickets/{code}/activate:
    post:
      tags: ["OTA Integration"]
      summary: Activate pre-made ticket with customer details
      security:
        - ApiKeyAuth: []
      parameters:
        - name: code
          in: path
          required: true
          schema:
            type: string
            example: "CRUISE-2025-FERRY-1762274285982"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customer_details, payment_reference]
              properties:
                customer_details:
                  type: object
                  required: [name, email, phone]
                  properties:
                    name:
                      type: string
                      example: "John Smith"
                    email:
                      type: string
                      format: email
                      example: "john.smith@example.com"
                    phone:
                      type: string
                      example: "+1234567890"
                payment_reference:
                  type: string
                  description: OTA payment transaction reference
                  example: "PAY-OTA-2025-001"
      responses:
        200:
          description: Ticket successfully activated
          content:
            application/json:
              schema:
                type: object
                properties:
                  ticket_code:
                    type: string
                    example: "CRUISE-2025-FERRY-1762274285982"
                  order_id:
                    type: string
                    example: "ORD-1762274304824"
                  customer_name:
                    type: string
                    example: "John Smith"
                  status:
                    type: string
                    enum: [ACTIVE]
                  activated_at:
                    type: string
                    format: date-time
        400:
          description: Invalid request data
        404:
          description: Ticket not found or already activated
        409:
          description: Ticket already activated
```

## 3) Invariants
- Pre-made tickets start with status PRE_GENERATED
- Only PRE_GENERATED tickets can be activated
- Activation creates corresponding OTA order record
- Each ticket can only be activated once
- Customer details must include name, email, and phone
- Payment reference is required for audit trail
- **NEW**: Reseller batches have extended expiry periods (configurable)
- **NEW**: Reseller metadata is preserved through activation chain
- **NEW**: Distribution mode cannot be changed after batch creation

## 4) Validations, Idempotency & Concurrency
- Validate product exists and has available inventory
- Check batch_id uniqueness for tracking
- Ensure ticket_code uniqueness across all tickets
- Atomic activation prevents double-activation
- Customer detail validation (email format, phone format)
- Payment reference validation and storage

## 5) Rules & Writes (TX)
**POST /api/ota/tickets/bulk-generate:**
1) Begin transaction
2) Validate product_id exists and has inventory
3) Generate unique ticket codes and QR codes
4) Create pre_generated_tickets records with PRE_GENERATED status
5) Populate entitlements based on product functions
6) Commit transaction
7) Return batch summary with all ticket details

**POST /api/ota/tickets/:code/activate:**
1) Begin transaction with row locking
2) Find ticket by code with status PRE_GENERATED
3) Validate customer details completeness
4) Create OTA order record with customer details
5) Update ticket status to ACTIVE and link to order
6) Set activated_at timestamp
7) Commit transaction
8) Log activation event for audit

## 6) Data Impact & Transactions

**NEW Table: ota_ticket_batches** *(Batch-level metadata and pricing)*
- batch_id (Primary Key, VARCHAR(100))
- partner_id (VARCHAR(50), for multi-partner isolation)
- product_id (INT, Foreign Key to products)
- total_quantity (INT, number of tickets in batch)
- distribution_mode (ENUM: 'direct_sale', 'reseller_batch')
- pricing_snapshot (JSON: locked pricing captured at generation)
  - base_price, customer_type_pricing[], weekend_premium, currency
  - captured_at, valid_until timestamps
  - special_date_multiplier for pricing context
- reseller_metadata (JSON, nullable: intended_reseller, batch_purpose, margin_guidance)
- created_at, expires_at (extended for reseller_batch mode)
- status (ENUM: 'active', 'expired', 'cancelled')
- tickets_generated (INT, tracking counter)
- tickets_activated (INT, tracking counter)

**Table: pre_generated_tickets** *(Simplified, references batch)*
- ticket_id (Primary Key, Generated)
- ticket_code (Unique, Format: CRUISE-YYYY-TYPE-{timestamp})
- batch_id (Foreign Key to ota_ticket_batches)
- partner_id (VARCHAR(50), for partner isolation)
- product_id (Foreign Key to products)
- qr_code (Base64 encoded data)
- status (PRE_GENERATED → ACTIVE)
- entitlements (JSON array)
- customer_name, customer_email, customer_phone (NULL until activation)
- order_id (Foreign Key, NULL until activation)
- payment_reference (VARCHAR(100), for audit trail)
- created_at, activated_at

**Table: ota_orders** *(Existing)*
- order_id (Primary Key, Format: ORD-{timestamp})
- customer_name, customer_email, customer_phone
- payment_reference (OTA transaction ID)
- total_amount, status, created_at

## 7) Observability
- Log `ota.tickets.bulk_generated` with `{batch_id, product_id, quantity}`
- Log `ota.tickets.activated` with `{ticket_code, order_id, customer_email}`
- Metric `ota.tickets.pre_generated.count` - Total unused tickets
- Metric `ota.tickets.activation.rate` - Daily activation rate
- Alert on high unused ticket counts or low activation rates

## 8) Acceptance — Given / When / Then
**Given** authenticated OTA partner with tickets:bulk-generate permission
**When** POST /api/ota/tickets/bulk-generate with valid product_id and quantity
**Then** creates specified number of PRE_GENERATED tickets with unique codes and QR codes

**Given** a PRE_GENERATED ticket exists
**When** POST /api/ota/tickets/{code}/activate with complete customer details
**Then** ticket status changes to ACTIVE, order record created, activated_at timestamp set

**Given** an already ACTIVE ticket
**When** attempting to activate again
**Then** returns 409 Conflict with clear error message

**Given** invalid customer details (missing phone)
**When** activation attempt
**Then** returns 400 Bad Request with validation details

## 9) Postman Coverage
- Bulk generation: Test various quantities and batch tracking
- Activation flow: Test complete customer onboarding
- Error cases: Test double activation, invalid tickets, incomplete data
- Permissions: Test API key permission requirements
- Database verification: Check status transitions and order creation