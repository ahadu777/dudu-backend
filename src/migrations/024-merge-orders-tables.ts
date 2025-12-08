import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 024: 合并 orders 和 ota_orders 表
 *
 * 变更内容：
 * 1. 修改 orders 表结构，添加 OTA 相关字段
 * 2. 修改 channel 列类型为 ENUM
 * 3. 迁移 ota_orders 数据到 orders 表
 * 4. 修改 tickets 表，添加 order_no 列，迁移 ota_order_id 数据
 * 5. 删除 tickets 表的 ota_order_id 列
 * 6. 备份并删除 ota_orders 表
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

    // ========== Step 2: 迁移 ota_orders 数据到 orders 表 ==========

    // 检查 ota_orders 表是否存在
    const tableExists = await queryRunner.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'ota_orders'
    `);

    if (tableExists[0].count > 0) {
      // 迁移 OTA 订单数据
      await queryRunner.query(`
        INSERT INTO orders (
          order_no,
          channel,
          user_id,
          partner_id,
          contact_name,
          contact_phone,
          contact_email,
          order_type,
          product_id,
          quantity,
          total,
          status,
          confirmation_code,
          payment_reference,
          special_requests,
          created_at,
          updated_at
        )
        SELECT
          order_id as order_no,
          'ota' as channel,
          NULL as user_id,
          partner_id,
          customer_name as contact_name,
          customer_phone as contact_phone,
          customer_email as contact_email,
          'package' as order_type,
          product_id,
          1 as quantity,
          total_amount as total,
          status,
          confirmation_code,
          payment_reference,
          special_requests,
          created_at,
          updated_at
        FROM ota_orders
      `);

      console.log('OTA orders migrated to unified orders table');
    }

    // ========== Step 3: 修改 tickets 表 ==========

    // 3.1 添加 order_no 列
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN order_no VARCHAR(64) NULL COMMENT '订单号（业务标识）' AFTER order_id
    `);

    // 3.2 为已有的小程序订单填充 order_no
    await queryRunner.query(`
      UPDATE tickets t
      INNER JOIN orders o ON t.order_id = o.id
      SET t.order_no = o.order_no
      WHERE t.order_id IS NOT NULL AND t.channel = 'direct'
    `);

    // 3.3 迁移 OTA 票券的订单关联
    // 先把 ota_order_id 存到 order_no
    const otaOrderIdExists = await queryRunner.query(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tickets'
        AND column_name = 'ota_order_id'
    `);

    if (otaOrderIdExists[0].count > 0) {
      await queryRunner.query(`
        UPDATE tickets
        SET order_no = ota_order_id
        WHERE ota_order_id IS NOT NULL AND channel = 'ota'
      `);

      // 然后关联到新的 orders 表的 id
      await queryRunner.query(`
        UPDATE tickets t
        INNER JOIN orders o ON t.order_no = o.order_no AND o.channel = 'ota'
        SET t.order_id = o.id
        WHERE t.ota_order_id IS NOT NULL AND t.channel = 'ota'
      `);

      // 3.4 删除 ota_order_id 列
      // 先删除索引（如果存在）
      try {
        await queryRunner.query(`DROP INDEX idx_tickets_ota_order_id ON tickets`);
      } catch (e) {
        // 索引可能不存在，忽略错误
      }
      try {
        await queryRunner.query(`ALTER TABLE tickets DROP INDEX IDX_tickets_ota_order_id`);
      } catch (e) {
        // 索引可能不存在，忽略错误
      }

      await queryRunner.query(`ALTER TABLE tickets DROP COLUMN ota_order_id`);
    }

    // 3.5 添加 order_no 索引
    await queryRunner.query(`CREATE INDEX idx_tickets_order_no ON tickets (order_no)`);

    // ========== Step 4: 保留 ota_orders 表（不删除）==========
    // 原表保留作为历史数据参考，新代码使用统一的 orders 表

    console.log('Migration 024: Orders tables merged successfully');
    console.log('Note: ota_orders table is preserved for reference');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========== Step 1: 恢复 tickets 表 ==========

    // 添加回 ota_order_id 列
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN ota_order_id VARCHAR(50) NULL COMMENT 'OTA订单ID' AFTER order_id
    `);

    // 从 order_no 恢复 ota_order_id
    await queryRunner.query(`
      UPDATE tickets
      SET ota_order_id = order_no
      WHERE channel = 'ota' AND order_no IS NOT NULL
    `);

    // 清除 OTA 票券的 order_id（因为原来没有）
    await queryRunner.query(`
      UPDATE tickets
      SET order_id = NULL
      WHERE channel = 'ota'
    `);

    // 删除 order_no 列
    await queryRunner.query(`DROP INDEX idx_tickets_order_no ON tickets`);
    await queryRunner.query(`ALTER TABLE tickets DROP COLUMN order_no`);

    // 添加 ota_order_id 索引
    await queryRunner.query(`CREATE INDEX idx_tickets_ota_order_id ON tickets (ota_order_id)`);

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
