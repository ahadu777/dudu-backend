import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add customer_name to ticket_reservations
 *
 * This allows storing customer name at reservation time.
 * The field is optional - if not provided, the system will
 * cascade lookup from tickets/pre_generated_tickets/orders.
 */
export class AddCustomerNameToReservations1733500022000 implements MigrationInterface {
  name = 'AddCustomerNameToReservations1733500022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add customer_name column (optional)
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD COLUMN \`customer_name\` VARCHAR(100) NULL COMMENT '客户姓名（可选，级联查询时使用）'
      AFTER \`customer_phone\`
    `);

    console.log('Migration 022: Added customer_name column to ticket_reservations');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      DROP COLUMN \`customer_name\`
    `);

    console.log('Migration 022: Removed customer_name column from ticket_reservations');
  }
}
