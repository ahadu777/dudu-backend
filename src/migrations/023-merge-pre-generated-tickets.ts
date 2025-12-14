import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * 合并 pre_generated_tickets 到 tickets 表
 *
 * 变更内容：
 * 1. 扩展 tickets 表状态枚举（添加 PRE_GENERATED）
 * 2. 添加 OTA 专用字段（batch_id, partner_id 等）
 * 3. 修改 order_id 类型（INT → VARCHAR）兼容 OTA
 * 4. 迁移 pre_generated_tickets 数据
 * 5. 保留旧表备份
 */
export class MergePreGeneratedTickets1733500000000 implements MigrationInterface {
  name = 'MergePreGeneratedTickets1733500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Starting tickets table merge migration...');

    // ===== Step 1: 修改 tickets 表结构 =====
    console.log('Step 1: Modifying tickets table structure...');

    // 1.1 扩展状态枚举（添加 PRE_GENERATED）
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`status\` ENUM(
        'PRE_GENERATED', 'PENDING_PAYMENT', 'ACTIVATED',
        'RESERVED', 'VERIFIED', 'EXPIRED', 'CANCELLED'
      ) NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

    // 1.2 修改 ticket_code 长度（50 → 100）
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`ticket_code\` VARCHAR(100) NOT NULL
    `);

    // 1.3 修改 order_id 类型（INT → VARCHAR），允许 NULL
    // 先创建临时列
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      ADD COLUMN \`order_id_new\` VARCHAR(50) NULL AFTER \`ticket_code\`
    `);

    // 迁移现有数据
    await queryRunner.query(`
      UPDATE \`tickets\` SET \`order_id_new\` = CAST(\`order_id\` AS CHAR)
    `);

    // 删除旧列，重命名新列
    await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`order_id\``);
    await queryRunner.query(`ALTER TABLE \`tickets\` CHANGE \`order_id_new\` \`order_id\` VARCHAR(50) NULL`);

    // 1.4 修改 orq 允许 NULL（OTA 票券无此字段）
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`orq\` INT NULL COMMENT 'Organization ID (NULL for OTA tickets)'
    `);

    // ===== Step 2: 添加 OTA 专用字段 =====
    console.log('Step 2: Adding OTA-specific columns...');

    await queryRunner.addColumns('tickets', [
      new TableColumn({
        name: 'batch_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'OTA 批次 ID',
      }),
      new TableColumn({
        name: 'partner_id',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: 'OTA 合作伙伴 ID',
      }),
      new TableColumn({
        name: 'payment_reference',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: '支付引用号',
      }),
      new TableColumn({
        name: 'distribution_mode',
        type: 'enum',
        enum: ['direct_sale', 'reseller_batch'],
        isNullable: true,
        comment: '销售模式：direct_sale=直销, reseller_batch=分销',
      }),
      new TableColumn({
        name: 'reseller_name',
        type: 'varchar',
        length: '200',
        isNullable: true,
        comment: '分销商名称',
      }),
      new TableColumn({
        name: 'raw',
        type: 'json',
        isNullable: true,
        comment: 'QR 码审计元数据（jti, issued_at 等）',
      }),
    ]);

    // ===== Step 3: 添加索引 =====
    console.log('Step 3: Creating indexes...');

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_BATCH_ID',
        columnNames: ['batch_id'],
      }),
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_PARTNER_ID',
        columnNames: ['partner_id'],
      }),
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_PARTNER_STATUS',
        columnNames: ['partner_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_CHANNEL',
        columnNames: ['channel'],
      }),
    );

    // ===== Step 4: 迁移 pre_generated_tickets 数据 =====
    console.log('Step 4: Migrating data from pre_generated_tickets...');

    // 检查源表是否存在
    const tableExists = await queryRunner.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'pre_generated_tickets'
    `);

    if (tableExists[0].count > 0) {
      // 获取迁移前行数
      const beforeCount = await queryRunner.query(`SELECT COUNT(*) as count FROM pre_generated_tickets`);
      console.log(`  Found ${beforeCount[0].count} tickets to migrate`);

      // 状态映射：ACTIVE → ACTIVATED, USED → VERIFIED
      await queryRunner.query(`
        INSERT INTO tickets (
          ticket_code, product_id, status, channel,
          order_id, batch_id, partner_id, payment_reference,
          distribution_mode, reseller_name,
          customer_name, customer_email, customer_phone, customer_type,
          qr_code, entitlements, ticket_price,
          raw, activated_at, created_at, updated_at
        )
        SELECT
          ticket_code, product_id,
          CASE status
            WHEN 'ACTIVE' THEN 'ACTIVATED'
            WHEN 'USED' THEN 'VERIFIED'
            ELSE status
          END as status,
          'ota' as channel,
          order_id, batch_id, partner_id, payment_reference,
          distribution_mode, reseller_name,
          customer_name, customer_email, customer_phone, customer_type,
          qr_code, entitlements, ticket_price,
          raw, activated_at, created_at, updated_at
        FROM pre_generated_tickets
      `);

      // 验证迁移
      const afterCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM tickets WHERE channel = 'ota'
      `);
      console.log(`  Migrated ${afterCount[0].count} OTA tickets`);

      // NOTE: 暂不删除/重命名旧表，因为部分代码仍在引用 PreGeneratedTicketEntity
      // TODO: 完成代码迁移后，手动执行：
      //   DROP TABLE pre_generated_tickets;
      // 或
      //   RENAME TABLE pre_generated_tickets TO pre_generated_tickets_backup;
      console.log('  ⚠️  pre_generated_tickets table kept for backward compatibility');
    } else {
      console.log('  No pre_generated_tickets table found, skipping data migration');
    }

    console.log('✅ Tickets table merge completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back tickets table merge...');

    // ===== Step 1: 删除迁移的 OTA 数据 =====
    // NOTE: pre_generated_tickets 表保持不变，只需删除 tickets 表中的 OTA 数据
    await queryRunner.query(`DELETE FROM tickets WHERE channel = 'ota'`);

    // ===== Step 2: 删除索引 =====
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_BATCH_ID');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_PARTNER_ID');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_PARTNER_STATUS');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_CHANNEL');

    // ===== Step 3: 删除 OTA 专用字段 =====
    await queryRunner.dropColumns('tickets', [
      'batch_id',
      'partner_id',
      'payment_reference',
      'distribution_mode',
      'reseller_name',
      'raw',
    ]);

    // ===== Step 4: 恢复 order_id 类型为 INT =====
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      ADD COLUMN \`order_id_int\` INT NULL AFTER \`ticket_code\`
    `);
    await queryRunner.query(`
      UPDATE \`tickets\` SET \`order_id_int\` = CAST(\`order_id\` AS SIGNED)
      WHERE \`order_id\` REGEXP '^[0-9]+$'
    `);
    await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`order_id\``);
    await queryRunner.query(`ALTER TABLE \`tickets\` CHANGE \`order_id_int\` \`order_id\` INT NOT NULL`);

    // ===== Step 5: 恢复 orq 为 NOT NULL =====
    await queryRunner.query(`
      UPDATE \`tickets\` SET \`orq\` = 1 WHERE \`orq\` IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`orq\` INT NOT NULL COMMENT 'Organization ID'
    `);

    // ===== Step 6: 恢复状态枚举 =====
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`status\` ENUM(
        'PENDING_PAYMENT', 'ACTIVATED', 'RESERVED',
        'VERIFIED', 'EXPIRED', 'CANCELLED'
      ) NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

    // ===== Step 7: 恢复 ticket_code 长度 =====
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`ticket_code\` VARCHAR(50) NOT NULL
    `);

    console.log('✅ Rollback completed');
  }
}
