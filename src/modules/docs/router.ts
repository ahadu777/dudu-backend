import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { markdownToHtml } from '../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex, getRelatedStories } from '../../utils/prdParser';
import { loadCardDocuments, getCardBySlug, getCardStats } from '../../utils/cardParser';
import { findStoriesUsingCard, findPRDForStory, buildSitemap } from '../../utils/sitemapBuilder';
import { runComplianceAudit } from '../../utils/complianceAuditor';
import { loadTestCoverageData, getCoverageStats } from '../../utils/coverageParser';
import { baseLayout, sharedStyles } from './templates/base';
import { componentStyles, pageHeader, backLink, metadataSection, statsBar } from './templates/components';

const router = Router();

// PRD List styles
const prdListStyles = `
.prd-list {
  display: grid;
  gap: 20px;
}
.prd-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}
.prd-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.prd-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}
.prd-title {
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}
.prd-title a {
  color: #3498db;
  text-decoration: none;
}
.prd-title a:hover {
  text-decoration: underline;
  color: #2980b9;
}
.prd-id {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s;
}
.prd-id:hover {
  background: #2980b9;
}
.prd-id-link {
  text-decoration: none;
}
.prd-meta {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: #7f8c8d;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.stories-section-inline {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}
.stories-title-inline {
  font-size: 0.95em;
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
}
.stories-list-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.story-badge-inline {
  display: inline-block;
  padding: 4px 10px;
  background: #e8f4f8;
  border: 1px solid #bee5eb;
  border-radius: 4px;
  font-size: 0.85em;
}
.story-badge-inline a {
  color: #0c5460;
  text-decoration: none;
  font-weight: 500;
}
.story-badge-inline a:hover {
  text-decoration: underline;
}
`;

// Card grid styles
const cardGridStyles = `
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}
.card-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}
.card-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}
.card-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}
.card-title a {
  color: #3498db;
  text-decoration: none;
}
.card-title a:hover {
  text-decoration: underline;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge.Done {
  background: #d4edda;
  color: #155724;
}
.status-badge.Ready {
  background: #cce5ff;
  color: #004085;
}
.status-badge.In.Progress, .status-badge.PR {
  background: #fff3cd;
  color: #856404;
}
.status-badge.Deprecated {
  background: #f8d7da;
  color: #721c24;
}
.card-meta {
  font-size: 0.85em;
  color: #7f8c8d;
  margin-bottom: 10px;
}
.card-meta div {
  margin-bottom: 4px;
}
.related-stories {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}
.related-stories-title {
  font-size: 0.85em;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}
.story-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.story-tag {
  display: inline-block;
  padding: 3px 8px;
  background: #e8f4f8;
  border: 1px solid #bee5eb;
  border-radius: 3px;
  font-size: 0.75em;
  color: #0c5460;
  text-decoration: none;
}
.story-tag:hover {
  background: #d1ecf1;
}
`;

// Story list styles
const storyListStyles = `
.story-list {
  display: grid;
  gap: 15px;
}
.story-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}
.story-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.story-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
}
.story-title {
  font-size: 1.15em;
  font-weight: 600;
  color: #2c3e50;
}
.story-title a {
  color: #3498db;
  text-decoration: none;
}
.story-title a:hover {
  text-decoration: underline;
}
.story-id {
  background: #3498db;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
}
.story-meta {
  display: flex;
  gap: 15px;
  font-size: 0.9em;
  color: #7f8c8d;
}
.story-meta a {
  color: #3498db;
  text-decoration: none;
}
.story-meta a:hover {
  text-decoration: underline;
}
`;

// Story detail styles
const storyDetailStyles = `
.story-id-badge {
  background: #3498db;
  color: white;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-block;
  margin-bottom: 20px;
}
.section {
  margin-top: 30px;
}
.section h2 {
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.card-grid-detail {
  display: grid;
  gap: 15px;
  margin-top: 15px;
}
.card-item-detail {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  background: #fafafa;
  transition: all 0.2s;
}
.card-item-detail:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
}
.card-item-detail a {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
}
.card-item-detail a:hover {
  text-decoration: underline;
}
.status-badge-detail {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  margin-left: 10px;
}
.status-Done, .status-Complete {
  background: #d4edda;
  color: #155724;
}
.status-In.Progress {
  background: #fff3cd;
  color: #856404;
}
.status-Draft, .status-Ready, .status-Approved {
  background: #d1ecf1;
  color: #0c5460;
}
`;

// ============ PRD Routes ============

