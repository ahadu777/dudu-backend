import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrlToProducts1733900000025 implements MigrationInterface {
  name = 'AddImageUrlToProducts1733900000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image_url column to products table
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN image_url VARCHAR(500) NULL
      COMMENT '商品展示图片URL'
    `);

    console.log('✅ Added image_url column to products table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN image_url
    `);

    console.log('✅ Removed image_url column from products table');
  }
}
