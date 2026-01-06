import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { markdownToHtml } from '../../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex, getRelatedStories } from '../../../utils/prdParser';
import { baseLayout } from '../templates/base';
import { componentStyles, backLink, metadataSection } from '../templates/components';
import { prdListStyles, storiesSectionStyles } from '../styles';

/**
 * PRD List handler - displays all PRD documents
 */
export function handlePrdList(_req: Request, res: Response): void {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error loading PRD documents:', errorMessage, error);
    res.status(500).json({ 
      error: 'Failed to load PRD documents',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

/**
 * Individual PRD view handler
 */
export function handlePrdDetail(req: Request, res: Response): void {
  try {
    const { prdId } = req.params;
    const prds = loadPRDDocuments();
    const stories = loadStoriesIndex();

    const prd = prds.find(p =>
      (p.metadata.prd_id || '').toLowerCase() === prdId.toLowerCase() ||
      p.filename.toLowerCase() === `${prdId.toLowerCase()}.md`
    );

    if (!prd) {
      res.status(404).json({ error: 'PRD not found' });
      return;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error loading PRD:', errorMessage, error);
    res.status(500).json({ 
      error: 'Failed to load PRD',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

/**
 * Redirect legacy story URL to new format
 */
export function handlePrdStoryRedirect(req: Request, res: Response): void {
  res.redirect(`/stories/${req.params.storyId}`);
}
