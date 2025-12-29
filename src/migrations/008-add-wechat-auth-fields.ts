import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add WeChat Authentication Fields to Users Table
 * Story: US-014 - WeChat Mini-Program User Authentication
 * PRD: PRD-004
 *
 * Changes:
 * - Add wechat_openid VARCHAR(64) UNIQUE NULL (WeChat user identifier)
 * - Add phone VARCHAR(32) NULL (user phone number from WeChat authorization)
 * - Add auth_type VARCHAR(20) NOT NULL DEFAULT 'email' (authentication source: 'email' or 'wechat')
 * - Add wechat_extra JSON NULL (additional WeChat user data: nickname, gender, city, etc.)
 * - Add INDEX idx_wechat_openid for performance
 */
export class AddWeChatAuthFields1736064000008 implements MigrationInterface {
  name = 'AddWeChatAuthFields1736064000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: 如果 users 表是通过 Migration 005 创建的，这些字段已经存在
    // 此 Migration 仅用于从旧版本升级的兼容性

    // 检查 wechat_openid 列是否存在
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'wechat_openid'
    `);

    if (columns.length > 0) {
      console.log('Migration 008: WeChat fields already exist, skipping');
      return;
    }

    // 1. Add wechat_openid column (unique identifier for WeChat users)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'wechat_openid',
        type: 'varchar',
        length: '64',
        isNullable: true,
        isUnique: true,
        comment: 'WeChat openid - unique identifier for WeChat mini-program users',
      }),
    );

    // 2. Add phone column (from WeChat phone number authorization)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '32',
        isNullable: true,
        comment: 'User phone number (E.164 format, e.g., +8613800138000)',
      }),
    );

    // 3. Add auth_type column (distinguish email vs WeChat authentication)
    // Default 'email' for backward compatibility with existing users
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'auth_type',
        type: 'varchar',
        length: '20',
        isNullable: false,
        default: "'email'",
        comment: 'Authentication source: email or wechat',
      }),
    );

    // 4. Add wechat_extra JSON column (stores nickname, gender, city, country, etc.)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'wechat_extra',
        type: 'json',
        isNullable: true,
        comment: 'Additional WeChat user data (nickname, gender, city, phone_country_code)',
      }),
    );

    // 5. Create index on wechat_openid for fast lookup during login
    await queryRunner.query(
      `CREATE INDEX idx_wechat_openid ON users (wechat_openid)`,
    );

    // 6. Create index on phone for potential phone-based lookups
    await queryRunner.query(
      `CREATE INDEX idx_phone ON users (phone)`,
    );

    // 7. Create composite index for auth_type queries
    await queryRunner.query(
      `CREATE INDEX idx_auth_type ON users (auth_type)`,
    );

    console.log('Migration 008: Added WeChat auth fields to users table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX idx_auth_type ON users`);
    await queryRunner.query(`DROP INDEX idx_phone ON users`);
    await queryRunner.query(`DROP INDEX idx_wechat_openid ON users`);

    // Drop columns
    await queryRunner.dropColumn('users', 'wechat_extra');
    await queryRunner.dropColumn('users', 'auth_type');
    await queryRunner.dropColumn('users', 'phone');
    await queryRunner.dropColumn('users', 'wechat_openid');
  }
}
