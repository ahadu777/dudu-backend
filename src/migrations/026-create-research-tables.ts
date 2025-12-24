import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 026: Create Research Hub tables
 *
 * 变更内容：
 * 1. 创建 research_topics 表 - 研究主题
 * 2. 创建 research_references 表 - 参考资料链接
 *
 * 用途：
 * - 整理来自 ChatGPT/Claude/Notion 等外部来源的研究资料
 * - 将散落的研究内容组织成可追溯的主题
 * - 支持从研究到 Memo 的转化
 */
export class CreateResearchTables1734700000026 implements MigrationInterface {
  name = 'CreateResearchTables1734700000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== Step 1: 创建 research_topics 表 ==========
    await queryRunner.query(`
      CREATE TABLE research_topics (
        id BIGINT NOT NULL AUTO_INCREMENT,
        topic VARCHAR(255) NOT NULL COMMENT '研究主题',
        status ENUM('active', 'synthesizing', 'done', 'archived') NOT NULL DEFAULT 'active' COMMENT '状态',
        synthesis_notes TEXT NULL COMMENT '综合笔记',
        questions JSON NULL COMMENT '待解答问题 [{text, answered}]',
        leads_to_memo VARCHAR(50) NULL COMMENT '关联 Memo ID (如 MEMO-001)',
        memo_content TEXT NULL COMMENT 'Memo 内容（文本形式存储）',
        started_at DATE NOT NULL COMMENT '开始日期',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加索引
    await queryRunner.query(`CREATE INDEX idx_research_topics_status ON research_topics (status)`);
    await queryRunner.query(`CREATE INDEX idx_research_topics_started_at ON research_topics (started_at)`);
    await queryRunner.query(`CREATE INDEX idx_research_topics_leads_to_memo ON research_topics (leads_to_memo)`);

    // ========== Step 2: 创建 research_references 表 ==========
    await queryRunner.query(`
      CREATE TABLE research_references (
        id BIGINT NOT NULL AUTO_INCREMENT,
        research_topic_id BIGINT NOT NULL COMMENT '所属研究主题',
        type ENUM('notion', 'google-doc', 'directus-file', 'url', 'screenshot', 'other') NOT NULL COMMENT '参考类型',
        title VARCHAR(255) NOT NULL COMMENT '参考标题',
        url VARCHAR(1024) NULL COMMENT '外部链接',
        directus_file_id VARCHAR(36) NULL COMMENT 'Directus 文件 ID (用于上传的文件)',
        notes TEXT NULL COMMENT '备注',
        reference_date DATE NULL COMMENT '参考日期',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_research_references_topic
          FOREIGN KEY (research_topic_id)
          REFERENCES research_topics(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加索引
    await queryRunner.query(`CREATE INDEX idx_research_references_topic_id ON research_references (research_topic_id)`);
    await queryRunner.query(`CREATE INDEX idx_research_references_type ON research_references (type)`);
    await queryRunner.query(`CREATE INDEX idx_research_references_reference_date ON research_references (reference_date)`);

    console.log('Migration 026: Research tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除表（先删子表，再删父表）
    await queryRunner.query(`DROP TABLE IF EXISTS research_references`);
    await queryRunner.query(`DROP TABLE IF EXISTS research_topics`);

    console.log('Migration 026: Research tables dropped');
  }
}