// PRD List
router.get('/prd', (_req: Request, res: Response) => {
  try {
    const prds = loadPRDDocuments();
    const stories = loadStoriesIndex();

    let content = `
    <h1>📋 Product Requirements Documents</h1>
    <p class="subtitle">Browse PRD documents and their related user stories</p>

    <div class="prd-list">`;

    prds.forEach(prd => {
      const prdIdForMatching = prd.metadata.prd_id || prd.filename.replace('.md', '');
      let relatedStories = getRelatedStories(prdIdForMatching, stories);

      // Fallback: if no stories found via business_requirement, try metadata related_stories
      if (relatedStories.length === 0 && prd.metadata.related_stories && Array.isArray(prd.metadata.related_stories)) {
        relatedStories = stories.filter(story =>
          prd.metadata.related_stories?.includes(story.id)
        );
      }

      const prdId = prd.metadata.prd_id || prd.filename.replace('.md', '');
      const prdUrl = `/prd/${prdId}`;

      content += `
      <div class="prd-card" onclick="window.location.href='${prdUrl}'">
        <div class="prd-header">
          <div>
            <div class="prd-title">
              <a href="${prdUrl}" onclick="event.stopPropagation();">${prd.title}</a>
            </div>
          </div>
          <a href="${prdUrl}" class="prd-id-link" onclick="event.stopPropagation();"><div class="prd-id">${prdId}</div></a>
        </div>
        <div class="prd-meta">`;

      if (prd.metadata.status) {
        content += `<span class="meta-item"><strong>Status:</strong> <span class="status ${prd.metadata.status}">${prd.metadata.status}</span></span>`;
      }
      if (prd.metadata.product_area) {
        content += `<span class="meta-item"><strong>Area:</strong> ${prd.metadata.product_area}</span>`;
      }
      if (prd.metadata.created_date) {
        content += `<span class="meta-item"><strong>Created:</strong> ${prd.metadata.created_date}</span>`;
      }

      content += `</div>`;

      if (relatedStories.length > 0) {
        content += `
        <div class="stories-section-inline">
          <div class="stories-title-inline">Related Stories:</div>
          <div class="stories-list-inline">`;

        relatedStories.forEach(story => {
          content += `<span class="story-badge-inline"><a href="/stories/${story.id}">${story.id}</a> - ${story.title}</span>`;
        });

        content += `
          </div>
        </div>`;
      }

      content += `
      </div>`;
    });

    content += `
    </div>`;

    const html = baseLayout(
      { title: 'Product Requirements Documents', styles: prdListStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading PRD documents:', error);
    res.status(500).json({ error: 'Failed to load PRD documents' });
  }
});

// Individual PRD view
router.get('/prd/:prdId', (req: Request, res: Response) => {
  try {
    const { prdId } = req.params;
    const prds = loadPRDDocuments();
    const stories = loadStoriesIndex();

    const prd = prds.find(p =>
      (p.metadata.prd_id || '').toLowerCase() === prdId.toLowerCase() ||
      p.filename.toLowerCase() === `${prdId.toLowerCase()}.md`
    );

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Get related stories
    let relatedStories = getRelatedStories(prd.metadata.prd_id || '', stories);

    // Fallback
    if (relatedStories.length === 0 && prd.metadata.related_stories && Array.isArray(prd.metadata.related_stories)) {
      relatedStories = stories.filter(story =>
        prd.metadata.related_stories?.includes(story.id)
      );
    }

    const prdIdDisplay = prd.metadata.prd_id || prdId;

    let content = `
    ${backLink('/prd', 'Back to PRD List')}
    <h1>${prd.title}</h1>
    <div class="prd-id">${prdIdDisplay}</div>

    ${metadataSection([
      { label: 'Status', value: prd.metadata.status },
      { label: 'Product Area', value: prd.metadata.product_area },
      { label: 'Owner', value: prd.metadata.owner },
      { label: 'Created', value: prd.metadata.created_date },
      { label: 'Last Updated', value: prd.metadata.last_updated },
      { label: 'Deadline', value: prd.metadata.deadline },
    ])}`;

    if (relatedStories.length > 0) {
      content += `
    <div class="stories-section">
      <div class="stories-title">📚 Related User Stories:</div>
      <div class="stories-list">`;

      relatedStories.forEach(story => {
        content += `<span class="story-badge"><a href="/stories/${story.id}">${story.id}</a> - ${story.title}</span>`;
      });

      content += `
      </div>
    </div>`;
    }

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(prd.content);

    content += `
    <div class="content">${htmlContent}</div>`;

    const storiesSectionStyles = `
.stories-section {
  background: #e8f4f8;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
}
.stories-title {
  font-weight: 600;
  color: #0c5460;
  margin-bottom: 10px;
}
.stories-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.story-badge {
  display: inline-block;
  padding: 6px 12px;
  background: white;
  border: 1px solid #bee5eb;
  border-radius: 4px;
}
.story-badge a {
  color: #0c5460;
  text-decoration: none;
  font-weight: 500;
}
.story-badge a:hover {
  text-decoration: underline;
}
`;

    const html = baseLayout(
      {
        title: `${prd.title} - PRD`,
        containerClass: 'narrow',
        styles: prdListStyles + storiesSectionStyles + componentStyles
      },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading PRD:', error);
    res.status(500).json({ error: 'Failed to load PRD' });
  }
});

// Redirect /prd/story/:storyId to /stories/:storyId
router.get('/prd/story/:storyId', (req: Request, res: Response) => {
  res.redirect(`/stories/${req.params.storyId}`);
});

// ============ Cards Routes ============

// Cards List
router.get('/cards', (_req: Request, res: Response) => {
  try {
    const cards = loadCardDocuments();
    const cardStats = getCardStats();

    const statsItems = [
      { label: 'Total Cards', value: cardStats.total },
      ...Object.entries(cardStats.byStatus).map(([status, count]) => ({
        label: status,
        value: count
      }))
    ];

    let content = pageHeader(
      '🎯 Implementation Cards',
      'Technical implementation cards with API contracts and specifications',
      [
        { href: '/project-docs', label: '← Project Docs' },
        { href: '/prd', label: 'PRDs' },
        { href: '/stories', label: 'Stories' }
      ]
    );

    content += statsBar(statsItems);

    content += `
    <div class="card-grid">`;

    cards.forEach(card => {
      const cardUrl = `/cards/${card.metadata.slug}`;
      const statusClass = (card.metadata.status || 'Unknown').replace(/ /g, '.');

      content += `
      <div class="card-item" onclick="window.location.href='${cardUrl}'">
        <div class="card-header">
          <div class="card-title">
            <a href="${cardUrl}" onclick="event.stopPropagation();">${card.title}</a>
          </div>
          <span class="status-badge ${statusClass}">${card.metadata.status || 'Unknown'}</span>
        </div>

        <div class="card-meta">`;

      if (card.metadata.team) {
        content += `<div><strong>Team:</strong> ${card.metadata.team}</div>`;
      }
      if (card.metadata.slug) {
        content += `<div><strong>Slug:</strong> <code>${card.metadata.slug}</code></div>`;
      }
      if (card.metadata.oas_paths && card.metadata.oas_paths.length > 0) {
        content += `<div><strong>API:</strong> <code>${card.metadata.oas_paths.join(', ')}</code></div>`;
      }

      content += `</div>`;

      if (card.metadata.related_stories && card.metadata.related_stories.length > 0) {
        content += `
        <div class="related-stories">
          <div class="related-stories-title">Related Stories:</div>
          <div class="story-tags">`;

        card.metadata.related_stories.forEach(storyId => {
          content += `<a href="/stories/${storyId}" class="story-tag">${storyId}</a>`;
        });

        content += `
          </div>
        </div>`;
      }

      content += `
      </div>`;
    });

    content += `
    </div>`;

    const html = baseLayout(
      { title: 'Implementation Cards', containerClass: 'wide', styles: cardGridStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading cards:', error);
    res.status(500).json({ error: 'Failed to load cards' });
  }
});

// Individual Card View
router.get('/cards/:cardSlug', (req: Request, res: Response) => {
  try {
    const { cardSlug } = req.params;
    const card = getCardBySlug(cardSlug);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const relatedStories = findStoriesUsingCard(cardSlug);

    let content = `
    ${backLink('/cards', 'Back to Cards')}
    <h1>${card.title}</h1>

    <div class="metadata">`;

    if (card.metadata.slug) {
      content += `<div class="metadata-item"><strong>Slug:</strong> <code>${card.metadata.slug}</code></div>`;
    }
    if (card.metadata.status) {
      const statusClass = card.metadata.status.replace(/ /g, '.');
      content += `<div class="metadata-item"><strong>Status:</strong> <span class="status-badge ${statusClass}">${card.metadata.status}</span></div>`;
    }
    if (card.metadata.team) {
      content += `<div class="metadata-item"><strong>Team:</strong> ${card.metadata.team}</div>`;
    }
    if (card.metadata.oas_paths && card.metadata.oas_paths.length > 0) {
      content += `<div class="metadata-item"><strong>API Paths:</strong> <code>${card.metadata.oas_paths.join(', ')}</code></div>`;
    }
    if (card.metadata.last_update) {
      content += `<div class="metadata-item"><strong>Last Update:</strong> ${card.metadata.last_update}</div>`;
    }
    if (relatedStories.length > 0) {
      const storyLinks = relatedStories.map(s => `<a href="/stories/${s.id}">${s.id}</a>`).join(', ');
      content += `<div class="metadata-item"><strong>Related Stories:</strong> ${storyLinks}</div>`;
    }

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(card.content);

    content += `</div>
    <div class="content">${htmlContent}</div>`;

    const html = baseLayout(
      { title: card.title, containerClass: 'narrow', styles: cardGridStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading card:', error);
    res.status(500).json({ error: 'Failed to load card' });
  }
});

// ============ Stories Routes ============

// Stories List
router.get('/stories', (_req: Request, res: Response) => {
  try {
    const stories = loadStoriesIndex();
    const prds = loadPRDDocuments();

    let content = pageHeader(
      '📖 User Stories',
      'User stories linking business requirements to technical implementation',
      [
        { href: '/project-docs', label: '← Project Docs' },
        { href: '/prd', label: 'PRDs' },
        { href: '/cards', label: 'Cards' }
      ]
    );

    content += `
    <div class="story-list">`;

    stories.forEach(story => {
      const storyUrl = `/stories/${story.id}`;
      const prd = story.business_requirement
        ? prds.find(p => p.metadata.prd_id === story.business_requirement)
        : null;

      content += `
      <div class="story-item" onclick="window.location.href='${storyUrl}'">
        <div class="story-header">
          <div class="story-title">
            <a href="${storyUrl}" onclick="event.stopPropagation();">${story.title}</a>
          </div>
          <div class="story-id">${story.id}</div>
        </div>
        <div class="story-meta">`;

      if (story.status) {
        content += `<span><strong>Status:</strong> ${story.status}</span>`;
      }
      if (prd) {
        content += `<span><strong>PRD:</strong> <a href="/prd/${prd.metadata.prd_id}" onclick="event.stopPropagation();">${prd.metadata.prd_id}</a></span>`;
      }

      content += `
        </div>
      </div>`;
    });

    content += `
    </div>`;

    const html = baseLayout(
      { title: 'User Stories', styles: storyListStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading stories:', error);
    res.status(500).json({ error: 'Failed to load stories' });
  }
});

// Individual Story View
router.get('/stories/:storyId', (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const stories = loadStoriesIndex();
    const story = stories.find(s => s.id === storyId || s.id.toLowerCase() === storyId.toLowerCase());

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const prd = findPRDForStory(storyId);
    const cards = loadCardDocuments();
    const storyCards = (story as any).cards || [];

    let content = `
    ${backLink('/stories', 'Back to Stories')}
    <h1>${story.title}</h1>
    <div class="story-id-badge">${story.id}</div>

    <div class="metadata">`;

    if (story.status) {
      content += `<div class="metadata-item"><strong>Status:</strong> <span class="status-badge-detail status-${story.status.replace(/ /g, '.')}">${story.status}</span></div>`;
    }

    if (prd) {
      content += `<div class="metadata-item"><strong>Business Requirement:</strong> <a href="/prd/${prd.metadata.prd_id}">${prd.metadata.prd_id}: ${prd.title}</a></div>`;
    } else if (story.business_requirement) {
      content += `<div class="metadata-item"><strong>Business Requirement:</strong> ${story.business_requirement}</div>`;
    }

    content += `</div>`;

    // Cards section
    if (storyCards.length > 0) {
      content += `
    <div class="section">
      <h2>🎯 Implementation Cards (${storyCards.length})</h2>
      <div class="card-grid-detail">`;

      storyCards.forEach((cardSlug: string) => {
        const card = cards.find(c => c.metadata.slug === cardSlug);
        if (card) {
          content += `
        <div class="card-item-detail">
          <a href="/cards/${card.metadata.slug}">${card.metadata.slug}</a>
          <span class="status-badge-detail status-${card.metadata.status?.replace(/ /g, '.')}">${card.metadata.status}</span>
          <div style="color: #7f8c8d; font-size: 0.9em; margin-top: 5px;">${card.title}</div>
        </div>`;
        } else {
          content += `
        <div class="card-item-detail">
          <span style="color: #e74c3c;">${cardSlug} (not found)</span>
        </div>`;
        }
      });

      content += `
      </div>
    </div>`;
    } else {
      content += `
    <div class="section">
      <h2>🎯 Implementation Cards</h2>
      <p style="color: #7f8c8d; font-style: italic;">No cards defined for this story yet.</p>
    </div>`;
    }

    // Load and render Story markdown content
    const storiesDir = path.resolve(process.cwd(), 'docs', 'stories');
    const storyFiles = fs.readdirSync(storiesDir).filter(f =>
      f.startsWith(`${storyId}-`) && f.endsWith('.md')
    );

    if (storyFiles.length > 0) {
      const storyFilePath = path.join(storiesDir, storyFiles[0]);
      const fileContent = fs.readFileSync(storyFilePath, 'utf-8');

      // Extract content after frontmatter (between --- markers)
      const frontmatterMatch = fileContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const markdownContent = frontmatterMatch ? frontmatterMatch[1].trim() : fileContent;

      if (markdownContent) {
        const htmlContent = markdownToHtml(markdownContent);
        content += `
    <div class="section">
      <h2>📝 Story Details</h2>
      <div class="content">${htmlContent}</div>
    </div>`;
      }
    }

    const html = baseLayout(
      { title: `${story.id}: ${story.title}`, containerClass: 'narrow', styles: storyDetailStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading story:', error);
    res.status(500).json({ error: 'Failed to load story' });
  }
});


// ============ Visualization Routes ============

router.get('/sitemap', (_req: Request, res: Response) => {
      try {
        const sitemap = buildSitemap();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Sitemap</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .tree {
      margin-top: 20px;
    }
    .prd-node {
      margin-bottom: 25px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }
    .prd-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 15px 20px;
      font-size: 1.1em;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .prd-header:hover {
      background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
    }
    .prd-header a {
      color: white;
      text-decoration: none;
    }
    .prd-header a:hover {
      text-decoration: underline;
    }
    .prd-content {
      padding: 20px;
      background: #fafafa;
    }
    .story-node {
      margin-bottom: 15px;
      border-left: 3px solid #3498db;
      padding-left: 15px;
    }
    .story-header {
      font-size: 1em;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    .story-header a {
      color: #3498db;
      text-decoration: none;
    }
    .story-header a:hover {
      text-decoration: underline;
    }
    .card-list {
      margin-left: 20px;
      margin-top: 8px;
    }
    .card-item {
      padding: 6px 12px;
      margin-bottom: 4px;
      background: white;
      border-radius: 4px;
      font-size: 0.9em;
      display: inline-block;
      margin-right: 8px;
    }
    .card-item a {
      color: #27ae60;
      text-decoration: none;
    }
    .card-item a:hover {
      text-decoration: underline;
    }
    .status-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: 600;
      margin-left: 6px;
    }
    .status-badge.Done {
      background: #d4edda;
      color: #155724;
    }
    .status-badge.Ready {
      background: #cce5ff;
      color: #004085;
    }
    .status-badge.Unknown {
      background: #e0e0e0;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🗺️ Documentation Sitemap</h1>
        <p class="subtitle">Hierarchical view of PRD → Story → Card relationships</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
      </div>
    </div>

    <div class="tree">`;

        sitemap.forEach(prd => {
          html += `
      <details class="prd-node" open>
        <summary class="prd-header">
          📋 <a href="/prd/${prd.prd_id}">${prd.prd_id}: ${prd.title}</a>
          <span class="status-badge ${prd.status}">${prd.status}</span>
        </summary>
        <div class="prd-content">`;

          if (prd.stories.length === 0) {
            html += `<p style="color: #7f8c8d; font-style: italic;">No stories yet</p>`;
          } else {
            prd.stories.forEach(story => {
              html += `
          <div class="story-node">
            <div class="story-header">
              📖 <a href="/stories/${story.id}">${story.id}: ${story.title}</a>
              <span class="status-badge ${story.status}">${story.status}</span>
            </div>`;

              if (story.cards.length > 0) {
                html += `<div class="card-list">`;
                story.cards.forEach(card => {
                  html += `<div class="card-item">🎯 <a href="/cards/${card.slug}">${card.slug}</a> <span class="status-badge ${card.status}">${card.status}</span></div>`;
                });
                html += `</div>`;
              } else {
                html += `<div class="card-list" style="color: #7f8c8d; font-size: 0.85em; font-style: italic;">No cards yet</div>`;
              }

              html += `
          </div>`;
            });
          }

          html += `
        </div>
      </details>`;
        });

        html += `
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error building sitemap:', error);
        res.status(500).json({ error: 'Failed to build sitemap' });
      }
});

router.get('/graph', (_req: Request, res: Response) => {
      try {
        const sitemap = buildSitemap();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relationship Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .controls {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      display: flex;
      gap: 15px;
      align-items: center;
    }
    .controls label {
      font-weight: 600;
      color: #2c3e50;
    }
    .controls select {
      padding: 5px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .graph-container {
      display: flex;
      gap: 40px;
      overflow-x: auto;
      padding: 30px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 8px;
      min-height: 600px;
    }
    .column {
      flex: 0 0 auto;
      min-width: 280px;
    }
    .column-header {
      text-align: center;
      font-size: 1.2em;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 20px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .node {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    .node:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .node.highlighted {
      background: #fff3cd;
      border: 2px solid #ffc107;
      box-shadow: 0 0 20px rgba(255, 193, 7, 0.4);
    }
    .node.dimmed {
      opacity: 0.3;
    }
    .prd-node {
      border-left: 5px solid #3498db;
      background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
    }
    .story-node {
      border-left: 5px solid #2ecc71;
      background: linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%);
    }
    .card-node {
      border-left: 5px solid #e74c3c;
      background: linear-gradient(135deg, #ffffff 0%, #ffebee 100%);
    }
    .node-title {
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 5px;
      font-size: 1em;
    }
    .node-subtitle {
      font-size: 0.85em;
      color: #7f8c8d;
      margin-bottom: 8px;
    }
    .node-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      margin-top: 5px;
    }
    .status-Done, .status-Complete {
      background: #d4edda;
      color: #155724;
    }
    .status-In.Progress {
      background: #fff3cd;
      color: #856404;
    }
    .status-Draft, .status-Ready {
      background: #d1ecf1;
      color: #0c5460;
    }
    .node-connections {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
      font-size: 0.8em;
      color: #7f8c8d;
    }
    .stats-box {
      margin-top: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-number {
      font-size: 2em;
      font-weight: 700;
      color: #3498db;
    }
    .stat-label {
      font-size: 0.9em;
      color: #7f8c8d;
    }
    .legend {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .legend-title {
      font-weight: 700;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .legend-items {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
    }
    .prd-color { background: #3498db; }
    .story-color { background: #2ecc71; }
    .card-color { background: #e74c3c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relationship Graph</h1>
      <div class="nav-links">
        <a href="/project-docs">← Hub</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
        <a href="/sitemap">Sitemap</a>
      </div>
    </div>
    <p class="subtitle">Visual representation of PRD → Story → Card relationships</p>

    <div class="controls">
      <label>Filter by PRD:</label>
      <select id="prdFilter" onchange="filterByPRD(this.value)">
        <option value="">All PRDs</option>`;

        sitemap.forEach(prd => {
          html += `<option value="${prd.prd_id}">${prd.prd_id}: ${prd.title}</option>`;
        });

        html += `
      </select>
      <button onclick="resetFilter()" style="padding: 5px 15px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer; font-weight: 600;">Reset</button>
      <span style="margin-left: auto; color: #7f8c8d; font-size: 0.9em;">Click any node to highlight its connections</span>
    </div>

    <div class="graph-container">
      <div class="column">
        <div class="column-header">📋 PRDs</div>
        <div id="prd-column">`;

        sitemap.forEach(prd => {
          const storyCount = prd.stories.length;
          const cardCount = prd.stories.reduce((sum, story) => sum + story.cards.length, 0);

          html += `
          <div class="node prd-node" data-type="prd" data-id="${prd.prd_id}" onclick="highlightConnections('prd', '${prd.prd_id}')">
            <div class="node-title">${prd.prd_id}</div>
            <div class="node-subtitle">${prd.title}</div>
            <span class="node-status status-${prd.status.replace(/ /g, '.')}">${prd.status}</span>
            <div class="node-connections">
              ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}, ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`;
        });

        html += `
        </div>
      </div>

      <div class="column">
        <div class="column-header">📖 User Stories</div>
        <div id="story-column">`;

        sitemap.forEach(prd => {
          prd.stories.forEach(story => {
            const cardCount = story.cards.length;
            html += `
          <div class="node story-node" data-type="story" data-id="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('story', '${story.id}')">
            <div class="node-title">${story.id}</div>
            <div class="node-subtitle">${story.title}</div>
            <span class="node-status status-${story.status.replace(/ /g, '.')}">${story.status}</span>
            <div class="node-connections">
              PRD: ${prd.prd_id} → ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>`;
          });
        });

        html += `
        </div>
      </div>

      <div class="column">
        <div class="column-header">🎯 Implementation Cards</div>
        <div id="card-column">`;

        sitemap.forEach(prd => {
          prd.stories.forEach(story => {
            story.cards.forEach(card => {
              html += `
          <div class="node card-node" data-type="card" data-id="${card.slug}" data-story="${story.id}" data-prd="${prd.prd_id}" onclick="highlightConnections('card', '${card.slug}')">
            <div class="node-title">${card.slug}</div>
            <div class="node-subtitle">${card.title}</div>
            <span class="node-status status-${card.status.replace(/ /g, '.')}">${card.status}</span>
            <div class="node-connections">
              Story: ${story.id}
            </div>
          </div>`;
            });
          });
        });

        html += `
        </div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-title">Legend</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color prd-color"></div>
          <span>PRD (Product Requirements Document)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color story-color"></div>
          <span>User Story</span>
        </div>
        <div class="legend-item">
          <div class="legend-color card-color"></div>
          <span>Implementation Card</span>
        </div>
      </div>
    </div>

    <div class="stats-box">
      <div class="stat-item">
        <div class="stat-number">${sitemap.length}</div>
        <div class="stat-label">PRDs</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${sitemap.reduce((sum, prd) => sum + prd.stories.length, 0)}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${sitemap.reduce((sum, prd) => sum + prd.stories.reduce((s, story) => s + story.cards.length, 0), 0)}</div>
        <div class="stat-label">Cards</div>
      </div>
    </div>
  </div>

  <script>
    let currentHighlight = null;

    function highlightConnections(type, id) {
      const allNodes = document.querySelectorAll('.node');

      // If clicking the same node, reset
      if (currentHighlight && currentHighlight.type === type && currentHighlight.id === id) {
        resetFilter();
        return;
      }

      currentHighlight = { type, id };

      allNodes.forEach(node => {
        node.classList.remove('highlighted', 'dimmed');
        node.classList.add('dimmed');
      });

      if (type === 'prd') {
        // Highlight PRD itself
        const prdNode = document.querySelector('.prd-node[data-id="' + id + '"]');
        if (prdNode) {
          prdNode.classList.remove('dimmed');
          prdNode.classList.add('highlighted');
        }

        // Highlight related stories and cards
        document.querySelectorAll('.story-node[data-prd="' + id + '"]').forEach(node => {
          node.classList.remove('dimmed');
          node.classList.add('highlighted');
        });
        document.querySelectorAll('.card-node[data-prd="' + id + '"]').forEach(node => {
          node.classList.remove('dimmed');
          node.classList.add('highlighted');
        });
      } else if (type === 'story') {
        const storyNode = document.querySelector('.story-node[data-id="' + id + '"]');
        if (!storyNode) return;

        const prdId = storyNode.dataset.prd;

        // Highlight story itself
        storyNode.classList.remove('dimmed');
        storyNode.classList.add('highlighted');

        // Highlight parent PRD
        const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
        if (prdNode) {
          prdNode.classList.remove('dimmed');
          prdNode.classList.add('highlighted');
        }

        // Highlight related cards
        document.querySelectorAll('.card-node[data-story="' + id + '"]').forEach(node => {
          node.classList.remove('dimmed');
          node.classList.add('highlighted');
        });
      } else if (type === 'card') {
        const cardNode = document.querySelector('.card-node[data-id="' + id + '"]');
        if (!cardNode) return;

        const storyId = cardNode.dataset.story;
        const prdId = cardNode.dataset.prd;

        // Highlight card itself
        cardNode.classList.remove('dimmed');
        cardNode.classList.add('highlighted');

        // Highlight parent story
        const storyNodeEl = document.querySelector('.story-node[data-id="' + storyId + '"]');
        if (storyNodeEl) {
          storyNodeEl.classList.remove('dimmed');
          storyNodeEl.classList.add('highlighted');
        }

        // Highlight parent PRD
        const prdNodeEl = document.querySelector('.prd-node[data-id="' + prdId + '"]');
        if (prdNodeEl) {
          prdNodeEl.classList.remove('dimmed');
          prdNodeEl.classList.add('highlighted');
        }
      }
    }

    function filterByPRD(prdId) {
      const allNodes = document.querySelectorAll('.node');

      if (!prdId) {
        resetFilter();
        return;
      }

      currentHighlight = null;

      allNodes.forEach(node => {
        node.classList.remove('highlighted', 'dimmed');
        node.classList.add('dimmed');
      });

      // Highlight selected PRD
      const prdNode = document.querySelector('.prd-node[data-id="' + prdId + '"]');
      if (prdNode) {
        prdNode.classList.remove('dimmed');
      }

      // Highlight related stories and cards
      document.querySelectorAll('.story-node[data-prd="' + prdId + '"]').forEach(node => {
        node.classList.remove('dimmed');
      });
      document.querySelectorAll('.card-node[data-prd="' + prdId + '"]').forEach(node => {
        node.classList.remove('dimmed');
      });
    }

    function resetFilter() {
      currentHighlight = null;
      document.getElementById('prdFilter').value = '';
      const allNodes = document.querySelectorAll('.node');
      allNodes.forEach(node => {
        node.classList.remove('highlighted', 'dimmed');
      });
    }
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error building relationship graph:', error);
        res.status(500).json({ error: 'Failed to build relationship graph' });
      }
});

router.get('/compliance', (_req: Request, res: Response) => {
      try {
        const report = runComplianceAudit();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Compliance Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3498db;
    }
    h1 {
      color: #2c3e50;
      font-size: 2em;
    }
    .back-link {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .score-card {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }
    .score-number {
      font-size: 5em;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 10px;
    }
    .score-label {
      font-size: 1.2em;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }
    .stat-box.error { border-left-color: #e74c3c; }
    .stat-box.warning { border-left-color: #f39c12; }
    .stat-box.success { border-left-color: #2ecc71; }
    .stat-title {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 2.5em;
      font-weight: 700;
      color: #2c3e50;
    }
    .stat-subtitle {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .quick-wins {
      background: #e8f5e9;
      border-left: 4px solid #2ecc71;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .quick-wins h3 {
      color: #27ae60;
      margin-bottom: 10px;
    }
    .quick-wins ul {
      list-style: none;
      padding: 0;
    }
    .quick-wins li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    .quick-wins li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #27ae60;
      font-weight: bold;
    }
    .violations-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    .violations-table th {
      background: #34495e;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }
    .violations-table td {
      padding: 15px;
      border-bottom: 1px solid #ecf0f1;
    }
    .violations-table tr:last-child td {
      border-bottom: none;
    }
    .violations-table tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge.error {
      background: #ffebee;
      color: #c62828;
    }
    .badge.warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    .file-path {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #7f8c8d;
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .fix-suggestion {
      background: #e3f2fd;
      padding: 10px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 0.9em;
    }
    .fix-suggestion strong {
      color: #1976d2;
    }
    .impact {
      color: #e74c3c;
      font-style: italic;
      margin-top: 5px;
      font-size: 0.9em;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #95a5a6;
    }
    .empty-state h3 {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .timestamp {
      text-align: right;
      color: #95a5a6;
      font-size: 0.9em;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Documentation Compliance Dashboard</h1>
      <a href="/project-docs" class="back-link">← Back to Docs Hub</a>
    </div>

    <div class="score-card">
      <div class="score-number">${report.overall_score}%</div>
      <div class="score-label">Overall Compliance Score</div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-title">Total Files</div>
        <div class="stat-value">${report.total_files}</div>
        <div class="stat-subtitle">${report.stats.prds.total} PRDs · ${report.stats.stories.total} Stories · ${report.stats.cards.total} Cards</div>
      </div>
      <div class="stat-box error">
        <div class="stat-title">Critical Issues</div>
        <div class="stat-value">${report.summary.critical_issues}</div>
        <div class="stat-subtitle">Errors that must be fixed</div>
      </div>
      <div class="stat-box warning">
        <div class="stat-title">Warnings</div>
        <div class="stat-value">${report.summary.warnings}</div>
        <div class="stat-subtitle">Issues to address</div>
      </div>
      <div class="stat-box success">
        <div class="stat-title">Compliant Files</div>
        <div class="stat-value">${report.stats.prds.compliant + report.stats.stories.compliant + report.stats.cards.compliant}</div>
        <div class="stat-subtitle">Following all rules</div>
      </div>
    </div>`;

        if (report.summary.quick_wins.length > 0) {
          html += `
    <div class="quick-wins">
      <h3>🚀 Quick Wins (Fix These First)</h3>
      <ul>`;
          report.summary.quick_wins.forEach(win => {
            html += `<li>${win}</li>`;
          });
          html += `
      </ul>
    </div>`;
        }

        if (report.violations.length > 0) {
          html += `
    <div class="section">
      <h2 class="section-title">Compliance Violations (${report.violations.length})</h2>
      <table class="violations-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>File</th>
            <th>Issue & Fix</th>
          </tr>
        </thead>
        <tbody>`;

          report.violations.forEach(v => {
            html += `
          <tr>
            <td><span class="badge ${v.type}">${v.type}</span></td>
            <td>${v.category}</td>
            <td><span class="file-path">${v.file}</span></td>
            <td>
              <strong>Issue:</strong> ${v.issue}
              <div class="fix-suggestion">
                <strong>Fix:</strong> ${v.fix}
              </div>
              <div class="impact">⚠️ Impact: ${v.impact}</div>
            </td>
          </tr>`;
          });

          html += `
        </tbody>
      </table>
    </div>`;
        } else {
          html += `
    <div class="empty-state">
      <h3>🎉 Perfect Compliance!</h3>
      <p>All documentation follows the standards. Great work!</p>
    </div>`;
        }

        html += `
    <div class="timestamp">
      Last updated: ${new Date(report.timestamp).toLocaleString()}
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error generating compliance report:', error);
        res.status(500).json({ error: 'Failed to generate compliance report' });
      }
});

router.get('/architecture', (_req: Request, res: Response) => {
      try {
        const filePath = path.join(process.cwd(), 'docs', 'product-architecture-flowchart.md');

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Architecture document not found' });
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract title from first H1
        const titleMatch = content.match(/^# (.+)$/m);
        const title = titleMatch ? titleMatch[1] : 'Product Architecture';

        // Convert markdown to HTML with Mermaid support
        let htmlContent = content;

        // Extract and preserve code blocks first
        const codeBlocks: string[] = [];
        let mermaidBlockCount = 0;
        htmlContent = htmlContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
          const index = codeBlocks.length;
          if (lang === 'mermaid') {
            mermaidBlockCount++;
            const mermaidCode = code.trim();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:2970',message:'Mermaid block extracted',data:{blockIndex:index,mermaidBlockCount,codeLength:mermaidCode.length,codePreview:mermaidCode.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            codeBlocks.push(`<div class="mermaid">\n${mermaidCode}\n</div>`);
          } else {
            codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
          }
          return `\n__CODE_BLOCK_${index}__\n`;
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:2976',message:'Total mermaid blocks found',data:{totalMermaidBlocks:mermaidBlockCount,totalCodeBlocks:codeBlocks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        // Escape remaining HTML
        htmlContent = htmlContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Headers
        htmlContent = htmlContent.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold and Italic
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline code
        htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        htmlContent = htmlContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Blockquotes
        htmlContent = htmlContent.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

        // Horizontal rules
        htmlContent = htmlContent.replace(/^---$/gim, '<hr>');

        // Tables
        htmlContent = htmlContent.replace(/^\|(.+)\|$/gim, (match) => {
          const cells = match.split('|').filter(c => c.trim());
          if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
            return ''; // Skip separator row
          }
          const row = cells.map(c => `<td>${c.trim()}</td>`).join('');
          return `<tr>${row}</tr>`;
        });
        htmlContent = htmlContent.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="data-table">$&</table>');

        // Paragraphs - but not around code block placeholders
        htmlContent = htmlContent.replace(/\n\n(?!__CODE_BLOCK)/g, '</p>\n<p>');
        htmlContent = '<p>' + htmlContent + '</p>';
        htmlContent = htmlContent.replace(/<p>\s*<(h[1-4]|table|blockquote|hr)/g, '<$1');
        htmlContent = htmlContent.replace(/<\/(h[1-4]|table|blockquote)>\s*<\/p>/g, '</$1>');
        htmlContent = htmlContent.replace(/<p>\s*__CODE_BLOCK_/g, '__CODE_BLOCK_');
        htmlContent = htmlContent.replace(/__CODE_BLOCK_(\d+)__\s*<\/p>/g, '__CODE_BLOCK_$1__');
        htmlContent = htmlContent.replace(/<p>\s*<\/p>/g, '');

        // Restore code blocks AFTER all other processing
        codeBlocks.forEach((block, index) => {
          htmlContent = htmlContent.replace(`__CODE_BLOCK_${index}__`, block);
          // #region agent log
          if (block.includes('class="mermaid"')) {
            const blockPreview = block.substring(0, 200).replace(/\n/g, '\\n');
            const hasNewlines = block.includes('\n');
            fetch('http://127.0.0.1:7242/ingest/73d11adb-3f0a-41a0-938a-bc91c91fadce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:3036',message:'Mermaid block restored to HTML',data:{blockIndex:index,blockLength:block.length,hasMermaidClass:block.includes('class="mermaid"'),hasNewlines,blockPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          }
          // #endregion
        });

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" onload="window.mermaidScriptLoaded = true;"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      margin-left: 15px;
    }
    .nav-links a:hover { text-decoration: underline; }
    h1 { color: #2c3e50; margin-bottom: 20px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin: 30px 0 15px; padding-top: 20px; border-top: 1px solid #eee; }
    h3 { color: #7f8c8d; margin: 20px 0 10px; }
    h4 { color: #95a5a6; margin: 15px 0 10px; }
    p { margin: 10px 0; }
    .mermaid {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      overflow-x: auto;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 15px 0;
    }
    code {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    :not(pre) > code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      color: #c7254e;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .data-table td, .data-table th {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    .data-table tr:nth-child(1) {
      background: #3498db;
      color: white;
      font-weight: bold;
    }
    .data-table tr:nth-child(even) { background: #f9f9f9; }
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 15px;
      margin: 15px 0;
      color: #666;
      background: #f8f9fa;
      padding: 10px 15px;
      border-radius: 0 4px 4px 0;
    }
    hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
    a { color: #3498db; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav-bar">
      <div></div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
        <a href="/stories">Stories</a>
        <a href="/cards">Cards</a>
        <a href="/sitemap">Sitemap</a>
      </div>
    </div>

    ${htmlContent}
  </div>

  <script>
    // #region agent log
    console.log('[DEBUG] Script execution started');
    console.log('[DEBUG] Document ready state:', document.readyState);
    console.log('[DEBUG] Mermaid divs found:', document.querySelectorAll('.mermaid').length);
    // #endregion
    
    function initMermaid() {
      // #region agent log
      console.log('[DEBUG] initMermaid called');
      console.log('[DEBUG] typeof mermaid:', typeof mermaid);
      console.log('[DEBUG] window.mermaidScriptLoaded:', window.mermaidScriptLoaded);
      const mermaidDivs = document.querySelectorAll('.mermaid');
      console.log('[DEBUG] Mermaid divs found:', mermaidDivs.length);
      if (mermaidDivs.length > 0) {
        console.log('[DEBUG] First mermaid div content preview:', mermaidDivs[0].textContent.substring(0, 100));
      }
      // #endregion
      
      if (typeof mermaid !== 'undefined') {
        try {
          // #region agent log
          console.log('[DEBUG] Initializing Mermaid...');
          // #endregion
          // Initialize without startOnLoad since we'll manually run
          mermaid.initialize({ startOnLoad: false, theme: 'default' });
          // #region agent log
          console.log('[DEBUG] Mermaid initialized, now running render...');
          // #endregion
          
          // Manually run to render all diagrams
          mermaid.run({
            querySelector: '.mermaid',
            postRenderCallback: function(id) {
              // #region agent log
              console.log('[DEBUG] Mermaid diagram rendered:', id);
              // #endregion
            }
          }).then(function() {
            // #region agent log
            const rendered = document.querySelectorAll('.mermaid svg').length;
            console.log('[DEBUG] Mermaid.run() completed. Rendered diagrams:', rendered);
            // #endregion
          }).catch(function(error) {
            // #region agent log
            console.error('[DEBUG] Mermaid.run() error:', error);
            // #endregion
          });
          
          return true;
        } catch (error) {
          // #region agent log
          console.error('[DEBUG] Mermaid initialization error:', error);
          // #endregion
          return false;
        }
      } else {
        // #region agent log
        console.error('[DEBUG] Mermaid library not loaded yet');
        // #endregion
        return false;
      }
    }
    
    function waitForMermaidAndInit() {
      // #region agent log
      console.log('[DEBUG] waitForMermaidAndInit called');
      console.log('[DEBUG] typeof mermaid:', typeof mermaid);
      console.log('[DEBUG] window.mermaidScriptLoaded:', window.mermaidScriptLoaded);
      // #endregion
      
      if (typeof mermaid !== 'undefined' || window.mermaidScriptLoaded) {
        if (initMermaid()) {
          // #region agent log
          console.log('[DEBUG] Mermaid initialized successfully');
          // #endregion
          return;
        }
      }
      
      // Poll until Mermaid is loaded
      const maxAttempts = 50;
      let attempts = 0;
      const pollInterval = setInterval(function() {
        attempts++;
        // #region agent log
        if (attempts % 10 === 0) {
          console.log('[DEBUG] Polling attempt', attempts, 'typeof mermaid:', typeof mermaid);
        }
        // #endregion
        
        if (typeof mermaid !== 'undefined') {
          clearInterval(pollInterval);
          initMermaid();
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          // #region agent log
          console.error('[DEBUG] Mermaid failed to load after', maxAttempts, 'attempts');
          // #endregion
        }
      }, 100);
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // #region agent log
        console.log('[DEBUG] DOMContentLoaded fired');
        // #endregion
        waitForMermaidAndInit();
      });
    } else {
      // DOM already loaded
      // #region agent log
      console.log('[DEBUG] DOM already loaded');
      // #endregion
      waitForMermaidAndInit();
    }
    
    // Also listen for script load event as backup
    window.addEventListener('load', function() {
      // #region agent log
      console.log('[DEBUG] window.load event fired');
      // #endregion
      if (typeof mermaid !== 'undefined' && document.querySelectorAll('.mermaid svg').length === 0) {
        // #region agent log
        console.log('[DEBUG] Window loaded but diagrams not rendered, retrying');
        // #endregion
        initMermaid();
      }
});
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading architecture document:', error);
        res.status(500).json({ error: 'Failed to load architecture document' });
      }
});

router.get('/coverage', (_req: Request, res: Response) => {
      try {
        const coverageData = loadTestCoverageData();
        const coverageStats = getCoverageStats();

        if (!coverageData || !coverageData.coverage_registry) {
          return res.status(404).json({ error: 'Coverage data not found' });
        }

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Coverage</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .nav-links {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: #e8f4f8;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 20px;
    }
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .stat-box:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    .stat-box .icon {
      font-size: 2em;
      margin-bottom: 10px;
      display: block;
    }
    .stat-box h3 {
      font-size: 0.8em;
      color: #6c757d;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .stat-box .number {
      font-size: 2.2em;
      font-weight: 700;
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box.success .number {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box.speed .number {
      background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-box .subtitle {
      font-size: 0.75em;
      color: #adb5bd;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-indicator {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .status-indicator.complete {
      background: #d4edda;
      color: #155724;
    }
    .status-indicator.partial {
      background: #fff3cd;
      color: #856404;
    }
    .status-indicator.draft {
      background: #e0e0e0;
      color: #666;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    /* Enhanced PM-friendly styles */
    .tabs {
      display: flex;
      border-bottom: 2px solid #e0e0e0;
      margin: 30px 0 20px;
      gap: 5px;
    }
    .tab {
      padding: 12px 24px;
      background: #f8f9fa;
      border: none;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
      font-size: 1em;
      font-weight: 500;
      color: #666;
      transition: all 0.2s;
    }
    .tab:hover {
      background: #e8f4f8;
      color: #3498db;
    }
    .tab.active {
      background: #3498db;
      color: white;
    }
    .tab-content {
      display: none;
      padding: 20px 0;
    }
    .tab-content.active {
      display: block;
    }
    .prd-detail-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .prd-detail-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .prd-detail-header:hover {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
    }
    .prd-detail-header h3 {
      color: #2c3e50;
      margin: 0;
    }
    .prd-detail-body {
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    }
    .prd-detail-body.expanded {
      padding: 20px;
      max-height: 2000px;
    }
    .feature-group {
      margin-bottom: 20px;
    }
    .feature-group h4 {
      color: #3498db;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    .scenario-list {
      list-style: none;
      padding: 0;
    }
    .scenario-list li {
      padding: 8px 12px;
      margin: 4px 0;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 0.95em;
    }
    .scenario-list li.pass {
      border-left: 3px solid #28a745;
    }
    .scenario-list li.pending {
      border-left: 3px solid #ffc107;
    }
    .progress-bar {
      background: #e0e0e0;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.85em;
    }
    .api-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
    }
    .api-status-item {
      padding: 10px 15px;
      background: #f8f9fa;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .api-status-item code {
      background: #2c3e50;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .api-status-item .badge {
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      background: #d4edda;
      color: #155724;
    }
    .quick-start {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .quick-start h3 {
      color: #3498db;
      margin-bottom: 15px;
    }
    .quick-start pre {
      background: #1a252f;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    .quick-start code {
      color: #2ecc71;
    }
    .coverage-notes {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    .coverage-notes h5 {
      color: #856404;
      margin-bottom: 10px;
    }
    .toggle-arrow {
      transition: transform 0.3s;
    }
    .toggle-arrow.expanded {
      transform: rotate(90deg);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 Test Coverage</h1>
        <p class="subtitle">Test coverage metrics and Newman test reports</p>
      </div>
      <div class="nav-links">
        <a href="/project-docs">← Project Docs</a>
        <a href="/prd">PRDs</a>
      </div>
    </div>

    <div class="stats-summary">
      <div class="stat-box">
        <span class="icon">📦</span>
        <h3>Total PRDs</h3>
        <div class="number">${coverageStats.total_prds}</div>
        <div class="subtitle">Product requirements</div>
      </div>
      <div class="stat-box success">
        <span class="icon">✅</span>
        <h3>Fully Covered</h3>
        <div class="number">${coverageStats.complete}</div>
        <div class="subtitle">100% test coverage</div>
      </div>
      <div class="stat-box">
        <span class="icon">📋</span>
        <h3>Test Requests</h3>
        <div class="number">${coverageStats.total_requests}</div>
        <div class="subtitle">API calls executed</div>
      </div>
      <div class="stat-box">
        <span class="icon">✓</span>
        <h3>Assertions</h3>
        <div class="number">${coverageStats.total_assertions}</div>
        <div class="subtitle">Validations performed</div>
      </div>
      <div class="stat-box success">
        <span class="icon">🎯</span>
        <h3>Success Rate</h3>
        <div class="number">${coverageStats.pass_rate}</div>
        <div class="subtitle">All tests passing</div>
      </div>
      <div class="stat-box speed">
        <span class="icon">⚡</span>
        <h3>Response Time</h3>
        <div class="number">${coverageData.coverage_summary?.test_statistics?.avg_response_time || '<500ms'}</div>
        <div class="subtitle">Average latency</div>
      </div>
    </div>

    <!-- Tabs for different views -->
    <div class="tabs">
      <button class="tab active" data-tab="overview">Overview</button>
      <button class="tab" data-tab="scenarios">Test Scenarios</button>
    </div>

    <!-- Overview Tab (default) -->
    <div id="tab-overview" class="tab-content active">
      <h2>PRD Coverage Details</h2>
      <p style="color: #666; margin-bottom: 20px;">Click on PRD ID to view full documentation</p>

      <table>
        <thead>
          <tr>
            <th>PRD ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Requests</th>
            <th>Assertions</th>
            <th>Pass Rate</th>
            <th>Collection</th>
          </tr>
        </thead>
        <tbody>`;

        coverageData.coverage_registry.forEach(entry => {
          const statusClass = entry.status.includes('100%') || entry.status.includes('Complete')
            ? 'complete'
            : entry.status.includes('Draft')
            ? 'draft'
            : 'partial';

          const requests = entry.test_statistics?.total_requests || '-';
          const assertions = entry.test_statistics?.total_assertions || '-';
          const passed = entry.test_statistics?.passed_assertions || 0;
          const total = entry.test_statistics?.total_assertions || 0;
          const passRate = total > 0 ? `${Math.round((passed / total) * 100)}%` : '-';

          html += `
          <tr>
            <td><a href="/prd/${entry.prd_id}">${entry.prd_id}</a></td>
            <td>${entry.title}</td>
            <td><span class="status-indicator ${statusClass}">${entry.status}</span></td>
            <td>${requests}</td>
            <td>${assertions}</td>
            <td>${passRate}</td>
            <td>${entry.primary_collection ? '<code>' + entry.primary_collection.split('/').pop() + '</code>' : '-'}</td>
          </tr>`;
        });

        html += `
        </tbody>
      </table>
    </div>

    <!-- Test Scenarios Tab -->
    <div id="tab-scenarios" class="tab-content">
      <h2>Detailed Test Scenarios</h2>
      <p style="color: #666; margin-bottom: 20px;">Click on each PRD to view tested scenarios and acceptance criteria</p>
      `;

        // Add detailed PRD sections
        coverageData.coverage_registry.forEach(entry => {
          const testedScenarios = entry.tested_scenarios || [];
          const coverageAnalysis = entry.coverage_analysis || {};
          const apiStatus = coverageAnalysis.api_endpoint_status || {};
          const byFeature = coverageAnalysis.by_feature || coverageAnalysis.by_category || {};
          const stats = entry.test_statistics;
          const passRate = stats && stats.passed_assertions !== undefined && stats.total_assertions
            ? Math.round((stats.passed_assertions / stats.total_assertions) * 100)
            : 100;

          html += `
      <div class="prd-detail-card">
        <div class="prd-detail-header" data-prd="${entry.prd_id}">
          <div>
            <h3>${entry.prd_id}: ${entry.title}</h3>
            <span class="status-indicator ${entry.status.includes('100%') || entry.status.includes('Complete') ? 'complete' : 'partial'}">${entry.status}</span>
          </div>
          <span class="toggle-arrow" id="arrow-${entry.prd_id}">▶</span>
        </div>
        <div class="prd-detail-body" id="body-${entry.prd_id}">

          <!-- Progress Bar -->
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%">${passRate}% Passed</div>
          </div>

          <!-- Test Statistics -->
          ${stats ? `
          <div class="stats-summary" style="margin: 15px 0;">
            <div class="stat-box">
              <h3>Requests</h3>
              <div class="number">${stats.total_requests || 0}</div>
            </div>
            <div class="stat-box">
              <h3>Assertions</h3>
              <div class="number">${stats.total_assertions || 0}</div>
            </div>
            <div class="stat-box">
              <h3>Passed</h3>
              <div class="number" style="color: #28a745;">${stats.passed_assertions || 0}</div>
            </div>
            <div class="stat-box">
              <h3>Failed</h3>
              <div class="number" style="color: ${(stats.failed_assertions || 0) > 0 ? '#dc3545' : '#28a745'};">${stats.failed_assertions || 0}</div>
            </div>
          </div>
          ` : ''}

          <!-- Feature Coverage -->
          ${Object.keys(byFeature).length > 0 ? `
          <div class="feature-group">
            <h4>Feature Coverage</h4>
            <div class="api-status-grid">
              ${Object.entries(byFeature).map(([feature, coverage]) => `
                <div class="api-status-item">
                  <span>${feature}</span>
                  <span class="badge">${coverage}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- API Endpoint Status -->
          ${Object.keys(apiStatus).length > 0 ? `
          <div class="feature-group">
            <h4>API Endpoint Status</h4>
            <div class="api-status-grid">
              ${Object.entries(apiStatus).map(([endpoint, status]) => `
                <div class="api-status-item">
                  <code>${endpoint}</code>
                  <span class="badge">${status}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Tested Scenarios -->
          ${testedScenarios.length > 0 ? `
          <div class="feature-group">
            <h4>Tested Scenarios (${testedScenarios.length} tests)</h4>
            <ul class="scenario-list">
              ${testedScenarios.map(scenario => `
                <li class="${scenario.includes('✅') ? 'pass' : 'pending'}">${scenario}</li>
              `).join('')}
            </ul>
          </div>
          ` : ''}

          <!-- Coverage Notes -->
          ${entry.coverage_notes ? `
          <div class="coverage-notes">
            <h5>Coverage Notes</h5>
            <p>${typeof entry.coverage_notes === 'string' ? entry.coverage_notes.replace(/\n/g, '<br>') : ''}</p>
          </div>
          ` : ''}

        </div>
      </div>`;
        });

        html += `
    </div>


  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Tab switching
      document.querySelectorAll('.tab[data-tab]').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var tabName = this.getAttribute('data-tab');
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
          document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
          // Show selected tab
          document.getElementById('tab-' + tabName).classList.add('active');
          this.classList.add('active');
        });
      });

      // PRD detail toggle
      document.querySelectorAll('.prd-detail-header[data-prd]').forEach(function(header) {
        header.addEventListener('click', function() {
          var prdId = this.getAttribute('data-prd');
          var body = document.getElementById('body-' + prdId);
          var arrow = document.getElementById('arrow-' + prdId);
          body.classList.toggle('expanded');
          arrow.classList.toggle('expanded');
        });
      });
    });
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading coverage data:', error);
        res.status(500).json({ error: 'Failed to load coverage data' });
      }
});

// Documentation Hub - Main landing page
router.get('/project-docs', (_req, res) => {
      try {
        const prdStats = { total: loadPRDDocuments().length };
        const storyStats = { total: loadStoriesIndex().length };
        const cardStats = getCardStats();
        const coverageStats = getCoverageStats();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Hub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .nav-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      transition: all 0.3s;
      text-decoration: none;
      display: block;
    }
    .nav-card:hover {
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      border-color: #3498db;
      transform: translateY(-4px);
    }
    .nav-card h2 {
      color: #3498db;
      margin-bottom: 10px;
      font-size: 1.4em;
    }
    .nav-card p {
      color: #666;
      margin-bottom: 15px;
    }
    .nav-card .stats {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 30px;
    }
    .stat-box {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      border-radius: 4px;
    }
    .stat-box h3 {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .stat-box .number {
      font-size: 2em;
      font-weight: 700;
      color: #2c3e50;
    }
    .rules-section {
      margin-top: 40px;
      border: 3px solid #e74c3c;
      border-radius: 8px;
      overflow: hidden;
    }
    .rules-header {
      background: #e74c3c;
      color: white;
      padding: 15px 20px;
      cursor: pointer;
      user-select: none;
      font-size: 1.1em;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rules-header:hover {
      background: #c0392b;
    }
    .rules-content {
      padding: 25px;
      background: #fff5f5;
    }
    .rules-content h3 {
      color: #e74c3c;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .rules-content h3:first-child {
      margin-top: 0;
    }
    .rules-content ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }
    .rules-content li {
      margin: 8px 0;
      color: #555;
    }
    .rules-content code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #c7254e;
    }
    .rules-content strong {
      color: #2c3e50;
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .warning-box strong {
      color: #856404;
    }
    details {
      margin-top: 15px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      color: #3498db;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      user-select: none;
    }
    summary:hover {
      background: #e9ecef;
    }
    .example-box {
      background: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Documentation Hub</h1>
    <p class="subtitle">Browse product documentation, user stories, implementation cards, and test coverage</p>

    <div class="nav-grid">
      <a href="/prd" class="nav-card">
        <h2>📋 PRD Documents</h2>
        <p>Product Requirements Documents with detailed specifications and business requirements</p>
        <div class="stats">Total: ${prdStats.total} documents</div>
      </a>

      <a href="/stories" class="nav-card">
        <h2>📖 User Stories</h2>
        <p>User stories linking business requirements to technical implementation</p>
        <div class="stats">Total: ${storyStats.total} stories</div>
      </a>

      <a href="/cards" class="nav-card">
        <h2>🎯 Implementation Cards</h2>
        <p>Technical implementation cards with API contracts and acceptance criteria</p>
        <div class="stats">Total: ${cardStats.total} cards (${cardStats.byStatus.Done || 0} done)</div>
      </a>

      <a href="/sitemap" class="nav-card">
        <h2>🗺️ Documentation Sitemap</h2>
        <p>Hierarchical view of PRD → Story → Card relationships</p>
        <div class="stats">Complete project structure</div>
      </a>

      <a href="/graph" class="nav-card">
        <h2>📊 Relationship Graph</h2>
        <p>Interactive visual graph showing connections between PRDs, Stories, and Cards</p>
        <div class="stats">Click nodes to explore relationships</div>
      </a>

      <a href="/compliance" class="nav-card">
        <h2>✅ Compliance Dashboard</h2>
        <p>Real-time documentation compliance audit with self-healing suggestions</p>
        <div class="stats">Automated compliance checking</div>
      </a>

      <a href="/coverage" class="nav-card">
        <h2>📊 Test Coverage</h2>
        <p>Test coverage metrics and Newman test reports</p>
        <div class="stats">${coverageStats.complete}/${coverageStats.total_prds} PRDs fully covered</div>
      </a>

      <a href="/docs" class="nav-card">
        <h2>🔧 API Documentation</h2>
        <p>Swagger UI with OpenAPI 3.0 specification</p>
        <div class="stats">Interactive API explorer</div>
      </a>

      <a href="/architecture" class="nav-card">
        <h2>🏗️ Product Architecture</h2>
        <p>Multi-platform product flowcharts: Mini-Program, OTA, Web Reservation, Venue Scanner</p>
        <div class="stats">Complete system overview</div>
      </a>
    </div>

    <h2 style="margin-top: 30px; margin-bottom: 15px;">Overview Statistics</h2>
    <div class="stats-grid">
      <div class="stat-box">
        <h3>PRD Documents</h3>
        <div class="number">${prdStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>User Stories</h3>
        <div class="number">${storyStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>Implementation Cards</h3>
        <div class="number">${cardStats.total}</div>
      </div>
      <div class="stat-box">
        <h3>Test Coverage</h3>
        <div class="number">${Math.round((coverageStats.complete / coverageStats.total_prds) * 100)}%</div>
      </div>
    </div>

    <div class="rules-section">
      <details open>
        <summary class="rules-header">
          <span>⚠️ Developer Maintenance Rules (MUST READ)</span>
          <span style="font-size: 0.9em; font-weight: normal;">Click to expand/collapse</span>
        </summary>
        <div class="rules-content">
          <div class="warning-box">
            <strong>⚠️ Critical:</strong> These rules are REQUIRED for the documentation site to work correctly. Breaking these rules causes broken relationships, missing content, and navigation errors.
          </div>

          <h3>1. Always Include YAML Frontmatter</h3>
          <p><strong>PRD Files (docs/prd/*.md):</strong></p>
          <div class="example-box">---<br>prd_id: "PRD-009"<br>status: "Draft"<br>related_stories: []<br>---</div>
          <p><strong>Story Entries (docs/stories/_index.yaml):</strong></p>
          <div class="example-box">- id: US-020<br>&nbsp;&nbsp;title: "Story title"<br>&nbsp;&nbsp;status: "Draft"<br>&nbsp;&nbsp;business_requirement: "PRD-009"<br>&nbsp;&nbsp;cards: []</div>
          <p><strong>Card Files (docs/cards/*.md):</strong></p>
          <div class="example-box">---<br>slug: new-endpoint<br>status: "Ready"<br>team: "A - Commerce"<br>related_stories: ["US-020"]<br>---</div>

          <h3>2. Use Consistent ID Formats</h3>
          <ul>
            <li><strong>PRD:</strong> <code>PRD-###</code> (e.g., PRD-001, PRD-009) ❌ NOT: prd-1, PRD1</li>
            <li><strong>Story:</strong> <code>US-###</code> (e.g., US-001, US-020) ❌ NOT: us-1, US1</li>
            <li><strong>Card slug:</strong> <code>kebab-case</code> (e.g., catalog-endpoint) ❌ NOT: catalog_endpoint</li>
          </ul>

          <h3>3. Maintain Bidirectional Relationships</h3>
          <p><strong>When you link A → B, you MUST also link B → A</strong></p>
          <ul>
            <li>✅ Card links to story (<code>related_stories: ["US-020"]</code>)</li>
            <li>✅ Story links back to card (<code>cards: ["card-slug"]</code>)</li>
            <li>✅ Story links to PRD (<code>business_requirement: "PRD-009"</code>)</li>
            <li>✅ PRD links back to story (<code>related_stories: ["US-020"]</code>)</li>
          </ul>

          <h3>4. File Naming Conventions</h3>
          <ul>
            <li><strong>PRD:</strong> <code>PRD-###-description.md</code></li>
            <li><strong>Card:</strong> <code>slug-name.md</code> (must match slug in frontmatter)</li>
            <li><strong>Story:</strong> Use <code>_index.yaml</code> (all stories in one file)</li>
          </ul>

          <h3>5. Valid Status Values</h3>
          <ul>
            <li><strong>PRD:</strong> Draft | In Progress | Done</li>
            <li><strong>Story:</strong> Draft | In Progress | Done</li>
            <li><strong>Card:</strong> Ready | In Progress | Done</li>
          </ul>

          <details>
            <summary>🚨 Common Mistakes That Break the Site</summary>
            <div style="margin-top: 15px;">
              <p><strong>Mistake 1:</strong> Missing <code>business_requirement</code> in story → Story appears orphaned</p>
              <p><strong>Mistake 2:</strong> Inconsistent ID casing (prd-009 vs PRD-009) → Links break</p>
              <p><strong>Mistake 3:</strong> One-way relationships → Content missing from hierarchy</p>
              <p><strong>Mistake 4:</strong> Missing <code>slug</code> in card frontmatter → Card invisible on site</p>
            </div>
          </details>

          <details>
            <summary>📋 Pre-Commit Checklist</summary>
            <div style="margin-top: 15px;">
              <p><strong>For new PRDs:</strong></p>
              <ul>
                <li>Filename follows <code>PRD-###-description.md</code></li>
                <li><code>prd_id</code> matches filename</li>
                <li><code>status</code> and <code>related_stories</code> fields present</li>
                <li>PRD added to at least one story's <code>business_requirement</code></li>
              </ul>
              <p><strong>For new Stories:</strong></p>
              <ul>
                <li>Entry added to <code>docs/stories/_index.yaml</code></li>
                <li><code>id</code> follows <code>US-###</code> format</li>
                <li><code>business_requirement</code> links to existing PRD</li>
                <li>PRD's <code>related_stories</code> includes this story ID</li>
              </ul>
              <p><strong>For new Cards:</strong></p>
              <ul>
                <li>Filename matches slug</li>
                <li>All required fields present: <code>slug</code>, <code>status</code>, <code>team</code>, <code>related_stories</code></li>
                <li>At least one story's <code>cards</code> array includes this slug</li>
                <li>Slug uses kebab-case</li>
              </ul>
            </div>
          </details>

          <details>
            <summary>📖 Full Documentation</summary>
            <div style="margin-top: 15px;">
              <p>For complete guide with step-by-step examples, troubleshooting, and detailed explanations, see:</p>
              <p style="margin-top: 10px;"><strong>📄 <a href="https://github.com/Synque/express/blob/init-ai/docs/reference/DOCUMENTATION-SITE.md" target="_blank" style="color: #3498db;">docs/reference/DOCUMENTATION-SITE.md</a></strong></p>
            </div>
          </details>

          <p style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #e0e0e0; color: #7f8c8d; font-size: 0.95em;">
            <strong>Remember:</strong> The documentation site is zero-maintenance ONLY if developers follow these rules.
            Always verify your changes at <a href="http://localhost:8080/sitemap" style="color: #3498db;">http://localhost:8080/sitemap</a> before committing.
          </p>
        </div>
      </details>
    </div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        logger.error('Error loading documentation hub:', error);
        res.status(500).json({ error: 'Failed to load documentation hub' });
      }
});

export default router;
