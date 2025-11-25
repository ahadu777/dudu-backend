import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationSlots1732500000000 implements MigrationInterface {
  name = 'CreateReservationSlots1732500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Create reservation_slots table =====
    await queryRunner.query(`
      CREATE TABLE \`reservation_slots\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '时段ID',
        \`date\` DATE NOT NULL COMMENT '预约日期',
        \`start_time\` TIME NOT NULL COMMENT '开始时间',
        \`end_time\` TIME NOT NULL COMMENT '结束时间',
        \`venue_id\` INT NULL COMMENT '场地ID (Future: multi-venue support)',
        \`total_capacity\` INT NOT NULL DEFAULT 200 COMMENT '总容量',
        \`booked_count\` INT NOT NULL DEFAULT 0 COMMENT '已预约数量',
        \`status\` ENUM('ACTIVE', 'FULL', 'CLOSED') NOT NULL DEFAULT 'ACTIVE' COMMENT '状态',
        \`orq\` INT NOT NULL COMMENT '组织ID',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_date\` (\`date\`),
        INDEX \`idx_orq\` (\`orq\`),
        INDEX \`idx_status\` (\`status\`),
        UNIQUE INDEX \`idx_unique_slot\` (\`date\`, \`start_time\`, \`orq\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约时段表'
    `);

    // ===== Step 2: Seed sample reservation slots (next 7 days) =====
    const today = new Date();
    const slots: string[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      // Morning slots: 09:00-12:00
      slots.push(`('${dateStr}', '09:00:00', '12:00:00', 200, 0, 'ACTIVE', 1)`);
      // Afternoon slots: 14:00-17:00
      slots.push(`('${dateStr}', '14:00:00', '17:00:00', 200, 0, 'ACTIVE', 1)`);
      // Evening slots: 18:00-21:00
      slots.push(`('${dateStr}', '18:00:00', '21:00:00', 150, 0, 'ACTIVE', 1)`);
    }

    await queryRunner.query(`
      INSERT INTO \`reservation_slots\` (\`date\`, \`start_time\`, \`end_time\`, \`total_capacity\`, \`booked_count\`, \`status\`, \`orq\`)
      VALUES ${slots.join(',\n        ')}
    `);

    console.log('✅ Created reservation_slots table and seeded 21 sample slots (7 days × 3 slots)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`reservation_slots\``);
    console.log('✅ Dropped reservation_slots table');
  }
}
