#!/usr/bin/env node
/**
 * Card 索引同步脚本
 *
 * 从 docs/cards/*.md 提取 frontmatter 生成 _index.yaml
 *
 * 用法:
 *   npm run sync:card-index
 *   node scripts/sync-card-index.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CARDS_DIR = path.resolve(process.cwd(), 'docs', 'cards');
const INDEX_FILE = path.join(CARDS_DIR, '_index.yaml');

/**
 * 解析 Markdown 文件的 YAML frontmatter
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      return yaml.load(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 从文件内容提取标题
 */
function extractTitle(content, metadata) {
  if (metadata?.card) return metadata.card;
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : 'Untitled';
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr.split('T')[0];
  }
}

/**
 * 加载所有 Card 文档
 */
function loadCards() {
  if (!fs.existsSync(CARDS_DIR)) {
    console.error('错误: docs/cards 目录不存在');
    process.exit(1);
  }

  const files = fs.readdirSync(CARDS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'));

  const cards = [];

  for (const filename of files) {
    const filePath = path.join(CARDS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = parseFrontmatter(content);

    if (!metadata) {
      console.warn(`警告: ${filename} 无法解析 frontmatter，跳过`);
      continue;
    }

    cards.push({
      slug: metadata.slug || filename.replace('.md', ''),
      title: extractTitle(content, metadata),
      status: metadata.status || 'Unknown',
      team: metadata.team || 'Unassigned',
      related_stories: metadata.related_stories || [],
      oas_paths: metadata.oas_paths || [],
      last_update: formatDate(metadata.last_update)
    });
  }

  // 按 slug 排序
  return cards.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * 计算统计信息
 */
function computeStats(cards) {
  const byStatus = {};
  const byTeam = {};

  for (const card of cards) {
    byStatus[card.status] = (byStatus[card.status] || 0) + 1;
    byTeam[card.team] = (byTeam[card.team] || 0) + 1;
  }

  return {
    total: cards.length,
    by_status: byStatus,
    by_team: byTeam
  };
}

/**
 * 生成索引内容
 */
function generateIndex(cards) {
  const stats = computeStats(cards);

  const index = {
    summary: stats,
    in_progress: cards
      .filter(c => c.status === 'In Progress')
      .map(c => ({
        slug: c.slug,
        story: c.related_stories[0] || 'N/A',
        started: c.last_update
      })),
    drafts: cards
      .filter(c => c.status === 'Draft')
      .map(c => ({
        slug: c.slug,
        story: c.related_stories[0] || 'N/A'
      })),
    cards: cards
  };

  return index;
}

/**
 * 生成 YAML 头部注释
 */
function generateHeader() {
  const now = new Date().toISOString().split('T')[0];
  return `# Card 索引文件 - 由脚本自动生成
# 用于快速查询 Card 状态、支持上下文恢复
#
# 同步命令: npm run sync:card-index
# 最后同步: ${now}
# 生成器: scripts/sync-card-index.js

`;
}

/**
 * 主函数
 */
function main() {
  console.log('同步 Card 索引...');

  // 加载 Cards
  const cards = loadCards();
  console.log(`找到 ${cards.length} 个 Card 文件`);

  // 生成索引
  const index = generateIndex(cards);

  // 转换为 YAML
  const yamlContent = yaml.dump(index, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false
  });

  // 写入文件
  const output = generateHeader() + yamlContent;
  fs.writeFileSync(INDEX_FILE, output, 'utf-8');

  // 输出统计
  console.log('\n索引统计:');
  console.log(`  总计: ${index.summary.total} 个 Card`);
  console.log(`  状态分布:`);
  for (const [status, count] of Object.entries(index.summary.by_status)) {
    console.log(`    - ${status}: ${count}`);
  }
  console.log(`  进行中: ${index.in_progress.length} 个`);
  console.log(`  草稿: ${index.drafts.length} 个`);

  console.log(`\n✅ 索引已写入: ${INDEX_FILE}`);
}

main();
