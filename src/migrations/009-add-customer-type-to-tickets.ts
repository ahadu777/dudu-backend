import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add Customer Type Field to Pre-Generated Tickets
 *
 * Purpose:
 * - Support customer type pricing (adult/child/elderly)
 * - Enable ticket activation with customer type selection
 *
 * Changes:
 * - Add customer_type ENUM column with values: 'adult', 'child', 'elderly'
 */
export class AddCustomerTypeToTickets1736065000009 implements MigrationInterface {
  name = 'AddCustomerTypeToTickets1736065000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add customer_type column
    await queryRunner.addColumn(
      'pre_generated_tickets',
      new TableColumn({
        name: 'customer_type',
        type: 'enum',
        enum: ['adult', 'child', 'elderly'],
        isNullable: true,
        comment: 'Customer type for pricing (adult/child/elderly)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop customer_type column
    await queryRunner.dropColumn('pre_generated_tickets', 'customer_type');
  }
}
