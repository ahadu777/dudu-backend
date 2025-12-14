/**
 * Shared HTML components for documentation pages
 */

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Navigation header with title and nav links
 */
export function pageHeader(title: string, subtitle: string, navLinks: NavLink[]): string {
  const navHtml = navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n        ');

  return `
    <div class="header">
      <div>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
      </div>
      <div class="nav-links">
        ${navHtml}
      </div>
    </div>`;
}

/**
 * Simple back link
 */
export function backLink(href: string, label: string): string {
  return `<a href="${href}" class="back-link">← ${label}</a>`;
}

/**
 * ID badge (for PRD-XXX, US-XXX etc)
 */
export function idBadge(id: string, href?: string): string {
  if (href) {
    return `<a href="${href}" class="id-badge-link" onclick="event.stopPropagation();"><span class="id-badge">${id}</span></a>`;
  }
  return `<span class="id-badge">${id}</span>`;
}

/**
 * Status badge with appropriate styling
 */
export function statusBadge(status: string): string {
  const statusClass = status.replace(/ /g, '.');
  return `<span class="status ${statusClass}">${status}</span>`;
}

/**
 * Metadata section
 */
export function metadataSection(items: Array<{ label: string; value: string | undefined }>): string {
  const filteredItems = items.filter(item => item.value);
  if (filteredItems.length === 0) return '';

  const itemsHtml = filteredItems
    .map(item => `<div class="metadata-item"><strong>${item.label}:</strong> ${item.value}</div>`)
    .join('\n      ');

  return `
    <div class="metadata">
      ${itemsHtml}
    </div>`;
}

/**
 * Story badge list
 */
export function storyBadgeList(stories: Array<{ id: string; title?: string }>, baseUrl = '/stories'): string {
  if (stories.length === 0) return '';

  const badgesHtml = stories
    .map(story => {
      const titleSuffix = story.title ? ` - ${story.title}` : '';
      return `<span class="story-badge"><a href="${baseUrl}/${story.id}">${story.id}</a>${titleSuffix}</span>`;
    })
    .join('\n        ');

  return `
    <div class="stories-section">
      <div class="stories-title">📚 Related Stories:</div>
      <div class="stories-list">
        ${badgesHtml}
      </div>
    </div>`;
}

/**
 * Card tags list
 */
export function cardTagList(cards: string[], baseUrl = '/cards'): string {
  if (cards.length === 0) return '';

  const tagsHtml = cards
    .map(cardSlug => `<a href="${baseUrl}/${cardSlug}" class="card-tag">${cardSlug}</a>`)
    .join('\n        ');

  return `
    <div class="cards-section">
      <div class="cards-title">🎯 Related Cards:</div>
      <div class="card-tags">
        ${tagsHtml}
      </div>
    </div>`;
}

/**
 * Stats bar
 */
export function statsBar(stats: Array<{ label: string; value: string | number }>): string {
  const statsHtml = stats
    .map(stat => `<div class="stat-item"><strong>${stat.label}:</strong> ${stat.value}</div>`)
    .join('\n      ');

  return `
    <div class="stats-bar">
      ${statsHtml}
    </div>`;
}

// Additional styles for components
export const componentStyles = `
.id-badge {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  display: inline-block;
}
.id-badge-link {
  text-decoration: none;
}
.id-badge:hover {
  background: #2980b9;
}
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
.cards-section {
  background: #fff3e0;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
}
.cards-title {
  font-weight: 600;
  color: #e65100;
  margin-bottom: 10px;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.card-tag {
  display: inline-block;
  padding: 3px 8px;
  background: white;
  border: 1px solid #ffcc80;
  border-radius: 3px;
  font-size: 0.85em;
  color: #e65100;
  text-decoration: none;
}
.card-tag:hover {
  background: #fff3e0;
}
`;
