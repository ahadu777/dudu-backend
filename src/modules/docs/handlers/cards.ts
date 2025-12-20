import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { markdownToHtml } from '../../../utils/markdown';
import { loadCardDocuments, getCardBySlug, getCardStats } from '../../../utils/cardParser';
import { findStoriesUsingCard } from '../../../utils/sitemapBuilder';
import { baseLayout } from '../templates/base';
import { componentStyles, pageHeader, statsBar, backLink } from '../templates/components';
import { cardGridStyles } from '../styles';

/**
 * Cards List handler - displays all implementation cards
 */
export function handleCardsList(_req: Request, res: Response): void {
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
}

/**
 * Individual Card View handler
 */
export function handleCardDetail(req: Request, res: Response): void {
  try {
    const { cardSlug } = req.params;
    const card = getCardBySlug(cardSlug);

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
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
}
