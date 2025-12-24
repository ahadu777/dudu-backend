import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ResearchTopicEntity } from './research-topic.entity';

/**
 * 参考资料类型
 */
export enum ReferenceType {
  NOTION = 'notion',           // Notion 文档
  GOOGLE_DOC = 'google-doc',   // Google 文档
  DIRECTUS_FILE = 'directus-file', // 上传到 Directus 的文件
  URL = 'url',                 // 普通 URL
  SCREENSHOT = 'screenshot',   // 截图
  OTHER = 'other'              // 其他
}

/**
 * 研究参考资料实体
 *
 * 链接到外部文档，不存储原始内容
 * - Notion 链接（ChatGPT/Claude 对话导出）
 * - Google Docs 链接
 * - 上传的截图/文件
 */
@Entity('research_references')
@Index(['research_topic_id'])
@Index(['type'])
@Index(['reference_date'])
export class ResearchReferenceEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  // 所属研究主题
  @Column({ type: 'bigint' })
  research_topic_id!: number;

  @ManyToOne(() => ResearchTopicEntity, topic => topic.references, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'research_topic_id' })
  topic!: ResearchTopicEntity;

  // 参考类型
  @Column({ type: 'enum', enum: ReferenceType })
  type!: ReferenceType;

  // 参考标题
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  // 外部链接
  @Column({ type: 'varchar', length: 1024, nullable: true })
  url?: string;

  // Directus 文件 ID (用于上传的文件)
  @Column({ type: 'varchar', length: 36, nullable: true })
  directus_file_id?: string;

  // 备注
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // 参考日期
  @Column({ type: 'date', nullable: true })
  reference_date?: Date;

  @CreateDateColumn()
  created_at!: Date;
}
