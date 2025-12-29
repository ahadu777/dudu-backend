import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Migration 023: 扩展 tickets 表支持 OTA
 *
 * 变更内容：
 * 1. 扩展 tickets 表状态枚举（添加 PRE_GENERATED）
 * 2. 添加 OTA 专用字段（batch_id, partner_id 等）
 * 3. 修改 order_id 类型（INT → BIGINT）
 * 4. 添加 OTA 查询索引
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

    // 1.3 修改 order_id 类型（INT → BIGINT），允许 NULL
    // 与 Entity 定义保持一致：order_id 是外键关联 orders.id (BIGINT)
    // order_no 字段用于存储业务订单号字符串
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`order_id\` BIGINT NULL COMMENT '订单ID（外键）'
    `);

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

    // 与 Entity 一致的复合索引
    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_BATCH_CHANNEL',
        columnNames: ['batch_id', 'channel'],
      }),
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_PARTNER_CREATED',
        columnNames: ['partner_id', 'created_at'],
      }),
    );

    console.log('✅ Tickets table OTA extension completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back tickets table OTA extension...');

    // 删除 OTA 数据
    await queryRunner.query(`DELETE FROM tickets WHERE channel = 'ota'`);

    // 删除索引
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_BATCH_ID');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_PARTNER_ID');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_PARTNER_STATUS');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_CHANNEL');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_BATCH_CHANNEL');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_PARTNER_CREATED');

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
      MODIFY COLUMN \`order_id\` INT NOT NULL COMMENT '订单ID'
    `);

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
