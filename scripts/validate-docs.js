#!/usr/bin/env node
/**
 * 文档校验脚本 - 检查 PRD → Stories → Cards → Code 的一致性
 *
 * 功能：
 * 1. 重复卡片检测 (相同 slug 或 oas_paths)
 * 2. 弃用引用检测 (引用了 status: Deprecated 的卡片)
 * 3. PRD → Stories → Cards 引用链检查
 * 4. Card 状态与代码一致性检查
 * 5. Story → PRD 反向引用检查 (business_requirement 字段)
 * 6. Card → Story 反向引用检查 (related_stories 字段)
 * 7. PRD ↔ Story 双向一致性检查
 * 8. 孤儿文档检测 (未被引用的 Cards/Stories)
 * 9. Stories _index.yaml 一致性检查
 *
 * 使用方式：
 *   npm run validate:docs
 *   node scripts/validate-docs.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

// 路径配置
const PATHS = {
  cards: 'docs/cards',
  stories: 'docs/stories',
  prd: 'docs/prd',
  modules: 'src/modules',
  storiesIndex: 'docs/stories/_index.yaml'
};

// 结果统计
const results = {
  errors: [],
  warnings: [],
  passed: []
};

/**
 * 解析 Markdown 文件的 YAML frontmatter
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch (e) {
    return null;
  }
}

/**
 * 解析 PRD 文件中的 YAML 代码块（PRD 使用不同的格式）
 */
function parsePrdMetadata(content) {
  // 尝试标准 frontmatter
  const frontmatter = parseFrontmatter(content);
  if (frontmatter?.id || frontmatter?.prd_id) {
    return frontmatter;
  }

  // 尝试解析 YAML 代码块 (```yaml ... ```)
  const yamlBlockMatch = content.match(/```yaml\n([\s\S]*?)\n```/);
  if (yamlBlockMatch) {
    try {
      const metadata = yaml.load(yamlBlockMatch[1]);
      // 规范化字段名
      if (metadata?.prd_id && !metadata?.id) {
        metadata.id = metadata.prd_id;
      }
      return metadata;
    } catch (e) {
      return null;
    }
  }

  // 尝试从文件名提取 PRD ID (如 PRD-001-xxx.md → PRD-001)
  return null;
}

/**
 * 从文件名中提取 Story ID (如 US-001-buy-3in1-pass.md → US-001)
 */
