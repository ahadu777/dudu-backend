import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInitialData1699372800004 implements MigrationInterface {
  name = 'SeedInitialData1699372800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert products (matching mock data structure)
    await queryRunner.query(`
      INSERT INTO products (id, name, description, base_price, weekend_premium, customer_discounts, status, category, entitlements) VALUES
      (106, 'Premium Cruise Package (5 Days)', 'Premium 5-day cruise experience with luxury accommodations and dining', 288.00, 30.00, '{"child": 100, "elderly": 50, "student": 50}', 'active', 'cruise', '[{"type": "accommodation", "description": "Premium cabin accommodation"}, {"type": "dining", "description": "All-you-can-eat dining access"}, {"type": "entertainment", "description": "Live shows and entertainment"}]'),
      (107, 'Family Cruise Package (7 Days)', 'Family-friendly 7-day cruise with activities for all ages', 388.00, 40.00, '{"child": 150, "elderly": 75, "family": 100}', 'active', 'cruise', '[{"type": "accommodation", "description": "Family cabin accommodation"}, {"type": "dining", "description": "Family dining package"}, {"type": "activities", "description": "Family activities and kids club"}]'),
      (108, 'Luxury Cruise Package (10 Days)', 'Ultra-luxury 10-day cruise with exclusive amenities', 688.00, 80.00, '{"elderly": 100, "vip": 200}', 'active', 'cruise', '[{"type": "accommodation", "description": "Luxury suite accommodation"}, {"type": "dining", "description": "Fine dining and premium beverages"}, {"type": "spa", "description": "Spa and wellness services"}, {"type": "concierge", "description": "Personal concierge service"}]'),
      (101, 'Day Trip Package', 'One-day excursion package', 88.00, 10.00, '{"child": 30, "student": 20}', 'active', 'excursion', '[{"type": "transport", "description": "Round-trip transportation"}, {"type": "lunch", "description": "Lunch included"}]'),
      (102, 'Weekend Getaway', 'Two-day weekend package', 188.00, 20.00, '{"child": 60, "elderly": 40}', 'active', 'weekend', '[{"type": "accommodation", "description": "Hotel accommodation"}, {"type": "breakfast", "description": "Continental breakfast"}]'),
      (103, 'Adventure Package', 'Three-day adventure experience', 288.00, 30.00, '{"student": 80, "group": 50}', 'active', 'adventure', '[{"type": "activities", "description": "Adventure activities"}, {"type": "equipment", "description": "All equipment provided"}]'),
      (104, 'Romantic Escape', 'Romantic couple package', 388.00, 50.00, '{"honeymoon": 100}', 'active', 'romantic', '[{"type": "accommodation", "description": "Romantic suite"}, {"type": "dining", "description": "Candlelight dinner"}]'),
      (105, 'Business Conference', 'Professional conference package', 488.00, 0.00, '{"corporate": 150, "bulk": 200}', 'inactive', 'business', '[{"type": "venue", "description": "Conference facilities"}, {"type": "catering", "description": "Business catering"}]')
    `);

    // Insert product inventory with channel allocations
    await queryRunner.query(`
      INSERT INTO product_inventory (product_id, sellable_cap, sold_count, channel_allocations) VALUES
      (106, 3000, 0, '{"direct": {"allocated": 1000, "reserved": 0, "sold": 0}, "ota": {"allocated": 2000, "reserved": 0, "sold": 0}}'),
      (107, 2000, 0, '{"direct": {"allocated": 500, "reserved": 0, "sold": 0}, "ota": {"allocated": 1500, "reserved": 0, "sold": 0}}'),
      (108, 1800, 0, '{"direct": {"allocated": 300, "reserved": 0, "sold": 0}, "ota": {"allocated": 1500, "reserved": 0, "sold": 0}}'),
      (101, 1000, 150, '{"direct": {"allocated": 850, "reserved": 0, "sold": 150}, "ota": {"allocated": 0, "reserved": 0, "sold": 0}}'),
      (102, 800, 50, '{"direct": {"allocated": 750, "reserved": 0, "sold": 50}, "ota": {"allocated": 0, "reserved": 0, "sold": 0}}'),
      (103, 600, 20, '{"direct": {"allocated": 580, "reserved": 0, "sold": 20}, "ota": {"allocated": 0, "reserved": 0, "sold": 0}}'),
      (104, 400, 10, '{"direct": {"allocated": 390, "reserved": 0, "sold": 10}, "ota": {"allocated": 0, "reserved": 0, "sold": 0}}'),
      (105, 200, 0, '{"direct": {"allocated": 200, "reserved": 0, "sold": 0}, "ota": {"allocated": 0, "reserved": 0, "sold": 0}}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM product_inventory`);
    await queryRunner.query(`DELETE FROM products`);
  }
}