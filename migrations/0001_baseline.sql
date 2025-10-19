-- Baseline migration: Products and inventory
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_functions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  function_code VARCHAR(100) NOT NULL,
  function_name VARCHAR(255) NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_product_function (product_id, function_code)
);

CREATE TABLE IF NOT EXISTS product_inventory (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL UNIQUE,
  sellable_cap INT NOT NULL DEFAULT 0,
  reserved_count INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_inventory CHECK (reserved_count >= 0 AND sold_count >= 0)
);

-- Seed data for testing
INSERT INTO products (id, sku, name, description, unit_price, active) VALUES
  (101, 'DAYPASS-001', 'Day Pass', 'Full day access to all attractions', 99.00, true)
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO product_functions (product_id, function_code, function_name, max_uses) VALUES
  (101, 'ENTRY', 'Park Entry', 1),
  (101, 'FASTPASS', 'Fast Pass Access', 3)
ON DUPLICATE KEY UPDATE function_name=function_name;

INSERT INTO product_inventory (product_id, sellable_cap, reserved_count, sold_count) VALUES
  (101, 1000, 0, 0)
ON DUPLICATE KEY UPDATE sellable_cap=1000;