import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateOTATicketBatches1699371000000 implements MigrationInterface {
  name = 'CreateOTATicketBatches1699371000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ota_ticket_batches',
        columns: [
          {
            name: 'batch_id',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'partner_id',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'product_id',
            type: 'int',
          },
          {
            name: 'total_quantity',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'distribution_mode',
            type: 'enum',
            enum: ['direct_sale', 'reseller_batch'],
            default: "'direct_sale'",
          },
          {
            name: 'pricing_snapshot',
            type: 'json',
          },
          {
            name: 'reseller_metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'batch_metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'cancelled'],
            default: "'active'",
          },
          {
            name: 'tickets_generated',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'tickets_activated',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'tickets_redeemed',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'total_revenue_realized',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for optimal query performance
    await queryRunner.query(`
      CREATE INDEX idx_partner_product ON ota_ticket_batches (partner_id, product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_status_expires ON ota_ticket_batches (status, expires_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_distribution_mode ON ota_ticket_batches (distribution_mode)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_created_at ON ota_ticket_batches (created_at)
    `);

    // Index for campaign analytics - using JSON column expression with CAST
    await queryRunner.query(`
      CREATE INDEX idx_campaign_type
      ON ota_ticket_batches ((CAST(JSON_UNQUOTE(JSON_EXTRACT(batch_metadata, '$.campaign_type')) AS CHAR(50))))
    `);

    // Add foreign key constraint to products table
    await queryRunner.query(`
      ALTER TABLE ota_ticket_batches
      ADD CONSTRAINT fk_batch_product
      FOREIGN KEY (product_id) REFERENCES products(id)
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    await queryRunner.query(`
      ALTER TABLE ota_ticket_batches
      DROP FOREIGN KEY fk_batch_product
    `);

    // Drop campaign index
    await queryRunner.query(`DROP INDEX idx_campaign_type ON ota_ticket_batches`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_partner_product ON ota_ticket_batches`);
    await queryRunner.query(`DROP INDEX idx_status_expires ON ota_ticket_batches`);
    await queryRunner.query(`DROP INDEX idx_distribution_mode ON ota_ticket_batches`);
    await queryRunner.query(`DROP INDEX idx_created_at ON ota_ticket_batches`);

    // Drop table
    await queryRunner.dropTable('ota_ticket_batches');
  }
}