// node scripts/story-coverage.mjs
// Prints a table of story→card coverage and status by reading
// docs/stories/_index.yaml and docs/cards/*.md frontmatter.
// No external deps; tiny YAML subset parser.

import fs from 'fs';
import path from 'path';

const STORIES_IDX = 'docs/stories/_index.yaml';
const CARDS_DIR = 'docs/cards';
const OAS_PATH = 'openapi/openapi.json';

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
  let inSequence = false;
  for (const raw of lines){
    const line = raw.replace(/\r/g,'').trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('stories:')) continue;
    if (line.startsWith('- id:')){
      if (current) out.stories.push(current);
      current = { id: line.split(':').slice(1).join(':').trim(), title:'', status:'', cards: [], sequence: [] };
      inCards = false;
      inSequence = false;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('title:')){ current.title = line.split(':').slice(1).join(':').trim(); continue; }
    if (line.startsWith('status:')){ current.status = line.split(':').slice(1).join(':').trim(); continue; }
    if (line.startsWith('cards:')){ inCards = true; inSequence = false; continue; }
    if (line.startsWith('sequence:')){ inSequence = true; inCards = false; continue; }
    if (line.includes(':')){
      // any new section resets cards parsing
      inCards = false;
      inSequence = false;
      continue;
    }
    // Prioritize sequence items to avoid misclassifying as cards
    if (inSequence && line.startsWith('- ')){
      current.sequence.push(line.slice(2).trim());
      continue;
    }
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

function loadOAS(){
  if (!fs.existsSync(OAS_PATH)) return null;
  try{ return JSON.parse(fs.readFileSync(OAS_PATH,'utf8')); }
  catch(e){ console.error('Failed to parse OpenAPI:', e.message); return null; }
}
const oas = loadOAS();

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

// Derive external dependencies from sequence entries (Strategy A)
function tokensFromSeqItem(item){
  if (typeof item !== 'string') return { inputs: [], output: null, tokens: [] };
  const parts = item.split('→');
  if (parts.length !== 2) return { inputs: [], output: null, tokens: [] };
  let lhs = parts[0].trim();
  const rhs = parts[1].trim();
  let inputs = [];
  if (lhs.startsWith('[') && lhs.endsWith(']')){
    lhs = lhs.slice(1, -1);
    inputs = lhs.split(',').map(s=>s.trim()).filter(Boolean);
  } else {
    inputs = [lhs];
  }
  const tokens = [...inputs, rhs].filter(Boolean);
  return { inputs, output: rhs, tokens };
}

const extRows = [];
for (const s of idx.stories){
  const cardsSet = new Set(s.cards || []);
  const seq = s.sequence || [];
  const extInputs = new Set();
  const extOutputs = new Set();
  const extAll = new Set();
  for (const it of seq){
    const { inputs, output, tokens } = tokensFromSeqItem(it);
    for (const t of tokens){ if (!cardsSet.has(t)) extAll.add(t); }
    for (const i of inputs){ if (!cardsSet.has(i)) extInputs.add(i); }
    if (output && !cardsSet.has(output)) extOutputs.add(output);
  }
  extRows.push({
    story: s.id,
    external_inputs: Array.from(extInputs).sort().join(', '),
    external_outputs: Array.from(extOutputs).sort().join(', '),
    external_all: Array.from(extAll).sort().join(', ')
  });
}
console.log('\nSequence external dependency report (derived from sequence)');
console.table(extRows);

// OpenAPI x-* validation
if (oas){
  const storyIds = new Set(idx.stories.map(s=>s.id));
  const cardSlugs = new Set(Object.keys(cards));
  const storySeqMap = new Map(idx.stories.map(s=>[s.id, new Set(s.sequence||[])]));

  const validations = [];
  const violations = [];

  for (const [p, ops] of Object.entries(oas.paths||{})){
    for (const [m, op] of Object.entries(ops)){
      if (!op || typeof op !== 'object') continue;
      const xStory = op['x-story'];
      const xCard = op['x-card'];
      const xSeq = op['x-sequence'];
      if (!xStory && !xCard && !xSeq) continue;

      let storyOk = true, cardOk = true, seqOk = 'n/a';
      if (Array.isArray(xStory) && xStory.length){
        storyOk = xStory.every(id=>storyIds.has(id));
        if (!storyOk) violations.push({path:p, method:m, reason:`x-story missing in _index.yaml: ${xStory}`});
      }
      if (typeof xCard === 'string'){
        cardOk = cardSlugs.has(xCard);
        if (!cardOk) violations.push({path:p, method:m, reason:`x-card slug not found: ${xCard}`});
      }
      if (xSeq && Array.isArray(xStory) && xStory.length && typeof xCard==='string'){
        const sid = xStory[0];
        const seqSet = storySeqMap.get(sid) || new Set();
        if (Array.isArray(xSeq)){
          const ok = xSeq.every(s=>seqSet.has(s));
          seqOk = ok;
          if (!ok) violations.push({path:p, method:m, reason:`x-sequence entries not in ${sid}.sequence`});
        } else if (typeof xSeq==='object'){
          let ok = true;
          if (Array.isArray(xSeq.follows)) ok = ok && xSeq.follows.every(a=>seqSet.has(`${a} → ${xCard}`));
          if (Array.isArray(xSeq.precedes)) ok = ok && xSeq.precedes.every(b=>seqSet.has(`${xCard} → ${b}`));
          seqOk = ok;
          if (!ok) violations.push({path:p, method:m, reason:`x-sequence follow/precede not aligned with ${sid}.sequence`});
        }
      }

      validations.push({ path:p, method:m.toUpperCase(), storyOk, cardOk, seqOk });
    }
  }

  console.log('\nOpenAPI x-* validation summary');
  console.table(validations);
  if (violations.length){
    console.log('\nViolations:');
    for (const v of violations){
      console.log(`- ${v.method.toUpperCase()} ${v.path} :: ${v.reason}`);
    }
  } else {
    console.log('\nNo x-* violations detected.');
  }
}
