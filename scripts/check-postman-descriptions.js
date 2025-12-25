/**
 * 检查 Postman Collection 中缺少 description 的请求
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'postman/auto-generated');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let totalRequests = 0;
let missingDesc = 0;
const results = [];

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
  const missing = [];

  function checkItems(items, folder) {
    if (items === null || items === undefined) return;
    for (const item of items) {
      if (item.item) {
        checkItems(item.item, item.name);
      } else if (item.request) {
        totalRequests++;
        if (item.description === undefined || item.description === null || item.description.trim() === '') {
          missingDesc++;
          missing.push({ name: item.name, folder: folder || '' });
        }
      }
    }
  }

  checkItems(content.item, '');

  if (missing.length > 0) {
    results.push({ file, missing, total: missing.length });
  }
}

console.log('=== Postman 请求 description 检查报告 ===\n');
console.log('总请求数:', totalRequests);
console.log('缺少 description:', missingDesc);
console.log('有 description:', totalRequests - missingDesc);
console.log('覆盖率:', ((totalRequests - missingDesc) / totalRequests * 100).toFixed(1) + '%');
console.log('\n--- 缺少 description 的请求 ---\n');

for (const r of results) {
  console.log('📁 ' + r.file + ' (' + r.total + ' 个缺失)');
  for (const m of r.missing) {
    console.log('   ❌ ' + (m.folder ? '[' + m.folder + '] ' : '') + m.name);
  }
  console.log('');
}

if (results.length === 0) {
  console.log('✅ 所有请求都有 description!');
}
