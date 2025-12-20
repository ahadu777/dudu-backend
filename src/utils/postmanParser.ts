/**
 * Postman Collection 解析器
 * 从 Postman Collection JSON 文件提取请求信息
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PostmanRequest {
  name: string;
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  assertions: string[];
}

export interface PostmanCollection {
  name: string;
  description?: string;
  prdId?: string;
  requests: PostmanRequest[];
}

/**
 * 解析单个 Postman Collection 文件
 */
export function parsePostmanCollection(filePath: string): PostmanCollection | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    const collection: PostmanCollection = {
      name: json.info?.name || path.basename(filePath),
      description: json.info?.description,
      requests: []
    };

    // 提取 PRD ID
    const prdMatch = filePath.match(/prd-(\d+)/i) || collection.name.match(/PRD-(\d+)/i);
    if (prdMatch) {
      collection.prdId = `PRD-${prdMatch[1].padStart(3, '0')}`;
    }

    // 解析请求项
    const items = json.item || [];
    for (const item of items) {
      const request = parseRequestItem(item, json.variable || []);
      if (request) {
        collection.requests.push(request);
      }
    }

    return collection;
  } catch (error) {
    console.error(`Failed to parse collection ${filePath}:`, error);
    return null;
  }
}

/**
 * 解析单个请求项
 */
function parseRequestItem(item: any, variables: any[]): PostmanRequest | null {
  if (!item.request) return null;

  const req = item.request;

  // 构建 URL
  let url = '';
  if (typeof req.url === 'string') {
    url = req.url;
  } else if (req.url?.raw) {
    url = req.url.raw;
  } else if (req.url?.path) {
    url = '/' + req.url.path.join('/');
  }

  // 替换变量
  for (const v of variables) {
    url = url.replace(`{{${v.key}}}`, v.value || '');
  }
  // 移除 base_url 前缀，只保留路径
  url = url.replace(/^https?:\/\/[^\/]+/, '').replace(/^{{base_url}}/, '');

  // 提取请求体
  let body: string | undefined;
  if (req.body?.raw) {
    body = req.body.raw;
  } else if (req.body?.mode === 'urlencoded' && req.body.urlencoded) {
    body = req.body.urlencoded.map((p: any) => `${p.key}=${p.value}`).join('&');
  }

  // 提取断言（从测试脚本）
  const assertions: string[] = [];
  const events = item.event || [];
  for (const event of events) {
    if (event.listen === 'test' && event.script?.exec) {
      const script = Array.isArray(event.script.exec)
        ? event.script.exec.join('\n')
        : event.script.exec;

      // 提取 pm.test('...') 中的断言名称
      const testMatches = script.matchAll(/pm\.test\s*\(\s*['"`]([^'"`]+)['"`]/g);
      for (const match of testMatches) {
        assertions.push(match[1]);
      }
    }
  }

  return {
    name: item.name || 'Unnamed Request',
    method: req.method || 'GET',
    url: url || '/',
    body,
    assertions
  };
}

/**
 * 加载所有 PRD 相关的 Postman Collections
 */
export function loadAllPrdCollections(collectionsDir?: string): Map<string, PostmanCollection> {
  const dir = collectionsDir || path.join(process.cwd(), 'postman/auto-generated');
  const collections = new Map<string, PostmanCollection>();

  if (!fs.existsSync(dir)) {
    return collections;
  }

  const files = fs.readdirSync(dir).filter(f =>
    f.startsWith('prd-') && f.endsWith('.postman_collection.json')
  );

  for (const file of files) {
    const filePath = path.join(dir, file);
    const collection = parsePostmanCollection(filePath);
    if (collection?.prdId) {
      collections.set(collection.prdId, collection);
    }
  }

  return collections;
}

/**
 * 根据测试用例名称查找对应的请求信息
 */
export function findRequestByTestName(
  collection: PostmanCollection,
  testName: string
): PostmanRequest | undefined {
  // 精确匹配
  let request = collection.requests.find(r => r.name === testName);
  if (request) return request;

  // 模糊匹配（去掉序号前缀）
  const normalizedName = testName.replace(/^\d+\.\d+\s*/, '').toLowerCase();
  request = collection.requests.find(r =>
    r.name.replace(/^\d+\.\d+\s*/, '').toLowerCase() === normalizedName
  );
  if (request) return request;

  // 包含匹配
  return collection.requests.find(r =>
    r.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(r.name.replace(/^\d+\.\d+\s*/, '').toLowerCase())
  );
}
