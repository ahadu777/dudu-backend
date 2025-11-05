# OTA Platform Integration Guide

## 🚀 Quick Start

The Synque OTA Platform provides a complete multi-partner ticketing system with real-time inventory management, secure partner isolation, and comprehensive activation workflows.

**Base URL**: `https://mesh.synque.ai/api/ota`

## 🔐 Authentication

All requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key_here" https://mesh.synque.ai/api/ota/inventory
```

### Available Partners

| Partner | API Key | Partner ID | Permissions |
|---------|---------|------------|-------------|
| Test Partner | `ota_test_key_12345` | `test_partner` | Full access |
| Production Partner | `ota_prod_key_67890` | `prod_partner` | Standard access |
| DuDu Travel | `dudu_key_12345` | `dudu_partner` | Bulk generation + read |
| OTA251103 Group | `ota251103_key_67890` | `ota251103_partner` | Reserve + activate |
| Full Access Partner | `ota_full_access_key_99999` | `ota_full_access_partner` | All permissions |

## 📊 Core Endpoints

### 1. Check Inventory

**GET** `/api/ota/inventory`

```bash
curl -H "X-API-Key: ota_test_key_12345" \
  "https://mesh.synque.ai/api/ota/inventory"
```

**Response**:
```json
{
  "available_quantities": {
    "106": 1882,
    "107": 1490,
    "108": 1500
  },
  "pricing_context": {
    "base_prices": {
      "106": { "weekday": 288, "weekend": 318 }
    },
    "customer_types": ["adult", "child", "elderly"],
    "special_dates": {
      "2025-12-31": { "multiplier": 1.5 }
    }
  }
}
```

### 2. Generate Bulk Tickets

**POST** `/api/ota/tickets/bulk-generate`

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ota251103_key_67890" \
  -d '{
    "product_id": 106,
    "quantity": 2,
    "batch_id": "MY_BATCH_001"
  }' \
  "https://mesh.synque.ai/api/ota/tickets/bulk-generate"
```

**Response**:
```json
{
  "batch_id": "MY_BATCH_001",
  "tickets": [
    {
      "ticket_code": "CRUISE-2025-FERRY-1762330663284",
      "qr_code": "data:image/png;base64,eyJ0aWNrZXRfaWQ...",
      "status": "PRE_GENERATED",
      "entitlements": [
        {
          "function_code": "ferry",
          "remaining_uses": 1
        }
      ]
    }
  ],
  "total_generated": 2
}
```

### 3. Activate Tickets

**POST** `/api/ota/tickets/:code/activate`

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ota251103_key_67890" \
  -d '{
    "customer_details": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123"
    },
    "payment_reference": "PAY-123456789"
  }' \
  "https://mesh.synque.ai/api/ota/tickets/CRUISE-2025-FERRY-1762330663284/activate"
```

**Response**:
```json
{
  "ticket_code": "CRUISE-2025-FERRY-1762330663284",
  "order_id": "ORD-1762331070078",
  "customer_name": "John Doe",
  "status": "ACTIVE",
  "activated_at": "2025-11-05T08:24:30.989Z"
}
```

### 4. Create Reservations

**POST** `/api/ota/reserve`

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ota251103_key_67890" \
  -d '{
    "product_id": 106,
    "quantity": 1,
    "customer_name": "Jane Smith",
    "customer_email": "jane@example.com"
  }' \
  "https://mesh.synque.ai/api/ota/reserve"
```

**Response**:
```json
{
  "reservation_id": "res_mhlq924o_cz0rij",
  "reserved_until": "2025-11-06T08:19:51.204Z",
  "pricing_snapshot": {
    "base_price": 288,
    "weekend_premium": 30,
    "customer_discounts": {
      "child": 100,
      "elderly": 50,
      "student": 50
    }
  }
}
```

### 5. Activate Reservations

**POST** `/api/ota/reservations/:id/activate`

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ota251103_key_67890" \
  -d '{
    "customer_details": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0456"
    },
    "payment_reference": "PAY-987654321"
  }' \
  "https://mesh.synque.ai/api/ota/reservations/res_mhlq924o_cz0rij/activate"
