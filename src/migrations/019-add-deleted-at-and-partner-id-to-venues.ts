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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('venues', 'idx_venues_partner_id');
    await queryRunner.dropIndex('venues', 'idx_venues_deleted_at');
    await queryRunner.dropColumn('venues', 'partner_id');
    await queryRunner.dropColumn('venues', 'deleted_at');
  }
}
