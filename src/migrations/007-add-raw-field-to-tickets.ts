import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add Raw JSON Field to Pre-Generated Tickets
 *
 * Purpose:
 * - Add flexible metadata storage to tickets
 * - Support future extensibility without schema changes
 *
 * Changes:
 * - Add raw JSON NULL (flexible metadata storage)
 */
export class AddRawFieldToTickets1736064000007 implements MigrationInterface {
  name = 'AddRawFieldToTickets1736064000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add raw JSON column for flexible metadata storage
    await queryRunner.addColumn(
      'pre_generated_tickets',
      new TableColumn({
        name: 'raw',
        type: 'json',
        isNullable: true,
        comment: 'Flexible metadata storage (customer preferences, device info, etc.)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop raw column
    await queryRunner.dropColumn('pre_generated_tickets', 'raw');
  }
}
