import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 010: 优化 ota_ticket_batches 表索引
 *
 * 变更内容：
 * 1. 删除废弃的统计字段（现在通过 JOIN 计算）
 * 2. 添加 partner 查询索引
 * 3. 添加 reseller 查询索引
 */
export class OptimizeBatchStatsIndexes1731486000000 implements MigrationInterface {
  name = 'OptimizeBatchStatsIndexes1731486000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 删除废弃的统计字段 =====
    // 这些字段现在通过 JOIN 查询实时计算
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

    // ===== 创建优化索引 =====

    // 1. Partner 查询索引
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
    // 删除索引
    try {
      await queryRunner.query(`DROP INDEX \`idx_batch_reseller_period\` ON \`ota_ticket_batches\``);
    } catch (e) {
      // 索引可能不存在
    }

    try {
      await queryRunner.query(`ALTER TABLE \`ota_ticket_batches\` DROP COLUMN \`reseller_name\``);
    } catch (e) {
      // 列可能不存在
    }

    try {
      await queryRunner.query(`DROP INDEX \`idx_batch_partner_created\` ON \`ota_ticket_batches\``);
    } catch (e) {
      // 索引可能不存在
    }

    // 恢复废弃的统计字段
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      ADD COLUMN \`tickets_generated\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`tickets_activated\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`tickets_redeemed\` INT UNSIGNED NOT NULL DEFAULT 0,
      ADD COLUMN \`total_revenue_realized\` DECIMAL(10, 2) NOT NULL DEFAULT 0
    `);
  }
}
