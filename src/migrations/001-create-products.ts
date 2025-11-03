import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProducts1699372800001 implements MigrationInterface {
  name = 'CreateProducts1699372800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'base_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'weekend_premium',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'customer_discounts',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive'],
            default: "'active'",
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'entitlements',
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

    await queryRunner.query(`CREATE INDEX IDX_PRODUCTS_STATUS ON products (status)`);
    await queryRunner.query(`CREATE INDEX IDX_PRODUCTS_CATEGORY ON products (category)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('products');
  }
}