import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOtaResellersTable1731570000000 implements MigrationInterface {
  name = 'CreateOtaResellersTable1731570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Create ota_resellers table =====
    await queryRunner.query(`
      CREATE TABLE \`ota_resellers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`partner_id\` VARCHAR(50) NOT NULL COMMENT 'OTA platform ID (e.g., ctrip, klook)',
        \`reseller_code\` VARCHAR(50) NOT NULL COMMENT 'Unique code within partner (e.g., GD-TRAVEL-001)',
        \`reseller_name\` VARCHAR(200) NOT NULL COMMENT 'Display name (e.g., "广州国旅")',
        \`contact_email\` VARCHAR(200) NULL,
        \`contact_phone\` VARCHAR(50) NULL,
        \`commission_rate\` DECIMAL(5,4) NOT NULL DEFAULT 0.10 COMMENT '佣金比例 (e.g., 0.10 = 10%)',
        \`contract_start_date\` DATE NULL,
        \`contract_end_date\` DATE NULL,
        \`status\` ENUM('active', 'suspended', 'terminated') NOT NULL DEFAULT 'active',
        \`settlement_cycle\` ENUM('weekly', 'monthly', 'quarterly') NOT NULL DEFAULT 'monthly',
        \`payment_terms\` VARCHAR(100) NULL COMMENT 'e.g., Net 30, Net 60',
        \`region\` VARCHAR(100) NULL COMMENT 'e.g., "华南地区", "华北地区"',
        \`tier\` ENUM('platinum', 'gold', 'silver', 'bronze') NOT NULL DEFAULT 'bronze',
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_partner_code\` (\`partner_id\`, \`reseller_code\`),
        INDEX \`idx_partner_id\` (\`partner_id\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_region\` (\`region\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OTA经销商主数据表'
    `);

    // ===== Step 2: Add reseller_id to ota_ticket_batches =====
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      ADD COLUMN \`reseller_id\` INT NULL COMMENT '经销商ID，关联ota_resellers.id'
      AFTER \`batch_metadata\`
    `);

    // ===== Step 3: Migrate existing resellers from JSON metadata =====
    // Extract unique resellers and insert into ota_resellers table
    await queryRunner.query(`
      INSERT INTO \`ota_resellers\` (\`partner_id\`, \`reseller_code\`, \`reseller_name\`, \`status\`)
      SELECT DISTINCT
        b.\`partner_id\`,
        CONCAT(
          b.\`partner_id\`, '-',
          SUBSTRING(MD5(JSON_UNQUOTE(JSON_EXTRACT(b.\`reseller_metadata\`, '$.intended_reseller'))), 1, 8)
        ) as reseller_code,
        JSON_UNQUOTE(JSON_EXTRACT(b.\`reseller_metadata\`, '$.intended_reseller')) as reseller_name,
        'active' as status
      FROM \`ota_ticket_batches\` b
      WHERE b.\`reseller_metadata\` IS NOT NULL
        AND JSON_UNQUOTE(JSON_EXTRACT(b.\`reseller_metadata\`, '$.intended_reseller')) IS NOT NULL
        AND JSON_UNQUOTE(JSON_EXTRACT(b.\`reseller_metadata\`, '$.intended_reseller')) != ''
    `);

    // ===== Step 4: Update batches with reseller_id foreign key =====
    await queryRunner.query(`
      UPDATE \`ota_ticket_batches\` b
      INNER JOIN \`ota_resellers\` r
        ON r.\`partner_id\` = b.\`partner_id\`
        AND r.\`reseller_name\` = JSON_UNQUOTE(JSON_EXTRACT(b.\`reseller_metadata\`, '$.intended_reseller'))
      SET b.\`reseller_id\` = r.\`id\`
      WHERE b.\`reseller_metadata\` IS NOT NULL
    `);

    // ===== Step 5: Add foreign key constraint =====
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      ADD CONSTRAINT \`fk_batch_reseller\`
        FOREIGN KEY (\`reseller_id\`) REFERENCES \`ota_resellers\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);

    // ===== Step 6: Add index for reseller_id queries =====
    await queryRunner.query(`
      CREATE INDEX \`idx_reseller_id\` ON \`ota_ticket_batches\` (\`reseller_id\`)
    `);

    // ===== Step 7: Drop old generated column if exists =====
    // Migration 010 created a virtual column for reseller_name, no longer needed
    const checkColumn = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ota_ticket_batches'
        AND COLUMN_NAME = 'reseller_name'
    `);

    if (checkColumn.length > 0) {
      await queryRunner.query(`
        DROP INDEX \`idx_batch_reseller_period\` ON \`ota_ticket_batches\`
      `);
      await queryRunner.query(`
        ALTER TABLE \`ota_ticket_batches\` DROP COLUMN \`reseller_name\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== Rollback Step 7: Restore generated column if needed =====
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      ADD COLUMN \`reseller_name\` VARCHAR(255) GENERATED ALWAYS AS
      (JSON_UNQUOTE(JSON_EXTRACT(\`reseller_metadata\`, '$.intended_reseller'))) VIRTUAL
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_batch_reseller_period\`
      ON \`ota_ticket_batches\` (\`reseller_name\`, \`created_at\`)
    `);

    // ===== Rollback Step 6: Drop index =====
    await queryRunner.query(`
      DROP INDEX \`idx_reseller_id\` ON \`ota_ticket_batches\`
    `);

    // ===== Rollback Step 5: Drop foreign key =====
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      DROP FOREIGN KEY \`fk_batch_reseller\`
    `);

    // ===== Rollback Step 4 & 3: Clear reseller_id (data migration reversal) =====
    await queryRunner.query(`
      UPDATE \`ota_ticket_batches\`
      SET \`reseller_id\` = NULL
    `);

    // ===== Rollback Step 2: Drop reseller_id column =====
    await queryRunner.query(`
      ALTER TABLE \`ota_ticket_batches\`
      DROP COLUMN \`reseller_id\`
    `);

    // ===== Rollback Step 1: Drop ota_resellers table =====
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`ota_resellers\`
    `);
  }
}
