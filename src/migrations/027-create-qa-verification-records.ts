import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 027: Create QA Verification Records table
 *
 * 变更内容：
 * 1. 创建 qa_verification_records 表 - QA 验证记录
 *
 * 用途：
 * - 存储断言标签（assertion_label）：原始断言名 → 中文标签映射
 * - 存储手动验证（manual_check）：QA 在 /tests 页面添加的验证记录
 * - 支持软删除
 *
 * 替代：
 * - docs/test-coverage/assertion-labels.yaml
 * - docs/test-coverage/manual-checks.yaml
 */
export class CreateQaVerificationRecords1735500000027 implements MigrationInterface {
  name = 'CreateQaVerificationRecords1735500000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 qa_verification_records 表
    await queryRunner.query(`
      CREATE TABLE qa_verification_records (
        id VARCHAR(32) NOT NULL COMMENT '业务ID',
        type ENUM('assertion_label', 'manual_check') NOT NULL COMMENT '记录类型',

        -- assertion_label 专用字段
        original_name VARCHAR(255) NULL COMMENT '原始断言名称',
        label VARCHAR(255) NULL COMMENT '中文标签',

        -- manual_check 专用字段
        prd_id VARCHAR(100) NULL COMMENT 'PRD/Story ID (如 PRD-006)',
        api_name VARCHAR(255) NULL COMMENT 'API 名称，为空表示 PRD 级别',
        description TEXT NULL COMMENT '验证描述',
        verified_by VARCHAR(50) NULL COMMENT '验证人',
        status ENUM('passed', 'failed', 'pending') NULL COMMENT '验证状态',
        verified_date DATE NULL COMMENT '验证日期',

        -- 通用字段
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL COMMENT '软删除时间',

        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加索引（与 Entity 定义一致）
    await queryRunner.query(`CREATE INDEX idx_type ON qa_verification_records (type)`);
    await queryRunner.query(`CREATE INDEX idx_prd ON qa_verification_records (prd_id)`);
    await queryRunner.query(`CREATE INDEX idx_original_name ON qa_verification_records (original_name)`);
    await queryRunner.query(`CREATE INDEX idx_deleted_at ON qa_verification_records (deleted_at)`);

    console.log('Migration 027: qa_verification_records table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS qa_verification_records`);
    console.log('Migration 027: qa_verification_records table dropped');
  }
}
