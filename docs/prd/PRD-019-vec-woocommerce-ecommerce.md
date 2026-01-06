# PRD-019: Vec WooCommerce E-commerce Platform

## Document Metadata
```yaml
prd_id: "PRD-019"
product_area: "E-commerce"
owner: "Vec Pet Supplies"
status: "Draft"
created_date: "2025-01-05"
last_updated: "2025-01-05"
version: "2.3"
related_stories: []
implementation_cards: []
deadline: "3 weeks from project start"
```

## Executive Summary

**Problem Statement**: Vec, a Hong Kong-based pet supplies company specializing in prescription pet diets, needs a modern e-commerce platform to sell premium pet food products online, enabling direct-to-consumer sales while maintaining the specialized knowledge and service their customers expect.

**Solution Overview**: WordPress + WooCommerce e-commerce platform with ~400 SKUs, optimized for Hong Kong/Macau market, featuring bilingual support (Chinese-first), Stripe payment integration, and clean, modern UI inspired by Pettington.

**Success Metrics**:
- Platform launch within 3-week staged delivery timeline
- Full catalog of ~400 SKUs live and purchasable
- Mobile-responsive design achieving 90%+ mobile usability score
- Payment processing via Stripe fully operational
- Page load times under 3 seconds

**Timeline**: 3 stages over 3 weeks
- Stage 1 (Foundation): WordPress + WooCommerce setup, theme, basic pages
- Stage 2 (Commerce): Product import, payments, shipping, accounts
- Stage 3 (Polish): Bilingual, SEO, performance, launch

---

## Business Context

### Market Opportunity
- **Market Size**: Hong Kong/Macau pet supplies market - premium pet food segment
- **Customer Segments**:
  - **Primary**: Pet owners seeking prescription pet diets
  - **Secondary**: General pet owners looking for premium pet food
  - **Tertiary**: Bulk buyers and repeat customers
- **Competitive Landscape**: Existing pet e-commerce platforms (Pettington, PetPetMaMa), physical pet stores
- **Business Impact**: Enable direct-to-consumer sales channel for specialized pet nutrition products

### Customer Research

**User Personas**:

| Persona | Age | Occupation | Pet | Key Needs | Pain Points |
|---------|-----|------------|-----|-----------|-------------|
| Sarah Chen - Concerned Pet Parent | 32 | Marketing Manager | Cat (5yo, kidney issues) | Prescription diet, authenticity | Limited availability, uncertainty |
| David Wong - Busy Professional | 45 | Finance Director | 2 Dogs | Convenience, quality | Heavy bags, store hours |
| Michelle Lam - First-Time Owner | 28 | Designer | Puppy (new) | Guidance, education | Information overload |

**Pain Points**:
- Limited availability of prescription pet diets in Hong Kong
- Uncertainty about product authenticity
- Inconvenience of physical store visits
- Difficulty finding specialized pet nutrition products
- Language barriers (need bilingual support)

**Validation**: Real business requirement from Vec pet supplies company

### Business Requirements
- **Revenue Goals**:
  - Enable online sales channel for ~400 SKUs
  - Support repeat purchases and customer retention
  - Optimize for Hong Kong/Macau market
- **Operational Constraints**:
  - Stripe payment integration (Hong Kong)
  - AWS EC2 hosting in ap-east-1 (Hong Kong region)
  - WordPress/WooCommerce platform requirement
  - Bilingual support (Traditional Chinese primary, English secondary)
- **Brand Guidelines**: Clean, modern, trustworthy, pet-focused

---

## UX Reference: Pettington Gap Analysis

### Reference Site Analysis
**Primary Reference**: www.pettington.com

### Feature Mapping

| Pettington Feature | Status | Vec Implementation | Priority |
|-------------------|--------|-------------------|----------|
| Clean minimal header | ADOPT | Logo left, nav center, cart right | P0 |
| Mega menu categories | ADOPT | Dog/Cat/Treats/Accessories dropdowns | P1 |
| Hero carousel | ADOPT | 3-5 rotating banners | P1 |
| Category cards (icons) | ADOPT | Visual category navigation | P0 |
| Product grid (4-col) | ADOPT | 4-col desktop, 2-col mobile | P0 |
| Quick view modal | SKIP | Not in MVP - reduces complexity | P3 |
| Sticky add-to-cart | ADOPT | Mobile sticky bar on PDP | P1 |
| WhatsApp button | ADOPT | Floating WhatsApp chat button | P1 |
| Trust badges | ADOPT | "100% Genuine", "Fast Delivery" | P0 |
| Newsletter popup | DEFER | Post-launch addition | P2 |
| Blog section | SKIP | Not in MVP scope | P3 |
| Loyalty points | SKIP | Future phase consideration | P3 |
| Multi-currency | SKIP | HKD only for launch | P3 |

### UX Principles from Pettington
1. **Simplicity First**: Clean layouts, ample whitespace
2. **Mobile Priority**: Touch-friendly, fast loading
3. **Trust Signals**: Prominent authenticity badges
4. **Easy Navigation**: Max 2 clicks to any product
5. **Visual Hierarchy**: Clear CTAs, readable pricing

---

## Product Specification

### Core Features

#### Product Catalog System (P0)
- **Description**: Comprehensive product catalog supporting ~400 SKUs with categories, filtering, and search
- **Business Value**: Enable customers to browse and find products efficiently
- **User Value**: Easy product discovery and comparison
- **Acceptance Criteria**:
  - Category-based navigation (Dog Food, Cat Food, Treats, Accessories)
  - Product filtering by brand, price, dietary needs, pet size
  - Search functionality with autocomplete
  - Product detail pages with full specifications
  - Prescription product flagging with notice

#### Shopping Cart & Checkout (P0)
- **Description**: Streamlined cart management and checkout flow
- **Business Value**: Maximize conversion rates
- **User Value**: Frictionless purchasing experience
- **Acceptance Criteria**:
  - Add/remove/update cart items
  - Persistent cart across sessions (30-day cookie)
  - Guest checkout option
  - Stripe payment integration
  - Order confirmation with details

