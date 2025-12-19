import { loadPRDDocuments, loadStoriesIndex } from './prdParser';
import { loadCardDocuments } from './cardParser';

export interface ComplianceViolation {
  type: 'error' | 'warning';
  category: string;
  file: string;
  issue: string;
  fix: string;
  impact: string;
}

export interface ComplianceReport {
  timestamp: string;
  overall_score: number;
  total_files: number;
  violations: ComplianceViolation[];
  stats: {
    prds: { total: number; compliant: number; violations: number };
    stories: { total: number; compliant: number; violations: number };
    cards: { total: number; compliant: number; violations: number };
  };
  summary: {
    critical_issues: number;
    warnings: number;
    quick_wins: string[];
  };
}

const VALID_PRD_STATUSES = ['Draft', 'In Progress', 'Done'];
const VALID_STORY_STATUSES = ['Draft', 'In Progress', 'Done'];
const VALID_CARD_STATUSES = ['Ready', 'In Progress', 'Done', 'deprecated', 'Deprecated'];

/**
 * Run comprehensive compliance audit on all documentation
 */
export function runComplianceAudit(): ComplianceReport {
  const violations: ComplianceViolation[] = [];
  const prds = loadPRDDocuments();
  const stories = loadStoriesIndex();
  const cards = loadCardDocuments();

  let prdViolations = 0;
  let storyViolations = 0;
  let cardViolations = 0;

  // Audit PRDs
  prds.forEach(prd => {
    const prdId = prd.metadata.prd_id || prd.filename.replace('.md', '');
    const filename = `docs/prd/${prd.filename}`;

    // Check status validity
    if (prd.metadata.status && !VALID_PRD_STATUSES.includes(prd.metadata.status)) {
      violations.push({
        type: 'warning',
        category: 'PRD Status',
        file: filename,
        issue: `Invalid status: "${prd.metadata.status}"`,
        fix: `Change status to one of: ${VALID_PRD_STATUSES.join(', ')}`,
        impact: 'Status filters and dashboards may not recognize this PRD'
      });
      prdViolations++;
    }

    // Check if related_stories is array
    if (prd.metadata.related_stories && !Array.isArray(prd.metadata.related_stories)) {
      violations.push({
        type: 'error',
        category: 'PRD Metadata',
        file: filename,
        issue: 'related_stories is not an array',
        fix: 'Change to array format: related_stories: ["US-001"]',
        impact: 'Story relationships will not work'
      });
      prdViolations++;
    }

    // Check bidirectional PRD → Story links
    if (prd.metadata.related_stories && Array.isArray(prd.metadata.related_stories)) {
      prd.metadata.related_stories.forEach((storyId: string) => {
        const story = stories.find(s => s.id === storyId);
        if (!story) {
          violations.push({
            type: 'error',
            category: 'Broken Relationship',
            file: filename,
            issue: `PRD links to non-existent story: ${storyId}`,
            fix: `Remove "${storyId}" from related_stories OR create story ${storyId}`,
            impact: 'Broken link on sitemap'
          });
          prdViolations++;
        } else if (story.business_requirement !== prdId) {
          violations.push({
            type: 'error',
            category: 'One-Way Relationship',
            file: filename,
            issue: `PRD links to ${storyId}, but ${storyId} links to ${story.business_requirement}`,
            fix: `Update ${storyId}.business_requirement to "${prdId}" in docs/stories/_index.yaml`,
            impact: 'Story won\'t appear under this PRD on sitemap'
          });
          prdViolations++;
        }
      });
    }
  });

  // Audit Stories
  stories.forEach(story => {
    const storyId = story.id;
    const filename = `docs/stories/_index.yaml (${storyId})`;

    // Check status validity
    if (!VALID_STORY_STATUSES.includes(story.status)) {
      violations.push({
        type: 'error',
        category: 'Story Status',
        file: filename,
        issue: `Invalid status: "${story.status}"`,
        fix: `Change status to one of: ${VALID_STORY_STATUSES.join(', ')}`,
        impact: 'Status filters will not work correctly'
      });
      storyViolations++;
    }

    // Check business_requirement exists
    if (!story.business_requirement) {
      violations.push({
        type: 'error',
        category: 'Missing Field',
        file: filename,
        issue: 'Missing business_requirement field',
        fix: 'Add business_requirement: "PRD-###" to link to parent PRD',
        impact: 'Story appears orphaned, won\'t show under any PRD'
      });
      storyViolations++;
    } else {
      // Check if PRD exists
      const prd = prds.find(p =>
        p.metadata.prd_id === story.business_requirement ||
        p.metadata.prd_id?.toLowerCase() === story.business_requirement?.toLowerCase()
      );
      if (!prd) {
        violations.push({
          type: 'error',
          category: 'Broken Relationship',
          file: filename,
          issue: `Story links to non-existent PRD: ${story.business_requirement}`,
          fix: `Create PRD ${story.business_requirement} OR update business_requirement to existing PRD`,
          impact: 'Story appears orphaned on /stories page'
        });
        storyViolations++;
      } else {
        // Check bidirectional link
        const prdStories = prd.metadata.related_stories || [];
        if (!prdStories.includes(storyId)) {
          violations.push({
            type: 'error',
            category: 'One-Way Relationship',
            file: filename,
            issue: `Story links to ${story.business_requirement}, but PRD doesn't link back`,
            fix: `Add "${storyId}" to related_stories in ${prd.filename}`,
            impact: 'Story won\'t appear in PRD\'s story list on sitemap'
          });
          storyViolations++;
        }
      }
    }

    // Check Story → Card relationships
    const storyCards = story.cards || [];
    storyCards.forEach((cardSlug: string) => {
      const card = cards.find(c => c.metadata.slug === cardSlug);
      if (!card) {
        violations.push({
          type: 'warning',
          category: 'Broken Card Link',
          file: filename,
          issue: `Story references non-existent card: ${cardSlug}`,
          fix: `Create card docs/cards/${cardSlug}.md OR remove from cards array`,
          impact: 'Card shows as "Not Found" on sitemap'
        });
        storyViolations++;
      } else {
        // Check bidirectional link
        const cardStories = card.metadata.related_stories || [];
        if (!cardStories.includes(storyId)) {
          violations.push({
            type: 'error',
            category: 'One-Way Relationship',
            file: filename,
            issue: `Story lists card "${cardSlug}", but card doesn't link back`,
            fix: `Add "${storyId}" to related_stories in docs/cards/${cardSlug}.md`,
            impact: 'Navigation from card back to story will fail'
          });
          storyViolations++;
        }
      }
    });
  });

  // Audit Cards
  cards.forEach(card => {
    const slug = card.metadata.slug;
    const filename = `docs/cards/${card.filename}`;

    // Check slug matches filename
    const expectedSlug = card.filename.replace('.md', '');
    if (slug !== expectedSlug) {
      violations.push({
        type: 'error',
        category: 'Slug Mismatch',
        file: filename,
        issue: `Slug "${slug}" doesn't match filename "${expectedSlug}"`,
        fix: `Change slug to "${expectedSlug}" OR rename file to ${slug}.md`,
        impact: 'Card routing will fail, card won\'t be accessible'
      });
      cardViolations++;
    }

    // Check status validity
    if (card.metadata.status && !VALID_CARD_STATUSES.includes(card.metadata.status)) {
      violations.push({
        type: 'warning',
        category: 'Card Status',
        file: filename,
        issue: `Invalid status: "${card.metadata.status}"`,
        fix: `Change status to one of: ${VALID_CARD_STATUSES.join(', ')}`,
        impact: 'Status display may be incorrect'
      });
      cardViolations++;
    }

    // Check related_stories exists
    if (!card.metadata.related_stories) {
      violations.push({
        type: 'error',
        category: 'Missing Field',
        file: filename,
        issue: 'Missing related_stories field',
        fix: 'Add related_stories: ["US-###"] to link to parent story',
        impact: 'Card appears orphaned, bidirectional navigation broken'
      });
      cardViolations++;
    } else if (!Array.isArray(card.metadata.related_stories)) {
      violations.push({
        type: 'error',
        category: 'Invalid Field Type',
        file: filename,
        issue: 'related_stories is not an array',
        fix: 'Change to array format: related_stories: ["US-001"]',
        impact: 'Story relationships will not work'
      });
      cardViolations++;
    } else {
      // Check Card → Story bidirectional links
      card.metadata.related_stories.forEach((storyId: string) => {
        const story = stories.find(s => s.id === storyId);
        if (!story) {
          violations.push({
            type: 'warning',
            category: 'Broken Relationship',
            file: filename,
            issue: `Card links to non-existent story: ${storyId}`,
            fix: `Remove "${storyId}" from related_stories OR create story ${storyId}`,
            impact: 'Story link will be broken'
          });
          cardViolations++;
        } else {
          const storyCardList = story.cards || [];
          if (!storyCardList.includes(slug)) {
            violations.push({
              type: 'error',
              category: 'One-Way Relationship',
              file: filename,
              issue: `Card links to ${storyId}, but story doesn't list this card`,
              fix: `Add "${slug}" to cards array in docs/stories/_index.yaml under ${storyId}`,
              impact: 'Card won\'t appear in story\'s card list on sitemap'
            });
            cardViolations++;
          }
        }
      });
    }
  });

  // Calculate stats
  const totalFiles = prds.length + stories.length + cards.length;
  const totalViolations = violations.length;
  const overallScore = Math.round(((totalFiles - totalViolations) / totalFiles) * 100);

  // Generate quick wins (most common fixes)
  const quickWins: string[] = [];
  const statusIssues = violations.filter(v => v.category.includes('Status')).length;
  if (statusIssues > 0) {
    quickWins.push(`Fix ${statusIssues} invalid status values (bulk replace in YAML files)`);
  }
  const missingFields = violations.filter(v => v.category === 'Missing Field').length;
  if (missingFields > 0) {
    quickWins.push(`Add ${missingFields} missing required fields to frontmatter`);
  }
  const oneWay = violations.filter(v => v.category === 'One-Way Relationship').length;
  if (oneWay > 0) {
    quickWins.push(`Fix ${oneWay} one-way relationships (add bidirectional links)`);
  }

  return {
    timestamp: new Date().toISOString(),
    overall_score: overallScore,
    total_files: totalFiles,
    violations: violations.sort((a, b) => {
      if (a.type === 'error' && b.type === 'warning') return -1;
      if (a.type === 'warning' && b.type === 'error') return 1;
      return 0;
    }),
    stats: {
      prds: {
        total: prds.length,
        compliant: prds.length - prdViolations,
        violations: prdViolations
      },
      stories: {
        total: stories.length,
        compliant: stories.length - storyViolations,
        violations: storyViolations
      },
      cards: {
        total: cards.length,
        compliant: cards.length - cardViolations,
        violations: cardViolations
      }
    },
    summary: {
      critical_issues: violations.filter(v => v.type === 'error').length,
      warnings: violations.filter(v => v.type === 'warning').length,
      quick_wins: quickWins
    }
  };
}
