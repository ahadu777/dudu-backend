/**
 * 指标计算服务
 * 包含生产就绪度评分和自动行动项生成
 */

import { runComplianceAudit } from '../../../utils/complianceAuditor';
import { loadTestCoverageData } from '../../../utils/coverageParser';
import { loadCardDocuments, getCardStats } from '../../../utils/cardParser';

// ============ 类型定义 ============

export interface AutoActionItem {
  description: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
  category: 'compliance' | 'coverage' | 'docs' | 'production';
}

export interface ProductionReadiness {
  score: number;
  details: string[];
}

// ============ 自动行动项生成 ============

/**
 * 从实际数据生成自动行动项
 * 数据驱动：从合规检查、覆盖率、文档状态等计算
 */
export function generateAutoActionItems(): AutoActionItem[] {
  const actions: AutoActionItem[] = [];

  // 1. 获取合规违规（错误 = 高优先级，警告 = 中优先级）
  const complianceResult = runComplianceAudit();
  const criticalViolations = complianceResult.violations.filter(v => v.type === 'error');
  const warningViolations = complianceResult.violations.filter(v => v.type === 'warning');

  if (criticalViolations.length > 0) {
    // 按类别分组以提高可操作性
    const byCategory = criticalViolations.reduce((acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byCategory).forEach(([category, count]) => {
      actions.push({
        description: `Fix ${count} ${category} error(s) in documentation`,
        priority: 'high',
        source: '/compliance',
        category: 'compliance'
      });
    });
  }

  if (warningViolations.length > 3) {
    actions.push({
      description: `Review ${warningViolations.length} compliance warnings`,
      priority: 'medium',
      source: '/compliance',
      category: 'compliance'
    });
  }

  // 2. 从 test-coverage 数据获取覆盖率差距
  const coverageData = loadTestCoverageData();
  if (coverageData?.remaining_gaps) {
    const gaps = coverageData.remaining_gaps as string[];
    if (gaps.length > 0) {
      actions.push({
        description: `Address ${gaps.length} remaining test coverage gap(s)`,
        priority: 'medium',
        source: '/coverage',
        category: 'coverage'
      });
    }
  }

  // 3. 获取需要完成的草稿/进行中卡片
  const cards = loadCardDocuments();
  const draftCards = cards.filter(c => c.metadata.status === 'Ready' || c.metadata.status === 'Draft');
  const inProgressCards = cards.filter(c => c.metadata.status === 'In Progress');

  if (inProgressCards.length > 0) {
    actions.push({
      description: `Complete ${inProgressCards.length} In Progress card(s)`,
      priority: 'high',
      source: '/cards',
      category: 'docs'
    });
  }

  if (draftCards.length > 3) {
    actions.push({
      description: `Move ${draftCards.length} Draft/Ready cards to In Progress or mark as deprecated`,
      priority: 'low',
      source: '/cards',
      category: 'docs'
    });
  }

  // 4. 生产就绪检查
  const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
  const successRate = testStats.success_rate || '0%';
  if (successRate !== '100%') {
    actions.push({
      description: `Fix failing tests (current: ${successRate} pass rate)`,
      priority: 'high',
      source: 'npm run test:prd',
      category: 'production'
    });
  }

  // 检查没有测试覆盖的 PRD
  const prdCoverageRegistry = (coverageData as any)?.coverage_registry || [];
  const prdsWithGaps = prdCoverageRegistry.filter((p: any) =>
    p.coverage_gaps && p.coverage_gaps.length > 0 && !p.deprecated
  );
  if (prdsWithGaps.length > 0) {
    actions.push({
      description: `Review ${prdsWithGaps.length} PRD(s) with known test gaps`,
      priority: 'medium',
      source: '/coverage',
      category: 'production'
    });
  }

  return actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============ 生产就绪度评分 ============

/**
 * 基于多个因素计算生产就绪度
 * - 测试通过率 (40 分)
 * - 无严重合规错误 (30 分)
 * - 文档完整性 (20 分)
 * - 无覆盖率差距 (10 分)
 */
export function calculateProductionReadiness(): ProductionReadiness {
  const details: string[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // 1. 测试通过率 (40 分)
  totalPoints += 40;
  const coverageData = loadTestCoverageData();
  const testStats = (coverageData?.coverage_summary as any)?.test_statistics || {};
  const successRate = testStats.success_rate === '100%' ? 100 : parseInt(testStats.success_rate || '0');
  const testPoints = Math.round(successRate * 0.4);
  earnedPoints += testPoints;
  details.push(`Tests: ${testPoints}/40 (${successRate}% pass rate)`);

  // 2. 无严重合规错误 (30 分)
  totalPoints += 30;
  const complianceResult = runComplianceAudit();
  const criticalErrors = complianceResult.violations.filter(v => v.type === 'error').length;
  const compliancePoints = criticalErrors === 0 ? 30 : Math.max(0, 30 - (criticalErrors * 5));
  earnedPoints += compliancePoints;
  details.push(`Compliance: ${compliancePoints}/30 (${criticalErrors} critical errors)`);

  // 3. 文档完整性 (20 分)
  totalPoints += 20;
  const cardStats = getCardStats();
  const docsCompleteRate = cardStats.total > 0
    ? ((cardStats.byStatus.Done || 0) / cardStats.total) * 100
    : 0;
  const docsPoints = Math.round(docsCompleteRate * 0.2);
  earnedPoints += docsPoints;
  details.push(`Docs: ${docsPoints}/20 (${Math.round(docsCompleteRate)}% complete)`);

  // 4. 无覆盖率差距 (10 分)
  totalPoints += 10;
  const gaps = (coverageData?.remaining_gaps as string[] || []).length;
  const gapPoints = gaps === 0 ? 10 : Math.max(0, 10 - (gaps * 2));
  earnedPoints += gapPoints;
  details.push(`Coverage Gaps: ${gapPoints}/10 (${gaps} gaps)`);

  const score = Math.round((earnedPoints / totalPoints) * 100);
  return { score, details };
}
