import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { markdownToHtml } from '../../../utils/markdown';
import { loadMemoDocuments, getMemoById, getMemoStats, getAllMemoTags } from '../../../utils/memoParser';
import { baseLayout } from '../templates/base';
import { componentStyles, pageHeader, statsBar, backLink } from '../templates/components';

// Memo-specific styles
const memoStyles = `
.memo-grid {
  display: grid;
  gap: 20px;
}
.memo-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}
.memo-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #9b59b6;
  transform: translateY(-2px);
}
.memo-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}
.memo-title {
  font-size: 1.2em;
  font-weight: 600;
  color: #2c3e50;
}
.memo-title a {
  color: #9b59b6;
  text-decoration: none;
}
.memo-title a:hover {
  text-decoration: underline;
}
.memo-id {
  background: #9b59b6;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
}
.memo-meta {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 0.85em;
  color: #7f8c8d;
}
.memo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.memo-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #f3e5f5;
  border: 1px solid #ce93d8;
  border-radius: 15px;
  font-size: 0.75em;
  color: #7b1fa2;
  text-decoration: none;
}
.memo-tag:hover {
  background: #e1bee7;
}
.audience-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 15px;
  font-size: 0.75em;
  color: #1565c0;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
}
.status-badge.Active {
  background: #d4edda;
  color: #155724;
}
.status-badge.Superseded {
  background: #fff3cd;
  color: #856404;
}
.status-badge.Archived {
  background: #e2e3e5;
  color: #383d41;
}
.filter-section {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}
.filter-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #2c3e50;
}
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-tag {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 0.85em;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.2s;
}
.filter-tag:hover, .filter-tag.active {
  background: #9b59b6;
  color: white;
  border-color: #9b59b6;
}
.metadata {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
}
.metadata-item {
  margin-bottom: 10px;
}
.metadata-item:last-child {
  margin-bottom: 0;
}
.content {
  line-height: 1.7;
}
.content h2 {
  color: #2c3e50;
  margin-top: 30px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #9b59b6;
}
.content h3 {
  color: #7f8c8d;
  margin-top: 25px;
  margin-bottom: 10px;
}
.content ul, .content ol {
  margin-left: 20px;
  margin-bottom: 15px;
}
.content li {
  margin-bottom: 8px;
}
.content strong {
  color: #2c3e50;
}
.leads-to-section {
  margin-top: 20px;
  padding: 15px;
  background: #e8f5e9;
  border-radius: 8px;
}
.leads-to-title {
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 10px;
}
`;

/**
 * Memos List handler - displays all strategic memos
 */
