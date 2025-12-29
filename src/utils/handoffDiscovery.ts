/**
 * 自动发现跨 PRD Handoff Points
 *
 * 数据来源:
 * - Story 的 depends_on 字段 (跨 PRD 依赖)
 * - Story 的用户目标 (自动生成流程描述)
 * - Card 的 oas_paths (API 端点)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ============ 类型定义 ============

export interface UserGoal {
  role: string;      // "已购票的客户"
  want: string;      // "选择特定的日期和时段进行预约"
  so_that: string;   // "规划行程，避免场馆过度拥挤"
}

export interface StoryWithGoal {
  id: string;
  title: string;
  business_requirement: string;  // PRD ID
  depends_on?: string[];
  cards?: string[];
  userGoal?: UserGoal;
}

export interface CardInfo {
  slug: string;
  title: string;
  oas_paths?: string[];
  related_stories?: string[];
}

export interface Handoff {
  source: {
    prd: string;
    story?: string;
    card?: string;
    role?: string;
    action?: string;
    paths?: string[];
  };
  target: {
    prd: string;
    story?: string;
    card?: string;
    role?: string;
    action?: string;
    paths?: string[];
  };
  userFlow: string;
  gapQuestion: string;
  type: 'story_dependency' | 'card_dependency';
  autoDiscovered: boolean;
}

// ============ 解析函数 ============

/**
 * 从 Story markdown 内容中解析用户目标
 * 格式: **作为** X **我想要** Y **以便于** Z
 */
export function parseUserGoal(content: string): UserGoal | null {
  // 匹配标准格式
  const pattern = /\*\*作为\*\*\s*(.+?)\s*\*\*我想要\*\*\s*(.+?)\s*\*\*以便于\*\*\s*(.+?)(?:\n|$)/s;
  const match = content.match(pattern);

  if (match) {
    return {
      role: match[1].trim(),
      want: match[2].trim(),
      so_that: match[3].trim()
    };
  }

  // 备用格式: As a... I want... So that...
  const enPattern = /\*\*As a?\*\*\s*(.+?)\s*\*\*I want to?\*\*\s*(.+?)\s*\*\*So that\*\*\s*(.+?)(?:\n|$)/si;
  const enMatch = content.match(enPattern);

  if (enMatch) {
    return {
      role: enMatch[1].trim(),
      want: enMatch[2].trim(),
      so_that: enMatch[3].trim()
    };
  }

  return null;
}

/**
 * 加载 Story 完整信息 (包含用户目标)
 */
