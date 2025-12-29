import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Migration: Add deleted_at and partner_id Columns to Venues Table
 *
 * Changes:
 * - Add deleted_at DATETIME NULL (TypeORM soft delete)
 * - Add partner_id VARCHAR(50) NULL (OTA partner ownership)
 * - Add indexes for both columns
 */
export class AddDeletedAtAndPartnerIdToVenues1736064000019 implements MigrationInterface {
  name = 'AddDeletedAtAndPartnerIdToVenues1736064000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: 如果 venues 表是通过 Migration 007 创建的，这些字段已经存在
    // 此 Migration 仅用于从旧版本升级的兼容性

    // 检查 deleted_at 列是否存在
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'venues'
        AND COLUMN_NAME = 'deleted_at'
    `);

    if (columns.length > 0) {
      console.log('Migration 019: deleted_at and partner_id already exist, skipping');
      return;
    }

    // 1. Add deleted_at column for soft delete
    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'deleted_at',
        type: 'datetime',
        isNullable: true,
        comment: 'Soft delete timestamp - NULL means not deleted',
      }),
    );

    // 2. Add partner_id column for OTA ownership
    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'partner_id',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: 'OTA partner ID who created/owns this venue',
      }),
    );

    // 3. Create indexes
    await queryRunner.createIndex(
      'venues',
      new TableIndex({
        name: 'idx_venues_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );

    await queryRunner.createIndex(
      'venues',
      new TableIndex({
        name: 'idx_venues_partner_id',
        columnNames: ['partner_id'],
      }),
    );

    console.log('Migration 019: Added deleted_at and partner_id to venues table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('venues', 'idx_venues_partner_id');
    await queryRunner.dropIndex('venues', 'idx_venues_deleted_at');
    await queryRunner.dropColumn('venues', 'partner_id');
    await queryRunner.dropColumn('venues', 'deleted_at');
  }
}
