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

    // Add qr_config column (与 Entity 一致)
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN qr_config JSON NULL
      COMMENT 'QR码配置 {dark_color, light_color, logo_url}'
    `);

    console.log('✅ Added image_url and qr_config columns to products table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN qr_config
    `);

    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN image_url
    `);

    console.log('✅ Removed image_url and qr_config columns from products table');
  }
}