#### User Account System (P1)
- **Description**: Customer registration, login, and account management
- **Business Value**: Enable customer retention and repeat purchases
- **User Value**: Order history, saved addresses, quick reordering
- **Acceptance Criteria**:
  - Registration with email verification
  - Login/logout functionality
  - Password reset flow
  - Order history viewing
  - Address book management
  - Reorder from history

#### Bilingual Support (P1)
- **Description**: Traditional Chinese (primary) and English language support
- **Business Value**: Serve Hong Kong/Macau market effectively
- **User Value**: Native language shopping experience
- **Acceptance Criteria**:
  - Chinese-first UI design
  - Language switcher in header (flag icons)
  - All content translatable via WPML
  - URL structure: `/zh/` (default), `/en/`

#### Mobile Responsive Design (P0)
- **Description**: Fully responsive design optimized for mobile devices
- **Business Value**: Capture mobile shoppers (70%+ of traffic expected)
- **User Value**: Seamless shopping on any device
- **Acceptance Criteria**:
  - Touch-friendly navigation (min tap target 44px)
  - Mobile-optimized product images (lazy loading)
  - Easy checkout on mobile
  - 90%+ Google Mobile Usability score

### Feature Priority Matrix

| Priority | Features | Stage |
|----------|----------|-------|
| P0 (Critical) | Product catalog, Shopping cart, Checkout, Payment (Stripe), Mobile responsive | 1-2 |
| P1 (High) | User accounts, Order history, Bilingual (ZH/EN), Search, WhatsApp button | 2 |
| P2 (Medium) | Wishlist, Email notifications, Shipping calculator, Cross-sell | 3 |
| P3 (Low) | Product reviews, Loyalty program, Gift cards, Blog | Future |

---

## Design Specification

### Design System

#### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #2E5B9A | Headers, CTAs, links |
| Secondary Teal | #4A9B8C | Accents, category highlights |
| Accent Orange | #E8734A | Sale badges, alerts, urgency |
| Background | #F8F9FA | Page backgrounds |
| Card Background | #FFFFFF | Product cards, modals |
| Text Primary | #333333 | Body text, headings |
| Text Secondary | #666666 | Descriptions, meta |
| Border | #E5E5E5 | Dividers, card borders |
| Success | #28A745 | In stock, success states |
| Warning | #FFC107 | Low stock warnings |
| Error | #DC3545 | Error states, out of stock |

#### Typography
| Element | Font | Size (Desktop) | Size (Mobile) | Weight |
|---------|------|----------------|---------------|--------|
| H1 | Noto Sans TC | 32px | 24px | 700 |
| H2 | Noto Sans TC | 24px | 20px | 600 |
| H3 | Noto Sans TC | 20px | 18px | 600 |
| Body | Noto Sans TC | 16px | 14px | 400 |
| Small | Noto Sans TC | 14px | 12px | 400 |
| Button | Noto Sans TC | 16px | 14px | 600 |
| Price | Noto Sans TC | 20px | 18px | 700 |

#### Spacing System
- Base unit: 8px
- Spacing scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px
- Component padding: 16px (cards), 24px (sections)
- Grid gutter: 24px (desktop), 16px (mobile)

#### Border Radius
- Small: 4px (buttons, inputs, badges)
- Medium: 8px (cards, modals, dropdowns)
- Large: 16px (feature sections, hero)
- Pill: 50% (tags, category pills)

### Wireframes

