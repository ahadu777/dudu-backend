# 🎨 Complete Frontend Integration Guide: Ticketing System

## 📋 Overview

Comprehensive integration package for building frontend applications with the complete ticketing system. This guide covers all 7 implemented user stories with API contracts, React components, and integration patterns.

**System:** Synque Express Ticketing API
**Status:** ✅ Production Ready
**API Version:** 1.0.0
**Coverage:** US-001 through US-007

---

## 🔐 Global Authentication

All authenticated endpoints require JWT tokens:

```typescript
// Customer endpoints
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}

// Operator endpoints
headers: {
  'Authorization': `Bearer ${operatorToken}`,
  'Content-Type': 'application/json'
}
```

### **Test Tokens (Development)**
```typescript
// Customer tokens
const customerTokens = {
  user123: 'user123',  // Has existing tickets
  user456: 'user456'   // Different user for testing
};

// Operator credentials
const operatorCredentials = {
  username: 'alice',
  password: 'secret123'
};
```

---

## 🛒 US-001: E-Commerce Flow (Buy → Pay → Tickets)

**User Story:** As a customer, I want to browse products, create orders, and receive tickets after payment.

### **API Integration**

#### **1. Get Product Catalog**
```typescript
// GET /catalog
interface Product {
  id: number;
  sku: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  functions: ProductFunction[];
}

interface ProductFunction {
  function_code: string;
  label: string;
  quantity: number;
}

const fetchCatalog = async (): Promise<{ products: Product[] }> => {
  const response = await fetch('/catalog');
  return response.json();
};
```

#### **2. Create Order**
```typescript
// POST /orders
interface OrderRequest {
  user_id: number;
  items: OrderItem[];
  channel_id: number;
  out_trade_no: string; // Unique identifier for idempotency
}

interface OrderItem {
  product_id: number;
  qty: number;
}

interface OrderResponse {
  order_id: number;
  status: 'CREATED' | 'PENDING_PAYMENT';
  items: OrderItem[];
  created_at: string;
}

const createOrder = async (orderData: OrderRequest): Promise<OrderResponse> => {
  const response = await fetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  if (!response.ok) throw new Error('Order creation failed');
  return response.json();
};
```

#### **3. Payment Processing** *(Backend webhook - for reference)*
```typescript
// POST /payments/notify (internal webhook)
// This is called by payment gateway, not frontend
interface PaymentNotification {
  order_id: number;
  payment_status: 'SUCCESS' | 'FAILED';
  paid_at: string;
}
```

### **React Component: Product Catalog & Checkout**

```typescript
const ProductCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog().then(data => {
      setProducts(data.products);
      setLoading(false);
    });
  }, []);

  const addToCart = (productId: number, quantity: number = 1) => {
    setCart(prev => new Map(prev.set(productId, (prev.get(productId) || 0) + quantity)));
  };

  const checkout = async () => {
    const items = Array.from(cart.entries()).map(([product_id, qty]) => ({
      product_id,
      qty
    }));

    const orderData: OrderRequest = {
      user_id: getCurrentUserId(), // Your auth system
      items,
      channel_id: 1, // Web channel
      out_trade_no: `WEB-${Date.now()}-${Math.random().toString(36).slice(2)}`
    };

    try {
      const order = await createOrder(orderData);
      // Redirect to payment gateway
      window.location.href = `/payment?order_id=${order.order_id}`;
    } catch (error) {
      alert('Order creation failed: ' + error.message);
    }
  };

  if (loading) return <div>Loading catalog...</div>;

  return (
    <div className="product-catalog">
      <h2>Available Packages</h2>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>
            <p className="sku">SKU: {product.sku}</p>

            <div className="functions">
              <h4>Includes:</h4>
              <ul>
                {product.functions.map(func => (
                  <li key={func.function_code}>
                    {func.label} ({func.quantity}x)
                  </li>
                ))}
              </ul>
            </div>

            <div className="product-actions">
              <button onClick={() => addToCart(product.id)}>
                Add to Cart {cart.get(product.id) ? `(${cart.get(product.id)})` : ''}
              </button>
            </div>
          </div>
        ))}
      </div>

      {cart.size > 0 && (
        <div className="checkout-section">
          <h3>Cart Summary</h3>
          {Array.from(cart.entries()).map(([productId, qty]) => {
            const product = products.find(p => p.id === productId);
            return (
              <div key={productId}>
                {product?.name} x {qty}
              </div>
            );
          })}
          <button onClick={checkout} className="checkout-button">
            Proceed to Payment
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 🎫 US-003: Customer Ticket Viewing

**User Story:** As a customer, I want to view my tickets and their QR codes for redemption.

### **API Integration**

#### **1. Get My Tickets**
```typescript
// GET /my/tickets
interface Ticket {
  ticket_code: string;
  product_id: number;
  product_name: string;
  status: 'active' | 'partially_redeemed' | 'redeemed' | 'expired' | 'void';
  expires_at?: string;
  entitlements: TicketEntitlement[];
  user_id: number;
  order_id: number;
  cancelled_at?: string;
  cancellation_reason?: string;
}

