import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketReservations1732500200000 implements MigrationInterface {
  name = 'CreateTicketReservations1732500200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Create ticket_reservations table =====
    await queryRunner.query(`
      CREATE TABLE \`ticket_reservations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '预约ID',
        \`ticket_id\` INT NOT NULL COMMENT '票务ID',
        \`slot_id\` INT NOT NULL COMMENT '时段ID',
        \`customer_email\` VARCHAR(255) NOT NULL COMMENT '客户邮箱',
        \`customer_phone\` VARCHAR(20) NOT NULL COMMENT '客户手机号',
        \`reserved_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '预约时间',
        \`status\` ENUM('RESERVED', 'CANCELLED', 'VERIFIED') NOT NULL DEFAULT 'RESERVED' COMMENT '预约状态',
        \`orq\` INT NOT NULL COMMENT '组织ID',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_ticket_id\` (\`ticket_id\`),
        INDEX \`idx_slot_id\` (\`slot_id\`),
        INDEX \`idx_orq\` (\`orq\`),
        INDEX \`idx_status\` (\`status\`),
        UNIQUE INDEX \`idx_unique_ticket\` (\`ticket_id\`),
        CONSTRAINT \`fk_reservation_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_reservation_slot\` FOREIGN KEY (\`slot_id\`) REFERENCES \`reservation_slots\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票务预约关联表'
    `);

    // ===== Step 2: Seed sample reservations =====
    // Link reserved tickets (id 4, 5) to slots
    await queryRunner.query(`
      INSERT INTO \`ticket_reservations\` (\`ticket_id\`, \`slot_id\`, \`customer_email\`, \`customer_phone\`, \`status\`, \`orq\`)
      VALUES
        (4, 1, 'charlie@example.com', '13800138003', 'RESERVED', 1),
        (5, 1, 'charlie@example.com', '13800138003', 'RESERVED', 1),
        (6, 2, 'david@example.com', '13800138004', 'VERIFIED', 1)
    `);

    // Update booked_count for slots
    await queryRunner.query(`
      UPDATE \`reservation_slots\` SET \`booked_count\` = 2 WHERE \`id\` = 1
    `);
    await queryRunner.query(`
      UPDATE \`reservation_slots\` SET \`booked_count\` = 1 WHERE \`id\` = 2
    `);

    console.log('✅ Created ticket_reservations table and seeded 3 sample reservations');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`ticket_reservations\``);
    console.log('✅ Dropped ticket_reservations table');
  }
}
