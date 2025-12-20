import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Base type for parsed YAML frontmatter
type ParsedFrontmatter = Record<string, unknown>;

export interface MemoMetadata {
  memo_id: string;
  title: string;
  tags: string[];
  audience: string[];
  status: 'Active' | 'Superseded' | 'Archived';
  created: string;
  updated: string;
  evolves_from?: string[];  // Previous versions/related memos
  leads_to?: string[];      // PRDs that came from this thinking
}

export interface MemoDocument {
  filename: string;
  metadata: MemoMetadata;
  content: string;
  title: string;
}

export interface MemoIndexEntry {
  id: string;
  title: string;
  tags: string[];
  audience: string[];
  status: string;
  created: string;
  updated: string;
  leads_to?: string[];
}

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): { metadata: ParsedFrontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      const metadata = yaml.load(match[1]) as ParsedFrontmatter;
      return { metadata, body: match[2] };
    } catch {
      // Continue to fallback
    }
  }

  // Fallback: extract title from first line
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return {
    metadata: { title: titleMatch ? titleMatch[1] : 'Untitled' },
    body: content
  };
}

/**
 * Load memo index from _index.yaml
 */
export function loadMemoIndex(): MemoIndexEntry[] {
  const indexPath = path.resolve(process.cwd(), 'docs', 'memos', '_index.yaml');

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const data = yaml.load(content) as { memos: MemoIndexEntry[] };
    return data.memos || [];
  } catch {
    return [];
  }
}

/**
 * Load all memo documents from docs/memos directory
 */
export function loadMemoDocuments(): MemoDocument[] {
  const memosDir = path.resolve(process.cwd(), 'docs', 'memos');

  if (!fs.existsSync(memosDir)) {
    return [];
  }

  const files = fs.readdirSync(memosDir).filter(f =>
    f.endsWith('.md') && !f.startsWith('_')
  );

  return files.map(filename => {
    const filePath = path.join(memosDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseFrontmatter(content);

    // Extract title from first line if not in metadata
    const titleMatch = body.match(/^#\s+(.+)$/m) || content.match(/^#\s+(.+)$/m);
    const title = String(metadata.title || (titleMatch ? titleMatch[1] : filename));

    return {
      filename,
      metadata: {
        memo_id: String(metadata.memo_id || ''),
        title: title,
        tags: (metadata.tags as string[]) || [],
        audience: (metadata.audience as string[]) || [],
        status: (metadata.status as MemoMetadata['status']) || 'Active',
        created: String(metadata.created || ''),
        updated: String(metadata.updated || ''),
        evolves_from: metadata.evolves_from as string[],
        leads_to: metadata.leads_to as string[]
      },
      content: body || content,
      title: title.replace(/^#+\s*/, '').trim()
    };
  }).sort((a, b) => {
    // Sort by updated date (most recent first)
    return b.metadata.updated.localeCompare(a.metadata.updated);
  });
}

/**
 * Get memo by ID
 */
export function getMemoById(memoId: string): MemoDocument | null {
  const memos = loadMemoDocuments();
  const normalizedId = memoId.startsWith('MEMO-') ? memoId : `MEMO-${memoId}`;

  return memos.find(m =>
    m.metadata.memo_id === memoId ||
    m.metadata.memo_id === normalizedId ||
    m.metadata.memo_id.toLowerCase() === memoId.toLowerCase()
  ) || null;
}

/**
 * Get memos by tag
 */
export function getMemosByTag(tag: string): MemoDocument[] {
  const memos = loadMemoDocuments();
  const normalizedTag = tag.toLowerCase();

  return memos.filter(m =>
    m.metadata.tags.some(t => t.toLowerCase() === normalizedTag)
  );
}

/**
 * Get memos by audience
 */
export function getMemosByAudience(audience: string): MemoDocument[] {
  const memos = loadMemoDocuments();
  const normalizedAudience = audience.toLowerCase();

  return memos.filter(m =>
    m.metadata.audience.some(a => a.toLowerCase() === normalizedAudience)
  );
}

/**
 * Get memos by status
 */
export function getMemosByStatus(status: string): MemoDocument[] {
  const memos = loadMemoDocuments();
  return memos.filter(m =>
    m.metadata.status.toLowerCase() === status.toLowerCase()
  );
}

/**
 * Get all unique tags across all memos
 */
export function getAllMemoTags(): string[] {
  const memos = loadMemoDocuments();
  const tagSet = new Set<string>();

  memos.forEach(m => {
    m.metadata.tags.forEach(t => tagSet.add(t));
  });

  return Array.from(tagSet).sort();
}

/**
 * Get all unique audiences across all memos
 */
export function getAllMemoAudiences(): string[] {
  const memos = loadMemoDocuments();
  const audienceSet = new Set<string>();

  memos.forEach(m => {
    m.metadata.audience.forEach(a => audienceSet.add(a));
  });

  return Array.from(audienceSet).sort();
}

/**
 * Get memo statistics
 */
export function getMemoStats(): {
  total: number;
  byStatus: Record<string, number>;
  byAudience: Record<string, number>;
  topTags: { tag: string; count: number }[];
} {
  const memos = loadMemoDocuments();

  const byStatus: Record<string, number> = {};
  const byAudience: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  memos.forEach(memo => {
    // Count by status
    const status = memo.metadata.status || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Count by audience
    memo.metadata.audience.forEach(audience => {
      byAudience[audience] = (byAudience[audience] || 0) + 1;
    });

    // Count tags
    memo.metadata.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Get top tags sorted by count
  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: memos.length,
    byStatus,
    byAudience,
    topTags
  };
}

/**
 * Search memos by content
 */
export function searchMemos(query: string): MemoDocument[] {
  const memos = loadMemoDocuments();
  const normalizedQuery = query.toLowerCase();

  return memos.filter(m =>
    m.title.toLowerCase().includes(normalizedQuery) ||
    m.content.toLowerCase().includes(normalizedQuery) ||
    m.metadata.tags.some(t => t.toLowerCase().includes(normalizedQuery))
  );
}