#### Homepage Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]        [Search Bar]        [Lang] [Account] [Cart(0)]   │
├─────────────────────────────────────────────────────────────────┤
│ [Dog Food ▼] [Cat Food ▼] [Treats] [Accessories] [Brands ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    HERO BANNER                           │   │
│  │            "Premium Pet Nutrition"                       │   │
│  │              [Shop Now Button]                           │   │
│  │         ○ ○ ● ○ ○ (carousel dots)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  [Icon]  │ │  [Icon]  │ │  [Icon]  │ │  [Icon]  │          │
│  │ Dog Food │ │ Cat Food │ │  Treats  │ │Accessories│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Featured Products                              [View All →]    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │                   │
│  │ Name   │ │ Name   │ │ Name   │ │ Name   │                   │
│  │ $XXX   │ │ $XXX   │ │ $XXX   │ │ $XXX   │                   │
│  │[Add]   │ │[Add]   │ │[Add]   │ │[Add]   │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [✓] 100% Genuine  [🚚] Fast Delivery  [💬] Expert Support│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  New Arrivals                                   [View All →]    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │                   │
│  │ Name   │ │ Name   │ │ Name   │ │ Name   │                   │
│  │ $XXX   │ │ $XXX   │ │ $XXX   │ │ $XXX   │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [About] [Contact] [Shipping] [Privacy] [Terms]                 │
│  © 2025 Vec Pet Supplies                    [WhatsApp Button]   │
└─────────────────────────────────────────────────────────────────┘
```

#### Product Listing Page (Shop/Category)
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header Navigation - Same as Homepage]                          │
├─────────────────────────────────────────────────────────────────┤
│ Home > Dog Food > Dry Food                                      │
├─────────────────────────────────────────────────────────────────┤
│ Dog Dry Food                          Showing 1-24 of 156       │
├──────────────────┬──────────────────────────────────────────────┤
│ FILTERS          │ Sort by: [Popularity ▼]    View: [Grid][List]│
│                  │                                              │
│ Categories       │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ □ Dry Food (156) │ │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │ │
│ □ Wet Food (89)  │ │ Brand  │ │ Brand  │ │ Brand  │ │ Brand  │ │
│ □ Prescription   │ │ Name   │ │ Name   │ │ Name   │ │ Name   │ │
│                  │ │ ★★★★☆  │ │ ★★★★★  │ │ ★★★☆☆  │ │ ★★★★☆  │ │
│ Brands           │ │ $XXX   │ │ $XXX   │ │ $XXX   │ │ $XXX   │ │
│ □ Royal Canin    │ │ [Add to│ │ [Add to│ │ [Add to│ │ [Add to│ │
│ □ Hill's         │ │  Cart] │ │  Cart] │ │  Cart] │ │  Cart] │ │
│ □ Purina         │ └────────┘ └────────┘ └────────┘ └────────┘ │
│ □ Orijen         │                                              │
│                  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ Price Range      │ │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │ │
│ $0 ────●──── $500│ │ ...    │ │ ...    │ │ ...    │ │ ...    │ │
│                  │ └────────┘ └────────┘ └────────┘ └────────┘ │
│ Pet Size         │                                              │
│ □ Small (1-10kg) │           [1] [2] [3] ... [7] [→]           │
│ □ Medium         │                                              │
│ □ Large (25kg+)  │                                              │
│                  │                                              │
│ [Clear Filters]  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

#### Product Detail Page (PDP)
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header Navigation]                                             │
├─────────────────────────────────────────────────────────────────┤
│ Home > Dog Food > Dry Food > Royal Canin Adult                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────┐  ┌────────────────────────────────────┐│
│ │                     │  │ ROYAL CANIN                        ││
│ │                     │  │ Adult Medium Dog Dry Food          ││
│ │    [Main Product    │  │ ★★★★☆ (24 reviews)                 ││
│ │       Image]        │  │                                    ││
│ │                     │  │ HKD $388.00                        ││
│ │                     │  │ ~~$428.00~~ SAVE 9%                ││
│ │                     │  │                                    ││
│ │                     │  │ Size: [2kg ▼] [4kg] [10kg] [15kg]  ││
│ └─────────────────────┘  │                                    ││
│ [○][○][○][○] thumbnails  │ Quantity: [-] [1] [+]              ││
│                          │                                    ││
│                          │ ┌────────────────────────────────┐ ││
│                          │ │      [ADD TO CART - $388]      │ ││
│                          │ └────────────────────────────────┘ ││
│                          │ [♡ Add to Wishlist]               ││
│                          │                                    ││
│                          │ ✓ In Stock - Ships in 1-2 days    ││
│                          │ 🚚 Free shipping over $500         ││
│                          │ ↩️ 7-day return policy              ││
│                          └────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [Description] [Specifications] [Ingredients] [Reviews (24)] ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Royal Canin Medium Adult is precisely balanced nutrition    ││
│ │ for medium breed adult dogs (11-25kg) from 12 months...     ││
│ │                                                             ││
│ │ Key Benefits:                                               ││
│ │ • Supports skin & coat health                               ││
│ │ • Promotes digestive health                                 ││
│ │ • Optimal energy levels                                     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ You May Also Like                                               │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│ │[Cross- │ │[Cross- │ │[Cross- │ │[Cross- │                    │
│ │ sell]  │ │ sell]  │ │ sell]  │ │ sell]  │                    │
│ └────────┘ └────────┘ └────────┘ └────────┘                    │
│                                                                 │
│ Recently Viewed                                                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│ │[Recent]│ │[Recent]│ │[Recent]│ │[Recent]│                    │
│ └────────┘ └────────┘ └────────┘ └────────┘                    │
└─────────────────────────────────────────────────────────────────┘

Mobile PDP - Sticky Add to Cart Bar:
┌─────────────────────────────────────────────────────────────────┐
│ HKD $388.00  │  [-] [1] [+]  │  [ADD TO CART]                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Cart Page
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header Navigation]                                             │
├─────────────────────────────────────────────────────────────────┤
│ Shopping Cart (3 items)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [img] │ Royal Canin Adult Medium    │ [-][2][+] │ $776.00  ││
│ │       │ Size: 4kg                   │           │ [Remove] ││
│ ├───────┼─────────────────────────────┼───────────┼──────────┤│
│ │ [img] │ Hill's Science Diet Puppy   │ [-][1][+] │ $298.00  ││
│ │       │ Size: 2kg                   │           │ [Remove] ││
│ ├───────┼─────────────────────────────┼───────────┼──────────┤│
│ │ [img] │ Dog Treats - Dental Chews   │ [-][3][+] │ $147.00  ││
│ │       │                             │           │ [Remove] ││
│ └───────┴─────────────────────────────┴───────────┴──────────┘│
│                                                                 │
│ ┌───────────────────────┐  ┌──────────────────────────────────┐│
│ │ Coupon Code           │  │ Order Summary                    ││
│ │ [______________][Apply]│  │                                  ││
│ └───────────────────────┘  │ Subtotal:           HKD $1,221.00││
│                             │ Shipping:              Calculated ││
│ [← Continue Shopping]      │ Discount:                  -$0.00││
│                             │ ──────────────────────────────── ││
│                             │ Total:            HKD $1,221.00  ││
│                             │                                  ││
│                             │ ┌──────────────────────────────┐ ││
│                             │ │    [PROCEED TO CHECKOUT]     │ ││
│                             │ └──────────────────────────────┘ ││
│                             │                                  ││
│                             │ 🔒 Secure checkout with Stripe   ││
│                             └──────────────────────────────────┘│
│                                                                 │
│ Cross-sell: Complete Your Order                                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│ │[Upsell]│ │[Upsell]│ │[Upsell]│ │[Upsell]│                    │
│ └────────┘ └────────┘ └────────┘ └────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Checkout Page
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]                              Secure Checkout 🔒          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──● Billing ─────○ Shipping ─────○ Payment ─────○ Confirm ──┐ │
│                                                                 │
│ ┌────────────────────────────────┐ ┌──────────────────────────┐│
│ │ Billing Details                │ │ Order Summary            ││
│ │                                │ │                          ││
│ │ Email *                        │ │ Royal Canin Adult   $776 ││
│ │ [_________________________]    │ │ Hill's Puppy        $298 ││
│ │                                │ │ Dental Chews        $147 ││
│ │ First Name *    Last Name *    │ │ ────────────────────────││
│ │ [____________] [____________]  │ │ Subtotal:       $1,221.00││
│ │                                │ │ Shipping:          $40.00││
│ │ Phone *                        │ │ ────────────────────────││
│ │ [_________________________]    │ │ Total:        $1,261.00 ││
│ │                                │ │                          ││
│ │ Address *                      │ │ Have a coupon?           ││
│ │ [_________________________]    │ │ [____________][Apply]    ││
│ │                                │ └──────────────────────────┘│
│ │ District *        Region *     │                             │
│ │ [____________] [____________]  │                             │
│ │                                │                             │
│ │ □ Ship to different address    │                             │
│ │                                │                             │
│ │ Order Notes (optional)         │                             │
│ │ [_________________________]    │                             │
│ │ [_________________________]    │                             │
│ │                                │                             │
│ │ ┌────────────────────────────┐ │                             │
│ │ │   [CONTINUE TO PAYMENT]    │ │                             │
│ │ └────────────────────────────┘ │                             │
│ └────────────────────────────────┘                             │
│                                                                 │
│ Payment Methods:                                                │
│ [Stripe] Credit/Debit Card                                      │
│ Visa | Mastercard | AMEX                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Mobile Navigation (Hamburger Menu)
```
┌─────────────────────┐
│ [X Close]           │
├─────────────────────┤
│ 🔍 Search           │
├─────────────────────┤
│ 🐕 Dog Food      →  │
│ 🐈 Cat Food      →  │
│ 🦴 Treats        →  │
│ 🎾 Accessories   →  │
├─────────────────────┤
│ 👤 My Account       │
│ 📦 Order History    │
│ ❤️ Wishlist         │
├─────────────────────┤
│ [ZH] | [EN]         │
├─────────────────────┤
│ 📞 Contact Us       │
│ ❓ FAQ              │
└─────────────────────┘
```

### Trust Elements Specification

| Element | Location | Content (ZH) | Content (EN) |
|---------|----------|--------------|--------------|
| Badge 1 | Header/Footer | 100% 正品保證 | 100% Genuine |
| Badge 2 | Header/Footer | 快速送貨 | Fast Delivery |
| Badge 3 | Footer | 專業諮詢 | Expert Support |
| Badge 4 | PDP | 7天退換 | 7-Day Returns |
| Badge 5 | Checkout | 安全付款 | Secure Payment |

### WhatsApp Integration Specification

**Floating Button**:
- Position: Bottom-right, 20px from edges
- Size: 60px diameter (mobile: 50px)
- Color: WhatsApp Green (#25D366)
- Z-index: 9999 (above all content)
- Animation: Subtle pulse every 10 seconds

**Click Behavior**:
```
Desktop: Opens WhatsApp Web in new tab
Mobile: Opens WhatsApp app directly
URL: https://wa.me/852XXXXXXXX?text={encoded_message}
Default message: "Hi, I have a question about Vec Pet Supplies..."
```

**Pre-filled Messages by Context**:
| Page | Message (EN) |
|------|--------------|
| Homepage | "Hi, I'd like to know more about Vec Pet Supplies" |
| Product Page | "Hi, I have a question about {product_name}" |
| Cart | "Hi, I need help with my order" |
| Order Confirmation | "Hi, I have a question about order #{order_id}" |

---

## Technical Specification

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                      CloudFlare CDN                             │
│              (SSL/TLS, DDoS Protection, Caching)                │
│              - Page Rules for static assets                      │
│              - Browser caching: 1 year for images               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS EC2 (ap-east-1)                         │
│                     Instance: t3.medium                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 WordPress + WooCommerce                  │   │
│  │  ┌─────────────┐ ┌───────────┐ ┌───────────────────┐   │   │
│  │  │   Theme     │ │  Plugins  │ │   WooCommerce     │   │   │
│  │  │ (Flavor/   │ │   Stack   │ │      Core         │   │   │
│  │  │  Custom)   │ │           │ │                   │   │   │
│  │  └─────────────┘ └───────────┘ └───────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────┐ ┌───────────────────────────────┐     │   │
│  │  │   Nginx    │ │        PHP 8.1 FPM            │     │   │
│  │  │  (Reverse  │ │   - OPcache enabled           │     │   │
│  │  │   Proxy)   │ │   - Memory limit: 256M        │     │   │
│  │  └─────────────┘ └───────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Amazon RDS (MySQL 8.0)                     │   │
│  │               Instance: db.t3.small                      │   │
│  │               Multi-AZ: No (single instance for MVP)     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┬───────────────┐
            ▼               ▼               ▼               ▼
      ┌──────────┐   ┌──────────┐    ┌──────────┐    ┌──────────┐
      │  Stripe  │   │ AWS S3   │    │ SendGrid │    │ WhatsApp │
      │ Payments │   │ (Media)  │    │  (SMTP)  │    │   API    │
      │          │   │          │    │          │    │          │
      │ - Cards  │   │ - Images │    │ - Order  │    │ - Chat   │
      │ - Apple  │   │ - PDFs   │    │   emails │    │   widget │
      │   Pay    │   │          │    │ - Alerts │    │          │
      └──────────┘   └──────────┘    └──────────┘    └──────────┘
```

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| CMS | WordPress | 6.4+ | Content management |
| E-commerce | WooCommerce | 8.5+ | Store functionality |
| Server | Nginx | 1.24+ | Web server, reverse proxy |
| Runtime | PHP | 8.1+ | Application runtime |
| Database | MySQL | 8.0 | Data storage |
| Hosting | AWS EC2 | t3.medium | Compute |
| DB Hosting | Amazon RDS | db.t3.small | Managed MySQL |
| CDN | CloudFlare | Pro | SSL, caching, security |
| Payment | Stripe | Latest | Payment processing |
| Media | AWS S3 | - | Image/file storage |
| Email | SendGrid | - | Transactional email |
| Chat | WhatsApp Business | - | Customer support |

### Plugin Stack by Stage

#### Stage 1: Foundation
| Plugin | Version | Purpose | License |
|--------|---------|---------|---------|
| WooCommerce | 8.5+ | E-commerce core | GPL |
| Flavor Theme | Latest | Base theme | Commercial |
| Classic Editor | 6.4+ | Content editing | GPL |
| WP Mail SMTP | 3.9+ | Email delivery | GPL |

#### Stage 2: Commerce
| Plugin | Version | Purpose | License |
|--------|---------|---------|---------|
| WooCommerce Stripe Gateway | 7.8+ | Payments | GPL |
| WPML | 4.6+ | Multilingual | Commercial |
| WooCommerce WPML | 5.3+ | WC translation | Commercial |
| Advanced Custom Fields Pro | 6.2+ | Custom fields | Commercial |
| WooCommerce Product Filter | Latest | Filtering | Commercial |

#### Stage 3: Polish & Optimization
| Plugin | Version | Purpose | License |
|--------|---------|---------|---------|
| WP Rocket | 3.15+ | Caching & performance | Commercial |
| Yoast SEO | 22+ | SEO optimization | Freemium |
| Wordfence Security | 7.10+ | Security | Freemium |
| UpdraftPlus | 1.23+ | Backups | Freemium |
| WP Offload Media | 3.2+ | S3 integration | Commercial |
| Joinchat | 5.1+ | WhatsApp button | GPL |

### Database Schema

#### WordPress Core Tables
```sql
-- Key tables utilized
wp_posts          -- Products, pages, orders, media
wp_postmeta       -- Product attributes, prices, custom fields
wp_users          -- Customers, administrators
wp_usermeta       -- Customer data, preferences
wp_options        -- Site settings, plugin configs
wp_terms          -- Categories, tags, attributes
wp_term_taxonomy  -- Category/tag relationships
wp_termmeta       -- Category custom fields
```

#### WooCommerce Tables
```sql
-- E-commerce specific
wp_wc_product_meta_lookup    -- Product search optimization
wp_wc_order_stats            -- Order analytics
wp_wc_order_product_lookup   -- Order-product relationships
wp_wc_customer_lookup        -- Customer analytics
wp_woocommerce_sessions      -- Cart sessions
wp_woocommerce_shipping_*    -- Shipping configurations
wp_woocommerce_tax_*         -- Tax settings (minimal for HK)
```

#### Custom Meta Fields (ACF)
```json
{
  "product_meta": {
    "prescription_required": "boolean",
    "pet_type": "string (dog|cat|both)",
    "pet_size": "array (small|medium|large|giant)",
    "life_stage": "string (puppy|adult|senior|all)",
    "dietary_type": "array (grain-free|hypoallergenic|weight-control)",
    "brand_origin": "string",
    "feeding_guide": "wysiwyg"
  }
}
```

### Extended Product Fields Specification

#### WooCommerce Native Fields
| Field | Type | Required | Example |
|-------|------|----------|---------|
| product_name | string | Yes | "Royal Canin Medium Adult" |
| sku | string | Yes | "RC-MED-ADULT-4KG" |
| regular_price | decimal | Yes | 428.00 |
| sale_price | decimal | No | 388.00 |
| short_description | text | Yes | "Complete nutrition for medium dogs..." |
| description | html | Yes | Full product description |
| weight | decimal | Yes | 4.0 (kg) |
| stock_quantity | integer | Yes | 50 |
| stock_status | enum | Yes | instock/outofstock/onbackorder |
| categories | array | Yes | ["Dog Food", "Dry Food"] |
| tags | array | No | ["bestseller", "prescription"] |
| images | array | Yes | [main_image, gallery_images...] |

#### Custom Fields (ACF Pro)
```json
{
  "vec_product_fields": {
    "brand": {
      "type": "taxonomy",
      "taxonomy": "product_brand",
      "required": true
    },
    "pet_type": {
      "type": "select",
      "choices": ["dog", "cat", "small_animal", "bird"],
      "required": true
    },
    "pet_size": {
      "type": "checkbox",
      "choices": ["small", "medium", "large", "giant"],
      "required": false
    },
    "life_stage": {
      "type": "select",
      "choices": ["puppy_kitten", "adult", "senior", "all_stages"],
      "required": true
    },
    "prescription_required": {
      "type": "true_false",
      "default": false,
      "required": false
    },
    "dietary_needs": {
      "type": "checkbox",
      "choices": [
        "grain_free",
        "hypoallergenic",
        "weight_control",
        "sensitive_stomach",
        "joint_support",
        "dental_care"
      ]
    },
    "ingredients_list": {
      "type": "textarea",
      "required": true
    },
    "guaranteed_analysis": {
      "type": "group",
      "sub_fields": {
        "protein_min": "number",
        "fat_min": "number",
        "fiber_max": "number",
        "moisture_max": "number"
      }
    },
    "feeding_guide": {
      "type": "wysiwyg",
      "required": true
    },
    "country_of_origin": {
      "type": "select",
      "choices": ["USA", "Canada", "France", "Germany", "Thailand", "Other"]
    }
  }
}
```

#### Product Import CSV Format
```csv
SKU,Name (ZH),Name (EN),Price,Sale Price,Category,Brand,Pet Type,Size,Weight(kg),Stock,Short Desc (ZH),Short Desc (EN),Prescription,Image URL
RC-MED-ADULT-4KG,皇家中型成犬糧,Royal Canin Medium Adult,428,388,狗糧>乾糧,Royal Canin,dog,medium,4,50,中型成犬專用營養配方,Complete nutrition for medium adult dogs,false,https://...
```

### Variant/Size Selector Specification

**Display Logic**:
```
Single Size Product:
- No selector shown
- Price displays directly

Multiple Sizes Available:
- Radio button group for sizes
- Default: smallest size selected
- Price updates on selection
- Stock status per variant
```

**UI Component**:
```
Size Selection:
┌─────────────────────────────────────────────┐
│ Size:                                       │
│ ○ 2kg - $198    ● 4kg - $388    ○ 10kg - $848│
│   In Stock        In Stock        Low Stock │
└─────────────────────────────────────────────┘
```

### Prescription Notice Workflow

**Products Flagged as Prescription**:
1. Product displays notice badge: "處方糧 / Prescription Diet"
2. Yellow warning banner on PDP
3. Notice text (bilingual):
   ```
   ZH: 此產品為處方糧，建議在獸醫指導下購買。如有疑問，請聯繫我們。
   EN: This is a prescription diet. We recommend purchasing under veterinary guidance. Contact us if you have questions.
   ```
4. WhatsApp button prominent next to notice
5. No purchase block (advisory only)

### Cross-sell/Upsell Logic

**Implementation**:
```
Product Page - "You May Also Like":
- Show 4 related products
- Logic: Same category + same brand OR same pet_type
- Exclude: Current product, out of stock items

Cart Page - "Complete Your Order":
- Show 4 complementary products
- Logic:
  - If cart has food → suggest treats, accessories
  - If cart has treats → suggest food
  - Always show bestsellers in same pet_type
```

### Security Requirements

| Requirement | Implementation | Priority |
|-------------|----------------|----------|
| SSL/TLS | CloudFlare Full (Strict) | P0 |
| PCI DSS | Via Stripe (no card data stored) | P0 |
| Login Protection | Wordfence login security | P1 |
| 2FA | Admin accounts only | P1 |
| Firewall | Wordfence WAF | P1 |
| Backup | Daily automated (UpdraftPlus → S3) | P0 |
| Updates | Weekly security patches | P1 |
| Password Policy | Min 12 chars, complexity required | P1 |

---

## Business Rules & Logic

### Pricing Strategy
- **Currency**: HKD (Hong Kong Dollars)
- **Tax**: Included in displayed prices (Hong Kong has no sales tax)
- **Pricing Model**: Fixed retail pricing
- **Discounts**:
  - Coupon code system (percentage or fixed)
  - Sale pricing per product
  - No automatic quantity discounts in MVP

### Shipping Rules

| Destination | Method | Threshold | Cost |
|-------------|--------|-----------|------|
| Hong Kong | Standard (SF Express) | < $500 | $40 |
| Hong Kong | Standard (SF Express) | ≥ $500 | FREE |
| Hong Kong | Express (Same Day) | Any | $80 |
| Macau | Standard | < $800 | $80 |
| Macau | Standard | ≥ $800 | FREE |

**Weight Surcharge**:
- Orders > 20kg: Additional $20 per 10kg

### Order Processing

```
Order Flow:
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Pending   │ → │ Processing │ → │  Shipped   │ → │ Completed  │
│ (Payment   │    │ (Payment   │    │ (Tracking  │    │ (Delivered)│
│  Pending)  │    │ Confirmed) │    │  Sent)     │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
      │                                                      │
      └──────────────── Cancelled ◄─────────────────────────┘
                    (Before shipping only)
```

**Email Notifications**:
| Trigger | Recipient | Email |
|---------|-----------|-------|
| Order placed | Customer | Order confirmation |
| Payment received | Customer | Payment confirmation |
| Order shipped | Customer | Shipping notification + tracking |
| Order delivered | Customer | Delivery confirmation + review request |
| Order cancelled | Customer | Cancellation confirmation |
| Low stock (<5) | Admin | Stock alert |
| New order | Admin | Order notification |

### Inventory Management
- **Stock Tracking**: WooCommerce native inventory
- **Low Stock Threshold**: 5 units
- **Out of Stock Behavior**: Display product, disable purchase button
- **Backorders**: Not supported in MVP
- **Stock Sync**: Manual via admin panel

---

## Implementation Strategy

### Staged Delivery Approach

#### Stage 1: Foundation (Week 1)

**Objectives**:
- Working WordPress + WooCommerce installation
- Base theme configured and customized
- Core pages created
- Admin training completed

**Deliverables**:
| Item | Description | Owner |
|------|-------------|-------|
| WordPress Setup | Fresh install on EC2, configured | Developer |
| WooCommerce Setup | Core plugin installed, basic settings | Developer |
| Theme Installation | Flavor theme installed, child theme created | Developer |
| Homepage | Hero, categories, featured products (placeholder) | Developer |
| Header/Footer | Navigation, logo, social links | Developer |
| Basic Pages | About, Contact, FAQ, Shipping Info | Developer |
| CloudFlare | DNS, SSL, basic caching rules | Developer |
| Admin Training | 2-hour session on content management | Developer + Client |

**Decision Checkpoint (End of Week 1)**:
- [ ] Homepage layout approved
- [ ] Navigation structure confirmed
- [ ] Color scheme finalized
- [ ] Proceed to Stage 2?

#### Stage 2: Commerce (Week 2)

**Objectives**:
- Full product catalog live
- Payment processing working
- Shipping configured
- User accounts functional

**Deliverables**:
| Item | Description | Owner |
|------|-------------|-------|
| Product Import | 400 SKUs imported with images | Developer + Client |
| Category Structure | Dog, Cat, Treats, Accessories + subcategories | Developer |
| Stripe Integration | Payment gateway live in test mode | Developer |
| Shipping Zones | HK, Macau with rates configured | Developer |
| User Registration | Email verification, account pages | Developer |
| Cart/Checkout | Full flow working end-to-end | Developer |
| Email Setup | SendGrid configured, templates customized | Developer |
| Admin Training | 2-hour session on order management | Developer + Client |

**Decision Checkpoint (End of Week 2)**:
- [ ] Product catalog complete and accurate
- [ ] Test orders processed successfully
- [ ] Shipping rates confirmed
- [ ] Proceed to Stage 3?

#### Stage 3: Polish & Launch (Week 3)

**Objectives**:
- Bilingual content complete
- Performance optimized
- Security hardened
- Site launched

**Deliverables**:
| Item | Description | Owner |
|------|-------------|-------|
| WPML Setup | Bilingual (ZH/EN) fully configured | Developer |
| Content Translation | All pages and products translated | Client |
| Performance | WP Rocket, image optimization, <3s load time | Developer |
| SEO | Yoast configured, sitemaps, meta tags | Developer |
| Security | Wordfence, backups, monitoring | Developer |
| WhatsApp | Joinchat widget configured | Developer |
| UAT | Client testing all flows | Client |
| Bug Fixes | Address UAT issues | Developer |
| Go-Live | DNS switch, monitoring setup | Developer |
| Launch Support | 2-day post-launch support | Developer |

**Launch Checklist**:
- [ ] All pages tested in both languages
- [ ] Payment tested in production mode
- [ ] Mobile testing completed
- [ ] Performance targets met
- [ ] Security scan passed
- [ ] Backup verified
- [ ] DNS propagation confirmed
- [ ] Monitoring alerts configured

### Content Requirements

#### Product Data Specification
**Required from Client (per product)**:
| Field | Format | Example |
|-------|--------|---------|
| Product Name (ZH) | Text | 皇家中型成犬糧 |
| Product Name (EN) | Text | Royal Canin Medium Adult |
| SKU | Text | RC-MED-ADULT-4KG |
| Price (HKD) | Number | 388 |
| Sale Price | Number (optional) | 358 |
| Category | Hierarchy | Dog Food > Dry Food |
| Brand | Text | Royal Canin |
| Pet Type | Select | Dog / Cat / Both |
| Size Options | Text | 2kg, 4kg, 10kg |
| Weight | Number (kg) | 4 |
| Short Description (ZH) | Text (150 chars) | 中型成犬專用... |
| Short Description (EN) | Text (150 chars) | Complete nutrition for... |
| Full Description (ZH) | HTML | Product details... |
| Full Description (EN) | HTML | Product details... |
| Prescription | Yes/No | No |
| Main Image | JPG/PNG (800x800px) | product-main.jpg |
| Gallery Images | JPG/PNG (3-5 images) | product-1.jpg, product-2.jpg |
| Stock Quantity | Number | 50 |

#### Site Content (Client to Provide)
| Page | Content Required |
|------|-----------------|
| About Us | Company story, mission, team (ZH + EN) |
| Contact | Phone, email, address, map (ZH + EN) |
| Shipping | Delivery areas, times, costs (ZH + EN) |
| Returns | Policy, process, conditions (ZH + EN) |
| FAQ | 10-15 common questions (ZH + EN) |
| Privacy | Data handling policy (ZH + EN) |
| Terms | Terms of service (ZH + EN) |

---

## Risk Assessment

### Risk Register

| ID | Risk | Category | Probability | Impact | Score | Mitigation | Owner |
|----|------|----------|-------------|--------|-------|------------|-------|
| R1 | Plugin conflicts causing site instability | Technical | Medium | High | 6 | Staging environment testing, minimal plugin set | Developer |
| R2 | Poor page load performance | Technical | Medium | High | 6 | CDN, caching, image optimization | Developer |
| R3 | Security breach/data leak | Technical | Low | Critical | 5 | Wordfence, regular updates, backups | Developer |
| R4 | Stripe payment issues | Technical | Low | Critical | 5 | Extensive testing, Stripe support escalation | Developer |
| R5 | Product data quality issues | Business | High | Medium | 6 | Data templates, validation scripts | Client |
| R6 | Launch timeline delays | Business | Medium | Medium | 4 | Staged delivery, buffer time, scope management | PM |
| R7 | Low initial traffic | Business | High | Medium | 6 | Marketing plan, SEO, social media | Client |
| R8 | Customer support overload | Business | Medium | Medium | 4 | FAQ, WhatsApp, chatbot consideration | Client |
| R9 | Admin training gaps | Operational | Medium | Medium | 4 | Documentation, video guides, follow-up training | Developer |
| R10 | Inventory sync errors | Operational | Low | High | 4 | Manual process initially, regular audits | Client |

**Scoring**: Probability (Low=1, Medium=2, High=3) × Impact (Low=1, Medium=2, High=3, Critical=4)

### Contingency Plans

| Risk | Trigger | Response |
|------|---------|----------|
| R1 - Plugin Conflict | Site error after plugin update | Immediate rollback to backup, staging re-test |
| R3 - Security Breach | Wordfence alert or unusual activity | Site lockdown, investigation, password reset |
| R6 - Timeline Delay | >2 days behind schedule | Scope reduction (defer P2 features), extend hours |

---

## Project Management

### RACI Matrix

| Activity | Developer | Client | PM |
|----------|-----------|--------|-----|
| WordPress/WC Installation | R | I | A |
| Theme Configuration | R | C | A |
| Homepage Design Approval | I | A | R |
| Product Data Preparation | C | R | A |
| Product Import | R | A | I |
| Payment Gateway Setup | R | I | A |
| Content Creation (ZH/EN) | I | R | A |
| UAT Testing | I | R | A |
| Bug Fixes | R | I | A |
| Go-Live Decision | C | A | R |
| Post-Launch Support | R | I | A |

**Legend**: R = Responsible, A = Accountable, C = Consulted, I = Informed

### Decision Checkpoints

| Checkpoint | Timing | Decisions Required | Attendees |
|------------|--------|-------------------|-----------|
| Kickoff | Day 1 | Confirm scope, timeline, contacts | All |
| Stage 1 Review | End Week 1 | Approve design, confirm products list | Client, PM |
| Stage 2 Review | End Week 2 | Test orders OK, confirm shipping rates | Client, PM |
| Launch Go/No-Go | End Week 3 | Final approval, DNS switch authorization | Client, PM |

---

## Budget Breakdown

### Estimated Costs (HKD)

| Category | Item | One-Time | Monthly | Notes |
|----------|------|----------|---------|-------|
| **Hosting** | AWS EC2 (t3.medium) | - | $400 | ap-east-1 |
| | Amazon RDS (db.t3.small) | - | $250 | MySQL 8.0 |
| | AWS S3 (50GB) | - | $50 | Media storage |
| **Domain/SSL** | CloudFlare Pro | - | $160 | CDN + Security |
| **Plugins** | WPML + WC WPML | $2,500 | - | Annual license |
| | WP Rocket | $400 | - | Annual license |
| | ACF Pro | $400 | - | Annual license |
| | Flavor Theme | $500 | - | One-time |
| **Services** | SendGrid (50K emails) | - | $120 | Transactional email |
| | Stripe Fees | - | 2.9% + $2.35/txn | Payment processing |
| **Development** | Setup + Customization | $XX,XXX | - | Quote TBD |
| | Training | Included | - | 2 sessions |

### Total Estimated

| Type | Amount (HKD) |
|------|--------------|
| One-Time Setup | ~$3,800 + Development |
| Monthly Operating | ~$980 + Stripe fees |
| Annual Renewals | ~$3,300 |

---

## Quality Assurance

### Acceptance Criteria

| ID | Criteria | Verification Method | Status |
|----|----------|---------------------|--------|
| AC-01 | Homepage loads in <3 seconds on 4G | Google PageSpeed Insights | [ ] |
| AC-02 | All 400 products visible and searchable | Manual + automated count | [ ] |
| AC-03 | Stripe test payment completes successfully | Test transaction | [ ] |
| AC-04 | User can register, login, view order history | Manual test flow | [ ] |
| AC-05 | Site fully functional in Chinese and English | Manual navigation | [ ] |
| AC-06 | Mobile responsive (iPhone 12, Samsung S21) | Device testing | [ ] |
| AC-07 | WhatsApp button opens chat correctly | Click test on mobile/desktop | [ ] |
| AC-08 | Email notifications received for orders | Test order | [ ] |
| AC-09 | Product filters work (brand, price, size) | Manual testing | [ ] |
| AC-10 | Cart persists after browser close | Session test | [ ] |
| AC-11 | Admin can add/edit products | Admin panel test | [ ] |

### Testing Checklist

#### Functional Testing
- [ ] Product browsing and filtering
- [ ] Search functionality with autocomplete
- [ ] Add to cart from listing and PDP
- [ ] Cart quantity updates
- [ ] Coupon code application
- [ ] Guest checkout flow
- [ ] Registered user checkout flow
- [ ] Payment processing (Stripe test mode)
- [ ] Order confirmation email
- [ ] User registration
- [ ] Password reset flow
- [ ] Order history viewing
- [ ] Language switching (ZH ↔ EN)
- [ ] Prescription product notice display
- [ ] WhatsApp button click behavior

#### Cross-Browser Testing
| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | [ ] | [ ] |
| Safari | [ ] | [ ] |
| Firefox | [ ] | [ ] |
| Edge | [ ] | [ ] |

#### Performance Testing
- [ ] Homepage <3s (4G connection)
- [ ] Category page <3s
- [ ] PDP <3s
- [ ] Checkout <3s
- [ ] Google PageSpeed Mobile >70
- [ ] Google PageSpeed Desktop >85

#### Security Testing
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] Stripe test transactions secure
- [ ] Admin login protected
- [ ] Wordfence scan clean
- [ ] No sensitive data in console logs

