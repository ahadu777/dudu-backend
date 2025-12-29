/**
 * 参考文档服务
 * 提供参考文档元数据和工具函数
 */

// ============ 参考文档用途映射 ============

const REFERENCE_FILE_PURPOSES: Record<string, string> = {
  'AI-TEST-GENERATION.md': 'Guide for AI to generate Postman test collections',
  'API-CHANGE-MANAGEMENT.md': 'Breaking vs non-breaking API changes workflow',
  'CEO-CONTEXT.md': 'CEO evaluation framework and questions',
  'DOCUMENT-LAYER-DECISION.md': 'When to create PRD vs Story vs Card',
  'DOCUMENT-SPEC.md': 'Document templates and lifecycle',
  'DOCUMENTATION-SITE.md': 'Documentation site implementation details',
  'DUPLICATE-PREVENTION.md': 'How to avoid duplicate stories/cards',
  'EXPERIENCE-LEARNING.md': 'Lessons learned and best practices',
  'KNOWLEDGE-GRAPH.md': 'Cross-story dependency tracking',
  'NATURAL-LANGUAGE-OPTIMIZATION.md': 'Converting user requests to specs',
  'NEWMAN-REPORT-STANDARD.md': 'Test report naming conventions',
  'PRODUCT-ARCHITECTURE.md': 'Multi-platform product flowcharts',
  'REFACTORING-IMPACT.md': 'Impact analysis for code changes',
  'RESEARCH-CONTEXT.md': 'Strategic memo system and research workflow',
  'RESTFUL-API-DESIGN.md': 'RESTful API design standards',
  'RUNBOOK-TEMPLATE.md': 'E2E test runbook template',
  'TC-REGISTRY-SPEC.md': 'Test coverage registry specification',
  'TROUBLESHOOTING.md': 'Common issues and solutions',
  'developer-rules.md': 'Developer guidelines and rules',
  'evaluation-questions.yaml': 'Foundation evaluation questions by role',
};

/**
 * 根据文件名获取参考文档的用途描述
 */
export function getReferenceFilePurpose(filename: string): string {
  return REFERENCE_FILE_PURPOSES[filename] || 'Reference documentation';
}

/**
 * 获取所有参考文档及其用途
 */
export function getAllReferencePurposes(): Record<string, string> {
  return { ...REFERENCE_FILE_PURPOSES };
}