function extractStoryIdFromFilename(filename) {
  const match = filename.match(/^(US-\d+[A-Z]?)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * 从内容中提取 Story ID (支持多种格式)
 */
function extractStoryId(content, filename) {
  // 1. 标准 frontmatter: id: US-001
  const frontmatterMatch = content.match(/^---[\s\S]*?^id:\s*["']?(US-\d+[A-Z]?)["']?/m);
  if (frontmatterMatch) return frontmatterMatch[1].toUpperCase();

  // 2. YAML 代码块: story_id: "US-012"
  const yamlBlockMatch = content.match(/story_id:\s*["']?(US-\d+[A-Z]?)["']?/i);
  if (yamlBlockMatch) return yamlBlockMatch[1].toUpperCase();

  // 3. 从文件名提取
  return extractStoryIdFromFilename(filename);
}

/**
 * 读取目录下所有 .md 文件
 */
function readMarkdownFiles(dir) {
  const files = {};
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.md') && !file.startsWith('_')) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // PRD 文件使用特殊解析
      const isPrd = dir.includes('prd');
      const frontmatter = isPrd ? parsePrdMetadata(content) : parseFrontmatter(content);

      // 对于 Stories，尝试多种方式提取 ID
      const storyId = dir.includes('stories') ? extractStoryId(content, file) : null;

      // 对于 PRD，如果没有解析到 id，从文件名提取
      let prdId = null;
      if (isPrd && !frontmatter?.id) {
        const prdMatch = file.match(/^(PRD-\d+)/i);
        if (prdMatch) {
          prdId = prdMatch[1].toUpperCase();
          if (frontmatter) {
            frontmatter.id = prdId;
          }
        }
      }

      files[file] = {
        path: filePath,
        content,
        frontmatter: frontmatter || (prdId ? { id: prdId } : null),
        slug: frontmatter?.slug || file.replace('.md', ''),
        storyId: storyId || frontmatter?.id
      };
    }
  });
  return files;
}

/**
 * 检查 1: 重复卡片检测
 */
function checkDuplicateCards(cards) {
  log.header('检查重复卡片');

  const slugMap = {};
  const oasPathsMap = {};
  let hasIssue = false;

  Object.entries(cards).forEach(([filename, card]) => {
    const slug = card.frontmatter?.slug;
    const oasPaths = card.frontmatter?.oas_paths || [];

    // 检查 slug 重复
    if (slug) {
      if (slugMap[slug]) {
        log.error(`重复 slug "${slug}": ${slugMap[slug]} 和 ${filename}`);
        results.errors.push(`重复 slug: ${slug}`);
        hasIssue = true;
      } else {
        slugMap[slug] = filename;
      }
    }

    // 检查 oas_paths 重复
    oasPaths.forEach(oasPath => {
      if (oasPath && oasPathsMap[oasPath]) {
        log.error(`重复 API 路径 "${oasPath}": ${oasPathsMap[oasPath]} 和 ${filename}`);
        results.errors.push(`重复 API 路径: ${oasPath}`);
        hasIssue = true;
      } else if (oasPath) {
        oasPathsMap[oasPath] = filename;
      }
    });
  });

  if (!hasIssue) {
    log.success(`无重复卡片 (共 ${Object.keys(cards).length} 张)`);
    results.passed.push('无重复卡片');
  }

  return !hasIssue;
}

/**
 * 检查 2: 弃用卡片引用检测
 */
function checkDeprecatedReferences(cards, stories, prds) {
  log.header('检查弃用卡片引用');

  // 找出所有弃用的卡片
  const deprecatedCards = new Set();
  Object.entries(cards).forEach(([filename, card]) => {
    const status = card.frontmatter?.status;
    const deprecated = card.frontmatter?.deprecated;
    if (status?.toLowerCase() === 'deprecated' || deprecated === true) {
      deprecatedCards.add(card.slug);
    }
  });

  if (deprecatedCards.size === 0) {
    log.success('无弃用卡片');
    results.passed.push('无弃用卡片');
    return true;
  }

  log.info(`发现 ${deprecatedCards.size} 个弃用卡片: ${Array.from(deprecatedCards).join(', ')}`);

  let hasIssue = false;

  // 检查 PRD 中的引用
  Object.entries(prds).forEach(([filename, prd]) => {
    const implCards = prd.frontmatter?.implementation_cards || [];
    implCards.forEach(cardRef => {
      if (deprecatedCards.has(cardRef)) {
        log.warn(`PRD ${filename} 引用了弃用卡片: ${cardRef}`);
        results.warnings.push(`${filename} 引用弃用卡片 ${cardRef}`);
        hasIssue = true;
      }
    });
  });

  // 检查 Stories 中的引用
  Object.entries(stories).forEach(([filename, story]) => {
    const storyCards = story.frontmatter?.cards || [];
    storyCards.forEach(cardRef => {
      if (deprecatedCards.has(cardRef)) {
        log.warn(`Story ${filename} 引用了弃用卡片: ${cardRef}`);
        results.warnings.push(`${filename} 引用弃用卡片 ${cardRef}`);
        hasIssue = true;
      }
    });
  });

  // 检查 _index.yaml
  if (fs.existsSync(PATHS.storiesIndex)) {
    const indexContent = fs.readFileSync(PATHS.storiesIndex, 'utf-8');
    deprecatedCards.forEach(cardSlug => {
      // 检查是否在非注释行中引用
      const lines = indexContent.split('\n');
      lines.forEach((line, lineNum) => {
        if (!line.trim().startsWith('#') && line.includes(cardSlug)) {
          // 排除注释中的引用
          const beforeHash = line.split('#')[0];
          if (beforeHash.includes(cardSlug)) {
            log.warn(`_index.yaml:${lineNum + 1} 引用了弃用卡片: ${cardSlug}`);
            results.warnings.push(`_index.yaml 引用弃用卡片 ${cardSlug}`);
            hasIssue = true;
          }
        }
      });
    });
  }

  if (!hasIssue) {
    log.success('无弃用卡片引用问题');
    results.passed.push('无弃用卡片引用');
  }

  return !hasIssue;
}

/**
 * 检查 3: PRD → Stories → Cards 引用链
 */
function checkReferenceChain(cards, stories, prds) {
  log.header('检查引用链完整性');

  const cardSlugs = new Set(Object.values(cards).map(c => c.slug));
  const storySlugs = new Set(Object.values(stories).map(s => s.frontmatter?.id || s.slug));

  let hasIssue = false;

  // 检查 PRD 引用的 Stories 是否存在
  Object.entries(prds).forEach(([filename, prd]) => {
    const relatedStories = prd.frontmatter?.related_stories || [];
    relatedStories.forEach(storyRef => {
      if (!storySlugs.has(storyRef)) {
        log.error(`PRD ${filename} 引用了不存在的 Story: ${storyRef}`);
        results.errors.push(`${filename} 引用不存在的 Story ${storyRef}`);
        hasIssue = true;
      }
    });

    // 检查 PRD 引用的 Cards 是否存在
    const implCards = prd.frontmatter?.implementation_cards || [];
    implCards.forEach(cardRef => {
      if (!cardSlugs.has(cardRef)) {
        log.error(`PRD ${filename} 引用了不存在的 Card: ${cardRef}`);
        results.errors.push(`${filename} 引用不存在的 Card ${cardRef}`);
        hasIssue = true;
      }
    });
  });

  // 检查 Stories 引用的 Cards 是否存在
  Object.entries(stories).forEach(([filename, story]) => {
    const storyCards = story.frontmatter?.cards || [];
    storyCards.forEach(cardRef => {
      if (!cardSlugs.has(cardRef)) {
        log.error(`Story ${filename} 引用了不存在的 Card: ${cardRef}`);
        results.errors.push(`${filename} 引用不存在的 Card ${cardRef}`);
        hasIssue = true;
      }
    });
  });

  if (!hasIssue) {
    log.success('引用链完整，所有引用的 Stories 和 Cards 都存在');
    results.passed.push('引用链完整');
  }

  return !hasIssue;
}

/**
 * 检查 4: Card 状态与代码一致性
 */
function checkCardCodeConsistency(cards) {
  log.header('检查 Card 状态与代码一致性');

  // 建立 API 路径到模块的映射
  const moduleRouters = {};
  if (fs.existsSync(PATHS.modules)) {
    fs.readdirSync(PATHS.modules).forEach(moduleName => {
      const routerPath = path.join(PATHS.modules, moduleName, 'router.ts');
      if (fs.existsSync(routerPath)) {
        const content = fs.readFileSync(routerPath, 'utf-8');
        moduleRouters[moduleName] = {
          path: routerPath,
          content,
          // 提取路由定义
          routes: extractRoutes(content)
        };
      }
    });
  }

  let hasIssue = false;
  const statusSuggestions = [];

  Object.entries(cards).forEach(([filename, card]) => {
    const status = card.frontmatter?.status;
    const oasPaths = card.frontmatter?.oas_paths || [];
    const slug = card.slug;

    if (status?.toLowerCase() === 'deprecated') return; // 跳过弃用卡片

    // 检查 API 路径是否在代码中实现
    oasPaths.forEach(oasPath => {
      if (!oasPath || oasPath === '[]') return;

      const implemented = isRouteImplemented(oasPath, moduleRouters);

      if (implemented && (status === 'Ready' || status === 'Draft')) {
        log.warn(`Card ${slug} 状态为 "${status}" 但 API "${oasPath}" 已在代码中实现，建议更新为 "Done"`);
        results.warnings.push(`${slug} 状态应更新为 Done`);
        statusSuggestions.push({ slug, filename, currentStatus: status, suggestedStatus: 'Done' });
        hasIssue = true;
      } else if (!implemented && status === 'Done') {
        log.warn(`Card ${slug} 状态为 "Done" 但 API "${oasPath}" 未找到实现`);
        results.warnings.push(`${slug} 标记为 Done 但代码未找到`);
        hasIssue = true;
      }
    });
  });

  if (!hasIssue) {
    log.success('Card 状态与代码一致');
    results.passed.push('Card 状态一致');
  } else if (statusSuggestions.length > 0) {
    log.info('\n建议更新以下 Card 状态:');
    statusSuggestions.forEach(s => {
      console.log(`  - ${s.slug}: ${s.currentStatus} → ${s.suggestedStatus}`);
    });
  }

  return !hasIssue;
}

/**
 * 从 router.ts 内容中提取路由
 */
function extractRoutes(content) {
  const routes = [];
  // 匹配 router.get('/path', ...) 等模式
  const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  return routes;
}

/**
 * 检查路由是否已实现
 */
function isRouteImplemented(oasPath, moduleRouters) {
  // 规范化路径 (移除参数占位符的差异)
  const normalizedOasPath = oasPath
    .replace(/\{[^}]+\}/g, ':param')
    .replace(/:[^/]+/g, ':param');

  for (const [moduleName, router] of Object.entries(moduleRouters)) {
    for (const route of router.routes) {
      const normalizedRoute = route.path.replace(/:[^/]+/g, ':param');
      if (normalizedOasPath.includes(normalizedRoute) || normalizedRoute.includes(normalizedOasPath.split('/').pop())) {
        return true;
      }
    }

    // 也检查文件内容是否包含路径关键词
    const pathKeyword = oasPath.split('/').filter(p => p && !p.startsWith('{') && !p.startsWith(':')).pop();
    if (pathKeyword && router.content.includes(pathKeyword)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查 5: Story → PRD 反向引用检查 (business_requirement 字段)
 */
function checkStoryToPrdBacklinks(stories, prds) {
  log.header('检查 Story → PRD 反向引用');

  const prdIds = new Set(Object.values(prds).map(p => p.frontmatter?.id).filter(Boolean));
  let hasIssue = false;

  Object.entries(stories).forEach(([filename, story]) => {
    const businessReq = story.frontmatter?.business_requirement;

    if (!businessReq) {
      log.warn(`Story ${filename} 缺少 business_requirement 字段`);
      results.warnings.push(`${filename} 缺少 business_requirement`);
      hasIssue = true;
    } else if (!prdIds.has(businessReq)) {
      log.error(`Story ${filename} 的 business_requirement "${businessReq}" 指向不存在的 PRD`);
      results.errors.push(`${filename} 引用不存在的 PRD ${businessReq}`);
      hasIssue = true;
    }
  });

  if (!hasIssue) {
    log.success('所有 Story 都正确关联到 PRD');
    results.passed.push('Story → PRD 引用完整');
  }

  return !hasIssue;
}

/**
 * 检查 6: Card → Story 反向引用检查 (related_stories 字段)
 */
function checkCardToStoryBacklinks(cards, stories) {
  log.header('检查 Card → Story 反向引用');

  const storyIds = new Set();
  Object.values(stories).forEach(story => {
    const id = story.storyId || story.frontmatter?.id;
    if (id) storyIds.add(id.toUpperCase());
  });

  let hasIssue = false;
  let cardsWithoutStory = 0;

  Object.entries(cards).forEach(([filename, card]) => {
    const status = card.frontmatter?.status;
    if (status?.toLowerCase() === 'deprecated') return; // 跳过弃用卡片

    const relatedStories = card.frontmatter?.related_stories || [];

    if (relatedStories.length === 0) {
      // 检查是否在某个 Story 的 cards 列表中被引用
      let isReferencedByStory = false;
      Object.values(stories).forEach(story => {
        const storyCards = story.frontmatter?.cards || [];
        if (storyCards.includes(card.slug)) {
          isReferencedByStory = true;
        }
      });

      if (!isReferencedByStory) {
        log.warn(`Card ${card.slug} 未关联任何 Story（既没有 related_stories 也未被任何 Story 引用）`);
        results.warnings.push(`${card.slug} 未关联 Story`);
        cardsWithoutStory++;
        hasIssue = true;
      }
    } else {
      // 检查 related_stories 中的 ID 是否存在
      relatedStories.forEach(storyRef => {
        if (!storyIds.has(storyRef.toUpperCase())) {
          log.error(`Card ${card.slug} 的 related_stories "${storyRef}" 指向不存在的 Story`);
          results.errors.push(`${card.slug} 引用不存在的 Story ${storyRef}`);
          hasIssue = true;
        }
      });
    }
  });

  if (!hasIssue) {
    log.success('所有 Card 都正确关联到 Story');
    results.passed.push('Card → Story 引用完整');
  } else if (cardsWithoutStory > 0) {
    log.info(`${cardsWithoutStory} 个 Card 未关联任何 Story`);
  }

  return !hasIssue;
}

/**
 * 检查 7: PRD ↔ Story 双向一致性
 */
function checkBidirectionalConsistency(stories, prds) {
  log.header('检查 PRD ↔ Story 双向一致性');

  let hasIssue = false;

  // 建立 PRD → Stories 映射
  const prdToStories = {};
  Object.entries(prds).forEach(([filename, prd]) => {
    const prdId = prd.frontmatter?.id;
    if (prdId) {
      prdToStories[prdId] = prd.frontmatter?.related_stories || [];
    }
  });

  // 建立 Story → PRD 映射
  const storyToPrd = {};
  Object.entries(stories).forEach(([filename, story]) => {
    const storyId = story.storyId || story.frontmatter?.id;
    const businessReq = story.frontmatter?.business_requirement;
    if (storyId && businessReq) {
      storyToPrd[storyId.toUpperCase()] = businessReq;
    }
  });

  // 检查双向一致性
  Object.entries(prdToStories).forEach(([prdId, relatedStories]) => {
    relatedStories.forEach(storyId => {
      const storyIdUpper = storyId.toUpperCase();
      if (storyToPrd[storyIdUpper] && storyToPrd[storyIdUpper] !== prdId) {
        log.error(`不一致: PRD ${prdId} 引用 ${storyId}，但该 Story 的 business_requirement 是 ${storyToPrd[storyIdUpper]}`);
        results.errors.push(`双向不一致: ${prdId} ↔ ${storyId}`);
        hasIssue = true;
      }
    });
  });

  // 检查 Story 指向的 PRD 是否在 related_stories 中列出该 Story
  Object.entries(storyToPrd).forEach(([storyId, prdId]) => {
    if (prdToStories[prdId]) {
      const relatedStoriesUpper = prdToStories[prdId].map(s => s.toUpperCase());
      if (!relatedStoriesUpper.includes(storyId)) {
        log.warn(`PRD ${prdId} 的 related_stories 中未列出 ${storyId}（但该 Story 的 business_requirement 指向此 PRD）`);
        results.warnings.push(`${prdId} 未列出关联的 ${storyId}`);
        hasIssue = true;
      }
    }
  });

  if (!hasIssue) {
    log.success('PRD ↔ Story 双向引用一致');
    results.passed.push('PRD ↔ Story 双向一致');
  }

  return !hasIssue;
}

/**
 * 检查 8: 孤儿检测
 */
function checkOrphans(cards, stories, prds) {
  log.header('检查孤儿文档');

  let hasIssue = false;

  // 收集所有被引用的 Card slugs
  const referencedCards = new Set();

  // 从 Stories 收集
  Object.values(stories).forEach(story => {
    const storyCards = story.frontmatter?.cards || [];
    storyCards.forEach(c => referencedCards.add(c));
  });

  // 从 PRDs 收集
  Object.values(prds).forEach(prd => {
    const implCards = prd.frontmatter?.implementation_cards || [];
    implCards.forEach(c => referencedCards.add(c));
  });

  // 检查未被引用的 Cards（排除 Deprecated）
  Object.entries(cards).forEach(([filename, card]) => {
    const status = card.frontmatter?.status;
    if (status?.toLowerCase() === 'deprecated') return;

    if (!referencedCards.has(card.slug)) {
      log.warn(`孤儿 Card: ${card.slug} 未被任何 Story 或 PRD 引用`);
      results.warnings.push(`孤儿 Card: ${card.slug}`);
      hasIssue = true;
    }
  });

  // 收集所有被引用的 Story IDs
  const referencedStories = new Set();
  Object.values(prds).forEach(prd => {
    const relatedStories = prd.frontmatter?.related_stories || [];
    relatedStories.forEach(s => referencedStories.add(s.toUpperCase()));
  });

  // 检查未被 PRD 引用的 Stories
  Object.entries(stories).forEach(([filename, story]) => {
    const storyId = story.storyId || story.frontmatter?.id;
    if (storyId && !referencedStories.has(storyId.toUpperCase())) {
      const businessReq = story.frontmatter?.business_requirement;
      if (businessReq) {
        log.warn(`Story ${storyId} 未被其关联的 PRD (${businessReq}) 的 related_stories 列出`);
        results.warnings.push(`孤儿 Story: ${storyId}`);
        hasIssue = true;
      }
    }
  });

  if (!hasIssue) {
    log.success('无孤儿文档');
    results.passed.push('无孤儿文档');
  }

  return !hasIssue;
}

/**
 * 检查 9: Stories _index.yaml 与独立 Story 文件一致性
 */
function checkStoriesConsistency(stories) {
  log.header('检查 Stories 一致性');

  if (!fs.existsSync(PATHS.storiesIndex)) {
    log.warn('_index.yaml 不存在，跳过一致性检查');
    return true;
  }

  const indexContent = fs.readFileSync(PATHS.storiesIndex, 'utf-8');
  const index = yaml.load(indexContent);

  if (!index?.stories) {
    log.warn('_index.yaml 格式不正确');
    return true;
  }

  let hasIssue = false;

  // 检查 _index.yaml 中的 stories 是否有对应文件
  const indexStoryIds = new Set(index.stories.map(s => s.id));
  const fileStoryIds = new Set();

  Object.values(stories).forEach(story => {
    // 使用 storyId (支持多种格式提取)
    const id = story.storyId || story.frontmatter?.id;
    if (id) fileStoryIds.add(id.toUpperCase());
  });

  // 检查 index 中有但文件中没有的
  indexStoryIds.forEach(id => {
    if (!fileStoryIds.has(id.toUpperCase())) {
      log.warn(`_index.yaml 中的 ${id} 没有对应的独立 Story 文件`);
      results.warnings.push(`${id} 缺少独立文件`);
      hasIssue = true;
    }
  });

  if (!hasIssue) {
    log.success('Stories 索引与文件一致');
    results.passed.push('Stories 一致');
  }

  return !hasIssue;
}

/**
 * 生成报告摘要
 */
function generateSummary() {
  log.header('校验结果摘要');

  console.log(`${colors.green}通过: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.yellow}警告: ${results.warnings.length}${colors.reset}`);
  console.log(`${colors.red}错误: ${results.errors.length}${colors.reset}`);

  if (results.errors.length > 0) {
    console.log(`\n${colors.red}错误列表:${colors.reset}`);
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}警告列表:${colors.reset}`);
    results.warnings.forEach(w => console.log(`  - ${w}`));
  }

  console.log('');

  if (results.errors.length > 0) {
    log.error('校验失败，请修复上述错误');
    return 1;
  } else if (results.warnings.length > 0) {
    log.warn('校验通过，但有警告需要关注');
    return 0;
  } else {
    log.success('校验完全通过！');
    return 0;
  }
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════╗');
  console.log('║     文档一致性校验工具 v1.0            ║');
  console.log('║     PRD → Stories → Cards → Code      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);

  // 读取所有文档
  const cards = readMarkdownFiles(PATHS.cards);
  const stories = readMarkdownFiles(PATHS.stories);
  const prds = readMarkdownFiles(PATHS.prd);

  log.info(`加载了 ${Object.keys(cards).length} 张 Cards`);
  log.info(`加载了 ${Object.keys(stories).length} 个 Stories`);
  log.info(`加载了 ${Object.keys(prds).length} 个 PRDs`);

  // 执行检查
  checkDuplicateCards(cards);
  checkDeprecatedReferences(cards, stories, prds);
  checkReferenceChain(cards, stories, prds);
  checkCardCodeConsistency(cards);
  checkStoryToPrdBacklinks(stories, prds);
  checkCardToStoryBacklinks(cards, stories);
  checkBidirectionalConsistency(stories, prds);
  checkOrphans(cards, stories, prds);
  checkStoriesConsistency(stories);

  // 生成摘要
  const exitCode = generateSummary();
  process.exit(exitCode);
}

// 运行
main();