---

## Success Metrics & KPIs

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Revenue | TBD | WooCommerce reports |
| Average Order Value | >$400 HKD | WooCommerce reports |
| Conversion Rate | >2% | Google Analytics |
| Cart Abandonment Rate | <70% | WooCommerce reports |
| Return Customer Rate | >30% | WooCommerce reports |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | <3 seconds | Google PageSpeed |
| Uptime | >99.5% | CloudFlare/UptimeRobot |
| Mobile Usability | >90% | Google Search Console |
| Core Web Vitals | All Green | Google PageSpeed |
| Error Rate | <0.1% | Server logs |

### Launch Criteria

**Must Have (P0)**:
- [ ] All 400 products imported with images
- [ ] Stripe payments working (production mode)
- [ ] Cart and checkout flow complete
- [ ] Mobile responsive
- [ ] Basic SEO (titles, descriptions)

**Should Have (P1)**:
- [ ] Bilingual (ZH/EN) complete
- [ ] User accounts functional
- [ ] Email notifications working
- [ ] WhatsApp integration live

**Nice to Have (P2)**:
- [ ] Cross-sell recommendations
- [ ] Wishlist functionality
- [ ] Advanced filtering

---

## Appendices

### A. Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | https://vec.com.hk (TBD) | Live site |
| Staging | https://staging.vec.com.hk (TBD) | Testing |
| Admin | /wp-admin | WordPress admin |

### B. Third-Party Accounts Required

| Service | Account Type | Setup By |
|---------|--------------|----------|
| AWS | Root + IAM | Developer |
| CloudFlare | Pro Plan | Developer |
| Stripe | Business Account | Client |
| SendGrid | Pro 50K | Developer |
| WPML | Agency License | Developer |

### C. Contact Information

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Client Contact | TBD | TBD | TBD |
| Developer | TBD | TBD | TBD |
| Project Manager | TBD | TBD | TBD |

---

**Document Status**: Draft - Pending Implementation
**Version**: 2.3
**Next Review**: After Stage 1 completion
**Source Document**: Vec_woocommerce_v2.3.pdf
**Related Documents**:
- WordPress/WooCommerce documentation
- Stripe API documentation
- WPML documentation
- Pettington.com (UX reference)
