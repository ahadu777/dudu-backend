import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * 扩展 tickets 表以支持小程序订单 (PRD-008)
 * 添加用户关联、客户类型、权益、价格等字段
 */
export class ExtendTicketsForMiniprogram1733000300000 implements MigrationInterface {
  name = 'ExtendTicketsForMiniprogram1733000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 修改 status 枚举，添加 CANCELLED 状态
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`status\` ENUM('PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED', 'CANCELLED')
      NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

    // 2. 添加新字段
    await queryRunner.addColumns('tickets', [
      new TableColumn({
        name: 'user_id',
        type: 'bigint',
        isNullable: true,
        comment: '小程序用户ID',
      }),
      new TableColumn({
        name: 'customer_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: '客户姓名',
      }),
      new TableColumn({
        name: 'customer_type',
        type: 'enum',
        enum: ['adult', 'child', 'elderly'],
        isNullable: true,
        comment: '客户类型：adult/child/elderly',
      }),
      new TableColumn({
        name: 'entitlements',
        type: 'json',
        isNullable: true,
        comment: '票券权益列表',
      }),
      new TableColumn({
        name: 'travel_date',
        type: 'date',
        isNullable: true,
        comment: '出行日期',
      }),
      new TableColumn({
        name: 'ticket_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
        comment: '票券金额',
      }),
      new TableColumn({
        name: 'channel',
        type: 'varchar',
        length: '20',
        default: "'direct'",
        comment: '渠道：direct=小程序, ota=OTA',
      }),
      new TableColumn({
        name: 'extra',
        type: 'json',
        isNullable: true,
        comment: '扩展元数据',
      }),
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      }),
      new TableColumn({
        name: 'expires_at',
        type: 'timestamp',
        isNullable: true,
        comment: '票券过期时间',
      }),
      new TableColumn({
        name: 'cancelled_at',
        type: 'timestamp',
        isNullable: true,
        comment: '取消时间',
      }),
    ]);

    // 3. 添加索引
    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_TRAVEL_DATE',
        columnNames: ['travel_date'],
      }),
    );

    console.log('✅ Extended tickets table for miniprogram support');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_USER_ID');
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_TRAVEL_DATE');

    // 删除新增字段
    await queryRunner.dropColumns('tickets', [
      'user_id',
      'customer_name',
      'customer_type',
      'entitlements',
      'travel_date',
      'ticket_price',
      'channel',
      'extra',
      'updated_at',
      'expires_at',
      'cancelled_at',
    ]);

    // 恢复原来的 status 枚举
    await queryRunner.query(`
      ALTER TABLE \`tickets\`
      MODIFY COLUMN \`status\` ENUM('PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED')
      NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

    console.log('✅ Reverted tickets table changes');
  }
}