export function handleMemosList(req: Request, res: Response): void {
  try {
    const memos = loadMemoDocuments();
    const stats = getMemoStats();
    const allTags = getAllMemoTags();
    const filterTag = req.query.tag as string | undefined;

    // Filter by tag if specified
    const filteredMemos = filterTag
      ? memos.filter(m => m.metadata.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
      : memos;

    const statsItems = [
      { label: 'Total Memos', value: stats.total },
      { label: 'Active', value: stats.byStatus['Active'] || 0 },
      { label: 'Tags', value: allTags.length }
    ];

    let content = pageHeader(
      'Strategic Memos',
      'Synthesized thinking, value propositions, and strategic analysis',
      [
        { href: '/project-docs', label: '< Project Docs' },
        { href: '/prd', label: 'PRDs' },
        { href: '/stories', label: 'Stories' }
      ]
    );

    content += statsBar(statsItems);

    // Tag filter section
    if (allTags.length > 0) {
      content += `
      <div class="filter-section">
        <div class="filter-title">Filter by Tag:</div>
        <div class="filter-tags">
          <a href="/memos" class="filter-tag ${!filterTag ? 'active' : ''}">All</a>`;

      allTags.forEach(tag => {
        const isActive = filterTag?.toLowerCase() === tag.toLowerCase();
        content += `<a href="/memos?tag=${encodeURIComponent(tag)}" class="filter-tag ${isActive ? 'active' : ''}">${tag}</a>`;
      });

      content += `
        </div>
      </div>`;
    }

    content += `<div class="memo-grid">`;

    if (filteredMemos.length === 0) {
      content += `<p style="color: #7f8c8d; text-align: center; padding: 40px;">No memos found${filterTag ? ` with tag "${filterTag}"` : ''}.</p>`;
    }

    filteredMemos.forEach(memo => {
      const memoUrl = `/memos/${memo.metadata.memo_id}`;

      content += `
      <div class="memo-card" onclick="window.location.href='${memoUrl}'">
        <div class="memo-header">
          <div class="memo-title">
            <a href="${memoUrl}" onclick="event.stopPropagation();">${memo.title}</a>
          </div>
          <span class="memo-id">${memo.metadata.memo_id}</span>
        </div>

        <div class="memo-meta">
          <span class="status-badge ${memo.metadata.status}">${memo.metadata.status}</span>
          <span>Updated: ${memo.metadata.updated}</span>
        </div>

        <div style="margin-bottom: 10px;">`;

      // Audience tags
      memo.metadata.audience.forEach(audience => {
        content += `<span class="audience-tag">${audience}</span> `;
      });

      content += `</div>

        <div class="memo-tags">`;

      memo.metadata.tags.forEach(tag => {
        content += `<a href="/memos?tag=${encodeURIComponent(tag)}" class="memo-tag" onclick="event.stopPropagation();">#${tag}</a>`;
      });

      content += `
        </div>
      </div>`;
    });

    content += `</div>`;

    const html = baseLayout(
      { title: 'Strategic Memos', containerClass: 'wide', styles: memoStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading memos:', error);
    res.status(500).json({ error: 'Failed to load memos' });
  }
}

/**
 * Individual Memo View handler
 */
export function handleMemoDetail(req: Request, res: Response): void {
  try {
    const { memoId } = req.params;
    const memo = getMemoById(memoId);

    if (!memo) {
      res.status(404).json({ error: 'Memo not found' });
      return;
    }

    let content = `
    ${backLink('/memos', 'Back to Memos')}

    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
      <h1 style="margin: 0;">${memo.title}</h1>
      <span class="memo-id">${memo.metadata.memo_id}</span>
    </div>

    <div class="metadata">
      <div class="metadata-item">
        <strong>Status:</strong> <span class="status-badge ${memo.metadata.status}">${memo.metadata.status}</span>
      </div>
      <div class="metadata-item">
        <strong>Created:</strong> ${memo.metadata.created}
      </div>
      <div class="metadata-item">
        <strong>Updated:</strong> ${memo.metadata.updated}
      </div>
      <div class="metadata-item">
        <strong>Audience:</strong> ${memo.metadata.audience.map(a => `<span class="audience-tag">${a}</span>`).join(' ')}
      </div>
      <div class="metadata-item">
        <strong>Tags:</strong> ${memo.metadata.tags.map(t => `<a href="/memos?tag=${encodeURIComponent(t)}" class="memo-tag">#${t}</a>`).join(' ')}
      </div>
    </div>`;

    // Show leads_to if any PRDs came from this memo
    if (memo.metadata.leads_to && memo.metadata.leads_to.length > 0) {
      content += `
      <div class="leads-to-section">
        <div class="leads-to-title">This memo led to:</div>
        ${memo.metadata.leads_to.map(prdId => `<a href="/prd/${prdId}" style="margin-right: 10px;">${prdId}</a>`).join('')}
      </div>`;
    }

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(memo.content);

    content += `<div class="content">${htmlContent}</div>`;

    const html = baseLayout(
      { title: memo.title, containerClass: 'narrow', styles: memoStyles + componentStyles },
      content
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error loading memo:', error);
    res.status(500).json({ error: 'Failed to load memo' });
  }
}
