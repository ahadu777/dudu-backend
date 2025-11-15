import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeBatchStatsIndexes1731486000000 implements MigrationInterface {
  name = 'OptimizeBatchStatsIndexes1731486000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Remove old columns that are no longer stored =====
    // These columns are now computed on-the-fly via JOIN queries
    // Note: MySQL doesn't support multiple DROP COLUMN IF EXISTS in one statement
    const columns = ['tickets_generated', 'tickets_activated', 'tickets_redeemed', 'total_revenue_realized'];
    for (const column of columns) {
      const checkColumn = await queryRunner.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ota_ticket_batches'
          AND COLUMN_NAME = '${column}'
      `);
      if (checkColumn.length > 0) {
        await queryRunner.query(`ALTER TABLE \`ota_ticket_batches\` DROP COLUMN \`${column}\``);
      }
    }

    // ===== Create optimized indexes for JOIN queries =====

    // 1. Composite index for batch statistics JOIN queries
    // Covers: batch_id, status (for filtering ACTIVE/REDEEMED tickets)
    const checkIndex1 = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_generated_tickets'
        AND INDEX_NAME = 'idx_tickets_batch_status'
    `);
    if (checkIndex1.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`idx_tickets_batch_status\`
        ON \`pre_generated_tickets\` (\`batch_id\`, \`status\`)
      `);
    }

    // 2. Note: Removed revenue index (ticket_price doesn't exist in table)
    // Revenue calculations use pricing_snapshot JSON from batch table

    // 3. Optimize partner-specific batch queries
    // For queries like: WHERE partner_id = ? ORDER BY created_at DESC
    const checkIndex2 = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ota_ticket_batches'
        AND INDEX_NAME = 'idx_batch_partner_created'
    `);
    if (checkIndex2.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`idx_batch_partner_created\`
        ON \`ota_ticket_batches\` (\`partner_id\`, \`created_at\` DESC)
      `);
    }

    // 4. Optimize reseller billing queries
    // For JSON_EXTRACT queries on reseller_metadata
    // Note: This creates a generated column + index for better performance
    const checkResellerNameCol = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ota_ticket_batches'
        AND COLUMN_NAME = 'reseller_name'
    `);
    if (checkResellerNameCol.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`ota_ticket_batches\`
        ADD COLUMN \`reseller_name\` VARCHAR(255) GENERATED ALWAYS AS
        (JSON_UNQUOTE(JSON_EXTRACT(\`reseller_metadata\`, '$.intended_reseller'))) VIRTUAL
      `);
    }

    const checkIndex3 = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ota_ticket_batches'
        AND INDEX_NAME = 'idx_batch_reseller_period'
    `);
    if (checkIndex3.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`idx_batch_reseller_period\`
        ON \`ota_ticket_batches\` (\`reseller_name\`, \`created_at\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX \`idx_batch_reseller_period\` ON \`ota_ticket_batches\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\` DROP COLUMN \`reseller_name\`
    `);

    await queryRunner.query(`
      DROP INDEX \`idx_batch_partner_created\` ON \`ota_ticket_batches\`
    `);

    await queryRunner.query(`
      DROP INDEX \`idx_tickets_batch_status\` ON \`pre_generated_tickets\`
    `);

    // Restore old columns (with default values)
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      ADD COLUMN \`tickets_generated\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`tickets_activated\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`tickets_redeemed\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`total_revenue_realized\` DECIMAL(10, 2) NOT NULL DEFAULT 0
    `);
  }
}
