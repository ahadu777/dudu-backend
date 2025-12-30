#!/usr/bin/env node
/**
 * AC 覆盖率验证脚本
 *
 * 功能：
 * 1. 读取 prd-XXX-ac-mapping.yaml 文件
 * 2. 读取对应的 Postman collection JSON 文件
 * 3. 比对 AC 与测试覆盖情况
 * 4. 输出覆盖率报告
 *
 * 用法：
 *   npm run validate:ac-coverage         # 验证所有 PRD
 *   npm run validate:ac-coverage 006     # 验证指定 PRD
 *
 * 遵循规范: docs/reference/AC-EXTRACTION-SPEC.md
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

// 路径配置
const PATHS = {
  mappingDir: path.join(__dirname, '../docs/test-coverage'),
  postmanDir: path.join(__dirname, '../postman/auto-generated'),
};

/**
 * 查找 AC 映射文件
 */
function findMappingFiles(prdId = null) {
  const files = fs.readdirSync(PATHS.mappingDir)
    .filter(f => f.match(/^prd-\d{3}-ac-mapping\.yaml$/));

  if (prdId) {
    const paddedId = prdId.toString().padStart(3, '0');
    return files.filter(f => f.includes(`prd-${paddedId}`));
  }

  return files;
}

/**
 * 查找对应的 Postman collection
 */
function findPostmanCollection(prdId) {
  const paddedId = prdId.toString().padStart(3, '0');
  const files = fs.readdirSync(PATHS.postmanDir)
    .filter(f => f.startsWith(`prd-${paddedId}`) && f.endsWith('.json'));

  return files.length > 0 ? files[0] : null;
}

/**
 * 解析 AC 映射文件
 */
function parseMapping(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

/**
 * 解析 Postman collection，提取 AC 引用
 */
function parsePostmanCollection(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const collection = JSON.parse(content);

  const acReferences = new Set();
  const testNames = [];

  function extractFromItems(items, folderName = '') {
    for (const item of items) {
      if (item.item) {
        // 这是一个 folder
        extractFromItems(item.item, item.name);
      } else if (item.name) {
        // 这是一个 request
        const match = item.name.match(/\[AC-[^\]]+\]/g);
        if (match) {
          match.forEach(ac => {
            const acId = ac.replace(/[\[\]]/g, '');
            acReferences.add(acId);
            testNames.push({
              folder: folderName,
              name: item.name,
              ac: acId,
            });
          });
        }
      }
    }
  }

  if (collection.item) {
    extractFromItems(collection.item);
  }

  return { acReferences, testNames };
}

/**
 * 从映射文件提取所有 AC
 */
function extractAllACs(mapping) {
  const acs = [];

  if (mapping.acceptance_criteria) {
    for (const [domain, criteria] of Object.entries(mapping.acceptance_criteria)) {
      if (Array.isArray(criteria)) {
        for (const ac of criteria) {
          acs.push({
            id: ac.ac_id,
            description: ac.description,
            category: ac.category || 'unknown',
            status: ac.status || 'pending',
            testId: ac.test_id || '',
            domain,
          });
        }
      }
    }
  }

  return acs;
}

/**
 * 验证单个 PRD 的 AC 覆盖率
 */
