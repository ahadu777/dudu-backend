-- Migration 0003: Add partner_id to OTA entities for multi-partner support
-- Description: Adds partner_id column to ota_orders and pre_generated_tickets tables for partner isolation

-- Add partner_id to ota_orders table
ALTER TABLE ota_orders
ADD COLUMN partner_id VARCHAR(50) NOT NULL DEFAULT 'test_partner';

-- Add partner_id to pre_generated_tickets table
ALTER TABLE pre_generated_tickets
ADD COLUMN partner_id VARCHAR(50) NOT NULL DEFAULT 'test_partner';

-- Add indexes for performance
CREATE INDEX idx_ota_orders_partner_id ON ota_orders(partner_id);
CREATE INDEX idx_ota_orders_partner_created ON ota_orders(partner_id, created_at);
CREATE INDEX idx_pre_generated_tickets_partner_id ON pre_generated_tickets(partner_id);
CREATE INDEX idx_pre_generated_tickets_partner_status ON pre_generated_tickets(partner_id, status);

-- Update existing records to use test_partner (for backward compatibility)
UPDATE ota_orders SET partner_id = 'test_partner' WHERE partner_id = 'test_partner';
UPDATE pre_generated_tickets SET partner_id = 'test_partner' WHERE partner_id = 'test_partner';