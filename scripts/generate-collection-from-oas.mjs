// node scripts/generate-collection-from-oas.mjs
// Prototype: generate a minimal Newman collection from OpenAPI x-* metadata
// Usage: node scripts/generate-collection-from-oas.mjs US-010A reports/collections/generated-us-010a-skeleton.json

import fs from 'fs';
import path from 'path';

const OAS = 'openapi/openapi.json';
const storyId = process.argv[2] || 'US-010A';
const outFile = process.argv[3] || `reports/collections/generated-${storyId.toLowerCase()}-skeleton.json`;

if (!fs.existsSync(OAS)){
  console.error(`Missing ${OAS}`);
  process.exit(1);
}

const oas = JSON.parse(fs.readFileSync(OAS,'utf8'));

const items = [];
for (const [p, ops] of Object.entries(oas.paths||{})){
  for (const [m, op] of Object.entries(ops)){
    if (!op || typeof op !== 'object') continue;
    const xs = op['x-story'];
    if (!Array.isArray(xs) || !xs.includes(storyId)) continue;

    items.push({
      name: `${m.toUpperCase()} ${p}`,
      request: {
        method: m.toUpperCase(),
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url: { raw: `{{baseUrl}}${p}`, host: ['{{baseUrl}}'], path: p.replace(/^\//,'').split('/') },
        body: (m.toLowerCase()==='get') ? undefined : { mode: 'raw', raw: '{\n  // TODO: fill request body\n}' }
      },
      event: [{
        listen: 'test',
        script: { type: 'text/javascript', exec: [
          "pm.test('status 2xx', () => pm.expect(pm.response.code).to.be.within(200,299));"
        ]}
      }]
    });
  }
}

const collection = {
  info: {
    name: `${storyId} — Generated Skeleton`,
    _postman_id: '00000000-0000-4000-8000-0000000GEN01',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: items,
  variable: [ { key: 'baseUrl', value: 'https://express-jdpny.ondigitalocean.app' } ]
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(collection,null,2));
console.log(`Generated: ${outFile} with ${items.length} items`);
