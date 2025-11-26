import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PRDMetadata {
  prd_id: string;
  product_area?: string;
  owner?: string;
  status?: string;
  created_date?: string;
  last_updated?: string;
  related_stories?: string[];
  implementation_cards?: string[];
  enhances?: string;
  enables?: string;
  deadline?: string;
}

export interface PRDDocument {
  filename: string;
  metadata: PRDMetadata;
  content: string;
  title: string;
}

export interface StoryInfo {
  id: string;
  title: string;
  status: string;
  business_requirement?: string;
}

/**
 * Parse YAML frontmatter from markdown file
 * Handles both --- frontmatter and ```yaml code blocks
 */
function parseFrontmatter(content: string): { metadata: any; body: string } {
  // Try YAML code block format first (used in PRD files)
  const yamlBlockRegex = /^#\s+[^\n]+\n\n##\s+Document\s+Metadata\s*\n```yaml\s*\n([\s\S]*?)\n```\s*\n\n([\s\S]*)$/;
  const yamlMatch = content.match(yamlBlockRegex);
  
  if (yamlMatch) {
    try {
      const metadata = yaml.load(yamlMatch[1]) as any;
      return { metadata, body: yamlMatch[2] };
    } catch (e) {
      // If parsing fails, continue to other methods
    }
  }
  
  // Try standard frontmatter format
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    try {
      const metadata = yaml.load(match[1]) as any;
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
      const metadata = yaml.load(metadataMatch[1]) as any;
      const body = content.replace(/```yaml\s*\n[\s\S]*?\n```\s*\n?/, '').trim();
      return { metadata, body };
    } catch (e2) {
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
 * Load all PRD documents from docs/prd directory
 */
export function loadPRDDocuments(): PRDDocument[] {
  const prdDir = path.resolve(process.cwd(), 'docs', 'prd');
  const files = fs.readdirSync(prdDir).filter(f => f.endsWith('.md'));
  
  return files.map(filename => {
    const filePath = path.join(prdDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseFrontmatter(content);
    
    // Extract title from first line if not in metadata
    const titleMatch = body.match(/^#\s+(.+)$/m) || content.match(/^#\s+(.+)$/m);
    const title = metadata.title || metadata.prd_id || (titleMatch ? titleMatch[1] : filename);
    
    return {
      filename,
      metadata: metadata as PRDMetadata,
      content: body || content,
      title: title.replace(/^#+\s*/, '').trim()
    };
  }).sort((a, b) => {
    // Sort by PRD ID
    const idA = a.metadata.prd_id || '';
    const idB = b.metadata.prd_id || '';
    return idA.localeCompare(idB);
  });
}

/**
 * Load stories index and return story information
 */
export function loadStoriesIndex(): StoryInfo[] {
  const storiesIndexPath = path.resolve(process.cwd(), 'docs', 'stories', '_index.yaml');
  
  if (!fs.existsSync(storiesIndexPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(storiesIndexPath, 'utf-8');
    const data = yaml.load(content) as { stories?: any[] };
    
    if (!data.stories) {
      return [];
    }
    
    return data.stories.map((story: any) => ({
      id: story.id || '',
      title: story.title || '',
      status: story.status || 'Unknown',
      business_requirement: story.business_requirement
    }));
  } catch (error) {
    console.error('Error loading stories index:', error);
    return [];
  }
}

/**
 * Get stories related to a PRD
 */
export function getRelatedStories(prdId: string, stories: StoryInfo[]): StoryInfo[] {
  // Normalize PRD ID - handle both "PRD-001" and "001" formats
  const normalizedPrdId = prdId.startsWith('PRD-') ? prdId : `PRD-${prdId}`;
  
  return stories.filter(story => {
    if (!story.business_requirement) return false;
    
    // Match exact PRD ID or normalized version
    const storyPrd = story.business_requirement;
    return storyPrd === prdId || 
           storyPrd === normalizedPrdId ||
           storyPrd.toLowerCase() === prdId.toLowerCase() ||
           storyPrd.toLowerCase() === normalizedPrdId.toLowerCase();
  });
}

/**
 * Get story by ID
 */
export function getStoryById(storyId: string): { content: string; metadata: any } | null {
  // Normalize story ID (ensure it starts with US-)
  const normalizedId = storyId.startsWith('US-') ? storyId : `US-${storyId}`;
  
  // Try different naming patterns
  const possiblePaths = [
    path.resolve(process.cwd(), 'docs', 'stories', `${normalizedId}.md`),
    path.resolve(process.cwd(), 'docs', 'stories', `${storyId}.md`),
    path.resolve(process.cwd(), 'docs', 'stories', `${normalizedId.toLowerCase()}.md`),
    path.resolve(process.cwd(), 'docs', 'stories', `${storyId.toLowerCase()}.md`),
  ];
  
  for (const storyPath of possiblePaths) {
    if (fs.existsSync(storyPath)) {
      const content = fs.readFileSync(storyPath, 'utf-8');
      const { metadata, body } = parseFrontmatter(content);
      return { content: body || content, metadata };
    }
  }
  
  return null;
}