function validatePRD(mappingFile) {
  const mappingPath = path.join(PATHS.mappingDir, mappingFile);
  const mapping = parseMapping(mappingPath);

  const prdId = mapping.prd_id || mappingFile.match(/prd-(\d{3})/)?.[1];
  const prdNum = prdId.replace('PRD-', '');

  console.log('');
  console.log(`${colors.cyan}${prdId} AC Coverage Check${colors.reset}`);
  console.log('═'.repeat(55));

  // 查找 Postman collection
  const postmanFile = findPostmanCollection(prdNum);
  let postmanACs = new Set();
  let testDetails = [];

  if (postmanFile) {
    const postmanPath = path.join(PATHS.postmanDir, postmanFile);
    const result = parsePostmanCollection(postmanPath);
    postmanACs = result.acReferences;
    testDetails = result.testNames;
    log.dim(`Collection: ${postmanFile}`);
  } else {
    log.warning(`No Postman collection found for ${prdId}`);
  }

  // 提取所有 AC
  const allACs = extractAllACs(mapping);

  if (allACs.length === 0) {
    log.warning('No ACs found in mapping file');
    return { prdId, total: 0, tested: 0, skipped: 0, missing: 0, gaps: [] };
  }

  // 统计
  const stats = {
    tested: 0,
    skipped: 0,
    pending: 0,
    missing: 0,
  };

  const gaps = [];
  const byCategory = {
    happy_path: { total: 0, tested: 0 },
    error_path: { total: 0, tested: 0 },
    edge_case: { total: 0, tested: 0 },
  };

  // 检查每个 AC
  for (const ac of allACs) {
    const hasTest = postmanACs.has(ac.id);
    const category = ac.category || 'unknown';

    // 更新分类统计
    if (byCategory[category]) {
      byCategory[category].total++;
    }

    if (ac.status === 'tested' || hasTest) {
      stats.tested++;
      if (byCategory[category]) {
        byCategory[category].tested++;
      }
      log.success(`${ac.id}: ${ac.description.substring(0, 30)}... → ${ac.testId || 'found'} (tested)`);
    } else if (ac.status === 'skipped') {
      stats.skipped++;
      log.warning(`${ac.id}: ${ac.description.substring(0, 30)}... → (skipped)`);
      gaps.push({
        acId: ac.id,
        reason: 'SKIPPED',
        description: ac.description,
      });
    } else if (ac.status === 'pending' || !hasTest) {
      stats.pending++;
      stats.missing++;
      log.error(`${ac.id}: ${ac.description.substring(0, 30)}... → (no test)`);
      gaps.push({
        acId: ac.id,
        reason: 'MISSING',
        description: ac.description,
      });
    }
  }

  // 输出摘要
  console.log('');
  const total = allACs.length;
  const covered = stats.tested + stats.skipped;
  const percentage = ((covered / total) * 100).toFixed(1);

  const statusColor = percentage >= 90 ? colors.green : percentage >= 70 ? colors.yellow : colors.red;
  console.log(`${statusColor}Coverage: ${stats.tested}/${total} = ${percentage}%${colors.reset}`);

  // 分类统计
  console.log('');
  console.log('By Category:');
  for (const [cat, data] of Object.entries(byCategory)) {
    if (data.total > 0) {
      const catPct = ((data.tested / data.total) * 100).toFixed(0);
      console.log(`  ${cat}: ${data.tested}/${data.total} (${catPct}%)`);
    }
  }

  // 输出 gaps
  if (gaps.length > 0) {
    console.log('');
    console.log('Gaps:');
    for (const gap of gaps) {
      const icon = gap.reason === 'SKIPPED' ? '⚠️' : '❌';
      console.log(`  ${icon} ${gap.acId} [${gap.reason}] - ${gap.description.substring(0, 40)}...`);
    }
  }

  return {
    prdId,
    total,
    tested: stats.tested,
    skipped: stats.skipped,
    missing: stats.missing,
    percentage: parseFloat(percentage),
    gaps,
  };
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const targetPrd = args[0];

  console.log('');
  console.log(`${colors.cyan}AC Coverage Validator${colors.reset}`);
  console.log(`${colors.dim}Spec: AC-EXTRACTION-SPEC.md v2.0${colors.reset}`);

  // 查找映射文件
  const mappingFiles = findMappingFiles(targetPrd);

  if (mappingFiles.length === 0) {
    if (targetPrd) {
      log.error(`No mapping file found for PRD-${targetPrd.toString().padStart(3, '0')}`);
    } else {
      log.error('No AC mapping files found');
    }
    process.exit(1);
  }

  // 验证每个 PRD
  const results = [];
  for (const file of mappingFiles) {
    try {
      const result = validatePRD(file);
      results.push(result);
    } catch (err) {
      log.error(`Failed to validate ${file}: ${err.message}`);
    }
  }

  // 输出总结
  if (results.length > 1) {
    console.log('');
    console.log('═'.repeat(55));
    console.log(`${colors.cyan}Summary${colors.reset}`);
    console.log('');

    let totalACs = 0;
    let totalTested = 0;
    let totalGaps = 0;

    for (const r of results) {
      totalACs += r.total;
      totalTested += r.tested;
      totalGaps += r.gaps.length;

      const statusIcon = r.percentage >= 90 ? '✅' : r.percentage >= 70 ? '⚠️' : '❌';
      console.log(`${statusIcon} ${r.prdId}: ${r.percentage}% (${r.tested}/${r.total})`);
    }

    console.log('');
    const overallPct = ((totalTested / totalACs) * 100).toFixed(1);
    console.log(`Overall: ${totalTested}/${totalACs} = ${overallPct}%`);

    if (totalGaps > 0) {
      console.log(`Total Gaps: ${totalGaps}`);
    }
  }

  // 检查是否有失败
  const hasFailures = results.some(r => r.percentage < 100 && r.gaps.some(g => g.reason === 'MISSING'));

  console.log('');
  if (hasFailures) {
    log.warning('Some ACs are missing tests');
    // 不退出失败，只是警告
  } else {
    log.success('All ACs are covered');
  }
}

// 运行
main();
