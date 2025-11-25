import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketsForReservation1732500100000 implements MigrationInterface {
  name = 'CreateTicketsForReservation1732500100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Create tickets table for reservation system =====
    // Note: This is separate from pre_generated_tickets (OTA system)
    // This table handles ticket activation and reservation workflow
    await queryRunner.query(`
      CREATE TABLE \`tickets\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '票务ID',
        \`ticket_code\` VARCHAR(50) NOT NULL UNIQUE COMMENT '票务编码（唯一）',
        \`order_id\` INT NOT NULL COMMENT '订单ID',
        \`status\` ENUM('PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_PAYMENT' COMMENT '票务状态',
        \`customer_email\` VARCHAR(255) NULL COMMENT '客户邮箱',
        \`customer_phone\` VARCHAR(20) NULL COMMENT '客户手机号',
        \`product_id\` INT NOT NULL COMMENT '产品ID',
        \`orq\` INT NOT NULL COMMENT '组织ID',
        \`qr_code\` TEXT NULL COMMENT 'Base64 QR code image',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`activated_at\` TIMESTAMP NULL COMMENT '激活时间',
        \`reserved_at\` TIMESTAMP NULL COMMENT '预约时间',
        \`verified_at\` TIMESTAMP NULL COMMENT '核销时间',
        \`verified_by\` INT NULL COMMENT '核销操作员ID',
        INDEX \`idx_ticket_code\` (\`ticket_code\`),
        INDEX \`idx_order_id\` (\`order_id\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_orq\` (\`orq\`),
        INDEX \`idx_product_id\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票务表（预约系统）'
    `);

    // ===== Step 2: Seed sample tickets =====
    const sampleTickets = [
      // ACTIVATED tickets ready for reservation
      "('TKT-2024-001', 1001, 'ACTIVATED', 'alice@example.com', '13800138001', 101, 1, NULL, NOW(), NOW(), NULL, NULL, NULL)",
      "('TKT-2024-002', 1001, 'ACTIVATED', 'alice@example.com', '13800138001', 101, 1, NULL, NOW(), NOW(), NULL, NULL, NULL)",
      "('TKT-2024-003', 1002, 'ACTIVATED', 'bob@example.com', '13800138002', 102, 1, NULL, NOW(), NOW(), NULL, NULL, NULL)",
      // RESERVED tickets
      "('TKT-2024-004', 1003, 'RESERVED', 'charlie@example.com', '13800138003', 101, 1, NULL, NOW(), NOW(), NOW(), NULL, NULL)",
      "('TKT-2024-005', 1003, 'RESERVED', 'charlie@example.com', '13800138003', 101, 1, NULL, NOW(), NOW(), NOW(), NULL, NULL)",
      // VERIFIED ticket
      "('TKT-2024-006', 1004, 'VERIFIED', 'david@example.com', '13800138004', 102, 1, NULL, NOW(), NOW(), NOW(), NOW(), 1)",
      // PENDING_PAYMENT ticket
      "('TKT-2024-007', 1005, 'PENDING_PAYMENT', NULL, NULL, 101, 1, NULL, NOW(), NULL, NULL, NULL, NULL)"
    ];

    await queryRunner.query(`
      INSERT INTO \`tickets\` (\`ticket_code\`, \`order_id\`, \`status\`, \`customer_email\`, \`customer_phone\`, \`product_id\`, \`orq\`, \`qr_code\`, \`created_at\`, \`activated_at\`, \`reserved_at\`, \`verified_at\`, \`verified_by\`)
      VALUES ${sampleTickets.join(',\n        ')}
    `);

    console.log('✅ Created tickets table and seeded 7 sample tickets');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tickets\``);
    console.log('✅ Dropped tickets table');
  }
}
