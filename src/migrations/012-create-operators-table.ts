import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcrypt';

export class CreateOperatorsTable1731578000000 implements MigrationInterface {
  name = 'CreateOperatorsTable1731578000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Create operators table =====
    await queryRunner.query(`
      CREATE TABLE \`operators\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '操作员ID',
        \`merchant_id\` BIGINT NULL COMMENT '所属商家ID (reserved for future use)',
        \`account\` VARCHAR(64) NOT NULL UNIQUE COMMENT '登录账号（唯一）',
        \`password_hash\` VARCHAR(128) NOT NULL COMMENT '密码哈希（bcrypt）',
        \`real_name\` VARCHAR(100) NULL COMMENT '真实姓名',
        \`status\` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE' COMMENT '状态',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_merchant\` (\`merchant_id\`),
        INDEX \`idx_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核销操作员账号表'
    `);

    // ===== Step 2: Seed test operators =====
    // Hash passwords for test operators (same as mock store)
    // alice: secret123, bob: pass456, charlie: admin789
    const aliceHash = await bcrypt.hash('secret123', 10);
    const bobHash = await bcrypt.hash('pass456', 10);
    const charlieHash = await bcrypt.hash('admin789', 10);

    await queryRunner.query(`
      INSERT INTO \`operators\` (\`account\`, \`password_hash\`, \`real_name\`, \`status\`)
      VALUES
        ('alice', '${aliceHash}', 'Alice Chan', 'ACTIVE'),
        ('bob', '${bobHash}', 'Bob Lee', 'ACTIVE'),
        ('charlie', '${charlieHash}', 'Charlie Wong', 'ACTIVE')
    `);

    console.log('✅ Created operators table and seeded 3 test operators (alice, bob, charlie)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop operators table
    await queryRunner.query(`DROP TABLE IF EXISTS \`operators\``);

    console.log('✅ Dropped operators table');
  }
}
