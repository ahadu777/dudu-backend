import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProductInventory1699372800002 implements MigrationInterface {
  name = 'CreateProductInventory1699372800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'product_inventory',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'product_id',
            type: 'int',
          },
          {
            name: 'sellable_cap',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'sold_count',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'channel_allocations',
            type: 'json',
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

    await queryRunner.query(`CREATE INDEX IDX_PRODUCT_INVENTORY_PRODUCT_ID ON product_inventory (product_id)`);

    await queryRunner.query(`
      ALTER TABLE product_inventory
      ADD CONSTRAINT FK_PRODUCT_INVENTORY_PRODUCT
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('product_inventory');
    if (table) {
      const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('product_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('product_inventory', foreignKey);
      }
    }
    await queryRunner.dropTable('product_inventory');
  }
}