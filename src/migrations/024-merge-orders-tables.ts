import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 024: 扩展 orders 表支持 OTA
 *
 * 变更内容：
 * 1. 修改 orders 表结构，添加 OTA 相关字段
 * 2. 修改 channel 列类型为 ENUM
 * 3. 修改 tickets 表，添加 order_no 列
 * 4. 添加查询索引
 */
export class MergeOrdersTables1734200000024 implements MigrationInterface {
  name = 'MergeOrdersTables1734200000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== Step 1: 修改 orders 表结构 ==========

    // 1.1 修改 channel 列类型（从 varchar 改为 enum）
    // 先添加新列
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN channel_new ENUM('direct', 'ota') NOT NULL DEFAULT 'direct' AFTER order_no
    `);

    // 迁移数据
    await queryRunner.query(`
      UPDATE orders SET channel_new = 'direct' WHERE channel = 'direct' OR channel IS NULL
    `);
    await queryRunner.query(`
      UPDATE orders SET channel_new = 'ota' WHERE channel = 'ota'
    `);

    // 删除旧列，重命名新列
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN channel`);
    await queryRunner.query(`ALTER TABLE orders CHANGE channel_new channel ENUM('direct', 'ota') NOT NULL DEFAULT 'direct'`);

    // 1.2 添加 OTA 相关字段
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN partner_id VARCHAR(50) NULL COMMENT 'OTA 合作伙伴 ID' AFTER user_id
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN confirmation_code VARCHAR(50) NULL COMMENT 'OTA 确认码' AFTER status
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN payment_reference VARCHAR(100) NULL COMMENT 'OTA 支付引用' AFTER confirmation_code
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN special_requests TEXT NULL COMMENT 'OTA 特殊请求' AFTER payment_reference
    `);

    // 1.3 修改 travel_date 允许为 NULL（OTA 订单可能没有出行日期）
    await queryRunner.query(`
      ALTER TABLE orders MODIFY COLUMN travel_date DATE NULL
    `);

    // 1.4 添加新索引
    await queryRunner.query(`CREATE INDEX idx_orders_channel ON orders (channel)`);
    await queryRunner.query(`CREATE INDEX idx_orders_partner_id ON orders (partner_id)`);
    await queryRunner.query(`CREATE INDEX idx_orders_partner_created ON orders (partner_id, created_at)`);

    // ========== Step 2: 修改 tickets 表 ==========

    // 2.1 添加 order_no 列
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN order_no VARCHAR(64) NULL COMMENT '订单号（业务标识）' AFTER order_id
    `);

    // 2.2 为已有的小程序订单填充 order_no
    await queryRunner.query(`
      UPDATE tickets t
      INNER JOIN orders o ON t.order_id = o.id
      SET t.order_no = o.order_no
      WHERE t.order_id IS NOT NULL AND t.channel = 'direct'
    `);

    // 2.3 添加 order_no 索引
    await queryRunner.query(`CREATE INDEX idx_tickets_order_no ON tickets (order_no)`);

    console.log('Migration 024: Orders table OTA extension completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========== Step 1: 恢复 tickets 表 ==========

    // 删除 order_no 列
    await queryRunner.query(`DROP INDEX idx_tickets_order_no ON tickets`);
    await queryRunner.query(`ALTER TABLE tickets DROP COLUMN order_no`);

    // ========== Step 2: 删除迁移的 OTA 订单 ==========

    await queryRunner.query(`DELETE FROM orders WHERE channel = 'ota'`);

    // ========== Step 3: 恢复 orders 表结构 ==========

    // 删除新添加的索引
    try {
      await queryRunner.query(`DROP INDEX idx_orders_channel ON orders`);
      await queryRunner.query(`DROP INDEX idx_orders_partner_id ON orders`);
      await queryRunner.query(`DROP INDEX idx_orders_partner_created ON orders`);
    } catch (e) {
      // 索引可能不存在
    }

    // 删除 OTA 相关字段
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN partner_id`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN confirmation_code`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN payment_reference`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN special_requests`);

    // 恢复 channel 列类型为 varchar
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN channel_old VARCHAR(20) NOT NULL DEFAULT 'direct' AFTER order_no
    `);
    await queryRunner.query(`UPDATE orders SET channel_old = channel`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN channel`);
    await queryRunner.query(`ALTER TABLE orders CHANGE channel_old channel VARCHAR(20) NOT NULL DEFAULT 'direct'`);

    // 恢复 travel_date 为 NOT NULL
    await queryRunner.query(`
      ALTER TABLE orders MODIFY COLUMN travel_date DATE NOT NULL
    `);

    console.log('Migration 024: Rollback completed');
  }
}
