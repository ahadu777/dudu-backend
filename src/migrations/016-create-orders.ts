import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 创建订单主表 (PRD-008)
 * 支持小程序订单和OTA订单
 */
export class CreateOrders1733000100000 implements MigrationInterface {
  name = 'CreateOrders1733000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'bigint',
            comment: '用户ID',
          },
          {
            name: 'order_no',
            type: 'varchar',
            length: '64',
            comment: '订单号（用于幂等校验和微信支付 out_trade_no）',
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            default: "'direct'",
            comment: '渠道：direct=小程序, ota=OTA平台',
          },
          {
            name: 'order_type',
            type: 'enum',
            enum: ['package', 'route'],
            default: "'package'",
            comment: '订单类型：套餐/班次',
          },
          {
            name: 'product_id',
            type: 'bigint',
            comment: '产品ID',
          },
          {
            name: 'product_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: '产品名称快照',
          },
          {
            name: 'quantity',
            type: 'int',
            default: 1,
            comment: '购买数量（总人数）',
          },
          {
            name: 'travel_date',
            type: 'date',
            comment: '出行日期',
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: '订单总额',
          },
          {
            name: 'pricing_context',
            type: 'json',
            isNullable: true,
            comment: '定价上下文（包含完整定价明细）',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
            default: "'pending'",
            comment: '订单状态',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'paid_at',
            type: 'datetime',
            isNullable: true,
            comment: '支付时间',
          },
          {
            name: 'cancelled_at',
            type: 'datetime',
            isNullable: true,
            comment: '取消时间',
          },
          {
            name: 'refunded_at',
            type: 'datetime',
            isNullable: true,
            comment: '退款时间',
          },
          {
            name: 'refund_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: '退款金额',
          },
          {
            name: 'refund_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: '退款原因',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_USER_ORDER_NO',
        columnNames: ['user_id', 'order_no'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_TRAVEL_DATE',
        columnNames: ['travel_date'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_PRODUCT_ID',
        columnNames: ['product_id'],
      }),
    );

    console.log('✅ Created orders table with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('orders');
    console.log('✅ Dropped orders table');
  }
}
