import { loadPRDDocuments, loadStoriesIndex, getRelatedStories, PRDDocument, StoryInfo } from './prdParser';
import { loadCardDocuments, CardDocument } from './cardParser';

export interface SitemapCard {
  slug: string;
  title: string;
  status: string;
}

export interface SitemapStory {
  id: string;
  title: string;
  status: string;
  cards: SitemapCard[];
}

export interface SitemapPRD {
  prd_id: string;
  title: string;
  status: string;
  stories: SitemapStory[];
}

/**
 * Build complete hierarchical sitemap: PRD → Story → Card
 */
export function buildSitemap(): SitemapPRD[] {
  const prds = loadPRDDocuments();
  const stories = loadStoriesIndex();
  const cards = loadCardDocuments();

  return prds.map(prd => {
    const prdId = prd.metadata.prd_id || prd.filename.replace('.md', '');
    const relatedStories = getRelatedStories(prdId, stories);

    // Also check if PRD has related_stories in metadata
    let storyList = relatedStories;
    if (relatedStories.length === 0 && prd.metadata.related_stories) {
      storyList = stories.filter(s =>
        prd.metadata.related_stories?.includes(s.id)
      );
    }

    return {
      prd_id: prdId,
      title: prd.title,
      status: prd.metadata.status || 'Unknown',
      stories: storyList.map(story => {
        // Get cards for this story from _index.yaml
        const storyData = stories.find(s => s.id === story.id);
        const storyCards: string[] = storyData?.cards || [];

        // Also check cards that reference this story
        const relatedCards = cards.filter(card =>
          card.metadata.related_stories?.includes(story.id)
        );

        // Merge both sources
        const cardSlugs = new Set([
          ...storyCards,
          ...relatedCards.map(c => c.metadata.slug)
        ]);

        const storyCardsList: SitemapCard[] = Array.from(cardSlugs)
          .map(slug => {
            const card = cards.find(c => c.metadata.slug === slug);
            if (card) {
              return {
                slug: card.metadata.slug,
                title: card.title,
                status: card.metadata.status || 'Unknown'
              };
            }
            // If card not found but referenced, show placeholder
            return {
              slug: slug as string,
              title: slug as string,
              status: 'Not Found'
            };
          })
          .filter(c => c.slug); // Remove empty entries

        return {
          id: story.id,
          title: story.title,
          status: story.status,
          cards: storyCardsList
        };
      })
    };
  });
}

/**
 * Get sitemap statistics
 */
export function getSitemapStats() {
  const sitemap = buildSitemap();

  let totalStories = 0;
  let totalCards = 0;

  sitemap.forEach(prd => {
    totalStories += prd.stories.length;
    prd.stories.forEach(story => {
      totalCards += story.cards.length;
    });
  });

  return {
    total_prds: sitemap.length,
    total_stories: totalStories,
    total_cards: totalCards
  };
}

/**
 * Find all stories that use a specific card
 */
export function findStoriesUsingCard(cardSlug: string): StoryInfo[] {
  const stories = loadStoriesIndex();
  const cards = loadCardDocuments();

  const card = cards.find(c => c.metadata.slug === cardSlug);
  if (!card) {
    return [];
  }

  // Check related_stories in card metadata
  const relatedStoryIds = card.metadata.related_stories || [];

  // Also check stories that reference this card in their cards array
  const matchingStories = stories.filter(story => {
    const storyCards = story.cards || [];
    return storyCards.includes(cardSlug) || relatedStoryIds.includes(story.id);
  });

  return matchingStories;
}

/**
 * Find PRD that contains a specific story
 */
export function findPRDForStory(storyId: string): PRDDocument | null {
  const prds = loadPRDDocuments();
  const stories = loadStoriesIndex();

  const story = stories.find(s => s.id === storyId);
  if (!story || !story.business_requirement) {
    return null;
  }

  const prdId = story.business_requirement;

  return prds.find(p =>
    p.metadata.prd_id === prdId ||
    p.metadata.prd_id?.toLowerCase() === prdId.toLowerCase()
  ) || null;
}
