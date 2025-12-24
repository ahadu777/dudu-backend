#!/usr/bin/env node
/**
 * OpenAPI Generator from Card Contracts
 *
 * 从 docs/cards/*.md 中提取 Contract 章节，合并生成 openapi.json
 * Card 是 API 契约的唯一真相源
 *
 * 用法: npm run generate:openapi
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 配置
const CARDS_DIR = path.resolve(__dirname, '../docs/cards');
const OPENAPI_OUTPUT = path.resolve(__dirname, '../openapi/openapi.json');

// 基础 OpenAPI 结构
const BASE_OPENAPI = {
  openapi: '3.0.3',
  info: {
    title: 'Synque Express Ticketing API',
    version: '0.1.0',
    description: 'Complete ticketing and event management API with user profile management, promotions, and cancellation support'
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Development server'
    },
    {
      url: 'https://api.ticketing.com',
      description: 'Production server'
    }
  ],
  paths: {},
  components: {
    schemas: {},
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authenticated API access'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for B2B integrations'
      }
    }
  }
};

// 基础路径（不从 Card 提取）
const BASE_PATHS = {
  '/healthz': {
    get: {
      tags: ['Infrastructure'],
      summary: 'Health check endpoint',
      description: 'Liveness probe for service health monitoring',
      responses: {
        '200': {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/version': {
    get: {
      tags: ['Infrastructure'],
      summary: 'Service version information',
      description: 'Returns service name and version',
      responses: {
        '200': {
          description: 'Version information',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'ticketing-api' },
                  version: { type: 'string', example: '0.1.0' }
                }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * 从 Card 内容中提取 Contract YAML
 */
function extractContract(content) {
  // 匹配 Contract 章节（支持 "## 2) Contract", "## Contract" 等变体）
  const contractSectionRegex = /##\s*(?:\d+\)\s*)?Contract.*?\n```yaml\n([\s\S]*?)\n```/i;
  const match = content.match(contractSectionRegex);

  if (!match) {
    return null;
  }

  try {
    return yaml.load(match[1]);
  } catch (e) {
    return null;
  }
}

/**
 * 从 Card 内容中提取 frontmatter
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  try {
    return yaml.load(match[1]) || {};
  } catch (e) {
    return {};
  }
}

/**
 * 加载所有 Card 文件并提取 Contract
 */
function loadCardsWithContracts() {
  if (!fs.existsSync(CARDS_DIR)) {
    console.error(`Cards directory not found: ${CARDS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.md'));
  const results = [];

  for (const filename of files) {
    const filePath = path.join(CARDS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);
    const contract = extractContract(content);

    results.push({
      filename,
      slug: frontmatter.slug || filename.replace('.md', ''),
      status: frontmatter.status || 'Unknown',
      contract
    });
  }

  return results;
}

/**
 * 合并多个 Contract 到 OpenAPI 结构
 */
function mergeContracts(cards) {
  const openapi = JSON.parse(JSON.stringify(BASE_OPENAPI));

  // 添加基础路径
  Object.assign(openapi.paths, BASE_PATHS);

  let pathCount = Object.keys(BASE_PATHS).length;
  let schemaCount = 0;
  const cardsWithContract = [];
  const cardsWithoutContract = [];

  for (const card of cards) {
    if (!card.contract) {
      cardsWithoutContract.push(card.slug);
      continue;
    }

    cardsWithContract.push(card.slug);

    // 合并 paths
    if (card.contract.paths) {
      for (const [path, methods] of Object.entries(card.contract.paths)) {
        if (openapi.paths[path]) {
          // 合并方法（Card 覆盖现有）
          Object.assign(openapi.paths[path], methods);
        } else {
          openapi.paths[path] = methods;
        }
        pathCount++;
      }
    }

    // 合并 components.schemas
    if (card.contract.components?.schemas) {
      for (const [name, schema] of Object.entries(card.contract.components.schemas)) {
        openapi.components.schemas[name] = schema;
        schemaCount++;
      }
    }
  }

  return {
    openapi,
    stats: {
      totalCards: cards.length,
      cardsWithContract: cardsWithContract.length,
      cardsWithoutContract: cardsWithoutContract.length,
      pathCount: Object.keys(openapi.paths).length,
      schemaCount: Object.keys(openapi.components.schemas).length
    },
    cardsWithContract,
    cardsWithoutContract
  };
}

/**
 * 主函数
 */
function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     OpenAPI Generator from Cards       ║');
  console.log('║     Card = Single Source of Truth      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 加载 Cards
  console.log('📂 Loading Cards from docs/cards/...');
  const cards = loadCardsWithContracts();
  console.log(`   Found ${cards.length} Card files\n`);

  // 合并 Contracts
  console.log('🔧 Merging Contract sections...');
  const { openapi, stats, cardsWithContract, cardsWithoutContract } = mergeContracts(cards);

  // 统计信息
  console.log('\n📊 Statistics:');
  console.log(`   Cards with Contract: ${stats.cardsWithContract}`);
  console.log(`   Cards without Contract: ${stats.cardsWithoutContract}`);
  console.log(`   Total Paths: ${stats.pathCount}`);
  console.log(`   Total Schemas: ${stats.schemaCount}`);

  // 无 Contract 的 Cards（可能是 Draft 或无 API）
  if (cardsWithoutContract.length > 0 && cardsWithoutContract.length <= 10) {
    console.log('\n⚠️  Cards without Contract section:');
    cardsWithoutContract.forEach(slug => console.log(`   - ${slug}`));
  }

  // 写入 OpenAPI 文件
  console.log(`\n📝 Writing to ${OPENAPI_OUTPUT}...`);
  fs.writeFileSync(
    OPENAPI_OUTPUT,
    JSON.stringify(openapi, null, 2),
    'utf-8'
  );

  console.log('\n✅ OpenAPI generated successfully!\n');

  // 返回统计供测试使用
  return stats;
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { extractContract, loadCardsWithContracts, mergeContracts };
