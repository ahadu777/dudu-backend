import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 028: Add OTA operator fields to operators table
 *
 * Changes:
 * 1. Add partner_id column - links operator to OTA partner
 * 2. Add operator_type column - distinguishes INTERNAL vs OTA operators
 * 3. Add index on partner_id for efficient filtering
 *
 * Purpose:
 * - Enable OTA platforms to create their own verification operators
 * - Scope isolation: OTA operators can only redeem their OTA's tickets
 * - Venue filtering: OTA operators only see their OTA's venues
 */
export class AddOtaOperatorFields1735500000028 implements MigrationInterface {
  name = 'AddOtaOperatorFields1735500000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add partner_id column
    await queryRunner.query(`
      ALTER TABLE operators
      ADD COLUMN partner_id VARCHAR(50) NULL AFTER merchant_id
      COMMENT 'OTA partner identifier (null for INTERNAL operators)'
    `);

    // Add operator_type column
    await queryRunner.query(`
      ALTER TABLE operators
      ADD COLUMN operator_type ENUM('INTERNAL', 'OTA') NOT NULL DEFAULT 'INTERNAL' AFTER status
      COMMENT 'Operator type: INTERNAL (system admin) or OTA (platform operator)'
    `);

    // Add index for partner_id filtering
    await queryRunner.query(`
      CREATE INDEX idx_operators_partner_id ON operators (partner_id)
    `);

    console.log('Migration 028: Added partner_id and operator_type fields to operators table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`DROP INDEX idx_operators_partner_id ON operators`);

    // Remove columns
    await queryRunner.query(`ALTER TABLE operators DROP COLUMN operator_type`);
    await queryRunner.query(`ALTER TABLE operators DROP COLUMN partner_id`);

    console.log('Migration 028: Removed partner_id and operator_type fields from operators table');
  }
}
