# OTA251103 Travel Group - Integration Guide

## 🚀 Quick Start for OTA251103

This guide is specifically for **OTA251103 Travel Group** to integrate with the Synque OTA Platform for cruise ticket generation and activation.

**Base URL**: `https://mesh.synque.ai/api/ota`

## 🔐 Your Authentication

**API Key**: `ota251103_key_67890`
**Partner ID**: `ota251103_partner`
**Rate Limit**: 300 requests per minute

All requests require your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: ota251103_key_67890" https://mesh.synque.ai/api/ota/inventory
```

## 📊 Available Products

| Product ID | Name | Price | Entitlements |
|------------|------|-------|--------------|
| **106** | Cruise Premium | $288 weekday / $318 weekend | Ferry + Gift + Tokens |
| **107** | Cruise Standard | $188 weekday / $228 weekend | Ferry + Gift |
| **108** | Cruise Luxury | $788 weekday / $868 weekend | Ferry + Gift + Premium Tokens |

## 🎫 Ticket Generation Workflow

### Step 1: Check Available Inventory

**GET** `/api/ota/inventory`

```bash
curl -H "X-API-Key: ota251103_key_67890" \
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
      "106": { "weekday": 288, "weekend": 318 },
      "107": { "weekday": 188, "weekend": 228 },
      "108": { "weekday": 788, "weekend": 868 }
    },
    "customer_types": ["adult", "child", "elderly"],
    "special_dates": {
      "2025-12-31": { "multiplier": 1.5 },
      "2026-02-18": { "multiplier": 1.3 }
    }
  }
}
```

### Step 2: Request Bulk Tickets from Administrator

**Note**: Bulk ticket generation is handled by the Synque administrator, not directly through the API.

**Process**:
1. **Contact administrator** with your ticket requirements:
   - Product ID (106, 107, or 108)
   - Quantity needed
   - Your preferred batch ID format (e.g., "OTA251103_BATCH_001")

2. **Administrator generates tickets** and provides you with:
   - Ticket codes for each generated ticket
   - QR codes for customer use
   - Batch tracking information

**Example of what you'll receive**:
```json
{
  "batch_id": "OTA251103_BATCH_001",
  "tickets": [
    {
      "ticket_code": "CRUISE-2025-FERRY-1762330663284",
      "qr_code": "data:image/png;base64,eyJ0aWNrZXRfaWQ...",
      "status": "PRE_GENERATED",
      "entitlements": [
        {
          "function_code": "ferry",
          "remaining_uses": 1
        },
        {
          "function_code": "gift",
          "remaining_uses": 1
        },
        {
          "function_code": "tokens",
          "remaining_uses": 1
        }
      ]
    }
  ],
  "total_generated": 10
}
```

### Step 3: Store Tickets Securely

**Important**: Store only the `ticket_code` securely until customer purchase. The QR code can be retrieved later via API when needed.

### Step 4: Activate When Customer Purchases

**POST** `/api/ota/tickets/:code/activate`

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ota251103_key_67890" \
  -d '{
    "customer_details": {
      "name": "John Doe",
      "email": "john@customer.com",
      "phone": "+1-555-0123"
    },
    "payment_reference": "PAY-OTA251103-123456"
  }' \
  "https://mesh.synque.ai/api/ota/tickets/CRUISE-2025-FERRY-1762330663284/activate"
```

**Required Fields**:
- `customer_details.name`: Customer's full name
- `customer_details.email`: Customer's email address
- `customer_details.phone`: Customer's phone number
- `payment_reference`: Your payment/order reference

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

## 📱 QR Code Usage

Each generated ticket includes a QR code that customers can use for venue access:

```json
{
  "qr_code": "data:image/png;base64,eyJ0aWNrZXRfaWQ..."
}
```

The QR code contains encoded ticket information and can be displayed directly to customers.

## 🔒 Security Features

- **Partner Isolation**: You can only activate tickets that you generated
- **Unique Ticket Codes**: Each ticket has a globally unique identifier
- **Rate Limiting**: 300 requests per minute to ensure system stability
- **Secure Activation**: Customer details required for activation

## ⚠️ Important Notes

### Inventory Management
- Inventory is deducted immediately when tickets are generated
- Check inventory before generating large batches
- Current inventory levels are shared across all partners

### Batch Recommendations
- Use meaningful batch IDs for tracking (e.g., "OTA251103_BATCH_YYYYMMDD_001")
- Generate tickets in reasonable quantities (1-100 per batch)
- Store tickets securely until customer purchase

### Error Handling

Common error responses:
```json
{
  "error": "INSUFFICIENT_INVENTORY",
  "message": "Not enough inventory available for product 106"
}
```

**Error Codes**:
- `INSUFFICIENT_INVENTORY`: Not enough tickets available
- `INVALID_PRODUCT_ID`: Product ID doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests per minute
- `TICKET_NOT_FOUND`: Ticket doesn't exist or not owned by you
- `TICKET_ALREADY_ACTIVATED`: Ticket has already been activated

## 📞 Integration Checklist

- [ ] Test inventory endpoint with your API key
- [ ] Generate a small batch of test tickets (quantity: 1-2)
- [ ] Store ticket codes and QR codes securely
- [ ] Test activation with dummy customer data
- [ ] Implement error handling for all endpoints
- [ ] Set up monitoring for rate limits
- [ ] Implement retry logic for network failures

## 🚀 Production Tips

1. **Always check inventory** before generating tickets
2. **Use descriptive batch IDs** for easy tracking
3. **Store tickets securely** until customer purchase
4. **Validate customer data** before activation
5. **Monitor your rate limits** (300 requests/minute)
6. **Implement proper error handling**

## 🚀 Next Steps for Integration

### Phase 1: Initial Setup & Testing
1. **Test API Access**
   - Verify inventory endpoint with your API key
   - Confirm authentication is working properly

2. **Coordinate with Administrator**
   - Contact Synque administrator for initial ticket allocation
   - Request test batch (5-10 tickets) for integration testing
   - Establish batch naming conventions

3. **Build Integration Infrastructure**
   - Implement secure storage for ticket codes
   - Set up activation workflow in your system
   - Create customer purchase integration points

### Phase 2: Production Preparation
4. **Scale Testing**
   - Test with larger ticket batches (50-100 tickets)
   - Validate error handling and retry logic
   - Monitor rate limits and performance

5. **Business Process Integration**
   - Train staff on ticket allocation requests
   - Establish inventory monitoring procedures
   - Set up customer support for activation issues

### Phase 3: Go Live
6. **Production Deployment**
   - Request production ticket allocation
   - Monitor first customer activations
   - Establish ongoing communication with administrator

### Recommended Timeline
- **Week 1**: API testing and initial coordination
- **Week 2**: Integration development and small batch testing
- **Week 3**: Production preparation and scaling tests
- **Week 4**: Go live with monitoring

## 📞 Support

For technical support or integration questions:
- **API Status**: `https://mesh.synque.ai/healthz`
- **Documentation**: `https://mesh.synque.ai/docs`

---

**Your Partner**: OTA251103 Travel Group
**API Key**: `ota251103_key_67890`
**Partner ID**: `ota251103_partner`
**Rate Limit**: 300 requests/minute