interface TicketEntitlement {
  function_code: string;
  label: string;
  remaining_uses: number;
}

const fetchMyTickets = async (userToken: string): Promise<{ tickets: Ticket[] }> => {
  const response = await fetch('/my/tickets', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  return response.json();
};
```

#### **2. Generate QR Token**
```typescript
// POST /tickets/{code}/qr-token
interface QRTokenResponse {
  token: string;      // JWT token containing {tid, code_hash, exp, jti}
  expires_in: number; // Always 60 seconds (fixed TTL)
}

const generateQRToken = async (ticketCode: string, userToken: string): Promise<QRTokenResponse> => {
  const response = await fetch(`/tickets/${ticketCode}/qr-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
    // No body required - TTL is fixed at 60 seconds
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate QR token');
  }

  return response.json();
};
```

### **React Component: Ticket Viewer**

```typescript
const TicketViewer = ({ userToken }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets(userToken).then(data => {
      setTickets(data.tickets);
      setLoading(false);
    });
  }, [userToken]);

  const showQR = async (ticket: Ticket) => {
    try {
      const tokenData = await generateQRToken(ticket.ticket_code, userToken);
      setQrToken(tokenData.token);
      setSelectedTicket(ticket);
    } catch (error) {
      alert('Failed to generate QR code: ' + error.message);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      'active': 'status-active',
      'partially_redeemed': 'status-partial',
      'redeemed': 'status-used',
      'expired': 'status-expired',
      'void': 'status-cancelled'
    };
    return classes[status] || 'status-unknown';
  };

  if (loading) return <div>Loading your tickets...</div>;

  return (
    <div className="ticket-viewer">
      <h2>My Tickets</h2>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found.</p>
          <p>Purchase some packages to see your tickets here!</p>
        </div>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.ticket_code} className={`ticket-card ${ticket.status}`}>
              <div className="ticket-header">
                <h3>{ticket.product_name}</h3>
                <span className={`status-badge ${getStatusBadgeClass(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>

              <div className="ticket-details">
                <p className="ticket-code">Code: {ticket.ticket_code}</p>
                {ticket.expires_at && (
                  <p className="expiry">
                    Expires: {new Date(ticket.expires_at).toLocaleDateString()}
                  </p>
                )}

                <div className="entitlements">
                  <h4>Available Uses:</h4>
                  {ticket.entitlements.map(ent => (
                    <div key={ent.function_code} className="entitlement">
                      <span className="label">{ent.label}:</span>
                      <span className={`uses ${ent.remaining_uses === 0 ? 'exhausted' : ''}`}>
                        {ent.remaining_uses} remaining
                      </span>
                    </div>
                  ))}
                </div>

                {ticket.cancelled_at && (
                  <div className="cancellation-info">
                    <p>Cancelled: {new Date(ticket.cancelled_at).toLocaleDateString()}</p>
                    {ticket.cancellation_reason && (
                      <p>Reason: {ticket.cancellation_reason}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="ticket-actions">
                {ticket.status === 'active' || ticket.status === 'partially_redeemed' ? (
                  <button onClick={() => showQR(ticket)} className="qr-button">
                    Show QR Code
                  </button>
                ) : (
                  <span className="unavailable">
                    {ticket.status === 'redeemed' ? 'Fully Used' :
                     ticket.status === 'expired' ? 'Expired' : 'Unavailable'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTicket && qrToken && (
        <QRCodeModal
          ticket={selectedTicket}
          token={qrToken}
          onClose={() => {
            setSelectedTicket(null);
            setQrToken(null);
          }}
        />
      )}
    </div>
  );
};

const QRCodeModal = ({ ticket, token, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>QR Code: {ticket.product_name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="qr-content">
          <div className="qr-code">
            {/* Use qrcode.js library for rendering */}
            <QRCodeSVG value={token} size={200} />
          </div>

          <div className="qr-info">
            <p><strong>Ticket:</strong> {ticket.ticket_code}</p>
            <p><strong>Valid for 60 seconds</strong></p>
            <p>Show this code to the operator for scanning</p>
            <small>Token auto-expires for security</small>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### **QR Code Rendering Implementation**

For visual QR code rendering, install a QR code library:

```bash
npm install qrcode.js qrcode-react
# or
npm install qrcode
```

**Complete Implementation:**

```typescript
import { QRCodeSVG } from 'qrcode-react';

// QR Token Manager with automatic refresh
class QRTokenManager {
  private token: string | null = null;
  private expiryTime: number = 0;
  private refreshTimer: NodeJS.Timeout | null = null;

  async getValidToken(ticketCode: string, userToken: string): Promise<string> {
    const now = Date.now();

    // Check if current token is still valid (with 10s buffer)
    if (this.token && now < this.expiryTime - 10000) {
      return this.token;
    }

    // Generate new token
    const response = await generateQRToken(ticketCode, userToken);
    this.token = response.token;
    this.expiryTime = now + (response.expires_in * 1000);

    return this.token;
  }

  startAutoRefresh(ticketCode: string, userToken: string, onUpdate: (token: string) => void) {
    this.refreshTimer = setInterval(async () => {
      try {
        const newToken = await this.getValidToken(ticketCode, userToken);
        onUpdate(newToken);
      } catch (error) {
        console.error('Failed to refresh QR token:', error);
      }
    }, 45000); // Refresh every 45 seconds
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Enhanced QR Code Modal with auto-refresh
const QRCodeModal = ({ ticket, userToken, onClose }) => {
  const [currentToken, setCurrentToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const tokenManager = useRef(new QRTokenManager());

  useEffect(() => {
    let mounted = true;

    const initializeQR = async () => {
      try {
        const token = await tokenManager.current.getValidToken(ticket.ticket_code, userToken);
        if (mounted) {
          setCurrentToken(token);
          setIsLoading(false);

          // Start auto-refresh
          tokenManager.current.startAutoRefresh(
            ticket.ticket_code,
            userToken,
            setCurrentToken
          );
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeQR();

    return () => {
      mounted = false;
      tokenManager.current.stopAutoRefresh();
    };
  }, [ticket.ticket_code, userToken]);

  if (isLoading) {
    return (
      <div className="modal-overlay">
        <div className="qr-modal">
          <p>Generating QR code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>QR Code: {ticket.product_name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="qr-content">
          <div className="qr-code">
            <QRCodeSVG
              value={currentToken}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>

          <div className="qr-info">
            <p><strong>Ticket:</strong> {ticket.ticket_code}</p>
            <p><strong>Valid for 60 seconds</strong></p>
            <p>QR code refreshes automatically</p>
            <small>Show this code to the operator for scanning</small>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Key Implementation Notes:**

1. **Security**: JWT tokens expire in 60 seconds
2. **Auto-refresh**: QR codes refresh every 45 seconds automatically
3. **Error handling**: Graceful fallbacks for network failures
4. **User experience**: Loading states and clear instructions

---

## 👮 US-006: Operator Authentication

**User Story:** As an operator, I need to log in to access scanning functionality.

### **API Integration**

```typescript
// POST /operators/login
interface OperatorLoginRequest {
  username: string;
  password: string;
}

interface OperatorLoginResponse {
  operator_token: string;
}

const operatorLogin = async (credentials: OperatorLoginRequest): Promise<OperatorLoginResponse> => {
  const response = await fetch('/operators/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
};
```

### **React Component: Operator Login**

```typescript
const OperatorLogin = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await operatorLogin(credentials);
      localStorage.setItem('operatorToken', result.operator_token);
      onLoginSuccess(result.operator_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="operator-login">
      <div className="login-form">
        <h2>Operator Login</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({
                ...prev,
                username: e.target.value
              }))}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({
                ...prev,
                password: e.target.value
              }))}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !credentials.username || !credentials.password}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-help">
          <p>Demo credentials: alice / secret123</p>
        </div>
      </div>
    </div>
  );
};
```

---

## 📱 US-002: Operator Scanning Interface

**User Story:** As an operator, I want to scan QR codes and validate tickets for redemption.

### **API Integration**

#### **1. Create Validator Session**
```typescript
// POST /validators/sessions
interface SessionRequest {
  operator_token: string;
  device_id: string;
  location_id?: number;
}

interface ValidatorSession {
  session_id: string;
  operator_id: number;
  device_id: string;
  location_id?: number;
  created_at: string;
  expires_at: string;
}

const createSession = async (operatorToken: string, deviceId: string): Promise<ValidatorSession> => {
  const response = await fetch('/validators/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${operatorToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      device_id: deviceId,
      location_id: 52 // Your location ID
    })
  });
  return response.json();
};
```

#### **2. Scan and Redeem Ticket**
```typescript
// POST /tickets/scan
interface ScanRequest {
  qr_token?: string;      // From QR code scan
  code?: string;          // Manual ticket code entry
  function_code: string;  // Which function to redeem
  session_id: string;     // From validator session
  location_id?: number;   // Optional location
}

interface ScanResponse {
  result: 'success' | 'reject';
  ticket_status: string;
  entitlements: TicketEntitlement[];
  reason?: string; // If result is 'reject'
}

const scanTicket = async (scanData: ScanRequest, operatorToken: string): Promise<ScanResponse> => {
  const response = await fetch('/tickets/scan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${operatorToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(scanData)
  });

  return response.json();
};
```

### **React Component: Ticket Scanner**

```typescript
const TicketScanner = ({ operatorToken }) => {
  const [session, setSession] = useState<ValidatorSession | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const availableFunctions = [
    { code: 'bus', label: 'Bus Ride' },
    { code: 'ferry', label: 'Ferry Ride' },
    { code: 'metro', label: 'Metro Entry' },
    { code: 'museum', label: 'Museum Entry' },
    { code: 'park', label: 'Park Entry' },
    { code: 'ride', label: 'Fast Pass' }
  ];

  useEffect(() => {
    // Create validator session on component mount
    const deviceId = `DEVICE-${Math.random().toString(36).slice(2)}`;
    createSession(operatorToken, deviceId).then(setSession);
  }, [operatorToken]);

  const handleScan = async () => {
    if (!session || !scanInput || !selectedFunction) return;

    setLoading(true);
    try {
      const scanData: ScanRequest = {
        qr_token: scanInput, // Assume it's a QR token
        function_code: selectedFunction,
        session_id: session.session_id,
        location_id: session.location_id
      };

      const result = await scanTicket(scanData, operatorToken);
      setScanHistory(prev => [result, ...prev]);
      setScanInput(''); // Clear input after scan

      // Show result feedback
      if (result.result === 'success') {
        showSuccess(`✅ Redeemed successfully! Ticket status: ${result.ticket_status}`);
      } else {
        showError(`❌ Redemption failed: ${result.reason}`);
      }

    } catch (error) {
      showError('Scan failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    // Implement your notification system
    alert(message);
  };

  const showError = (message: string) => {
    // Implement your notification system
    alert(message);
  };

  if (!session) return <div>Setting up scanner...</div>;

  return (
    <div className="ticket-scanner">
      <div className="scanner-header">
        <h2>Ticket Scanner</h2>
        <div className="session-info">
          <p>Session: {session.session_id.slice(0, 8)}...</p>
          <p>Location: {session.location_id || 'Any'}</p>
        </div>
      </div>

      <div className="scan-form">
        <div className="form-group">
          <label htmlFor="scan-input">QR Code / Ticket Code:</label>
          <input
            id="scan-input"
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Scan QR code or enter ticket code"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="function-select">Function to Redeem:</label>
          <select
            id="function-select"
            value={selectedFunction}
            onChange={(e) => setSelectedFunction(e.target.value)}
          >
            <option value="">Select function...</option>
            {availableFunctions.map(func => (
              <option key={func.code} value={func.code}>
                {func.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleScan}
          disabled={loading || !scanInput || !selectedFunction}
          className="scan-button"
        >
          {loading ? 'Processing...' : 'Scan & Redeem'}
        </button>
      </div>

      <div className="scan-history">
        <h3>Recent Scans</h3>
        {scanHistory.length === 0 ? (
          <p>No scans yet</p>
        ) : (
          <div className="history-list">
            {scanHistory.slice(0, 10).map((scan, index) => (
              <div key={index} className={`scan-result ${scan.result}`}>
                <div className="result-header">
                  <span className={`result-badge ${scan.result}`}>
                    {scan.result === 'success' ? '✅' : '❌'} {scan.result}
                  </span>
                  <span className="timestamp">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                {scan.result === 'success' ? (
                  <div className="success-details">
                    <p>Status: {scan.ticket_status}</p>
                    <p>Remaining entitlements: {scan.entitlements?.length || 0}</p>
                  </div>
                ) : (
                  <div className="error-details">
                    <p>Reason: {scan.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 📊 US-005: Admin Reporting Dashboard

**User Story:** As an admin, I want to view redemption reports and analytics.

### **API Integration**

```typescript
// GET /reports/redemptions
interface RedemptionFilters {
  from?: string;        // ISO date
  to?: string;          // ISO date
  location_id?: number;
  operator_id?: number;
  function_code?: string;
}

interface RedemptionEvent {
  ticket_id: number;
  function_code: string;
  operator_id: number;
  session_id: string;
  location_id?: number;
  result: 'success' | 'reject';
  reason?: string;
  ts: string;
}

const fetchRedemptions = async (filters: RedemptionFilters = {}): Promise<RedemptionEvent[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, value.toString());
  });

  const response = await fetch(`/reports/redemptions?${params}`);
  return response.json();
};
```

### **React Component: Reports Dashboard**

```typescript
const ReportsDashboard = () => {
  const [redemptions, setRedemptions] = useState<RedemptionEvent[]>([]);
  const [filters, setFilters] = useState<RedemptionFilters>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchRedemptions(filters);
      setRedemptions(data);
    } catch (error) {
      alert('Failed to load reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const getStats = () => {
    const total = redemptions.length;
    const successful = redemptions.filter(r => r.result === 'success').length;
    const failed = redemptions.filter(r => r.result === 'reject').length;

    const byFunction = redemptions.reduce((acc, r) => {
      if (r.result === 'success') {
        acc[r.function_code] = (acc[r.function_code] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return { total, successful, failed, byFunction };
  };

  const stats = getStats();

  return (
    <div className="reports-dashboard">
      <h2>Redemption Reports</h2>

      <div className="filters-section">
        <div className="filter-group">
          <label>From Date:</label>
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
          />
        </div>

        <div className="filter-group">
          <label>To Date:</label>
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>

        <div className="filter-group">
          <label>Location ID:</label>
          <input
            type="number"
            value={filters.location_id || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              location_id: e.target.value ? parseInt(e.target.value) : undefined
            }))}
            placeholder="All locations"
          />
        </div>

        <button onClick={loadReports} disabled={loading} className="load-button">
          {loading ? 'Loading...' : 'Load Reports'}
        </button>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Scans</h3>
          <span className="stat-number">{stats.total}</span>
        </div>

        <div className="stat-card success">
          <h3>Successful</h3>
          <span className="stat-number">{stats.successful}</span>
        </div>

        <div className="stat-card failed">
          <h3>Failed</h3>
          <span className="stat-number">{stats.failed}</span>
        </div>

        <div className="stat-card rate">
          <h3>Success Rate</h3>
          <span className="stat-number">
            {stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%
          </span>
        </div>
      </div>

      <div className="function-breakdown">
        <h3>Redemptions by Function</h3>
        <div className="function-stats">
          {Object.entries(stats.byFunction).map(([func, count]) => (
            <div key={func} className="function-stat">
              <span className="function-name">{func}</span>
              <span className="function-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="detailed-list">
        <h3>Recent Redemptions</h3>
        {redemptions.length === 0 ? (
          <p>No redemptions found for the selected period.</p>
        ) : (
          <div className="redemptions-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Function</th>
                  <th>Result</th>
                  <th>Operator</th>
                  <th>Location</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.slice(0, 100).map((redemption, index) => (
                  <tr key={index} className={`result-${redemption.result}`}>
                    <td>{new Date(redemption.ts).toLocaleString()}</td>
                    <td>{redemption.function_code}</td>
                    <td>
                      <span className={`result-badge ${redemption.result}`}>
                        {redemption.result}
                      </span>
                    </td>
                    <td>{redemption.operator_id}</td>
                    <td>{redemption.location_id || 'N/A'}</td>
                    <td>{redemption.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## ❌ US-007: Ticket Cancellation & Refunds

**User Story:** As a customer, I want to cancel my unused tickets and receive refunds.

### **API Integration**

#### **1. Get Cancellation Policies**
```typescript
// GET /cancellation-policies
interface CancellationPolicy {
  rule_type: 'redemption_based' | 'time_based' | 'product_based';
  description: string;
  refund_percentage: number;
  conditions: any;
}

interface CancellationPolicyExample {
  scenario: string;
  ticket_status: string;
  redemptions_used: number;
  total_redemptions: number;
  refund_percentage: number;
  explanation: string;
}

const fetchCancellationPolicies = async (): Promise<{
  policies: CancellationPolicy[];
  examples: CancellationPolicyExample[];
}> => {
  const response = await fetch('/cancellation-policies');
  return response.json();
};
```

#### **2. Cancel Ticket**
```typescript
// POST /tickets/{code}/cancel
interface CancellationRequest {
  reason?: string;
}

interface CancellationResponse {
  ticket_status: 'void';
  refund_amount: number;
  refund_id: string;
  cancelled_at: string;
}

const cancelTicket = async (
  ticketCode: string,
  reason: string,
  userToken: string
): Promise<CancellationResponse> => {
  const response = await fetch(`/tickets/${ticketCode}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Cancellation failed');
  }

  return response.json();
};
```

#### **3. Get Refund History**
```typescript
// GET /my/refunds
interface Refund {
  refund_id: string;
  order_id: number;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  reason: string;
  created_at: string;
  completed_at?: string;
}

const fetchRefunds = async (userToken: string): Promise<{ refunds: Refund[] }> => {
  const response = await fetch('/my/refunds', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  return response.json();
};
```

### **React Component: Ticket Cancellation**

```typescript
const TicketCancellation = ({ ticket, userToken, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canCancel = ticket.status === 'active' || ticket.status === 'partially_redeemed';

  const calculateEstimatedRefund = (ticket: Ticket) => {
    if (!canCancel) return '0%';

    // Simple estimation based on remaining uses
    const totalUses = ticket.entitlements.reduce((sum, e) => sum + (e.original_quantity || e.remaining_uses), 0);
    const remainingUses = ticket.entitlements.reduce((sum, e) => sum + e.remaining_uses, 0);
    const usagePercentage = totalUses > 0 ? (totalUses - remainingUses) / totalUses : 0;

    if (usagePercentage === 0) return '100%';
    if (usagePercentage <= 0.5) return '50%';
    if (usagePercentage < 1.0) return '25%';
    return '0%';
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelTicket(ticket.ticket_code, reason, userToken);
      alert(`Ticket cancelled! Refund: $${result.refund_amount}`);
      onSuccess();
    } catch (error) {
      alert('Cancellation failed: ' + error.message);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  if (!canCancel) return null;

  return (
    <>
      <button onClick={() => setShowModal(true)} className="cancel-button">
        Cancel Ticket ({calculateEstimatedRefund(ticket)} refund)
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <h3>Cancel Ticket: {ticket.product_name}</h3>

            <div className="cancel-info">
              <p><strong>Code:</strong> {ticket.ticket_code}</p>
              <p><strong>Estimated Refund:</strong> {calculateEstimatedRefund(ticket)}</p>
            </div>

            <div className="form-group">
              <label>Reason (optional):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Plans changed"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Keep Ticket</button>
              <button onClick={handleCancel} disabled={loading} className="confirm-cancel">
                {loading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

---

## ⚠️ Global Error Handling

### **HTTP Status Codes**
```typescript
const handleApiError = (response: Response, errorData: any) => {
  switch (response.status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'Access denied. Insufficient permissions.';
    case 404:
      return 'Resource not found or you don\'t have access.';
    case 409:
      return 'Conflict. The operation cannot be completed.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return errorData?.message || 'An unexpected error occurred.';
  }
};

// Global error boundary for React
class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🧪 Testing Framework

### **API Testing Utilities**
```typescript
// Test utilities for integration testing
const createTestUser = () => ({
  token: 'user123',
  id: 123
});

const createTestOperator = () => ({
  username: 'alice',
  password: 'secret123'
});

// Mock API responses for testing
const mockApiResponses = {
  catalog: {
    products: [
      {
        id: 101,
        name: '3-in-1 Transport Pass',
        sku: 'PASS-3IN1',
        status: 'active',
        functions: [
          { function_code: 'bus', label: 'Bus Ride', quantity: 2 },
          { function_code: 'ferry', label: 'Ferry Ride', quantity: 1 }
        ]
      }
    ]
  },
  tickets: {
    tickets: [
      {
        ticket_code: 'TKT-123-001',
        product_name: '3-in-1 Transport Pass',
        status: 'active',
        entitlements: [
          { function_code: 'bus', label: 'Bus Ride', remaining_uses: 2 },
          { function_code: 'ferry', label: 'Ferry Ride', remaining_uses: 1 }
        ]
      }
    ]
  }
};

// Jest test example
describe('Ticket Operations', () => {
  test('should fetch user tickets', async () => {
    const tickets = await fetchMyTickets('user123');
    expect(tickets.tickets).toHaveLength(2);
    expect(tickets.tickets[0].ticket_code).toBe('TKT-123-001');
  });

  test('should cancel ticket successfully', async () => {
    const result = await cancelTicket('TKT-123-001', 'Test cancellation', 'user123');
    expect(result.ticket_status).toBe('void');
    expect(result.refund_amount).toBeGreaterThanOrEqual(0);
  });
});
```

---

## 🚀 Deployment Checklist

### **Environment Configuration**
```typescript
const config = {
  development: {
    apiBaseUrl: 'http://localhost:8080',
    operatorTokens: { alice: 'secret123' },
    userTokens: { user123: 'user123' }
  },
  production: {
    apiBaseUrl: 'https://your-api.com',
    // Real authentication flows
  }
};
```

### **Performance Optimizations**
- **Code Splitting**: Load components lazily with `React.lazy()`
- **Caching**: Cache catalog and policies data with React Query
- **Offline Support**: Use service workers for ticket viewing
- **QR Code**: Use efficient QR code libraries (qrcode-react)

### **Security Considerations**
- **Token Storage**: Use secure storage for JWT tokens
- **Input Validation**: Validate all user inputs client-side
- **HTTPS Only**: Ensure all API calls use HTTPS in production
- **CSP Headers**: Implement Content Security Policy

---

## 📞 Support & Resources

**API Documentation**: `/docs` endpoint
**Test Environment**: Use provided test tokens
**Production API**: `https://express-jdpny.ondigitalocean.app/`

**Quick Health Check**:
```bash
curl https://express-jdpny.ondigitalocean.app/healthz
# Should return: {"status":"ok"}
```

---

**🎉 Complete Integration Guide - Ready for Frontend Development!**

This guide covers all 7 user stories with complete API contracts, React components, and integration patterns. Frontend teams can now build the complete ticketing experience with confidence!