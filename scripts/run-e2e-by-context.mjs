#!/usr/bin/env node
// Run Newman collections by story ID or card slug and emit US-xxxx-e2e.xml
// Usage examples:
//  - node scripts/run-e2e-by-context.mjs --story US-010A
//  - node scripts/run-e2e-by-context.mjs --card tickets-scan
// Env: BASE_URL overrides default in collections (passed as --env-var baseUrl)

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const STORIES_IDX = path.join(ROOT, 'docs/stories/_index.yaml');
const CARDS_DIR = path.join(ROOT, 'docs/cards');
const REPORT_DIR = path.join(ROOT, 'reports/newman');
const COLLECTIONS_DIR = path.join(ROOT, 'reports/collections');

function fail(msg){
  console.error(`run-e2e-by-context: ${msg}`);
  process.exit(1);
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { story: null, card: null, generate: false };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a === '--story') out.story = args[++i];
    else if (a === '--card') out.card = args[++i];
    else if (a === '--generate') out.generate = true;
    else if (/^US-/.test(a)) out.story = a; // support: node script US-010A
    else if (a && !a.startsWith('--') && !out.card && !out.story) out.card = a; // script tickets-scan
  }
  if (!out.story && !out.card) fail('Provide --story US-XXXX or --card <slug>');
  return out;
}

function YAMLtoJSONStories(txt){
  const out = { stories: [] };
  const lines = txt.split('\n');
  let current = null;
  let inCards = false;
  let inValidation = false;
  let inValidationNewman = false;
  for (const raw of lines){
    const line = raw.replace(/\r/g,'');
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('stories:')) continue;
    if (t.startsWith('- id:')){
      if (current) out.stories.push(current);
      current = { id: t.split(':').slice(1).join(':').trim(), cards: [], validation_assets: { newman: [] } };
      inCards = false; inValidation=false; inValidationNewman=false; continue;
    }
    if (!current) continue;
    if (t.startsWith('cards:')){ inCards = true; inValidation=false; inValidationNewman=false; continue; }
    if (t.startsWith('validation_assets:')){ inValidation=true; inCards=false; continue; }
    if (inValidation && t.startsWith('newman:')){ inValidationNewman=true; continue; }
    if (/^[A-Za-z_\-]+:/.test(t)){ inCards=false; inValidationNewman=false; continue; }
    if (inCards && t.startsWith('- ')) current.cards.push(t.slice(2).trim());
    if (inValidationNewman && t.startsWith('- ')) current.validation_assets.newman.push(t.slice(2).trim());
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

function normaliseCollectionPath(p){
  // If absolute path, return as-is
  if (path.isAbsolute(p)) return p;
  // Prefer reports/collections as the canonical source of collections
  const candidate = path.join(ROOT, p);
  if (fs.existsSync(candidate)) return candidate;
  // If points to reports/newman/*.json, try the same filename under reports/collections
  const base = path.basename(p);
  const alt = path.join(COLLECTIONS_DIR, base);
  if (fs.existsSync(alt)) return alt;
  // Last resort: search under reports/collections by filename
  const maybe = path.join(COLLECTIONS_DIR, p);
  if (fs.existsSync(maybe)) return maybe;
  return candidate; // let caller error out if still missing
}

function resolveCollectionsByStory(storyId){
  if (!fs.existsSync(STORIES_IDX)) fail(`Missing ${STORIES_IDX}`);
  const txt = fs.readFileSync(STORIES_IDX,'utf8');
  const idx = YAMLtoJSONStories(txt);
  const s = (idx.stories||[]).find(x=>x.id===storyId);
  if (!s) fail(`Story not found in _index.yaml: ${storyId}`);
  // Prefer explicit validation assets
  if (s.validation_assets?.newman?.length){
    return s.validation_assets.newman.map(p=>normaliseCollectionPath(p));
  }
  // Fallback to cards' frontmatter newman_report
  const cols = [];
  for (const slug of s.cards){
    const f = path.join(CARDS_DIR, `${slug}.md`);
    if (!fs.existsSync(f)) continue;
    const fm = parseFrontmatter(fs.readFileSync(f,'utf8'));
    if (fm.newman_report) cols.push(normaliseCollectionPath(String(fm.newman_report)));
  }
  // If none found, return empty to allow auto-generation fallback by caller
  return cols;
}

function resolveCollectionsByCard(slug){
  const f = path.join(CARDS_DIR, `${slug}.md`);
  if (!fs.existsSync(f)) fail(`Card not found: ${slug}`);
  const fm = parseFrontmatter(fs.readFileSync(f,'utf8'));
  if (!fm.newman_report) fail(`Card ${slug} has no newman_report frontmatter`);
  return [normaliseCollectionPath(String(fm.newman_report))];
}

// Run newman and emit one JUnit XML per collection with the same basename + '-e2e'
function runNewmanPerCollection(collections){
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const baseUrl = process.env.BASE_URL || process.env.baseUrl;
  for (const col of collections){
    const base = path.basename(col).replace(/\.json$/,'');
    const junitOut = path.join(REPORT_DIR, `${base}-e2e.xml`);
    const args = ['run', col, '--reporters', 'cli,junit', '--reporter-junit-export', junitOut];
    if (baseUrl) args.push('--env-var', `baseUrl=${baseUrl}`);
    console.log(`[run-e2e] ${path.basename(col)} → ${path.relative(ROOT, junitOut)}`);
    const r = spawnSync('npx', ['newman', ...args], { stdio: 'inherit' });
    if (r.status !== 0) fail(`Newman failed for ${col}`);
  }
}

(function main(){
  const { story, card, generate } = parseArgs();
  let collections;
  if (story) {
    if (generate) {
      const outCol = path.join(COLLECTIONS_DIR, `generated-${story.toLowerCase()}-skeleton.json`);
      const r = spawnSync('node', [path.join(ROOT, 'scripts/generate-collection-from-oas.mjs'), story, outCol], { stdio: 'inherit' });
      if (r.status !== 0) fail('Collection generation failed');
      collections = [outCol];
    } else {
      collections = resolveCollectionsByStory(story);
      if (!collections || collections.length === 0) {
        // Auto-generate skeleton when story has no registered collections
        const outCol = path.join(COLLECTIONS_DIR, `generated-${story.toLowerCase()}-skeleton.json`);
        const r = spawnSync('node', [path.join(ROOT, 'scripts/generate-collection-from-oas.mjs'), story, outCol], { stdio: 'inherit' });
        if (r.status !== 0) fail('Collection generation failed');
        collections = [outCol];
      }
    }
  } else {
    collections = resolveCollectionsByCard(card);
  }

  console.log(`[run-e2e] Running ${collections.length} collection(s) (one JUnit per collection)`);
  runNewmanPerCollection(collections);
  console.log(`[run-e2e] Done.`);
})();
