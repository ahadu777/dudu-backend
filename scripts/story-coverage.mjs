// node scripts/story-coverage.mjs
// Prints a table of story→card coverage and status by reading
// docs/stories/_index.yaml and docs/cards/*.md frontmatter.
// No external deps; tiny YAML subset parser.

import fs from 'fs';
import path from 'path';

const STORIES_IDX = 'docs/stories/_index.yaml';
const CARDS_DIR = 'docs/cards';

function YAMLtoJSON(txt){
  // tiny subset: supports:
  // stories:
  //  - id: US-001
  //    title: ...
  //    status: ...
  //    cards:
  //      - slug-a
  //      - slug-b
  const out = { stories: [] };
  const lines = txt.split('\n');
  let current = null;
  let inCards = false;
  for (const raw of lines){
    const line = raw.replace(/\r/g,'').trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('stories:')) continue;
    if (line.startsWith('- id:')){
      if (current) out.stories.push(current);
      current = { id: line.split(':').slice(1).join(':').trim(), title:'', status:'', cards: [] };
      inCards = false;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('title:')){ current.title = line.split(':').slice(1).join(':').trim(); continue; }
    if (line.startsWith('status:')){ current.status = line.split(':').slice(1).join(':').trim(); continue; }
    if (line.startsWith('cards:')){ inCards = true; continue; }
    if (inCards && line.startsWith('- ')){
      current.cards.push(line.slice(2).trim());
      continue;
    }
  }
  if (current) out.stories.push(current);
  return out;
}

function parseFrontmatter(md){
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const raw of m[1].split('\n')){
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx+1).trim();
    val = val.replace(/^"|"$/g,'');
    fm[key] = val;
  }
  return fm;
}

function loadIndex(){
  if (!fs.existsSync(STORIES_IDX)){
    console.error(`Missing ${STORIES_IDX}`);
    process.exit(1);
  }
  const y = fs.readFileSync(STORIES_IDX, 'utf8');
  return YAMLtoJSON(y);
}

function loadCards(){
  if (!fs.existsSync(CARDS_DIR)) return {};
  const files = fs.readdirSync(CARDS_DIR).filter(f=>f.endsWith('.md'));
  const map = {};
  for (const f of files){
    const md = fs.readFileSync(path.join(CARDS_DIR,f), 'utf8');
    map[f.replace(/\.md$/,'')] = parseFrontmatter(md);
  }
  return map;
}

const idx = loadIndex();
const cards = loadCards();

const rows = [];
for (const s of idx.stories){
  for (const slug of s.cards){
    const fm = cards[slug] || {};
    rows.push({
      story: `${s.id}`,
      title: s.title,
      card: slug,
      exists: !!cards[slug],
      status: fm.status || 'Missing',
      readiness: fm.readiness || '',
      team: fm.team || '',
      pr: fm.pr || ''
    });
  }
}
rows.sort((a,b)=> (a.story+a.card).localeCompare(b.story+b.card));
console.table(rows);