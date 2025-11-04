import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateOTAPreMadeTickets1699372800005 implements MigrationInterface {
  name = 'CreateOTAPreMadeTickets1699372800005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pre_generated_tickets table
    await queryRunner.createTable(
      new Table({
        name: 'pre_generated_tickets',
        columns: [
          {
            name: 'ticket_code',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'product_id',
            type: 'int',
          },
          {
            name: 'batch_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PRE_GENERATED', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
            default: "'PRE_GENERATED'",
          },
          {
            name: 'qr_code',
            type: 'text',
          },
          {
            name: 'entitlements',
            type: 'json',
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'customer_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'customer_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'order_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payment_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'activated_at',
            type: 'timestamp',
            isNullable: true,
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

    // Create ota_orders table
    await queryRunner.createTable(
      new Table({
        name: 'ota_orders',
        columns: [
          {
            name: 'order_id',
            type: 'varchar',
            length: '50',
            isPrimary: true,
          },
          {
            name: 'product_id',
            type: 'int',
          },
          {
            name: 'channel_id',
            type: 'int',
            default: 2, // OTA channel
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'customer_email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'customer_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'payment_reference',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
            default: "'confirmed'",
          },
          {
            name: 'confirmation_code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'special_requests',
            type: 'text',
            isNullable: true,
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

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX IDX_pre_generated_tickets_batch_id ON pre_generated_tickets (batch_id)`);
    await queryRunner.query(`CREATE INDEX IDX_pre_generated_tickets_product_id ON pre_generated_tickets (product_id)`);
    await queryRunner.query(`CREATE INDEX IDX_pre_generated_tickets_status ON pre_generated_tickets (status)`);
    await queryRunner.query(`CREATE INDEX IDX_pre_generated_tickets_customer_email ON pre_generated_tickets (customer_email)`);

    await queryRunner.query(`CREATE INDEX IDX_ota_orders_customer_email ON ota_orders (customer_email)`);
    await queryRunner.query(`CREATE INDEX IDX_ota_orders_payment_reference ON ota_orders (payment_reference)`);
    await queryRunner.query(`CREATE INDEX IDX_ota_orders_status ON ota_orders (status)`);
    await queryRunner.query(`CREATE INDEX IDX_ota_orders_created_at ON ota_orders (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IDX_ota_orders_created_at ON ota_orders`);
    await queryRunner.query(`DROP INDEX IDX_ota_orders_status ON ota_orders`);
    await queryRunner.query(`DROP INDEX IDX_ota_orders_payment_reference ON ota_orders`);
    await queryRunner.query(`DROP INDEX IDX_ota_orders_customer_email ON ota_orders`);

    await queryRunner.query(`DROP INDEX IDX_pre_generated_tickets_customer_email ON pre_generated_tickets`);
    await queryRunner.query(`DROP INDEX IDX_pre_generated_tickets_status ON pre_generated_tickets`);
    await queryRunner.query(`DROP INDEX IDX_pre_generated_tickets_product_id ON pre_generated_tickets`);
    await queryRunner.query(`DROP INDEX IDX_pre_generated_tickets_batch_id ON pre_generated_tickets`);

    // Drop tables
    await queryRunner.dropTable('ota_orders');
    await queryRunner.dropTable('pre_generated_tickets');
  }
}