```

## 🏭 Products Available

| Product ID | Name | Type | Base Price |
|------------|------|------|------------|
| **106** | Cruise Premium | Ferry + Gift + Tokens | $288 weekday / $318 weekend |
| **107** | Cruise Standard | Ferry + Gift | $188 weekday / $228 weekend |
| **108** | Cruise Luxury | Ferry + Gift + Premium Tokens | $788 weekday / $868 weekend |

## 🔒 Security & Partner Isolation

### Partner-Scoped Operations
- **Ticket Generation**: Each partner can only see/activate their own tickets
- **Inventory**: Shared across all partners with real-time deduction
- **Orders**: Partner-specific order history and management
- **Reservations**: Partner-scoped reservation system

### Error Handling
```json
{
  "error": "TICKET_NOT_FOUND",
  "message": "Ticket CRUISE-2025-FERRY-xyz not found or already activated"
}
```

**Common Error Codes**:
- `API_KEY_REQUIRED` - Missing X-API-Key header
- `INVALID_API_KEY` - Invalid or expired API key
- `INSUFFICIENT_PERMISSIONS` - Partner lacks required permission
- `RATE_LIMIT_EXCEEDED` - Partner exceeded rate limit
- `TICKET_NOT_FOUND` - Ticket not found or not owned by partner
- `VALIDATION_ERROR` - Invalid request parameters

## 📈 Rate Limits

| Partner | Requests/Minute |
|---------|-----------------|
| Test Partner | 100 |
| Production Partner | 1000 |
| DuDu Travel | 500 |
| OTA251103 Group | 300 |
| Full Access Partner | 500 |

## 🔄 Complete Integration Flow

### 1. Check Inventory
```bash
GET /api/ota/inventory
```

### 2. Generate Tickets (Option A)
```bash
POST /api/ota/tickets/bulk-generate
{
  "product_id": 106,
  "quantity": 10,
  "batch_id": "BATCH_2025_001"
}
```

### 3. Activate When Sold
```bash
POST /api/ota/tickets/{ticket_code}/activate
{
  "customer_details": {...},
  "payment_reference": "PAY_REF"
}
```

### OR Reserve → Activate Flow (Option B)

### 2. Create Reservation
```bash
POST /api/ota/reserve
{
  "product_id": 106,
  "quantity": 1,
  "customer_name": "Customer Name",
  "customer_email": "customer@email.com"
}
```

### 3. Activate Reservation
```bash
POST /api/ota/reservations/{reservation_id}/activate
{
  "customer_details": {...},
  "payment_reference": "PAY_REF"
}
```

## 📱 QR Code Usage

Generated tickets include base64-encoded QR codes:
```json
{
  "qr_code": "data:image/png;base64,eyJ0aWNrZXRfaWQ..."
}
```

Decode the QR data to get:
```json
{
  "ticket_id": 1762330663284.6711,
  "product_id": 106,
  "batch_id": "BATCH_ID",
  "issued_at": "2025-11-05T08:17:42.930Z"
}
```

## 🚨 Production Considerations

### Database Mode
The platform runs in database mode with real MySQL persistence:
- **Host**: `wp-blue.cqsqnun7uqvc.ap-east-1.rds.amazonaws.com`
- **Real-time inventory**: All operations immediately reflected
- **Partner isolation**: Database-level security enforcement

### Monitoring
- **Health Check**: `GET /healthz`
- **API Documentation**: `GET /docs`
- **OpenAPI Spec**: `GET /openapi.json`

### Best Practices
1. **Always check inventory** before generating large batches
2. **Use meaningful batch IDs** for tracking and debugging
3. **Implement retry logic** for network failures
4. **Store ticket codes securely** until activation
5. **Validate customer data** before activation
6. **Monitor rate limits** and implement backoff

## 🛠️ Development Environment

### Local Testing
```bash
# Start in mock mode (fast development)
npm start

# Start in database mode (production testing)
USE_DATABASE=true npm start
```

### Environment Variables
```bash
DB_HOST=wp-blue.cqsqnun7uqvc.ap-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USERNAME=dudu
DB_PASSWORD=dudu_251101@dev
DB_DATABASE=dudu
USE_DATABASE=true
```

## 📞 Support

For integration support or API key requests:
- **Documentation**: `https://mesh.synque.ai/docs`
- **Status**: `https://mesh.synque.ai/healthz`
- **Technical Issues**: Check error codes and implement proper retry logic

---

**Last Updated**: November 5, 2025
**API Version**: v1.0
**Environment**: Production (Database Mode)