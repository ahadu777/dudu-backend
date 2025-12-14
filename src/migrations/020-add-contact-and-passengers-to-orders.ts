import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 为订单表添加联系人信息和乘客信息字段
 */
export class AddContactAndPassengersToOrders1733100100000 implements MigrationInterface {
  name = 'AddContactAndPassengersToOrders1733100100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加联系人信息字段
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'contact_name',
        type: 'varchar',
        length: '100',
        isNullable: true, // 先设为可空，便于旧数据兼容
        comment: '联系人姓名',
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'contact_phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
        comment: '联系人手机号',
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'contact_email',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: '联系人邮箱',
      }),
    );

    // 添加乘客信息字段（JSON 格式，可选）
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'passengers',
        type: 'json',
        isNullable: true,
        comment: '乘客信息（可选，用于实名验证）',
      }),
    );

    console.log('✅ Added contact and passengers fields to orders table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'passengers');
    await queryRunner.dropColumn('orders', 'contact_email');
    await queryRunner.dropColumn('orders', 'contact_phone');
    await queryRunner.dropColumn('orders', 'contact_name');

    console.log('✅ Removed contact and passengers fields from orders table');
  }
}
