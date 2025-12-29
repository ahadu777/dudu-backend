/**
 * QA Verification Repository
 *
 * 提供 QA 验证数据的数据库操作：
 * - 断言标签（assertion_label）
 * - 手动验证（manual_check）
 */

import { DataSource, Repository, IsNull } from 'typeorm';
import { QaVerificationRecordEntity, QaRecordType, ManualCheckStatus } from '../../../models/qa-verification-record.entity';

export interface ManualCheckData {
  prd_id: string;
  api_name?: string;
  description: string;
  verified_by?: string;
  status?: ManualCheckStatus;
}

export interface ManualCheck {
  id: string;
  description: string;
  verified_by: string;
  date: string;
  status: ManualCheckStatus;
  api?: string;
}

export class QaVerificationRepository {
  private repo: Repository<QaVerificationRecordEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(QaVerificationRecordEntity);
  }

  // ============ ID 生成 ============

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ============ Assertion Labels ============

  /**
   * 获取所有断言标签（未删除的）
   */
  async findAllAssertionLabels(): Promise<Map<string, string>> {
    const records = await this.repo.find({
      where: {
        type: 'assertion_label' as QaRecordType,
        deleted_at: IsNull()
      }
    });

    const labels = new Map<string, string>();
    for (const record of records) {
      if (record.original_name && record.label) {
        labels.set(record.original_name, record.label);
      }
    }
    return labels;
  }

  /**
   * 保存断言标签（upsert）
   */
  async saveAssertionLabel(originalName: string, label: string): Promise<void> {
    // 查找现有记录（包括软删除的）
    const existing = await this.repo.findOne({
      where: { type: 'assertion_label' as QaRecordType, original_name: originalName },
      withDeleted: true
    });

    if (existing) {
      // 更新现有记录（恢复软删除）
      existing.label = label;
      existing.deleted_at = undefined;
      await this.repo.save(existing);
    } else {
      // 创建新记录
      const record = this.repo.create({
        id: this.generateId(),
        type: 'assertion_label' as QaRecordType,
        original_name: originalName,
        label: label
      });
      await this.repo.save(record);
    }
  }

  /**
   * 删除断言标签（恢复为原始名称时调用）
   */
  async deleteAssertionLabel(originalName: string): Promise<void> {
    await this.repo.softDelete({
      type: 'assertion_label' as QaRecordType,
      original_name: originalName
    });
  }

  // ============ Manual Checks ============

  /**
   * 获取指定 PRD 的所有手动验证（按 API 分组）
   */
  async findManualChecksByPrd(prdId: string): Promise<ManualCheck[]> {
    const records = await this.repo.find({
      where: {
        type: 'manual_check' as QaRecordType,
        prd_id: prdId,
        deleted_at: IsNull()
      },
      order: { created_at: 'DESC' }
    });

    return records.map(r => {
      // 处理日期：可能是 Date 对象或字符串
      let dateStr: string;
      if (r.verified_date) {
        dateStr = r.verified_date instanceof Date
          ? r.verified_date.toISOString().split('T')[0]
          : String(r.verified_date).split('T')[0];
      } else {
        dateStr = r.created_at instanceof Date
          ? r.created_at.toISOString().split('T')[0]
          : String(r.created_at).split('T')[0];
      }
      return {
        id: r.id,
        description: r.description || '',
        verified_by: r.verified_by || 'QA',
        date: dateStr,
        status: r.status || 'pending',
        api: r.api_name
      };
    });
  }

  /**
   * 获取所有 PRD 的手动验证（按 PRD 分组）
   */
  async findAllManualChecksGroupedByPrd(): Promise<Record<string, ManualCheck[]>> {
    const records = await this.repo.find({
      where: {
        type: 'manual_check' as QaRecordType,
        deleted_at: IsNull()
      },
      order: { prd_id: 'ASC', created_at: 'DESC' }
    });

    const grouped: Record<string, ManualCheck[]> = {};
    for (const r of records) {
      const prdId = r.prd_id || 'unknown';
      if (!grouped[prdId]) {
        grouped[prdId] = [];
      }
      // 处理日期：可能是 Date 对象或字符串
      let dateStr: string;
      if (r.verified_date) {
        dateStr = r.verified_date instanceof Date
          ? r.verified_date.toISOString().split('T')[0]
          : String(r.verified_date).split('T')[0];
      } else {
        dateStr = r.created_at instanceof Date
          ? r.created_at.toISOString().split('T')[0]
          : String(r.created_at).split('T')[0];
      }
      grouped[prdId].push({
        id: r.id,
        description: r.description || '',
        verified_by: r.verified_by || 'QA',
        date: dateStr,
        status: r.status || 'pending',
        api: r.api_name
      });
    }
    return grouped;
  }

  /**
   * 创建手动验证
   */
  async createManualCheck(data: ManualCheckData): Promise<ManualCheck> {
    const record = this.repo.create({
      id: this.generateId(),
      type: 'manual_check' as QaRecordType,
      prd_id: data.prd_id,
      api_name: data.api_name,
      description: data.description,
      verified_by: data.verified_by || 'QA',
      status: data.status || 'pending',
      verified_date: new Date()
    });

    await this.repo.save(record);

    return {
      id: record.id,
      description: record.description || '',
      verified_by: record.verified_by || 'QA',
      date: new Date().toISOString().split('T')[0],
      status: record.status || 'pending',
      api: record.api_name
    };
  }

  /**
   * 更新手动验证状态
   */
  async updateManualCheckStatus(id: string, status: ManualCheckStatus): Promise<boolean> {
    const result = await this.repo.update(
      { id, type: 'manual_check' as QaRecordType, deleted_at: IsNull() },
      { status, verified_date: new Date() }
    );
    return (result.affected ?? 0) > 0;
  }

  /**
   * 软删除手动验证
   */
  async softDeleteManualCheck(id: string): Promise<boolean> {
    const result = await this.repo.softDelete({
      id,
      type: 'manual_check' as QaRecordType
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 根据 ID 查找手动验证
   */
  async findManualCheckById(id: string): Promise<ManualCheck | null> {
    const record = await this.repo.findOne({
      where: {
        id,
        type: 'manual_check' as QaRecordType,
        deleted_at: IsNull()
      }
    });

    if (!record) return null;

    // 处理日期：可能是 Date 对象或字符串
    let dateStr: string;
    if (record.verified_date) {
      dateStr = record.verified_date instanceof Date
        ? record.verified_date.toISOString().split('T')[0]
        : String(record.verified_date).split('T')[0];
    } else {
      dateStr = record.created_at instanceof Date
        ? record.created_at.toISOString().split('T')[0]
        : String(record.created_at).split('T')[0];
    }

    return {
      id: record.id,
      description: record.description || '',
      verified_by: record.verified_by || 'QA',
      date: dateStr,
      status: record.status || 'pending',
      api: record.api_name
    };
  }
}
