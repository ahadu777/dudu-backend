# PRD-009: Multi-Tenant E-Commerce Platform (B2B & B2C)

## Document Metadata
```yaml
prd_id: "PRD-009"
product_area: "Commerce"
owner: "Product Team"
status: "Draft"
created_date: "2025-12-14"
last_updated: "2025-12-14"
related_stories: []
implementation_cards: []
```

## Document Information

| Field | Value |
|-------|-------|
| **Document Title** | E-Commerce Platform PRD |
| **Version** | 5.0 |
| **Status** | Living Document |
| **Last Updated** | December 2025 |
| **Owner** | Product Team |
| **Stakeholders** | Engineering, Design, Sales, Operations |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Objectives](#3-goals--objectives)
4. [Target Users & Personas](#4-target-users--personas)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [User Flows](#8-user-flows)
9. [Technical Architecture](#9-technical-architecture)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Constraints & Assumptions](#11-constraints--assumptions)
12. [Dependencies](#12-dependencies)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Current Implementation Status](#14-current-implementation-status)
15. [Test Cases & Audit Checklist](#15-test-cases--audit-checklist)
16. [Development Plan](#16-development-plan)
17. [Issue Tracker](#17-issue-tracker)
18. [Future Features (Roadmap)](#18-future-features-roadmap)
19. [Codebase Guide](#19-codebase-guide)
20. [Database Schema](#20-database-schema)
21. [API Reference](#21-api-reference)
22. [External Services](#22-external-services)
23. [Development Setup](#23-development-setup)
24. [Appendices](#24-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Build a **flexible, multi-tenant e-commerce platform** that serves both B2C (individual consumers) and B2B (business buyers) customers across multiple organizations, enabling seamless online ordering with organization-specific branding, pricing, and workflows.

### 1.2 Value Proposition

| Stakeholder | Value Delivered |
|-------------|-----------------|
| **B2C Customers** | Fast, intuitive shopping experience with secure checkout |
| **B2B Customers** | Self-service ordering with company-specific pricing and invoicing |
| **Organizations** | Fully branded storefront with centralized order management |
| **Operations** | Reduced manual order processing, real-time inventory visibility |

### 1.3 Product Scope

This PRD covers the complete e-commerce functionality including:

- Product catalog and discovery
- Shopping cart and checkout
- B2B pricing and invoicing
- Payment processing
- Order management
- Inventory tracking
- Promotions and discounts

### 1.4 Out of Scope

- Shipping carrier integration (future phase)
- Marketplace/multi-vendor support
- Subscription/recurring orders
- Customer reviews and ratings system

---

## 2. Problem Statement

### 2.1 Current Challenges

#### For B2C Customers
| Problem | Impact | Evidence |
|---------|--------|----------|
| Complex checkout processes | Cart abandonment | Industry avg: 70% abandonment rate |
| Poor mobile experience | Lost mobile sales | 60%+ traffic is mobile |
| Lack of real-time stock info | Customer frustration | Orders placed for unavailable items |
| Multiple payment friction | Incomplete purchases | Users abandon at payment step |

#### For B2B Customers
| Problem | Impact | Evidence |
|---------|--------|----------|
| Manual ordering (phone/email) | Slow, error-prone | Orders take hours, not minutes |
| No pricing visibility | Constant back-and-forth | Sales team bottleneck |
| Paper-based invoicing | Delayed payments | Manual invoice generation |
| No order history access | Repeat order friction | Can't easily reorder |
| Lack of PO tracking | Procurement pain | No audit trail |

#### For Organizations
| Problem | Impact | Evidence |
|---------|--------|----------|
| Disconnected systems | Data silos | Manual data reconciliation |
| No real-time inventory | Overselling | Fulfillment failures |
| Generic platforms | Brand dilution | Can't customize experience |
| Manual promotions | Marketing bottleneck | Slow campaign execution |

### 2.2 Opportunity Statement

> **By providing a unified, multi-tenant e-commerce platform with B2B and B2C capabilities, we can reduce order processing time by 80%, eliminate manual invoicing, and provide real-time visibility across all sales channels.**

---

## 3. Goals & Objectives

### 3.1 Business Goals

| Goal | Description | Target |
|------|-------------|--------|
| **G1** | Increase online order volume | +50% within 6 months |
| **G2** | Reduce order processing time | <5 minutes per order |
| **G3** | Enable B2B self-service | 70% B2B orders via platform |
| **G4** | Reduce cart abandonment | <40% abandonment rate |
| **G5** | Support multiple organizations | 5+ organizations on platform |

### 3.2 User Goals

| User Type | Goals |
|-----------|-------|
| **B2C Customer** | Find products quickly, checkout in <3 minutes, track orders |
| **B2B Buyer** | Access company pricing, place bulk orders, download invoices |
| **Admin/Operator** | Manage orders efficiently, track inventory, run promotions |

### 3.3 Product Objectives

| Objective | Key Results |
|-----------|-------------|
| **O1: Seamless Checkout** | Checkout completion rate >60% |
| **O2: Mobile-First** | 100% feature parity on mobile |
| **O3: B2B Enablement** | Invoice generation <30 seconds |
| **O4: Real-time Inventory** | Stock accuracy >99% |
| **O5: Multi-Org Support** | Org-specific branding, pricing, workflows |

---

## 4. Target Users & Personas

### 4.1 Persona: Sarah Chen - B2C Individual Buyer

| Attribute | Details |
|-----------|---------|
| **Role** | Individual consumer |
| **Age** | 28-45 |
| **Tech Savvy** | Moderate to High |
| **Device** | Primarily mobile (70%), Desktop (30%) |

**Goals:**
- Browse and compare products easily
- Quick checkout with saved payment methods
- Track order status in real-time
- Access order history for returns

**Pain Points:**
- Too many checkout steps
- Hidden costs revealed at checkout
- No guest checkout option
- Slow page loads on mobile

**Quote:**
> "I want to find what I need, buy it fast, and know exactly when it's arriving."

---

### 4.2 Persona: Michael Torres - B2B Procurement Manager

| Attribute | Details |
|-----------|---------|
| **Role** | Procurement Manager at mid-size company |
| **Company Size** | 50-500 employees |
| **Order Frequency** | Weekly to bi-weekly |
| **Order Value** | $500 - $10,000 per order |

**Goals:**
- Access negotiated/contract pricing
- Place orders with PO numbers
- Download invoices for accounting
- Reorder frequently purchased items quickly
- Manage approval workflows

**Pain Points:**
- Having to call/email for pricing
- No visibility into order status
- Manual invoice requests
- Can't see order history

**Quote:**
> "I need to place orders quickly with our contract pricing, and get proper invoices for our accounting team."

---

### 4.3 Persona: Lisa Wong - Operations Administrator

| Attribute | Details |
|-----------|---------|
| **Role** | Order/Operations Administrator |
| **Responsibilities** | Order processing, inventory, customer service |
| **Daily Volume** | 20-100 orders |

**Goals:**
- Process orders efficiently
- Monitor inventory levels
- Generate reports and invoices
- Manage customer communications
- Run promotional campaigns

**Pain Points:**
- Manual data entry across systems
- No real-time inventory visibility
- Complex promotion setup
- Fragmented customer information

**Quote:**
> "I need one place to manage all orders, see what's in stock, and keep customers informed."

---

### 4.4 Persona: David Park - Organization Owner/Admin

| Attribute | Details |
|-----------|---------|
| **Role** | Business Owner or IT Admin |
| **Responsibilities** | Platform configuration, branding, user management |

**Goals:**
- Customize storefront with company branding
- Configure pricing and payment options
- Manage user access and permissions
- View sales analytics and reports

**Pain Points:**
- Generic platforms don't match brand
- Complex configuration processes
- Limited customization options

---

## 5. User Stories & Use Cases

### 5.1 B2C User Stories

#### Epic: Product Discovery
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2C-001 | As a customer, I want to browse products by category so I can find what I need quickly | P0 | Categories display, filter works, <2s load |
| B2C-002 | As a customer, I want to search for products by name so I can find specific items | P0 | Search returns relevant results in <1s |
| B2C-003 | As a customer, I want to filter by price range so I can stay within budget | P1 | Price filter works, results update instantly |
| B2C-004 | As a customer, I want to sort products by price/name so I can compare options | P1 | Sort options work correctly |
| B2C-005 | As a customer, I want to see product availability so I don't order out-of-stock items | P0 | Stock level displayed, out-of-stock indicated |

#### Epic: Product Details
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2C-006 | As a customer, I want to view product images so I can see what I'm buying | P0 | Multiple images, zoom capability |
| B2C-007 | As a customer, I want to see product variants (size/color) so I can select the right option | P1 | Variants selectable, price updates |
| B2C-008 | As a customer, I want to see unit pricing so I can compare value | P1 | Unit price displayed clearly |

#### Epic: Shopping Cart
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2C-009 | As a customer, I want to add products to cart so I can purchase multiple items | P0 | Add to cart works, feedback shown |
| B2C-010 | As a customer, I want to update quantities in cart so I can adjust my order | P0 | Quantity +/- works, total updates |
| B2C-011 | As a customer, I want to remove items from cart so I can change my mind | P0 | Remove works, cart updates |
| B2C-012 | As a customer, I want my cart to persist so I don't lose items on refresh | P0 | Cart survives page refresh/close |
| B2C-013 | As a customer, I want to see cart total so I know what I'll pay | P0 | Subtotal, tax, total displayed |

#### Epic: Checkout
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2C-014 | As a customer, I want to enter shipping info so I receive my order | P0 | Address form validates, saves |
| B2C-015 | As a customer, I want to select delivery options so I control when I receive order | P1 | Delivery methods shown, dates selectable |
| B2C-016 | As a customer, I want to review my order before paying so I can verify details | P0 | Full order summary displayed |
| B2C-017 | As a customer, I want to select payment method so I can pay my way | P0 | Payment options shown, selection works |
| B2C-018 | As a customer, I want to apply discount codes so I can save money | P1 | Code entry works, discount applied |
| B2C-019 | As a customer, I want order confirmation so I know my order was placed | P0 | Confirmation page, order number shown |

#### Epic: Order Management
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2C-020 | As a customer, I want to view order history so I can track past purchases | P1 | Order list with status |
| B2C-021 | As a customer, I want to view order details so I can see what I ordered | P1 | Full order details accessible |
| B2C-022 | As a customer, I want to track order status so I know when it's coming | P1 | Status updates displayed |

---

### 5.2 B2B User Stories

#### Epic: B2B Authentication & Access
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2B-001 | As a B2B buyer, I want to log in with my company account so I access B2B features | P0 | Company login works, B2B UI shown |
| B2B-002 | As a B2B buyer, I want to see my company's negotiated prices so I know what I'll pay | P0 | Company-specific prices displayed |
| B2B-003 | As a B2B buyer, I want to select which company I'm ordering for (if multiple) | P1 | Company selector works |

#### Epic: B2B Ordering
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2B-004 | As a B2B buyer, I want to order in bulk quantities so I can meet business needs | P0 | Bulk qty entry works |
| B2B-005 | As a B2B buyer, I want to enter a PO number so I can track for accounting | P1 | PO field available, saved to order |
| B2B-006 | As a B2B buyer, I want to see tiered pricing so I know discounts for volume | P1 | Price tiers displayed |
| B2B-007 | As a B2B buyer, I want to select invoice payment so I can pay on terms | P0 | Invoice option available |
| B2B-008 | As a B2B buyer, I want to see my credit terms so I know payment timeline | P2 | Net terms displayed |

#### Epic: B2B Invoicing
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2B-009 | As a B2B buyer, I want invoices generated for orders so I have accounting records | P0 | Invoice auto-generated |
| B2B-010 | As a B2B buyer, I want to download invoice PDFs so I can share with accounting | P0 | PDF download works |
| B2B-011 | As a B2B buyer, I want invoice to show company details and tax so it's compliant | P0 | All required fields present |
| B2B-012 | As a B2B buyer, I want to access past invoices so I can reconcile payments | P1 | Invoice history accessible |

#### Epic: B2B Order Management
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| B2B-013 | As a B2B buyer, I want to reorder previous orders quickly so I save time | P1 | Reorder button works |
| B2B-014 | As a B2B buyer, I want to see all company orders so I have visibility | P1 | Company order list shown |

---

### 5.3 Admin User Stories

#### Epic: Order Management
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-001 | As an admin, I want to view all orders so I can manage fulfillment | P0 | Order list loads, searchable |
| ADM-002 | As an admin, I want to update order status so customers are informed | P0 | Status update works |
| ADM-003 | As an admin, I want to search/filter orders so I can find specific orders | P0 | Search and filters work |
| ADM-004 | As an admin, I want to view order details so I can process orders | P0 | Full order details shown |

#### Epic: Inventory Management
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-005 | As an admin, I want to view stock levels so I know what's available | P0 | Stock levels displayed |
| ADM-006 | As an admin, I want to record stock in/out so inventory stays accurate | P0 | Stock operations work |
| ADM-007 | As an admin, I want low stock alerts so I can reorder in time | P1 | Alerts trigger at threshold |

#### Epic: Promotions
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-008 | As an admin, I want to create promotions so I can drive sales | P1 | Promotion creation works |
| ADM-009 | As an admin, I want to create discount codes so customers can save | P1 | Code creation works |
| ADM-010 | As an admin, I want to preview promotion effect so I verify before launch | P2 | Preview shows discount |

#### Epic: Customer Management
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-011 | As an admin, I want to manage customer groups so I can segment pricing | P1 | Groups CRUD works |
| ADM-012 | As an admin, I want to assign customers to groups so they get correct pricing | P1 | Assignment works |

#### Epic: Data Import/Export
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-013 | As an admin, I want to import data via CSV/Excel so I can bulk load orders/products | P1 | CSV upload works, records created |
| ADM-014 | As an admin, I want to download import templates so I know the correct format | P1 | Template downloads with correct columns |
| ADM-015 | As an admin, I want to see import progress so I know when it's complete | P2 | Progress bar shows percentage |
| ADM-016 | As an admin, I want to export contacts to CSV so I can use data externally | P2 | CSV downloads with selected fields |
| ADM-017 | As an admin, I want to upload files/images so I can attach to products/orders | P1 | File upload works, files accessible |

#### Epic: Templates & Automation
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-018 | As an admin, I want to save order templates so I can reuse common orders | P1 | Template saves, can be loaded |
| ADM-019 | As an admin, I want to manage workflows so I can automate processes | P2 | Workflow list loads, can execute |
| ADM-020 | As an admin, I want to monitor workflow jobs so I can track automation | P2 | Job status visible, can retry failed |

#### Epic: Notifications & Communication
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-021 | As an admin, I want to send push notifications so I can alert customers | P2 | Notification sends, delivery tracked |
| ADM-022 | As an admin, I want to view activity logs so I can audit system changes | P1 | Activities listed with filters |

#### Epic: AI Assistant
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-023 | As an operator, I want to create orders via chat so I can take orders quickly | P2 | Chat adds products, creates order |
| ADM-024 | As an operator, I want to view chat history so I can reference past conversations | P2 | History searchable, can resume |

#### Epic: Multi-Organization
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| ADM-025 | As an admin, I want to switch organizations so I can manage multiple tenants | P0 | Org switcher works, data isolated |
| ADM-026 | As an admin, I want org-specific branding so each tenant has their identity | P1 | Colors, logo, theme per org |

---

## 6. Functional Requirements

### 6.1 Product Catalog

#### FR-CAT-001: Product Listing
| Requirement | Description |
|-------------|-------------|
| **Display Modes** | Support grid, list, and order form views |
| **Grid Configuration** | Configurable columns (1-4), responsive |
| **Product Card** | Show image, name, price, stock status |
| **Lazy Loading** | Images load on scroll for performance |

#### FR-CAT-002: Product Filtering
| Filter Type | Behavior |
|-------------|----------|
| **Category** | Client-side, multi-select |
| **Price Range** | Client-side, slider or min/max inputs |
| **Availability** | Client-side, toggle in-stock only |
| **Company (B2B)** | Server-side, updates pricing |

#### FR-CAT-003: Product Sorting
| Sort Option | Direction |
|-------------|-----------|
| Name | A-Z, Z-A |
| Price | Low-High, High-Low |
| Date Added | Newest, Oldest |

#### FR-CAT-004: Pagination
| Type | Behavior |
|------|----------|
| Traditional | Page numbers, next/prev |
| Load More | Button to load next batch |
| Infinite Scroll | Auto-load on scroll |

**Configuration Reference**: [lib/catalog-config.ts](lib/catalog-config.ts)

```typescript
interface ProductCatalogConfig {
  display: {
    defaultView: 'grid' | 'list' | 'orderForm';
    gridColumns: number;
    showProductImages: boolean;
    enableQuickView: boolean;
    enableDetailPage: boolean;
  };
  sorting: {
    defaultSortField: 'name' | 'price';
    defaultSortDirection: 'asc' | 'desc';
    allowUserSorting: boolean;
  };
  filtering: {
    availableFilters: Array<'categories' | 'price' | 'availability' | 'company'>;
    companyFilter: { showExclusivePricing: boolean };
  };
  pagination: {
    type: 'traditional' | 'loadMore' | 'infiniteScroll';
    itemsPerPage: number;
  };
}
```

---

### 6.2 Product Detail

#### FR-PD-001: Product Information Display
| Element | Requirement |
|---------|-------------|
| **Name** | Display product name prominently |
| **Price** | Show price, unit price if applicable |
| **Description** | Rich text product description |
| **Stock** | Show available quantity or status |
| **SKU/Code** | Display product identifier |

#### FR-PD-002: Image Gallery
| Feature | Requirement |
|---------|-------------|
| **Multiple Images** | Support 1-10 images per product |
| **Gallery Navigation** | Thumbnails, dots, or slider |
| **Zoom** | Click/hover to zoom (configurable) |
| **Responsive** | Optimized for mobile viewing |

#### FR-PD-003: Product Variants
| Feature | Requirement |
|---------|-------------|
| **Variant Selection** | Dropdowns or buttons for options |
| **Price Update** | Price changes based on variant |
| **Stock Update** | Stock reflects selected variant |
| **Image Update** | Image changes with variant (if configured) |

#### FR-PD-004: Add to Cart
| Feature | Requirement |
|---------|-------------|
| **Quantity Selector** | +/- buttons, direct input |
| **Max Quantity** | Cannot exceed available stock |
| **Add Button** | Clear CTA, disabled if unavailable |
| **Feedback** | Toast notification on add |

---

### 6.3 Shopping Cart

#### FR-CART-001: Cart Operations
| Operation | Requirement |
|-----------|-------------|
| **Add Item** | Add product with quantity, variant |
| **Update Quantity** | Modify quantity, recalculate totals |
| **Remove Item** | Delete item from cart |
| **Clear Cart** | Remove all items |

#### FR-CART-002: Cart Display
| Element | Requirement |
|---------|-------------|
| **Item List** | Image, name, variant, qty, price |
| **Subtotal** | Sum of item totals |
| **Discounts** | Show applied discounts |
| **Tax** | Calculate and display tax |
| **Total** | Final amount to pay |

#### FR-CART-003: Cart Persistence
| Scenario | Behavior |
|----------|----------|
| **Page Refresh** | Cart survives refresh |
| **Browser Close** | Cart persists (localStorage) |
| **Login** | Cart merges with account cart |

#### FR-CART-004: Sticky Cart
| Feature | Requirement |
|---------|-------------|
| **Visibility** | Always visible while shopping |
| **Collapse/Expand** | Toggle detailed view |
| **Item Count** | Badge showing cart count |
| **Quick Checkout** | Button to proceed |

---

### 6.4 Checkout Flow

#### FR-CHK-001: Multi-Step Checkout
| Step | Required | Content |
|------|----------|---------|
| **1. Products** | Yes | Product selection (can be separate) |
| **2. Customer Info** | Configurable | Name, email, phone, address |
| **3. Delivery** | Configurable | Method, date, notes |
| **4. Review** | Yes | Order summary |
| **5. Payment** | Configurable | Payment method selection |

#### FR-CHK-002: Customer Information
| Field | Validation |
|-------|------------|
| **Name** | Required, 2-100 chars |
| **Email** | Required, valid email format |
| **Phone** | Required, valid phone format |
| **Address** | Required for physical delivery |
| **City/State/Zip** | Required for physical delivery |

#### FR-CHK-003: Delivery Options
| Option | Details |
|--------|---------|
| **Delivery Method** | Standard, Express, Pickup |
| **Delivery Date** | Date picker with available dates |
| **Delivery Notes** | Free text for instructions |
| **Delivery Location** | Map selection (if enabled) |

#### FR-CHK-004: Order Review
| Element | Requirement |
|---------|-------------|
| **Item Summary** | All items with quantities and prices |
| **Customer Summary** | Entered customer information |
| **Delivery Summary** | Selected delivery options |
| **Price Breakdown** | Subtotal, discounts, tax, total |
| **Edit Links** | Navigate back to modify |

#### FR-CHK-005: Payment
| Feature | Requirement |
|---------|-------------|
| **Method Selection** | Display available payment methods |
| **Gateway Integration** | Connect to payment processors |
| **Redirect Handling** | Handle 3DS, external gateways |
| **Error Handling** | Clear error messages, retry option |

---

### 6.5 B2B Features

#### FR-B2B-001: Company Authentication
| Feature | Requirement |
|---------|-------------|
| **Company Login** | Authenticate with company credentials |
| **Company Selection** | Select active company (if multiple) |
| **Company Context** | All operations use company context |

#### FR-B2B-002: B2B Pricing
| Feature | Requirement |
|---------|-------------|
| **Company Prices** | Show company-negotiated prices |
| **Price Tiers** | Volume discount tiers |
| **Customer Groups** | Group-based pricing rules |
| **Exclusive Products** | Company-specific product access |

#### FR-B2B-003: B2B Checkout
| Feature | Requirement |
|---------|-------------|
| **PO Number** | Optional field for purchase order |
| **Company Billing** | Pre-fill company address |
| **Invoice Payment** | Select pay-by-invoice option |
| **Net Terms** | Display payment terms |

#### FR-B2B-004: Invoice Generation
| Feature | Requirement |
|---------|-------------|
| **Auto-Generation** | Invoice created on order |
| **PDF Export** | Download as PDF |
| **Required Fields** | Company name, address, tax ID, items, totals |
| **Tax Calculation** | Correct tax per jurisdiction |

---

### 6.6 Order Management

#### FR-ORD-001: Order List (Admin)
| Feature | Requirement |
|---------|-------------|
| **Order Display** | List with key details |
| **Search** | Search by order #, customer, etc. |
| **Filter** | Filter by status, date, customer |
| **Sort** | Sort by date, status, amount |

#### FR-ORD-002: Order Detail
| Feature | Requirement |
|---------|-------------|
| **Order Info** | Order #, date, status |
| **Customer Info** | Name, contact, address |
| **Items** | Products, quantities, prices |
| **Totals** | Subtotal, tax, discounts, total |
| **History** | Status changes, notes |

#### FR-ORD-003: Order Status Management
| Status | Description |
|--------|-------------|
| **Pending** | Order received, not processed |
| **Confirmed** | Order confirmed |
| **Processing** | Order being prepared |
| **Shipped** | Order dispatched |
| **Delivered** | Order received by customer |
| **Cancelled** | Order cancelled |

#### FR-ORD-004: Order Timeline
| Feature | Requirement |
|---------|-------------|
| **Visual Timeline** | Show order progress |
| **Status History** | All status changes with timestamps |
| **Notes** | Internal notes per status |

---

### 6.7 Inventory Management

#### FR-INV-001: Stock Tracking
| Feature | Requirement |
|---------|-------------|
| **Stock Levels** | Current quantity per product |
| **Stock Status** | In stock, low stock, out of stock |
| **Location** | Multi-location support (if applicable) |

#### FR-INV-002: Stock Operations
| Operation | Details |
|-----------|---------|
| **Stock In** | Add inventory with reason |
| **Stock Out** | Remove inventory with reason |
| **Adjustment** | Correct inventory counts |
| **Transfer** | Move between locations |

#### FR-INV-003: Stock Alerts
| Alert | Trigger |
|-------|---------|
| **Low Stock** | Quantity below threshold |
| **Out of Stock** | Quantity = 0 |
| **Reorder Point** | Quantity at reorder level |

---

### 6.8 Promotions & Discounts

#### FR-PROMO-001: Promotion Types
| Type | Description |
|------|-------------|
| **Percentage Off** | X% discount on items/order |
| **Fixed Amount** | $X off items/order |
| **Buy X Get Y** | Purchase-based free items |
| **Free Shipping** | Waive shipping cost |

#### FR-PROMO-002: Discount Codes
| Feature | Requirement |
|---------|-------------|
| **Code Entry** | Input field in cart/checkout |
| **Validation** | Check code validity, usage limits |
| **Application** | Apply discount, show savings |
| **Removal** | Allow code removal |

#### FR-PROMO-003: Promotion Display
| Component | Usage |
|-----------|-------|
| **Banner** | Homepage/category promotion |
| **Carousel** | Multiple promotions rotation |
| **Badge** | Product-level promo indicator |
| **Cart Display** | Show applied promotion |

---

### 6.9 Data Import/Export

#### FR-IMP-001: CSV/Excel Import
| Feature | Requirement |
|---------|-------------|
| **File Upload** | Support CSV and Excel (.xlsx) files |
| **File Validation** | Max 1MB, validate file type |
| **Field Mapping** | Auto-detect columns, manual mapping |
| **Collection Target** | Import to any collection (orders, products, companies, customers) |
| **Progress Tracking** | Show import progress percentage |
| **Error Handling** | Report row-level errors, skip/retry options |
| **Template Download** | Generate CSV template from collection schema |
| **Batch Processing** | Process records in batches for large files |

**Supported Import Targets:**
- Orders and Order Lines
- Products
- Companies
- Customers/Contacts
- Inventory adjustments

**Files:** `app/import/`, `components/csv-import.tsx`, `lib/hooks/use-csv-import.ts`

#### FR-IMP-002: File Upload
| Feature | Requirement |
|---------|-------------|
| **Single Upload** | Upload individual files |
| **Bulk Upload** | Upload multiple files at once |
| **File Types** | Images, PDFs, documents |
| **Progress Indicator** | Show upload progress |
| **File Management** | View, download, delete uploaded files |

**Files:** `app/file-upload/`, `components/file-upload.tsx`, `components/bulk-upload.tsx`

#### FR-IMP-003: Data Export
| Feature | Requirement |
|---------|-------------|
| **Contact Export** | Export customers/contacts to CSV |
| **Order Export** | Export orders with line items |
| **Inventory Export** | Export stock levels |
| **Custom Fields** | Select fields to export |

**Files:** `components/export-contacts.tsx`, `lib/download-utils.ts`

---

### 6.10 Order Templates

#### FR-TMPL-001: Template Management
| Feature | Requirement |
|---------|-------------|
| **Save Template** | Save current order as reusable template |
| **Template Name** | Name and description for template |
| **Template List** | View all saved templates with search/filter |
| **Load Template** | Apply template to new order |
| **Preview Template** | View template details before loading |
| **Delete Template** | Remove unused templates |
| **Template Types** | Filter by template type |

**Use Cases:**
- Frequently ordered product combinations
- Standard B2B reorders
- Seasonal order patterns

**Files:** `components/order-templates.tsx`, `hooks/useOrderTemplates.ts`

---

### 6.11 AI Chat Assistant

#### FR-CHAT-001: Conversational Order Taking
| Feature | Requirement |
|---------|-------------|
| **Chat Interface** | Real-time chat dialog with AI assistant |
| **Product Search** | Find products via natural language |
| **Add to Cart** | Add products through conversation |
| **Update Quantities** | Modify order via chat |
| **Customer Selection** | Set customer through conversation |
| **Order Preview** | View order built through chat |
| **Share Conversation** | Share chat transcript |

**Order Actions Supported:**
- `add_product` - Add product to order
- `update_quantity` - Change item quantity
- `remove_product` - Remove from order
- `set_customer` - Assign customer
- `finalize_order` - Complete order

**Files:** `app/chat/`, `components/chat-dialog.tsx`, `components/chat-share-dialog.tsx`

#### FR-CHAT-002: Chat History
| Feature | Requirement |
|---------|-------------|
| **Conversation History** | View past chat sessions |
| **Search History** | Search through conversations |
| **Resume Chat** | Continue previous conversation |

**Files:** `app/chat-history/page.tsx`

---

### 6.12 Workflow Automation

#### FR-WF-001: Workflow Manager
| Feature | Requirement |
|---------|-------------|
| **Workflow List** | View available workflow templates |
| **Execute Workflow** | Run workflow on demand |
| **Job Monitoring** | Track job status (pending, running, completed, failed) |
| **Job Filters** | Filter by status, date range |
| **Retry Failed** | Retry failed workflow jobs |
| **Stop Job** | Cancel running jobs |
| **Execution Steps** | View step-by-step execution details |

**Workflow Types:**
- Order processing automation
- Inventory sync workflows
- Notification triggers
- Data synchronization

**Files:** `app/workflow-manager/`, `components/workflow-manager.tsx`, `components/workflow-execution-steps.tsx`

---

### 6.13 Activity Tracking

#### FR-ACT-001: Activity Logs
| Feature | Requirement |
|---------|-------------|
| **Activity List** | View all system activities |
| **Activity Filters** | Filter by action, user, date, collection |
| **Order Activities** | Track changes specific to an order |
| **Activity Details** | View full details of each activity |
| **User Attribution** | Show who performed each action |
| **Timestamp** | Exact time of each activity |

**Tracked Actions:**
- Create, Update, Delete operations
- Status changes
- User actions
- System events

**Files:** `components/activity-tab.tsx`, `components/activity-detail-modal.tsx`, `lib/api-activity.ts`

---

### 6.14 Push Notifications

#### FR-NOTIF-001: Firebase Cloud Messaging
| Feature | Requirement |
|---------|-------------|
| **Send Notification** | Push notifications to users |
| **Target Audience** | Select users/groups to notify |
| **Notification Content** | Title, body, data payload |
| **Delivery Status** | Track notification delivery |
| **Notification History** | View sent notifications |

**Use Cases:**
- Order status updates
- Promotional announcements
- Low stock alerts
- System notifications

**Files:** `app/push-notifications/`, `lib/api-push-notifications.ts`

---

### 6.15 Quick Favorites & Recommendations

#### FR-FAV-001: Quick Add Favorites
| Feature | Requirement |
|---------|-------------|
| **Mark Favorite** | Add products to favorites |
| **Quick Add** | One-click add favorites to cart |
| **Favorites List** | View all favorited products |
| **Remove Favorite** | Unmark products |

**Files:** `components/quick-add-favorites.tsx`

#### FR-FAV-002: Product Recommendations
| Feature | Requirement |
|---------|-------------|
| **Related Products** | Show related items on product detail |
| **Frequently Bought** | Items often purchased together |
| **Recently Viewed** | Track and display viewed products |

**Files:** `components/product-recommendations.tsx`

---

### 6.16 Multi-Organization Management

#### FR-ORG-001: Organization Configuration
| Feature | Requirement |
|---------|-------------|
| **Multiple Orgs** | Support multiple organizations (tenants) |
| **Org Selection** | Switch between organizations |
| **Org-Specific Config** | Each org has own API URL, branding, colors |
| **Data Isolation** | Complete data separation between orgs |

**Supported Organizations:**
- ORQ Home (orq-dev)
- Want Want (orq-ww)
- RentSmart (rs-orq) - multiple environments

#### FR-ORG-002: Organization Branding
| Feature | Requirement |
|---------|-------------|
| **Custom Colors** | Gradient, text, border colors per org |
| **Logo** | Organization logo display |
| **Theme** | Organization-specific styling |

#### FR-ORG-003: Organization Switching
| Feature | Requirement |
|---------|-------------|
| **Org Switcher** | UI to change active organization |
| **Login Modal** | Authenticate to different org |
| **Context Persistence** | Remember selected org |

**Files:** `lib/config.ts`, `stores/org-store.ts`, `components/org-switcher.tsx`, `components/org-login-modal.tsx`

---

### 6.17 Document Management

#### FR-DOC-001: Order Documents
| Feature | Requirement |
|---------|-------------|
| **Document Tab** | View all order-related documents |
| **Document Types** | Invoices, inventory notes, receipts |
| **PDF Generation** | Generate PDF documents |
| **Document Preview** | Preview before download |
| **Attachments** | Attach files to orders |

**Files:** `components/order/documents-tab.tsx`, `components/document-tables.tsx`, `components/enhanced-attachments.tsx`

#### FR-DOC-002: Inventory Documents
| Feature | Requirement |
|---------|-------------|
| **Inventory Notes** | Generate inventory adjustment docs |
| **Stock Reports** | Export stock level reports |
| **Movement History** | Document stock movements |

**Files:** `components/inventory-request-preview.tsx`, `components/inventory-output-preview.tsx`

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Requirement | Target |
|--------|-------------|--------|
| **Page Load Time** | Initial page load | < 3 seconds |
| **Time to Interactive** | User can interact | < 5 seconds |
| **API Response Time** | Backend responses | < 500ms (p95) |
| **Search Response** | Search results | < 1 second |
| **Checkout Completion** | Full checkout flow | < 3 minutes |

### 7.2 Scalability

| Metric | Requirement |
|--------|-------------|
| **Concurrent Users** | Support 1,000+ simultaneous users |
| **Orders per Hour** | Handle 500+ orders/hour |
| **Product Catalog** | Support 10,000+ products |
| **Organizations** | Support 10+ organizations |

### 7.3 Availability

| Metric | Requirement |
|--------|-------------|
| **Uptime** | 99.9% availability |
| **Planned Maintenance** | < 4 hours/month |
| **Recovery Time** | < 1 hour for critical issues |
| **Data Backup** | Daily backups, 30-day retention |

### 7.4 Security

| Requirement | Implementation |
|-------------|----------------|
| **Authentication** | JWT tokens, secure session management |
| **Authorization** | Role-based access control (RBAC) |
| **Data Encryption** | TLS 1.3 in transit, AES-256 at rest |
| **Payment Security** | PCI DSS compliant (via gateways) |
| **Input Validation** | Server-side validation, XSS prevention |
| **API Security** | Rate limiting, CORS configuration |

### 7.5 Usability

| Requirement | Standard |
|-------------|----------|
| **Mobile Responsive** | 100% functionality on mobile |
| **Touch Targets** | Minimum 44x44px tap targets |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Language Support** | i18n ready (EN, ZH-CN, ZH-TW implemented) |

### 7.6 Reliability

| Requirement | Standard |
|-------------|----------|
| **Error Handling** | Graceful degradation, clear error messages |
| **Data Integrity** | Transaction consistency, no data loss |
| **Offline Support** | Cart persistence, retry failed operations |
| **Monitoring** | Real-time error tracking, alerting |

---

## 8. User Flows

### 8.1 B2C Purchase Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        B2C PURCHASE FLOW                          │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────┐     ┌─────────────┐
    │  Homepage   │────►│   Search    │
    └──────┬──────┘     └──────┬──────┘
           │                   │
           ▼                   │
    ┌─────────────┐            │
    │  Category   │◄───────────┘
    │   Browse    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐     ┌─────────────┐
    │  Product    │────►│   Apply     │
    │   Listing   │     │   Filters   │
    └──────┬──────┘     └─────────────┘
           │
           ▼
    ┌─────────────┐
    │  Product    │
    │   Detail    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Add to     │────────────────────┐
    │   Cart      │                    │ Continue
    └──────┬──────┘                    │ Shopping
           │                           │
           ▼                           │
    ┌─────────────┐◄───────────────────┘
    │   Cart      │
    │   Review    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Customer   │
    │   Info      │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Delivery   │
    │  Options    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Order     │
    │   Review    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐     ┌─────────────┐
    │  Payment    │────►│  Payment    │
    │  Selection  │     │  Gateway    │
    └──────┬──────┘     └──────┬──────┘
           │                   │
           ▼                   │
    ┌─────────────┐◄───────────┘
    │   Order     │
    │ Confirmation│
    └──────┬──────┘
           │
           ▼
    ┌─────────┐
    │   END   │
    └─────────┘
```

### 8.2 B2B Purchase Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        B2B PURCHASE FLOW                          │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────┐
    │  Company    │
    │   Login     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Select     │ (if multiple companies)
    │  Company    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Product    │◄──── B2B Prices Displayed
    │  Catalog    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Product    │◄──── Company Pricing
    │   Detail    │      Volume Tiers
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Add to     │◄──── Bulk Quantities
    │   Cart      │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Cart      │◄──── B2B Pricing Applied
    │   Review    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Company    │◄──── Pre-filled Company Info
    │  Billing    │      PO Number Entry
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Order     │
    │   Review    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Payment    │◄──── Invoice Option
    │  Selection  │      Net Terms Shown
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Order     │
    │ Confirmation│
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Invoice    │◄──── Auto-Generated
    │  Generated  │      PDF Download
    └──────┬──────┘
           │
           ▼
    ┌─────────┐
    │   END   │
    └─────────┘
```

### 8.3 Admin Order Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    ADMIN ORDER MANAGEMENT                         │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────┐
    │   Admin     │
    │   Login     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐     ┌─────────────┐
    │   Order     │────►│   Search/   │
    │   List      │     │   Filter    │
    └──────┬──────┘     └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   Order     │
    │   Detail    │
    └──────┬──────┘
           │
           ├──────────────┬──────────────┐
           ▼              ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │  Update   │  │  Generate │  │   View    │
    │  Status   │  │  Invoice  │  │  Activity │
    └───────────┘  └───────────┘  └───────────┘
           │              │              │
           └──────────────┴──────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Fulfillment│
                   │  Timeline   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────┐
                   │   END   │
                   └─────────┘
```

---

## 9. Technical Architecture

### 9.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Application                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │  Pages  │  │Components│  │  Hooks  │  │ Stores  │        │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ REST API
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Directus Backend                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │  Auth   │  │  Items  │  │  Files  │  │ Webhooks│        │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  PostgreSQL │  │    Redis    │  │   S3/Files  │                 │
│  │  Database   │  │   Cache     │  │   Storage   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 | React framework with SSR/SSG |
| **UI Components** | shadcn/ui | Accessible component library |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **State Management** | Zustand | Lightweight state management |
| **Forms** | React Hook Form | Form handling |
| **API Client** | Axios | HTTP client |
| **Backend** | Directus | Headless CMS / API |
| **Database** | PostgreSQL | Primary data store |
| **Authentication** | JWT | Token-based auth |
| **Payments** | Multiple Gateways | WeChat, etc. |

### 9.3 Multi-Organization Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MULTI-ORGANIZATION LAYER                          │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   ORQ Home    │  │   Want Want   │  │   RentSmart   │           │
│  │   (orq-dev)   │  │    (orq-ww)   │  │   (rs-orq)    │           │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤           │
│  │ • API URL     │  │ • API URL     │  │ • API URL     │           │
│  │ • Branding    │  │ • Branding    │  │ • Branding    │           │
│  │ • Colors      │  │ • Colors      │  │ • Colors      │           │
│  │ • Pricing     │  │ • Pricing     │  │ • Pricing     │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
│  Configuration: lib/config.ts                                        │
│  State: stores/org-store.ts                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.4 Key Components

#### Frontend Components
| Component | Location | Purpose |
|-----------|----------|---------|
| EcommerceOrderView | `components/ecommerce-order/` | Main e-commerce orchestrator |
| ProductFilterSidebar | `components/ecommerce-order/` | Product filtering |
| StickyCart | `components/ecommerce-order/` | Persistent shopping cart |
| ProductDetailModal | `components/ecommerce-order/` | Product details |
| Checkout Steps | `components/ecommerce-order/steps/` | Multi-step checkout |
| InvoiceGenerator | `components/` | B2B invoice creation |

#### API Integration
| File | Purpose |
|------|---------|
| `lib/api-order.ts` | Order CRUD operations |
| `lib/api-products.ts` | Product fetching |
| `lib/api-payment.ts` | Payment processing |
| `lib/api-stock.ts` | Inventory operations |
| `lib/api-promotions.ts` | Promotion management |
| `lib/customer-groups-api.ts` | B2B customer groups |

#### State Management
| Store | Purpose |
|-------|---------|
| `stores/org-store.ts` | Organization context |
| `stores/orderStore.ts` | Order/cart state |

---

## 10. Success Metrics & KPIs

### 10.1 Business Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Online Order Volume** | Baseline | +50% | Orders per month |
| **Order Processing Time** | Manual | <5 min | Time from order to confirmed |
| **B2B Self-Service Rate** | 0% | 70% | B2B orders via platform |
| **Revenue per Visit** | Baseline | +20% | Total revenue / visits |

### 10.2 User Experience Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Cart Abandonment Rate** | ~70% | <40% | Carts abandoned / carts created |
| **Checkout Completion Rate** | ~30% | >60% | Orders / checkout starts |
| **Time to Purchase** | Unknown | <3 min | Time from cart to order |
| **Mobile Conversion Rate** | Unknown | >2% | Mobile orders / mobile visits |

### 10.3 Technical Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Page Load Time** | Unknown | <3s | Lighthouse/RUM |
| **API Response Time** | Unknown | <500ms | Server logs (p95) |
| **Error Rate** | Unknown | <1% | Errors / requests |
| **Uptime** | Unknown | 99.9% | Monitoring system |

### 10.4 B2B Specific Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Invoice Generation Time** | Manual | <30s | Time from order to PDF |
| **B2B Reorder Rate** | Unknown | >40% | Repeat B2B orders |
| **Average B2B Order Value** | Baseline | +15% | B2B revenue / B2B orders |

### 10.5 Measurement Plan

| Metric | Tool | Frequency | Owner |
|--------|------|-----------|-------|
| Order Volume | Database | Daily | Operations |
| Abandonment | Analytics | Weekly | Product |
| Load Time | Lighthouse | Weekly | Engineering |
| Errors | Monitoring | Real-time | Engineering |
| User Feedback | Surveys | Monthly | Product |

---

## 11. Constraints & Assumptions

### 11.1 Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Multi-tenant Architecture** | Must support multiple organizations | Adds complexity to data isolation |
| **Existing Backend** | Directus backend already in place | Limited backend customization |
| **Payment Gateways** | Must use supported gateways | Limited payment options |
| **Mobile Web Only** | No native mobile apps planned | Rely on responsive design |
| **Browser Support** | Modern browsers only | No IE support |

### 11.2 Assumptions

| Assumption | Risk if Invalid |
|------------|-----------------|
| Users have reliable internet | Offline scenarios not handled |
| Products have images | UI may look incomplete |
| Organizations manage own inventory | No cross-org inventory |
| Tax rules are simple | Complex tax needs custom work |
| B2B customers are pre-registered | No B2B self-registration |

### 11.3 Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Cart sync across devices | Cart only in localStorage | P2 |
| Real-time inventory | Not WebSocket-based | P2 |
| Search optimization | Client-side only | P1 |
| Image optimization | Manual process | P2 |

---

## 12. Dependencies

### 12.1 Internal Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Directus Backend | Backend Team | Active |
| Authentication Service | Backend Team | Active |
| Organization Config | Platform Team | Active |
| Design System | Design Team | In Progress |

### 12.2 External Dependencies

| Dependency | Provider | Purpose |
|------------|----------|---------|
| Payment Gateway | WeChat, etc. | Payment processing |
| Email Service | (TBD) | Order confirmations |
| File Storage | Directus Assets | Product images |
| Map Service | (Optional) | Delivery location |

### 12.3 Third-Party Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 14.x | Framework |
| React | 18.x | UI Library |
| Zustand | 4.x | State management |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Components |
| Axios | 1.x | HTTP client |
| date-fns | 2.x | Date handling |
| react-hook-form | 7.x | Form handling |

---

## 13. Risks & Mitigations

### 13.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Payment gateway failures** | Medium | High | Multiple gateways, fallback options |
| **Inventory sync issues** | Medium | High | Real-time updates, validation at checkout |
| **Performance degradation** | Medium | Medium | Monitoring, caching, optimization |
| **Security vulnerabilities** | Low | Critical | Regular audits, secure coding practices |
| **Multi-org data leakage** | Low | Critical | Strict data isolation, testing |
| **Mobile UX issues** | Medium | Medium | Mobile-first design, testing |
| **Third-party API changes** | Medium | Medium | Abstraction layers, monitoring |

### 13.2 Contingency Plans

| Scenario | Plan |
|----------|------|
| Payment gateway down | Display alternative payment methods, manual order option |
| High traffic spike | Auto-scaling, queue management, graceful degradation |
| Data corruption | Automated backups, point-in-time recovery |
| Security breach | Incident response plan, user notification, credential reset |

---

## 14. Current Implementation Status

### 14.1 Feature Status Overview

| Module | Status | Completion | Notes |
|--------|--------|------------|-------|
| Product Catalog | ✅ Implemented | 90% | Needs UX polish |
| Product Filtering | ✅ Implemented | 85% | Persistence issues |
| Shopping Cart | ✅ Implemented | 90% | Works well |
| Checkout Flow | ✅ Implemented | 85% | Mobile needs work |
| B2B Pricing | ✅ Implemented | 80% | Customer groups work |
| B2B Invoicing | ✅ Implemented | 85% | PDF quality varies |
| Payment Integration | ✅ Implemented | 75% | Limited gateways |
| Order Management | ✅ Implemented | 90% | Good functionality |
| Inventory | ✅ Implemented | 80% | Alerts need work |
| Promotions | ✅ Implemented | 75% | Basic functionality |
| Multi-Org | ✅ Implemented | 95% | Works well |
| CSV/Excel Import | ✅ Implemented | 85% | Works for most collections |
| File Upload | ✅ Implemented | 90% | Single and bulk upload |
| Order Templates | ✅ Implemented | 80% | Save/load works |
| AI Chat Assistant | ✅ Implemented | 70% | Basic order taking |
| Workflow Manager | ✅ Implemented | 75% | Job monitoring works |
| Activity Tracking | ✅ Implemented | 85% | Filters and details |
| Push Notifications | ✅ Implemented | 70% | FCM integration |
| Document Management | ✅ Implemented | 80% | Invoices, inventory docs |

### 14.2 Known Issues for Audit

| Area | Priority | Issue |
|------|----------|-------|
| Checkout Mobile | P1 | Step navigation UX |
| Cart Calculations | P1 | Tax accuracy |
| Payment Redirects | P1 | Gateway reliability |
| Filter Persistence | P2 | State lost on navigation |
| Invoice PDF | P2 | Formatting inconsistency |
| Stock Alerts | P2 | Not triggering |
| Search | P2 | Performance on large catalogs |

### 14.3 Files Reference

#### Core E-commerce
| File | Purpose |
|------|---------|
| [ecommerce-order-view.tsx](components/ecommerce-order/ecommerce-order-view.tsx) | Main orchestrator |
| [product-filter-sidebar.tsx](components/ecommerce-order/product-filter-sidebar.tsx) | Filtering |
| [sticky-cart.tsx](components/ecommerce-order/sticky-cart.tsx) | Cart display |
| [product-detail-modal.tsx](components/ecommerce-order/product-detail-modal.tsx) | Product details |
| [customer-info-step.tsx](components/ecommerce-order/steps/customer-info-step.tsx) | Checkout step 1 |
| [delivery-options-step.tsx](components/ecommerce-order/steps/delivery-options-step.tsx) | Checkout step 2 |
| [review-step.tsx](components/ecommerce-order/steps/review-step.tsx) | Checkout step 3 |
| [payment-methods-step.tsx](components/ecommerce-order/steps/payment-methods-step.tsx) | Checkout step 4 |

#### API Layer
| File | Purpose |
|------|---------|
| [api-order.ts](lib/api-order.ts) | Order operations |
| [api-products.ts](lib/api-products.ts) | Product operations |
| [api-payment.ts](lib/api-payment.ts) | Payment operations |
| [api-stock.ts](lib/api-stock.ts) | Inventory operations |
| [api-promotions.ts](lib/api-promotions.ts) | Promotion operations |
| [customer-groups-api.ts](lib/customer-groups-api.ts) | B2B groups |

#### Configuration
| File | Purpose |
|------|---------|
| [config.ts](lib/config.ts) | Organization config |
| [catalog-config.ts](lib/catalog-config.ts) | Catalog settings |

#### Additional Feature Files
| File | Purpose |
|------|---------|
| [csv-import.tsx](components/csv-import.tsx) | CSV/Excel import |
| [order-templates.tsx](components/order-templates.tsx) | Order templates |
| [chat-dialog.tsx](components/chat-dialog.tsx) | AI chat assistant |
| [workflow-manager.tsx](components/workflow-manager.tsx) | Workflow automation |
| [activity-tab.tsx](components/activity-tab.tsx) | Activity tracking |
| [push-notifications/](app/push-notifications/) | Push notifications |

---

## 15. Test Cases & Audit Checklist

### 15.1 B2C Flow Test Cases

#### TC-B2C-HOME: Homepage Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-HOME-001 | Page loads within 3 seconds | Load time < 3s | ☐ |
| TC-B2C-HOME-002 | Hero section displays correctly | All elements visible | ☐ |
| TC-B2C-HOME-003 | Navigation menu works | All links functional | ☐ |
| TC-B2C-HOME-004 | Mobile layout is responsive | Usable on phone | ☐ |
| TC-B2C-HOME-005 | No console errors | Console clean | ☐ |
| TC-B2C-HOME-006 | CTA buttons work | Navigate correctly | ☐ |

#### TC-B2C-CAT: Product Catalog Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-CAT-001 | Products load correctly | All products display | ☐ |
| TC-B2C-CAT-002 | Grid view works | Products in grid | ☐ |
| TC-B2C-CAT-003 | List view works | Products in list | ☐ |
| TC-B2C-CAT-004 | Category filter works | Products filtered | ☐ |
| TC-B2C-CAT-005 | Search filter works | Relevant results | ☐ |
| TC-B2C-CAT-006 | Price filter works | Price range applied | ☐ |
| TC-B2C-CAT-007 | Sorting works (price, name) | Correct order | ☐ |
| TC-B2C-CAT-008 | Pagination works | Next page loads | ☐ |
| TC-B2C-CAT-009 | Product images display | Images visible | ☐ |
| TC-B2C-CAT-010 | Prices show correctly | Correct prices | ☐ |
| TC-B2C-CAT-011 | Stock status visible | In/out of stock shown | ☐ |
| TC-B2C-CAT-012 | Add to cart from listing | Item added | ☐ |
| TC-B2C-CAT-013 | Mobile touch targets adequate | Tappable on phone | ☐ |

#### TC-B2C-PD: Product Detail Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-PD-001 | Detail page/modal opens | Detail view shows | ☐ |
| TC-B2C-PD-002 | All product images load | Images visible | ☐ |
| TC-B2C-PD-003 | Image gallery navigation | Can browse images | ☐ |
| TC-B2C-PD-004 | Price displays correctly | Correct price | ☐ |
| TC-B2C-PD-005 | Description shows | Description visible | ☐ |
| TC-B2C-PD-006 | Stock level indicator works | Shows availability | ☐ |
| TC-B2C-PD-007 | Unit selection works | Can select units | ☐ |
| TC-B2C-PD-008 | Quantity selector works | +/- buttons work | ☐ |
| TC-B2C-PD-009 | Add to cart button works | Item added to cart | ☐ |
| TC-B2C-PD-010 | Success feedback shown | Toast notification | ☐ |

#### TC-B2C-CART: Shopping Cart Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-CART-001 | Cart icon shows item count | Badge shows count | ☐ |
| TC-B2C-CART-002 | Cart opens/displays correctly | Cart view shows | ☐ |
| TC-B2C-CART-003 | All items listed | All cart items visible | ☐ |
| TC-B2C-CART-004 | Product images in cart | Thumbnails show | ☐ |
| TC-B2C-CART-005 | Prices correct | Correct item prices | ☐ |
| TC-B2C-CART-006 | Quantity increase works | Can add more | ☐ |
| TC-B2C-CART-007 | Quantity decrease works | Can reduce | ☐ |
| TC-B2C-CART-008 | Item removal works | Item removed | ☐ |
| TC-B2C-CART-009 | Subtotal calculates correctly | Math is correct | ☐ |
| TC-B2C-CART-010 | Tax shows (if applicable) | Tax calculated | ☐ |
| TC-B2C-CART-011 | Total is correct | Final amount correct | ☐ |
| TC-B2C-CART-012 | Cart persists on refresh | Cart survives refresh | ☐ |
| TC-B2C-CART-013 | Cart persists on browser close | Cart survives close | ☐ |
| TC-B2C-CART-014 | Empty cart message | Shows when empty | ☐ |
| TC-B2C-CART-015 | Proceed to checkout works | Goes to checkout | ☐ |

#### TC-B2C-CHK: Checkout Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-CHK-001 | Customer form displays | Form visible | ☐ |
| TC-B2C-CHK-002 | Required fields marked | Asterisks shown | ☐ |
| TC-B2C-CHK-003 | Name field works | Can enter name | ☐ |
| TC-B2C-CHK-004 | Email validates format | Invalid email rejected | ☐ |
| TC-B2C-CHK-005 | Phone field works | Can enter phone | ☐ |
| TC-B2C-CHK-006 | Address fields work | Can enter address | ☐ |
| TC-B2C-CHK-007 | Validation messages show | Errors displayed | ☐ |
| TC-B2C-CHK-008 | Can proceed when valid | Next step accessible | ☐ |
| TC-B2C-CHK-009 | Cannot proceed when invalid | Blocked until fixed | ☐ |
| TC-B2C-CHK-010 | Data persists if going back | Data not lost | ☐ |
| TC-B2C-CHK-011 | Delivery options display | Options visible | ☐ |
| TC-B2C-CHK-012 | Can select delivery method | Selection works | ☐ |
| TC-B2C-CHK-013 | Delivery date picker works | Can select date | ☐ |
| TC-B2C-CHK-014 | Delivery notes field works | Can add notes | ☐ |
| TC-B2C-CHK-015 | Order summary accurate | Correct items/prices | ☐ |
| TC-B2C-CHK-016 | Can edit/go back | Back navigation works | ☐ |
| TC-B2C-CHK-017 | Payment methods display | Options visible | ☐ |
| TC-B2C-CHK-018 | Can select payment method | Selection works | ☐ |
| TC-B2C-CHK-019 | Payment form works | Can enter details | ☐ |
| TC-B2C-CHK-020 | Submit payment works | Payment processes | ☐ |
| TC-B2C-CHK-021 | Error handling on failed payment | Error shown | ☐ |
| TC-B2C-CHK-022 | Success redirect works | Goes to confirmation | ☐ |

#### TC-B2C-CONF: Order Confirmation Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2C-CONF-001 | Confirmation page displays | Page shows | ☐ |
| TC-B2C-CONF-002 | Order number shown | Number visible | ☐ |
| TC-B2C-CONF-003 | Order summary accurate | Correct details | ☐ |
| TC-B2C-CONF-004 | View Order link works | Links to order | ☐ |

---

### 15.2 B2B Flow Test Cases

#### TC-B2B-AUTH: B2B Access Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2B-AUTH-001 | B2B login works | Can log in | ☐ |
| TC-B2B-AUTH-002 | Company is recognized | Company context set | ☐ |
| TC-B2B-AUTH-003 | B2B menu/options visible | B2B UI elements show | ☐ |

#### TC-B2B-PRICE: B2B Pricing Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2B-PRICE-001 | Company-specific prices show | Different prices | ☐ |
| TC-B2B-PRICE-002 | Price different from B2C | B2B discount visible | ☐ |
| TC-B2B-PRICE-003 | Price tiers work | Volume discounts | ☐ |
| TC-B2B-PRICE-004 | Customer group pricing works | Group price applied | ☐ |

#### TC-B2B-CHK: B2B Checkout Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2B-CHK-001 | PO number field available | Field visible | ☐ |
| TC-B2B-CHK-002 | PO number saved to order | PO on order | ☐ |
| TC-B2B-CHK-003 | Invoice option available | Can select invoice | ☐ |
| TC-B2B-CHK-004 | Net terms displayed | Terms shown | ☐ |
| TC-B2B-CHK-005 | Billing address captured | Address on order | ☐ |

#### TC-B2B-INV: B2B Invoice Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-B2B-INV-001 | Invoice can be generated | Invoice created | ☐ |
| TC-B2B-INV-002 | Invoice preview works | Preview displays | ☐ |
| TC-B2B-INV-003 | PDF download works | PDF downloads | ☐ |
| TC-B2B-INV-004 | Invoice details correct | All fields present | ☐ |
| TC-B2B-INV-005 | Company info on invoice | Company shown | ☐ |
| TC-B2B-INV-006 | Payment terms on invoice | Terms shown | ☐ |

---

### 15.3 Admin Flow Test Cases

#### TC-ADM-ORD: Order Management Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-ADM-ORD-001 | Order list loads | Orders display | ☐ |
| TC-ADM-ORD-002 | Search orders works | Results shown | ☐ |
| TC-ADM-ORD-003 | Filter by status works | Filtered results | ☐ |
| TC-ADM-ORD-004 | Filter by date works | Date range applied | ☐ |
| TC-ADM-ORD-005 | Order detail opens | Detail view shows | ☐ |
| TC-ADM-ORD-006 | Order items display correctly | Items listed | ☐ |
| TC-ADM-ORD-007 | Can update order status | Status changes | ☐ |
| TC-ADM-ORD-008 | Status change saves | Status persists | ☐ |
| TC-ADM-ORD-009 | Can add notes to order | Notes saved | ☐ |
| TC-ADM-ORD-010 | Activity log shows changes | History visible | ☐ |

#### TC-ADM-INV: Inventory Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-ADM-INV-001 | Stock page loads | Page displays | ☐ |
| TC-ADM-INV-002 | Stock levels display | Levels visible | ☐ |
| TC-ADM-INV-003 | Can add stock (stock in) | Stock increased | ☐ |
| TC-ADM-INV-004 | Can remove stock (stock out) | Stock decreased | ☐ |
| TC-ADM-INV-005 | Stock history shows | History visible | ☐ |
| TC-ADM-INV-006 | Low stock products identified | Alert shown | ☐ |
| TC-ADM-INV-007 | Stock reflects on product | Display updated | ☐ |

#### TC-ADM-PROMO: Promotions Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-ADM-PROMO-001 | Promotion list loads | Promotions shown | ☐ |
| TC-ADM-PROMO-002 | Can create new promotion | Promotion created | ☐ |
| TC-ADM-PROMO-003 | Can edit promotion | Changes saved | ☐ |
| TC-ADM-PROMO-004 | Can delete promotion | Promotion removed | ☐ |
| TC-ADM-PROMO-005 | Discount codes can be created | Code created | ☐ |
| TC-ADM-PROMO-006 | **Promotions apply to orders** | Discount calculated | ☐ |
| TC-ADM-PROMO-007 | Discount shows in cart | Discount visible | ☐ |
| TC-ADM-PROMO-008 | Discount shows on order | Discount on order | ☐ |

#### TC-ADM-CUST: Customer Management Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-ADM-CUST-001 | Company list loads | Companies shown | ☐ |
| TC-ADM-CUST-002 | Can create company | Company created | ☐ |
| TC-ADM-CUST-003 | Can edit company | Changes saved | ☐ |
| TC-ADM-CUST-004 | Customer groups list loads | Groups shown | ☐ |
| TC-ADM-CUST-005 | Can assign company to group | Assignment works | ☐ |
| TC-ADM-CUST-006 | Group pricing applies | Price changes | ☐ |

---

### 15.4 Technical Test Cases

#### TC-TECH-CONSOLE: Console Error Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-TECH-CONSOLE-001 | Homepage: No console errors | Console clean | ☐ |
| TC-TECH-CONSOLE-002 | Catalog: No console errors | Console clean | ☐ |
| TC-TECH-CONSOLE-003 | Cart: No console errors | Console clean | ☐ |
| TC-TECH-CONSOLE-004 | Checkout: No console errors | Console clean | ☐ |
| TC-TECH-CONSOLE-005 | Admin: No console errors | Console clean | ☐ |

#### TC-TECH-API: Network/API Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-TECH-API-001 | No failed API calls | All 2xx responses | ☐ |
| TC-TECH-API-002 | API response times < 2s | Fast responses | ☐ |
| TC-TECH-API-003 | No duplicate API calls | Single calls | ☐ |
| TC-TECH-API-004 | Authentication works | Token valid | ☐ |

#### TC-TECH-MOBILE: Mobile Responsiveness Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-TECH-MOBILE-001 | Homepage mobile layout | Responsive | ☐ |
| TC-TECH-MOBILE-002 | Catalog mobile layout | Responsive | ☐ |
| TC-TECH-MOBILE-003 | Product detail mobile layout | Responsive | ☐ |
| TC-TECH-MOBILE-004 | Cart mobile layout | Responsive | ☐ |
| TC-TECH-MOBILE-005 | Checkout mobile layout | Responsive | ☐ |

#### TC-TECH-PERF: Performance Tests
| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-TECH-PERF-001 | Initial page load < 3s | Fast load | ☐ |
| TC-TECH-PERF-002 | Product listing < 2s | Fast listing | ☐ |
| TC-TECH-PERF-003 | Add to cart < 1s | Instant add | ☐ |
| TC-TECH-PERF-004 | Checkout submit < 3s | Fast submit | ☐ |

---

## 16. Development Plan

### 16.1 Development Approach

```
AUDIT FIRST → PRIORITIZE → FIX CRITICAL → COMPLETE FEATURES → ADD NEW
```

1. **Audit Phase** - Test every user flow, document all issues
2. **Prioritize** - Categorize issues by severity (P0/P1/P2/P3)
3. **Fix Critical (P0)** - Payment, promotions, tax
4. **Fix High (P1)** - B2B pricing, validation, stock alerts
5. **Complete Features** - Finish incomplete implementations
6. **Add New** - Only after existing features work

### 16.2 Priority Definitions

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0** | Blocks sales/usage | Can't checkout, payment fails |
| **P1** | Major pain point | Cart loses items, validation broken |
| **P2** | Annoying but workable | UI inconsistency, minor bug |
| **P3** | Nice to fix | Edge case, polish item |

### 16.3 Feature Completion Priorities

| Feature | Current State | What's Missing | Priority |
|---------|---------------|----------------|----------|
| **Payment Processing** | Status lookup only | Actual gateway integration | P0 |
| **Promotions** | CRUD works | Apply to orders, calculate discount | P0 |
| **Tax Calculation** | Not implemented | Tax rules, display in cart | P0 |
| **B2B Pricing** | Customer groups exist | Price tier logic, display | P1 |
| **Form Validation** | Minimal | Proper validation, error messages | P1 |
| **Stock Alerts** | Stock display only | Threshold alerts, notifications | P1 |
| **Invoice Branding** | Basic template | Company logo, custom styling | P2 |
| **Excel Import** | CSV only | .xlsx support | P2 |
| **Order Editing** | View only | Edit after creation | P2 |
| **AI Chat** | UI only | LLM backend integration | P3 |
| **Workflow Engine** | Stub only | Actual workflow execution | P3 |

### 16.4 Implementation Details

#### Payment Processing (P0)
**Current**: API can check payment status, but no actual processing

**To Complete**:
1. Choose payment provider (Stripe recommended)
2. Set up test account
3. Install SDK: `yarn add @stripe/stripe-js @stripe/react-stripe-js`
4. Create payment intent on order creation
5. Implement payment form in PaymentMethodsStep
6. Handle success/failure callbacks
7. Update order with payment status

**Files to modify**:
- `lib/api-payment.ts` - Add Stripe integration
- `components/ecommerce-order/steps/payment-methods-step.tsx` - Add form
- `app/payment/status/page.tsx` - Handle callbacks

#### Promotions Application (P0)
**Current**: Can create/edit promotions, but they don't apply to orders

**To Complete**:
1. Create discount calculation utility
2. Add discount code input to cart/checkout
3. Validate code against promotions API
4. Calculate discount amount
5. Show discount in cart summary
6. Save applied discount to order
7. Show discount on invoice

**Files to modify**:
- New: `lib/discount-calculator.ts`
- New: `components/discount-code-input.tsx`
- `components/ecommerce-order/sticky-cart.tsx`
- `components/ecommerce-order/steps/review-step.tsx`
- `lib/api-order.ts`

#### Tax Calculation (P0)
**Current**: No tax calculation exists

**To Complete**:
1. Determine tax rules (flat rate vs. by region)
2. Create tax calculation service
3. Add tax display to cart summary
4. Include tax in order total
5. Show tax breakdown on invoice

**Files to modify**:
- New: `lib/tax-calculator.ts`
- `components/ecommerce-order/sticky-cart.tsx`
- `components/invoice-generator.tsx`

### 16.5 Development Workflow

**Daily Process**:
```
Morning:
1. Review what's in progress
2. Check Issue Tracker for priority items
3. Pick one item to work on
4. Update status to "In Progress"

During Work:
1. Create branch for the fix/feature
2. Make changes
3. Test thoroughly (use Test Cases section)
4. Commit with clear message

End of Day:
1. Update Issue Tracker status
2. Note any blockers
3. Commit all work
4. Plan tomorrow
```

**Git Workflow**:
```bash
# Start new fix
git checkout -b fix/BUG-001-payment-button

# When done
git commit -m "fix(payment): implement actual payment processing

- Add Stripe integration
- Create payment form component
- Handle success/failure callbacks

Fixes BUG-001"

git push origin fix/BUG-001-payment-button
```

### 16.6 Milestone Tracking

| Milestone | Description | Status |
|-----------|-------------|--------|
| Audit Complete | All test cases run | ☐ Not Started |
| P0 Issues Fixed | Payment, promotions, tax | ☐ Not Started |
| P1 Issues Fixed | B2B, validation, alerts | ☐ Not Started |
| Features Complete | All incomplete done | ☐ Not Started |
| P2/P3 Polish | UI/UX improvements | ☐ Not Started |
| Ready for Launch | All tests pass | ☐ Not Started |

---

## 17. Issue Tracker

### 17.1 Issue Categories

| Category | What to look for | Color |
|----------|------------------|-------|
| **BUG** | Broken functionality | 🔴 Red |
| **UX** | Confusing or frustrating flows | 🟡 Yellow |
| **UI** | Visual inconsistencies | 🔵 Blue |
| **TECH** | Code/performance issues | 🟣 Purple |

### 17.2 Active Issues

#### P0 - Critical (Fix Immediately)

_Issues discovered during audit will be logged here_

<!-- Example Issue:
#### BUG-001: Payment button does nothing

**Category**: BUG
**Priority**: P0
**Flow**: B2C Checkout
**Current Behavior**: Clicking "Pay Now" shows loading then nothing happens
**Expected Behavior**: Should process payment and show confirmation
**Steps to Reproduce**:
1. Add product to cart
2. Go through checkout steps
3. Click "Pay Now" button
4. Nothing happens, no error

**Affected Files**:
- components/ecommerce-order/steps/payment-methods-step.tsx
- lib/api-payment.ts

**Status**: 🔴 Open
**Fixed In**: [commit/PR link when fixed]
-->

---

#### P1 - High Priority

_Issues discovered during audit will be logged here_

---

#### P2 - Medium Priority

_Issues discovered during audit will be logged here_

---

#### P3 - Low Priority

_Issues discovered during audit will be logged here_

---

### 17.3 Known Issues from Code Review

| Issue ID | Area | Issue | Priority | Status |
|----------|------|-------|----------|--------|
| TECH-001 | Payments | No actual payment gateway integration | P0 | 🔴 Open |
| TECH-002 | Promotions | Discounts not applied to orders | P0 | 🔴 Open |
| TECH-003 | Checkout | No tax calculation | P0 | 🔴 Open |
| TECH-004 | B2B | Company pricing logic incomplete | P1 | 🔴 Open |
| TECH-005 | Inventory | No low stock alerts | P1 | 🔴 Open |
| TECH-006 | Checkout | Minimal form validation | P1 | 🔴 Open |
| TECH-007 | AI Chat | No AI backend (UI only) | P2 | 🔴 Open |
| TECH-008 | Workflow | Manager is stub only | P2 | 🔴 Open |
| TECH-009 | Import | Excel not supported (CSV only) | P2 | 🔴 Open |
| TECH-010 | Docs | Invoice branding missing | P2 | 🔴 Open |

### 17.4 Issue Statistics

| Category | Total | P0 | P1 | P2 | P3 | Fixed |
|----------|-------|----|----|----|----|-------|
| BUG | 0 | 0 | 0 | 0 | 0 | 0 |
| UX | 0 | 0 | 0 | 0 | 0 | 0 |
| UI | 0 | 0 | 0 | 0 | 0 | 0 |
| TECH | 10 | 3 | 3 | 4 | 0 | 0 |
| **TOTAL** | **10** | **3** | **3** | **4** | **0** | **0** |

### 17.5 Issue Template

```markdown
#### [CATEGORY]-[NUMBER]: [Short Title]

**Category**: BUG / UX / UI / TECH
**Priority**: P0 / P1 / P2 / P3
**Flow**: Which user flow this affects
**Current Behavior**: What happens now
**Expected Behavior**: What should happen
**Steps to Reproduce**:
1. Go to...
2. Click on...
3. See...

**Affected Files**:
- file1.tsx
- file2.ts

**Screenshot**: [attach if helpful]
**Status**: 🔴 Open | 🟡 In Progress | 🟢 Fixed
**Fixed In**: [commit/PR link]
```

---

## 18. Future Features (Roadmap)

> Features not yet implemented but planned for future development.

### 18.1 Returns & Refunds (Not Implemented)

#### FR-RET-001: Return Request Management
| Feature | Description | Priority |
|---------|-------------|----------|
| **Return Request** | Customer initiates return request | P1 |
| **Return Reasons** | Pre-defined reason codes | P2 |
| **Return Authorization** | Admin approves/rejects returns | P1 |
| **Return Labels** | Generate return shipping labels | P2 |
| **Refund Processing** | Process refund to original payment | P1 |
| **Partial Returns** | Return some items from order | P2 |
| **Exchange Option** | Exchange instead of refund | P2 |

**User Stories:**
- As a customer, I want to request a return so I can get a refund
- As an admin, I want to approve/reject returns so I can manage return policy
- As a customer, I want to track my refund status so I know when I'll be refunded

---

### 18.2 Shipping Integration (Not Implemented)

#### FR-SHIP-001: Carrier Integration
| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-Carrier Support** | Integrate with FedEx, UPS, DHL, etc. | P1 |
| **Rate Shopping** | Compare rates across carriers | P2 |
| **Shipping Labels** | Generate shipping labels | P1 |
| **Tracking Numbers** | Auto-assign tracking numbers | P1 |
| **Real-time Tracking** | Track package location | P1 |
| **Delivery Notifications** | SMS/email on delivery updates | P2 |
| **Address Validation** | Verify shipping addresses | P2 |

**User Stories:**
- As an admin, I want to generate shipping labels so I can ship orders
- As a customer, I want to track my package so I know when it arrives
- As an admin, I want to compare shipping rates so I can choose best option

---

### 18.3 Reports & Analytics (Not Implemented)

#### FR-RPT-001: Sales Reports
| Report | Description | Priority |
|--------|-------------|----------|
| **Sales Summary** | Total sales by period | P1 |
| **Product Performance** | Best/worst selling products | P1 |
| **Customer Analytics** | Customer lifetime value, segments | P2 |
| **Order Trends** | Order volume over time | P1 |
| **Revenue Breakdown** | Revenue by category, customer type | P1 |

#### FR-RPT-002: Inventory Reports
| Report | Description | Priority |
|--------|-------------|----------|
| **Stock Levels** | Current inventory by product | P1 |
| **Low Stock Report** | Products below threshold | P1 |
| **Inventory Valuation** | Total inventory value | P2 |
| **Movement History** | Stock in/out over time | P2 |

#### FR-RPT-003: Export & Scheduling
| Feature | Description | Priority |
|---------|-------------|----------|
| **PDF Export** | Export reports as PDF | P1 |
| **Excel Export** | Export reports as Excel | P1 |
| **Scheduled Reports** | Auto-generate reports on schedule | P3 |
| **Email Reports** | Email reports to stakeholders | P3 |

**User Stories:**
- As an admin, I want to view sales reports so I can track business performance
- As an admin, I want to export reports so I can share with stakeholders
- As an admin, I want to see low stock alerts so I can reorder inventory

---

### 18.4 Enhanced Customer Features (Not Implemented)

#### FR-CUST-001: Wishlist
| Feature | Description | Priority |
|---------|-------------|----------|
| **Add to Wishlist** | Save products for later | P2 |
| **Wishlist Management** | View, remove wishlist items | P2 |
| **Share Wishlist** | Share with others | P3 |
| **Move to Cart** | One-click add to cart | P2 |
| **Price Alerts** | Notify on price drop | P3 |

#### FR-CUST-002: Product Reviews
| Feature | Description | Priority |
|---------|-------------|----------|
| **Write Review** | Submit product review | P3 |
| **Star Rating** | 1-5 star rating system | P3 |
| **Review Moderation** | Admin approves reviews | P3 |
| **Helpful Votes** | Mark reviews as helpful | P3 |
| **Verified Purchase** | Badge for verified buyers | P3 |

---

### 18.5 Advanced B2B Features (Not Implemented)

#### FR-B2B-ADV-001: Quotation System
| Feature | Description | Priority |
|---------|-------------|----------|
| **Request Quote** | Customer requests quote | P1 |
| **Quote Creation** | Admin creates quote | P1 |
| **Quote Approval** | Customer accepts/rejects | P1 |
| **Quote to Order** | Convert approved quote to order | P1 |
| **Quote Expiry** | Auto-expire quotes after period | P2 |

#### FR-B2B-ADV-002: Credit Management
| Feature | Description | Priority |
|---------|-------------|----------|
| **Credit Limits** | Set max credit per company | P1 |
| **Credit Check** | Block orders over limit | P1 |
| **Credit History** | View payment history | P2 |
| **Credit Alerts** | Warn when approaching limit | P2 |

#### FR-B2B-ADV-003: Approval Workflows
| Feature | Description | Priority |
|---------|-------------|----------|
| **Order Approval** | Require manager approval for large orders | P2 |
| **Approval Levels** | Multiple approval tiers | P2 |
| **Email Notifications** | Notify approvers | P2 |
| **Approval History** | Track approval chain | P2 |

---

### 18.6 Additional Enhancements (Not Implemented)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-Currency** | Support different currencies | P2 |
| **Tax Management** | Complex tax rules by region | P1 |
| **Gift Cards** | Purchase and redeem gift cards | P3 |
| **Loyalty Program** | Points, rewards for purchases | P3 |
| **Product Bundles** | Sell products as packages | P2 |
| **Abandoned Cart Recovery** | Email reminders for abandoned carts | P2 |
| **Search Autocomplete** | Suggest products while typing | P2 |
| **Barcode Scanning** | Scan to add products (mobile) | P2 |
| **EDI Integration** | Electronic data interchange for B2B | P3 |
| **Audit Logs** | Comprehensive change tracking | P2 |
| **Email Templates** | Customizable order emails | P2 |
| **SMS Notifications** | Order updates via SMS | P3 |

---

## 19. Codebase Guide

> Technical reference for developers and AI agents working with this codebase.

### 19.1 Repository Information

| Item | Value |
|------|-------|
| **Frontend Repository** | https://github.com/sinkfloat/saas-order-creation |
| **Backend Repository** | https://github.com/Synque/derp-orq |
| **CMS/Admin** | Directus at https://orq-dev.synque.ca/ |
| **Hosting** | Cloudflare |
| **Framework** | Next.js 14 (App Router) |

### 19.2 Folder Structure

```
saas-order-creation/
├── app/                    # Next.js App Router (pages & routes)
│   ├── app/               # SaaS application homepage
│   ├── order/             # Order management
│   ├── product/           # Product catalog
│   ├── contacts/          # Contact management
│   ├── payment/           # Payment processing
│   ├── ota/               # OTA (Online Travel Agency) system
│   ├── login/             # Authentication
│   ├── collection/        # Development tool (API explorer)
│   ├── import/            # CSV import
│   ├── promotions/        # Promotion management
│   └── [brand]/           # Branded landing pages (deeptravel, synque, capy)
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── order/            # Order-related components
│   ├── ecommerce-order/  # E-commerce flow components
│   ├── ota/              # OTA dashboard components
│   └── promotions/       # Promotion components
├── lib/                   # Utilities, API clients, hooks
│   ├── hooks/            # Custom React hooks (13 files)
│   ├── ota/              # OTA-specific utilities
│   ├── api.ts            # Main API client (81KB)
│   ├── api-order.ts      # Order API
│   ├── api-payment.ts    # Payment API
│   ├── api-products.ts   # Product API
│   ├── auth.ts           # Authentication utilities
│   └── config.ts         # Organization configuration
├── stores/               # Zustand state stores
│   ├── orderStore.ts     # Order state management
│   └── org-store.ts      # Organization selection
├── payments/             # Payment gateway configuration
│   ├── config/           # Gateway & method configs
│   ├── hooks/            # Payment hooks
│   └── types.ts          # Payment types
├── contexts/             # React Context providers
├── types/                # TypeScript definitions
├── constants/            # Application constants
├── styles/               # Global CSS
└── docs/                 # Documentation & PRDs
```

### 19.3 Key Files Reference

#### Core Configuration
| File | Purpose |
|------|---------|
| `lib/config.ts` | Multi-organization configuration, URL resolution |
| `lib/auth.ts` | JWT authentication, token management |
| `stores/org-store.ts` | Organization selection state |
| `app/layout.tsx` | Root layout with providers |

#### API Clients
| File | Purpose |
|------|---------|
| `lib/api.ts` | Main API client with all CRUD operations |
| `lib/api-order.ts` | Order API (org-aware) |
| `lib/api-payment.ts` | Payment processing |
| `lib/api-products.ts` | Product catalog |
| `lib/api-promotions.ts` | Promotions |
| `lib/api-stock.ts` | Inventory management |
| `lib/customer-groups-api.ts` | Customer groups (tags) |
| `lib/user-groups-api.ts` | User groups |

#### Key Hooks
| Hook | Purpose |
|------|---------|
| `lib/hooks/use-collection-data.ts` | Fetch collection data |
| `lib/hooks/use-promotions.ts` | Promotion management |
| `lib/hooks/use-stock.ts` | Stock management |
| `lib/hooks/use-customer-groups.ts` | Customer groups |
| `lib/hooks/use-csv-import.ts` | CSV import logic |

### 19.4 App Routes Reference

#### Authentication
| Route | Description |
|-------|-------------|
| `/login` | User login page |
| `/register` | User registration |
| `/b2b-register` | B2B company registration |

#### E-Commerce Core
| Route | Description |
|-------|-------------|
| `/app` | SaaS application homepage (dashboard) |
| `/order` | Order management |
| `/order/create` | Create new order |
| `/order/[nonce]` | View order details |
| `/order/list` | Order listing |
| `/product/catalog` | Product catalog |
| `/product/catalog/manage` | Catalog management |

#### Customer & Company
| Route | Description |
|-------|-------------|
| `/contacts` | Contact management |
| `/contacts/customers` | Customer list |
| `/customer/[id]` | Customer details |
| `/customer-groups` | Customer group management |
| `/user-groups` | User group management |

#### Payment & Documents
| Route | Description |
|-------|-------------|
| `/payment` | Payment processing |
| `/payment/transactions` | Transaction history |
| `/payment/status` | Payment status |

#### Admin & Tools
| Route | Description |
|-------|-------------|
| `/stock` | Inventory management |
| `/promotions` | Promotion management |
| `/workflow-manager` | Workflow automation |
| `/import` | CSV/data import |
| `/collection/[collection]` | Collection viewer (dev tool) |

---

## 20. Database Schema

> Directus collections used by this platform. Access admin at https://orq-dev.synque.ca/

### 20.1 Core E-Commerce Collections

#### Orders & Transactions
| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **order** | id, code, nonce, status, type, amount_total, tax_amount_payable, discount, order_date, delivery_date, remarks, payment_method | M2O: company, M2M: product (OrderLine), transaction |
| **transaction** | id, orq, status, amount, payment_method | - |
| **transaction_batch** | id, orq, status | M2M: transaction |

#### Products & Inventory
| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **product** | id, name, code, description, status, orq, category, images | M2O: category, M2M: inventory, product_price, images, companies |
| **product_price** | id, product, price, cost, discount_rate, effective_start, effective_end, qty, unit, company, status | M2O: product, unit, company |
| **inventory** | id, product, quantity, location, status | M2O: product, location |
| **category** | id, name, parent_id, children, status, orq | Self-referencing (parent-child) |
| **unit** | id, name, code, type, duration, status, orq, name_zh_HANT | - |

#### Product Variants
| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **product_variant** | id, product, status, sort | M2O: product |
| **product_option** | id, name, status | - |
| **product_option_value** | id, product_option, value, status | M2O: product_option |
| **product_variant_option** | id, product_variant, product_option, product_option_value, status, sort | M2O: product_variant, product_option, product_option_value |

### 20.2 Customer & Organization Collections

| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **company** | id, name, code, status, group, orq, address, contact, email, phone, name_zh_HANT | M2M: product, tags_company |
| **contacts** | id, first_name, last_name, email, channel, type, org, company, orq, number, contact_number | M2O: company, contact_notes |
| **contact_notes** | contact_id, note, date_created | M2O: contacts |
| **tags** | id, name, type, status, orq, date_created | M2M: company (via tags_company) |
| **tags_company** | tags_id, company_id | M2O: tags, company |

**Note:** `tags` collection is polymorphic - filter by `type`:
- `type: "customer_group"` → Customer groups
- `type: "user_group"` → User groups

### 20.3 Document Collections

| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **document** | id, name, type, raw, orq, date_created | M2M: attach (orders) |
| **document_template** | id, name, type, fields | - |
| **attach** | id, order, document, type | M2O: order, document |

**Document types:** invoice, inventory_note, order_form, price_list

### 20.4 Workflow & System Collections

| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **job** | id, name, job_spec, status, date_created, parent_id, children | M2O: job_spec, Self-referencing |
| **job_spec** | id, name, orq, status | - |
| **activity** | id, collection, action, item, user, timestamp, comment | M2O: user |
| **revisions** | id, data, delta, collection, item, activity | M2O: activity |
| **app_user** | uid, first_name, last_name, email, status | - |
| **location** | id, name, code, status | - |

### 20.5 Promotion Collections

| Collection | Key Fields | Relationships |
|------------|-----------|---------------|
| **app_promotion_master** | id, pmid, name, title, description, wysiwyg, status, priority | - |
| **promotion_top** | id, name, lang, location, wysiwyg, status | - |

### 20.6 Multi-Tenant Pattern

All collections include `orq` field for organization isolation:
```typescript
// Query pattern for organization-scoped data
GET /items/{collection}?filter[orq][_eq]={organizationId}
```

---

## 21. API Reference

> All APIs use Directus REST endpoints with JWT authentication.

### 21.1 Authentication

```typescript
// Login
POST /auth/login
Body: { email, password }
Response: { access_token, refresh_token, expires }

// Get current user
GET /users/me
Headers: { Authorization: "Bearer {token}" }
```

### 21.2 API URL Resolution

```typescript
// Get organization-aware API URL
import { getApiOrqUrl } from '@/lib/config';
const apiUrl = getApiOrqUrl(); // Returns correct URL for current org

// Get organization ID
import { useOrgStore } from '@/stores/org-store';
const orqId = useOrgStore.getState().getSelectedOrq();
```

### 21.3 Common API Patterns

#### List Items
```typescript
GET /items/{collection}
  ?filter[orq][_eq]={orqId}
  &filter[status][_eq]=published
  &fields=*,relation.*
  &sort=-date_created
  &limit=50
  &offset=0
```

#### Get Single Item
```typescript
GET /items/{collection}/{id}
  ?fields=*,relation.*
```

#### Create Item
```typescript
POST /items/{collection}
Body: { field1: value1, field2: value2, orq: orqId }
```

#### Update Item
```typescript
PATCH /items/{collection}/{id}
Body: { field1: newValue }
```

#### Delete Item
```typescript
DELETE /items/{collection}/{id}
```

### 21.4 Key Endpoint Examples

#### Orders
```typescript
// List orders
GET /items/order?filter[orq][_eq]=1&fields=*,company.*,product.*

// Create order
POST /items/order
Body: {
  code: "ORD-001",
  status: "pending",
  amount_total: 1000,
  company: 10,
  orq: 1,
  product: [{ product_id: 5, quantity: 2 }]
}
```

#### Products
```typescript
// List products with prices
GET /items/product?filter[orq][_eq]=1&fields=*,product_price.*,category.*

// Get product with variants
GET /items/product/{id}?fields=*,product_variant.*,product_variant.product_variant_option.*
```

#### Customer Groups (Tags)
```typescript
// List customer groups
GET /items/tags?filter[type][_eq]=customer_group&filter[orq][_eq]=1

// Add company to group
POST /items/tags_company
Body: { tags_id: 5, company_id: 10 }

// Remove company from group
DELETE /items/tags_company?filter[tags_id][_eq]=5&filter[company_id][_eq]=10
```

### 21.5 Field Expansion Patterns

**Important:** Match the existing pattern in codebase.

```typescript
// Simple (returns IDs)
fields=*
// company: [10, 11, 12]

// Expanded (returns nested objects)
fields=*,company.company_id.*
// company: [{ company_id: { id: 10, name: "Company A" } }]
```

---

## 22. External Services

> Third-party services integrated with the platform.

### 22.1 Payment Gateways

| Gateway | Usage | Supported Methods |
|---------|-------|-------------------|
| **CyberSource** | Card payments | VISA, MASTERCARD, AMEX, UnionPay |
| **Xendit** | Southeast Asia | Virtual Accounts, E-wallets (OVO, DANA, LinkAja), Cards, QR |

#### Payment Channels
| Channel | Gateway | Status |
|---------|---------|--------|
| WeChat Pay (QR, H5, JS API) | Xendit | ✅ Integrated |
| Alipay | Xendit | ✅ Integrated |
| FPS (Hong Kong) | CyberSource | ✅ Integrated |
| Credit Cards | CyberSource | ✅ Integrated |

#### Payment Configuration
```typescript
// payments/config/gateways.ts - Gateway definitions
// payments/config/methods.ts - Payment method configuration
// payments/hooks/usePayment.ts - Payment hook
```

### 22.2 AI Integration

| Service | Usage | Endpoint |
|---------|-------|----------|
| **Google Gemini** | Content generation for landing pages | generativelanguage.googleapis.com |

Used in:
- `/deeptravel` - Travel itinerary generation
- `/capy-base` - Content generation
- `/synque` - Content generation

### 22.3 Push Notifications

| Service | Usage |
|---------|-------|
| **Firebase Cloud Messaging (FCM)** | Push notification delivery |

Files:
- `lib/api-push-notifications.ts` - FCM integration
- `components/push-notifications/` - UI components

### 22.4 Backend Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Synque API** | https://orq-dev.synque.ca | Primary Directus backend |
| **SMS API** | Organization validation | Multi-org user management |

#### Available Organizations
| Key | Description |
|-----|-------------|
| orq-dev | Development environment |
| orq-ww | Want Want |
| rs-orq | RentSmart |
| orq-rs-prod-stage | RentSmart Production Staging |
| orq-rs-web-prod | RentSmart Web Production |

---

## 23. Development Setup

> How to run and develop this platform locally.

### 23.1 Prerequisites

- Node.js 18+
- Yarn package manager
- Access to Directus backend (https://orq-dev.synque.ca/)

### 23.2 Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linting
yarn lint
```

### 23.3 Development Workflow

#### State Management
```typescript
// Organization selection (Zustand)
import { useOrgStore } from '@/stores/org-store';
const orqId = useOrgStore.getState().getSelectedOrq();

// Order state (Zustand)
import { useOrderStore } from '@/stores/orderStore';
```

#### API Calls
```typescript
// Always use organization-aware URL
import { getApiOrqUrl } from '@/lib/config';
import { getAccessToken } from '@/lib/auth';

const response = await fetch(`${getApiOrqUrl()}/items/order`, {
  headers: {
    Authorization: `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json'
  }
});
```

#### Provider Hierarchy
```
I18nProvider → ThemeProvider → NavigationProvider → AuthProvider
```

### 23.4 Key Development Patterns

#### Preventing Multiple API Calls
```typescript
const [loading, setLoading] = useState(false);

const loadData = useCallback(async () => {
  if (loading) return; // Guard
  setLoading(true);
  try {
    // API call
  } finally {
    setLoading(false);
  }
}, [loading]);
```

#### Organization-Aware Queries
```typescript
function getCurrentOrq(): number {
  return useOrgStore.getState().getSelectedOrq();
}

// Use in API calls
const orqId = getCurrentOrq();
const url = `${getApiOrqUrl()}/items/product?filter[orq][_eq]=${orqId}`;
```

### 23.5 Development Tools

#### Collection Viewer
Navigate to `/collection/[collection]` to:
- Browse any Directus collection
- Inspect field types and relationships
- Copy complete collection data for AI-assisted development
- Test API responses

#### CSV Import
Navigate to `/import` to:
- Import test data
- Explore collection schemas
- Generate sample data

### 23.6 File Naming Convention

- Use **kebab-case** for all file names
- `.tsx` for React components
- `.ts` for utilities and logic

---

## 24. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **B2B** | Business-to-Business - sales between companies |
| **B2C** | Business-to-Consumer - sales to individuals |
| **SKU** | Stock Keeping Unit - product identifier |
| **PO** | Purchase Order - B2B order reference |
| **ORQ** | Organization - a tenant in the multi-tenant system |
| **Cart Abandonment** | User adds items but doesn't complete purchase |
| **Net Terms** | B2B payment terms (e.g., Net 30 = pay within 30 days) |

### Appendix B: User Story Status

| ID | Story | Status |
|----|-------|--------|
| B2C-001 | Browse by category | ✅ Done |
| B2C-002 | Search products | ✅ Done |
| B2C-003 | Filter by price | ✅ Done |
| B2C-004 | Sort products | ✅ Done |
| B2C-005 | See availability | ✅ Done |
| B2C-006 | View images | ✅ Done |
| B2C-007 | Select variants | ✅ Done |
| B2C-008 | See unit pricing | ✅ Done |
| B2C-009 | Add to cart | ✅ Done |
| B2C-010 | Update quantities | ✅ Done |
| B2C-011 | Remove from cart | ✅ Done |
| B2C-012 | Cart persistence | ✅ Done |
| B2C-013 | See cart total | ✅ Done |
| B2C-014 | Enter shipping | ✅ Done |
| B2C-015 | Select delivery | ✅ Done |
| B2C-016 | Review order | ✅ Done |
| B2C-017 | Select payment | ✅ Done |
| B2C-018 | Apply discount | ✅ Done |
| B2C-019 | See confirmation | ✅ Done |
| B2C-020 | View history | ✅ Done |
| B2C-021 | View order detail | ✅ Done |
| B2C-022 | Track status | ✅ Done |
| B2B-001 | Company login | ✅ Done |
| B2B-002 | See B2B prices | ✅ Done |
| B2B-003 | Select company | ✅ Done |
| B2B-004 | Bulk ordering | ✅ Done |
| B2B-005 | Enter PO number | ⚠️ Verify |
| B2B-006 | See price tiers | ✅ Done |
| B2B-007 | Invoice payment | ✅ Done |
| B2B-008 | See net terms | ⚠️ Verify |
| B2B-009 | Invoice generated | ✅ Done |
| B2B-010 | Download PDF | ✅ Done |
| B2B-011 | Invoice details | ✅ Done |
| B2B-012 | Invoice history | ✅ Done |
| B2B-013 | Reorder | ⚠️ Verify |
| B2B-014 | Company orders | ✅ Done |

### Appendix C: Configuration Options

#### Checkout Flow Configuration
```typescript
interface OrderConfig {
  steps: {
    products: { enabled: boolean };
    customerInfo: { enabled: boolean };
    delivery: { enabled: boolean };
    review: { enabled: boolean };
    payment: { enabled: boolean };
  };
  ui: {
    showStepIndicator: boolean;
    showStickyCart: boolean;
    allowBackNavigation: boolean;
  };
}
```

#### Catalog Configuration
```typescript
interface ProductCatalogConfig {
  display: {
    defaultView: 'grid' | 'list' | 'orderForm';
    gridColumns: number;
    showProductImages: boolean;
    enableQuickView: boolean;
  };
  sorting: {
    defaultSortField: 'name' | 'price';
    allowUserSorting: boolean;
  };
  filtering: {
    availableFilters: string[];
    companyFilter: { showExclusivePricing: boolean };
  };
  pagination: {
    type: 'traditional' | 'loadMore' | 'infiniteScroll';
    itemsPerPage: number;
  };
}
```

### Appendix D: Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com

# Organization URLs
NEXT_PUBLIC_ORQ_DEV_URL=https://orq-dev.synque.ca
NEXT_PUBLIC_ORQ_WW_URL=https://orq-ww.synque.ca
NEXT_PUBLIC_ORQ_RS_URL=https://rs-orq.synque.ca

# Feature Flags
NEXT_PUBLIC_ENABLE_B2B=true
NEXT_PUBLIC_ENABLE_PROMOTIONS=true
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | Team | Initial draft |
| 2.0 | Dec 2025 | Team | Complete PRD rewrite with full sections |
| 3.0 | Dec 2025 | Team | Added 9 new functional requirements (6.9-6.17): Data Import/Export, Order Templates, AI Chat Assistant, Workflow Automation, Activity Tracking, Push Notifications, Quick Favorites, Multi-Organization Management, Document Management. Added Future Features roadmap section. |
| 4.0 | Dec 2025 | Team | **Consolidated all documentation into single PRD.** Added: Section 15 (Test Cases & Audit Checklist - 100+ test cases), Section 16 (Development Plan with priorities and implementation details), Section 17 (Issue Tracker with known issues). Removed separate MD files: FEATURE-STATUS.md, DEVELOPMENT-PLAN.md, ISSUES.md, AUDIT-CHECKLIST.md. |
| 5.0 | Dec 2025 | Team | **Added technical sections for AI agent knowledge base.** Added: Section 19 (Codebase Guide - folder structure, key files, routes), Section 20 (Database Schema - all Directus collections), Section 21 (API Reference - authentication, patterns, examples), Section 22 (External Services - payment gateways, AI, FCM), Section 23 (Development Setup - quick start, patterns, tools). Now 24 total sections. |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| Stakeholder | | | |

---

*This is a living document. Updates should be made as requirements evolve and implementation progresses.*
