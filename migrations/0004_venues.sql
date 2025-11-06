-- Migration: Create venues table and seed initial venue data
-- PRD-003: Event Venue Operations
-- Date: 2025-11-06

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  venue_code VARCHAR(100) UNIQUE NOT NULL COMMENT 'Unique venue identifier (central-pier, cheung-chau, etc.)',
  venue_name VARCHAR(200) NOT NULL COMMENT 'Display name for venue',
  venue_type VARCHAR(50) NOT NULL COMMENT 'Type of venue (ferry_terminal, gift_shop, playground)',
  supported_functions JSON COMMENT 'Array of function codes supported by this venue',
  location_address VARCHAR(200) COMMENT 'Physical address of venue',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether venue is currently active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_venue_code (venue_code),
  INDEX idx_venue_type (venue_type),
  INDEX idx_venue_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Venue locations for PRD-003 operations';

-- Seed initial venue data
INSERT INTO venues (venue_code, venue_name, venue_type, supported_functions, location_address, is_active) VALUES
('central-pier', 'Central Pier Terminal', 'ferry_terminal', '["ferry_boarding"]', 'Central, Hong Kong', TRUE),
('cheung-chau', 'Cheung Chau Terminal', 'ferry_terminal', '["ferry_boarding", "gift_redemption", "playground_token"]', 'Cheung Chau, Hong Kong', TRUE),
('gift-shop-central', 'Central Pier Gift Shop', 'gift_shop', '["gift_redemption"]', 'Central Pier Terminal, Central, Hong Kong', TRUE),
('playground-cc', 'Cheung Chau Playground', 'playground', '["playground_token"]', 'Cheung Chau, Hong Kong', TRUE)
ON DUPLICATE KEY UPDATE
  venue_name = VALUES(venue_name),
  venue_type = VALUES(venue_type),
  supported_functions = VALUES(supported_functions),
  location_address = VALUES(location_address),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS venues;


