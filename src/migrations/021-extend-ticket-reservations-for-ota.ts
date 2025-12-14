import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendTicketReservationsForOta1733500000000 implements MigrationInterface {
  name = 'ExtendTicketReservationsForOta1733500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Step 1: Add source column =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD COLUMN \`source\` ENUM('direct', 'ota') NOT NULL DEFAULT 'direct' COMMENT '票券来源：direct=小程序直购, ota=OTA渠道' AFTER \`id\`
    `);

    // ===== Step 2: Add ota_ticket_code column =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD COLUMN \`ota_ticket_code\` VARCHAR(100) NULL COMMENT 'OTA票券编码（source=ota时使用）' AFTER \`source\`
    `);

    // ===== Step 3: Drop old unique constraint on ticket_id =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      DROP INDEX \`idx_unique_ticket\`
    `);

    // ===== Step 4: Drop old foreign key constraint =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      DROP FOREIGN KEY \`fk_reservation_ticket\`
    `);

    // ===== Step 5: Modify ticket_id to allow NULL =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      MODIFY COLUMN \`ticket_id\` INT NULL COMMENT '票务ID（source=direct时使用）'
    `);

    // ===== Step 6: Re-add foreign key with ON DELETE SET NULL =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD CONSTRAINT \`fk_reservation_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE SET NULL
    `);

    // ===== Step 7: Add unique constraint for direct tickets (ticket_id not null) =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD UNIQUE INDEX \`idx_unique_direct_ticket\` (\`ticket_id\`)
    `);

    // ===== Step 8: Add unique constraint for OTA tickets =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD UNIQUE INDEX \`idx_unique_ota_ticket\` (\`ota_ticket_code\`)
    `);

    // ===== Step 9: Add index on source for filtering =====
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD INDEX \`idx_source\` (\`source\`)
    `);

    console.log('✅ Extended ticket_reservations table for OTA ticket support');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new indexes
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP INDEX \`idx_source\``);
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP INDEX \`idx_unique_ota_ticket\``);
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP INDEX \`idx_unique_direct_ticket\``);

    // Drop new foreign key
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP FOREIGN KEY \`fk_reservation_ticket\``);

    // Restore ticket_id to NOT NULL (will fail if there are OTA reservations)
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      MODIFY COLUMN \`ticket_id\` INT NOT NULL COMMENT '票务ID'
    `);

    // Re-add original foreign key
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD CONSTRAINT \`fk_reservation_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE
    `);

    // Re-add original unique constraint
    await queryRunner.query(`
      ALTER TABLE \`ticket_reservations\`
      ADD UNIQUE INDEX \`idx_unique_ticket\` (\`ticket_id\`)
    `);

    // Remove new columns
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP COLUMN \`ota_ticket_code\``);
    await queryRunner.query(`ALTER TABLE \`ticket_reservations\` DROP COLUMN \`source\``);

    console.log('✅ Reverted ticket_reservations table OTA extensions');
  }
}
