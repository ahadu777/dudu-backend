import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 创建订单支付记录表 (PRD-008)
 * 记录微信支付等支付信息
 */
export class CreateOrderPayments1733000200000 implements MigrationInterface {
  name = 'CreateOrderPayments1733000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'order_payments',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
            comment: '订单ID',
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['wechat', 'alipay', 'manual'],
            default: "'wechat'",
            comment: '支付方式',
          },
          {
            name: 'transaction_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '微信支付交易号',
          },
          {
            name: 'prepay_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '预支付ID',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            comment: '支付金额',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
            default: "'PENDING'",
            comment: '支付状态',
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
            comment: '支付成功时间',
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
            comment: '退款金额（部分退款场景）',
          },
          {
            name: 'callback_raw',
            type: 'json',
            isNullable: true,
            comment: '微信回调原始数据',
          },
          {
            name: 'error_message',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '错误信息',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'order_payments',
      new TableIndex({
        name: 'IDX_ORDER_PAYMENTS_ORDER_ID',
        columnNames: ['order_id'],
      }),
    );

    await queryRunner.createIndex(
      'order_payments',
      new TableIndex({
        name: 'IDX_ORDER_PAYMENTS_TRANSACTION_ID',
        columnNames: ['transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      'order_payments',
      new TableIndex({
        name: 'IDX_ORDER_PAYMENTS_STATUS',
        columnNames: ['status'],
      }),
    );

    // 创建外键
    await queryRunner.createForeignKey(
      'order_payments',
      new TableForeignKey({
        name: 'FK_ORDER_PAYMENTS_ORDER',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    console.log('✅ Created order_payments table with indexes and foreign key');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('order_payments', 'FK_ORDER_PAYMENTS_ORDER');
    await queryRunner.dropTable('order_payments');
    console.log('✅ Dropped order_payments table');
  }
}
