import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import { markdownToHtml } from '../../../utils/markdown';
import { loadPRDDocuments, loadStoriesIndex, StoryInfo } from '../../../utils/prdParser';
import { loadCardDocuments } from '../../../utils/cardParser';
import { findPRDForStory } from '../../../utils/sitemapBuilder';
import { baseLayout } from '../templates/base';
import { componentStyles, pageHeader, backLink } from '../templates/components';
import { storyListStyles, storyDetailStyles } from '../styles';

/**
 * Stories List handler - displays all user stories
 */
export function handleStoriesList(_req: Request, res: Response): void {
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
}

/**
 * Individual Story View handler
 */
export function handleStoryDetail(req: Request, res: Response): void {
  try {
    const { storyId } = req.params;
    const stories = loadStoriesIndex();
    // Support both story ID (US-LMS-001) and full filename slug (US-LMS-001-borrower-onboarding)
    const story = stories.find(s => 
      s.id === storyId || 
      s.id.toLowerCase() === storyId.toLowerCase() ||
      storyId.toLowerCase().startsWith(s.id.toLowerCase())
    );

    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const prd = findPRDForStory(storyId);
    const cards = loadCardDocuments();
    // StoryInfo interface has cards field as optional string[]
    const storyCards: string[] = story.cards || [];

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
}
