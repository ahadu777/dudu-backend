import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateChannelReservations1699372800003 implements MigrationInterface {
  name = 'CreateChannelReservations1699372800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'channel_reservations',
        columns: [
          {
            name: 'reservation_id',
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
            type: 'varchar',
            length: '20',
            default: "'ota'",
          },
          {
            name: 'quantity',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'activated', 'cancelled'],
            default: "'active'",
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'activated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'order_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'pricing_snapshot',
            type: 'json',
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
      true,
    );

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX IDX_RESERVATIONS_STATUS_EXPIRES ON channel_reservations (status, expires_at)`);
    await queryRunner.query(`CREATE INDEX IDX_RESERVATIONS_PRODUCT_CHANNEL ON channel_reservations (product_id, channel_id)`);
    await queryRunner.query(`CREATE INDEX IDX_RESERVATIONS_EXPIRY ON channel_reservations (expires_at, status)`);

    // Create foreign key to products table
    await queryRunner.query(`
      ALTER TABLE channel_reservations
      ADD CONSTRAINT FK_CHANNEL_RESERVATIONS_PRODUCT
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('channel_reservations');
    if (table) {
      const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('product_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('channel_reservations', foreignKey);
      }
    }
    await queryRunner.dropTable('channel_reservations');
  }
}