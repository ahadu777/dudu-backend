-- Orders migration with idempotency support
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  out_trade_no VARCHAR(64) NOT NULL,
  channel_id INT NOT NULL,
  status ENUM('PENDING_PAYMENT','PAID','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payload_hash VARCHAR(64) NOT NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_out_trade (user_id, out_trade_no),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_items (order_id)
);