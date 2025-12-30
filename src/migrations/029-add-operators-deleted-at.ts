import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 029: Add deleted_at column to operators table for soft delete
 *
 * Changes:
 * - Add deleted_at timestamp column for soft delete support
 *
 * Purpose:
 * - Enable proper soft delete for operators (vs just DISABLED status)
 * - Distinguish between "disabled" (can be re-enabled) and "deleted" (soft-deleted)
 * - TypeORM @DeleteDateColumn() support
 */
export class AddOperatorsDeletedAt1735500000029 implements MigrationInterface {
  name = 'AddOperatorsDeletedAt1735500000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operators
      ADD COLUMN deleted_at TIMESTAMP NULL
      COMMENT 'Soft delete timestamp'
    `);

    console.log('Migration 029: Added deleted_at column to operators table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operators DROP COLUMN deleted_at
    `);

    console.log('Migration 029: Removed deleted_at column from operators table');
  }
}
