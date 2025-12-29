import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Base type for parsed YAML frontmatter (allows any fields)
type ParsedFrontmatter = Record<string, unknown>;

export interface CardMetadata {
  card: string;
  slug: string;
  team?: string;
  oas_paths?: string[];
  migrations?: string[];
  status?: string;
  readiness?: string;
  branch?: string;
  pr?: string;
  newman_report?: string;
  last_update?: string;
  related_stories?: string[];
}

export interface CardDocument {
  filename: string;
  metadata: CardMetadata;
  content: string;
  title: string;
}

/**
 * Parse YAML frontmatter from markdown file
 * Handles both --- frontmatter and ```yaml code blocks
 */
function parseFrontmatter(content: string): { metadata: ParsedFrontmatter; body: string } {
  // Try standard frontmatter format (used in cards)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      const metadata = yaml.load(match[1]) as ParsedFrontmatter;
      return { metadata, body: match[2] };
    } catch (e) {
      // Continue to fallback
    }
  }

  // Try simple YAML code block anywhere in content
  const metadataBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
  const metadataMatch = content.match(metadataBlockRegex);
  if (metadataMatch) {
    try {
      const metadata = yaml.load(metadataMatch[1]) as ParsedFrontmatter;
      const body = content.replace(/```yaml\s*\n[\s\S]*?\n```\s*\n?/, '').trim();
      return { metadata, body };
    } catch (e2) {
      // Continue to fallback
    }
  }

  // Fallback: extract title from first line
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return {
    metadata: { card: titleMatch ? titleMatch[1] : 'Untitled' },
    body: content
  };
}

/**
 * Load all card documents from docs/cards directory
 */
export function loadCardDocuments(): CardDocument[] {
  const cardsDir = path.resolve(process.cwd(), 'docs', 'cards');

  if (!fs.existsSync(cardsDir)) {
    return [];
  }

  const files = fs.readdirSync(cardsDir).filter(f => f.endsWith('.md'));

  return files.map(filename => {
    const filePath = path.join(cardsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseFrontmatter(content);

    // Extract title from first line if not in metadata
    const titleMatch = body.match(/^#\s+(.+)$/m) || content.match(/^#\s+(.+)$/m);
    const title = String(metadata.card || (titleMatch ? titleMatch[1] : filename));

    return {
      filename,
      metadata: metadata as unknown as CardMetadata,
      content: body || content,
      title: title.replace(/^#+\s*/, '').trim()
    };
  }).sort((a, b) => {
    // Sort by slug
    const slugA = a.metadata.slug || a.filename;
    const slugB = b.metadata.slug || b.filename;
    return slugA.localeCompare(slugB);
  });
}

/**
 * Get card by slug
 */
export function getCardBySlug(slug: string): CardDocument | null {
  const cards = loadCardDocuments();
  return cards.find(c =>
    c.metadata.slug === slug ||
    c.metadata.slug?.toLowerCase() === slug.toLowerCase() ||
    c.filename.toLowerCase() === `${slug.toLowerCase()}.md`
  ) || null;
}

/**
 * Get cards related to a story
 */
export function getCardsForStory(storyId: string): CardDocument[] {
  const cards = loadCardDocuments();
  const normalizedId = storyId.startsWith('US-') ? storyId : `US-${storyId}`;

  return cards.filter(card => {
    if (!card.metadata.related_stories) return false;
    return card.metadata.related_stories.some(s =>
      s === storyId ||
      s === normalizedId ||
      s.toLowerCase() === storyId.toLowerCase() ||
      s.toLowerCase() === normalizedId.toLowerCase()
    );
  });
}

/**
 * Get cards by status
 */
export function getCardsByStatus(status: string): CardDocument[] {
  const cards = loadCardDocuments();
  return cards.filter(c =>
    c.metadata.status?.toLowerCase() === status.toLowerCase()
  );
}

/**
 * Get cards by team
 */
export function getCardsByTeam(team: string): CardDocument[] {
  const cards = loadCardDocuments();
  return cards.filter(c =>
    c.metadata.team?.toLowerCase() === team.toLowerCase()
  );
}

/**
 * Get card statistics
 */
export function getCardStats(): {
  total: number;
  byStatus: Record<string, number>;
  byTeam: Record<string, number>;
} {
  const cards = loadCardDocuments();

  const byStatus: Record<string, number> = {};
  const byTeam: Record<string, number> = {};

  cards.forEach(card => {
    const status = card.metadata.status || 'Unknown';
    const team = card.metadata.team || 'Unassigned';

    byStatus[status] = (byStatus[status] || 0) + 1;
    byTeam[team] = (byTeam[team] || 0) + 1;
  });

  return {
    total: cards.length,
    byStatus,
    byTeam
  };
}

/**
 * Contract section extracted from Card
 */
export interface ContractSection {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

/**
 * Extract OAS 3.0 Contract section from Card content
 * Matches "## 2) Contract" or similar section headers
 */
export function extractContract(content: string): ContractSection | null {
  // Match Contract section header (handles variations like "## 2) Contract", "## Contract")
  const contractSectionRegex = /##\s*(?:\d+\)\s*)?Contract.*?\n```yaml\n([\s\S]*?)\n```/i;
  const match = content.match(contractSectionRegex);

  if (!match) {
    return null;
  }

  try {
    const contractYaml = yaml.load(match[1]) as ContractSection;
    return contractYaml;
  } catch (e) {
    // Invalid YAML in Contract section
    return null;
  }
}

/**
 * Load all Cards with their Contract sections
 */
export function loadCardsWithContracts(): Array<{
  card: CardDocument;
  contract: ContractSection | null;
}> {
  const cards = loadCardDocuments();

  return cards.map(card => ({
    card,
    contract: extractContract(card.content)
  }));
}