export function loadStoriesWithGoals(): StoryWithGoal[] {
  const storiesDir = path.resolve(process.cwd(), 'docs', 'stories');
  const indexPath = path.join(storiesDir, '_index.yaml');

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  try {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const indexData = yaml.load(indexContent) as { stories?: any[] };

    if (!indexData.stories) {
      return [];
    }

    return indexData.stories.map((story: any) => {
      const storyInfo: StoryWithGoal = {
        id: story.id || '',
        title: story.title || '',
        business_requirement: story.business_requirement || '',
        depends_on: story.depends_on || [],
        cards: story.cards || []
      };

      // 尝试读取 Story markdown 文件获取用户目标
      const storyFileName = findStoryFile(storiesDir, story.id);
      if (storyFileName) {
        const storyContent = fs.readFileSync(path.join(storiesDir, storyFileName), 'utf-8');
        const userGoal = parseUserGoal(storyContent);
        if (userGoal) {
          storyInfo.userGoal = userGoal;
        }

        // 从 frontmatter 中读取 depends_on (如果索引中没有)
        if (!storyInfo.depends_on || storyInfo.depends_on.length === 0) {
          const frontmatterMatch = storyContent.match(/^---\s*\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            try {
              const frontmatter = yaml.load(frontmatterMatch[1]) as any;
              if (frontmatter.depends_on) {
                storyInfo.depends_on = Array.isArray(frontmatter.depends_on)
                  ? frontmatter.depends_on
                  : [frontmatter.depends_on];
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      return storyInfo;
    });
  } catch (error) {
    console.error('Error loading stories with goals:', error);
    return [];
  }
}

/**
 * 查找 Story 文件名 (支持多种命名格式)
 */
function findStoryFile(storiesDir: string, storyId: string): string | null {
  const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));

  // 尝试匹配 US-001-xxx.md 或 US-001.md 格式
  const normalizedId = storyId.toUpperCase();

  for (const file of files) {
    const upperFile = file.toUpperCase();
    if (upperFile.startsWith(normalizedId + '-') || upperFile === normalizedId + '.MD') {
      return file;
    }
  }

  return null;
}

/**
 * 加载 Card 索引信息
 */
export function loadCardsIndex(): CardInfo[] {
  const cardsIndexPath = path.resolve(process.cwd(), 'docs', 'cards', '_index.yaml');

  if (!fs.existsSync(cardsIndexPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(cardsIndexPath, 'utf-8');
    const data = yaml.load(content) as { cards?: any[] };

    if (!data.cards) {
      return [];
    }

    return data.cards.map((card: any) => ({
      slug: card.slug || '',
      title: card.title || '',
      oas_paths: card.oas_paths || [],
      related_stories: card.related_stories || []
    }));
  } catch (error) {
    console.error('Error loading cards index:', error);
    return [];
  }
}

// ============ 自动发现算法 ============

/**
 * 自动发现跨 PRD Handoff Points
 */
export function discoverCrossPRDHandoffs(): Handoff[] {
  const stories = loadStoriesWithGoals();
  const cards = loadCardsIndex();
  const handoffs: Handoff[] = [];

  // 构建 Story ID → Story 映射
  const storyMap = new Map<string, StoryWithGoal>();
  stories.forEach(s => storyMap.set(s.id, s));

  // 构建 Card slug → Card 映射
  const cardMap = new Map<string, CardInfo>();
  cards.forEach(c => cardMap.set(c.slug, c));

  // 构建 Story → PRD 映射
  const storyToPRD = new Map<string, string>();
  stories.forEach(s => {
    if (s.business_requirement) {
      storyToPRD.set(s.id, s.business_requirement);
    }
  });

  // 方法1: 从 Story depends_on 发现跨 PRD 依赖
  for (const story of stories) {
    if (!story.depends_on || story.depends_on.length === 0) continue;

    const sourcePRD = story.business_requirement;
    if (!sourcePRD) continue;

    for (const depId of story.depends_on) {
      const depStory = storyMap.get(depId);
      if (!depStory) continue;

      const targetPRD = depStory.business_requirement;
      if (!targetPRD || sourcePRD === targetPRD) continue;

      // 找到跨 PRD 依赖!
      const sourceCards = cards.filter(c =>
        c.related_stories?.includes(story.id)
      );
      const targetCards = cards.filter(c =>
        c.related_stories?.includes(depId)
      );

      handoffs.push({
        source: {
          prd: sourcePRD,
          story: story.id,
          role: story.userGoal?.role,
          action: story.userGoal?.want,
          paths: sourceCards.flatMap(c => c.oas_paths || []).slice(0, 3)
        },
        target: {
          prd: targetPRD,
          story: depId,
          role: depStory.userGoal?.role,
          action: depStory.userGoal?.want,
          paths: targetCards.flatMap(c => c.oas_paths || []).slice(0, 3)
        },
        userFlow: generateUserFlow(depStory, story),
        gapQuestion: generateGapQuestion(depStory, story, targetCards, sourceCards),
        type: 'story_dependency',
        autoDiscovered: true
      });
    }
  }

  // 去重 (基于 source PRD + target PRD + story IDs)
  const seen = new Set<string>();
  const uniqueHandoffs = handoffs.filter(h => {
    const key = `${h.source.prd}-${h.target.prd}-${h.source.story}-${h.target.story}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueHandoffs;
}

/**
 * 自动生成用户流程描述
 */
function generateUserFlow(targetStory: StoryWithGoal, sourceStory: StoryWithGoal): string {
  const targetAction = targetStory.userGoal?.want || targetStory.title;
  const sourceAction = sourceStory.userGoal?.want || sourceStory.title;

  // 简化描述
  const simplify = (text: string): string => {
    return text
      .replace(/^(我想要|I want to?)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
  };

  return `${simplify(targetAction)} → ${simplify(sourceAction)}`;
}

/**
 * 自动生成 Gap Question
 */
function generateGapQuestion(
  targetStory: StoryWithGoal,
  sourceStory: StoryWithGoal,
  targetCards: CardInfo[],
  sourceCards: CardInfo[]
): string {
  const targetPath = targetCards[0]?.oas_paths?.[0] || targetStory.id;
  const sourcePath = sourceCards[0]?.oas_paths?.[0] || sourceStory.id;

  return `是否有 E2E 测试覆盖从 ${targetPath} 到 ${sourcePath} 的完整流程？`;
}

/**
 * 获取 Handoff 的简短摘要 (用于 CLI 输出)
 */
export function getHandoffsSummary(handoffs: Handoff[]): string {
  if (handoffs.length === 0) {
    return '未发现跨 PRD Handoff Points';
  }

  const lines = [
    `发现 ${handoffs.length} 个跨 PRD Handoff Points:`,
    ''
  ];

  for (const h of handoffs) {
    lines.push(`  ${h.target.prd} → ${h.source.prd}`);
    lines.push(`    ${h.userFlow}`);
    lines.push('');
  }

  return lines.join('\n');
}
