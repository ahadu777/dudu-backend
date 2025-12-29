/**
 * Postman Collection 解析器
 * 从 Postman Collection JSON 文件提取请求信息
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FlowMetadata {
  sequence: number;
  page: string;
  trigger: string;
  produces: string[];
  consumes: string[];
}

export interface PostmanRequest {
  name: string;
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  assertions: string[];
  description?: string;
  flow?: FlowMetadata;
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

  // 解析 x-flow 扩展字段
  let flow: FlowMetadata | undefined;
  if (item['x-flow']) {
    const xFlow = item['x-flow'];
    flow = {
      sequence: xFlow.sequence ?? 0,
      page: xFlow.page ?? '',
      trigger: xFlow.trigger ?? '',
      produces: xFlow.produces ?? [],
      consumes: xFlow.consumes ?? []
    };
  }

  return {
    name: item.name || 'Unnamed Request',
    method: req.method || 'GET',
    url: url || '/',
    body,
    assertions,
    description: item.description,
    flow
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

/**
 * 数据流节点
 */
export interface DataFlowNode {
  variable: string;
  producedBy: string[];  // 请求名称列表
  consumedBy: string[];  // 请求名称列表
}

/**
 * 页面分组
 */
export interface PageGroup {
  page: string;
  icon: string;
  color: string;
  requests: PostmanRequest[];
}

/**
 * 页面图标和颜色映射
 */
const PAGE_STYLES: Record<string, { icon: string; color: string }> = {
  'system': { icon: '⚙️', color: '#6b7280' },
  'product-list': { icon: '🏠', color: '#3b82f6' },
  'product-detail': { icon: '📦', color: '#10b981' },
  'order-confirm': { icon: '💳', color: '#f59e0b' },
  'my-orders': { icon: '📋', color: '#8b5cf6' },
  'order-detail': { icon: '📄', color: '#6366f1' },
  'checkout': { icon: '💰', color: '#ef4444' },
  'my-tickets': { icon: '🎫', color: '#14b8a6' },
  'venue-scan': { icon: '📷', color: '#ec4899' }
};

/**
 * 分析数据流
 */
export function analyzeDataFlow(collection: PostmanCollection): DataFlowNode[] {
  const variableMap = new Map<string, { producedBy: Set<string>; consumedBy: Set<string> }>();

  for (const request of collection.requests) {
    if (!request.flow) continue;

    // 记录 produces
    for (const variable of request.flow.produces) {
      if (!variableMap.has(variable)) {
        variableMap.set(variable, { producedBy: new Set(), consumedBy: new Set() });
      }
      variableMap.get(variable)!.producedBy.add(request.name);
    }

    // 记录 consumes
    for (const variable of request.flow.consumes) {
      if (!variableMap.has(variable)) {
        variableMap.set(variable, { producedBy: new Set(), consumedBy: new Set() });
      }
      variableMap.get(variable)!.consumedBy.add(request.name);
    }
  }

  return Array.from(variableMap.entries()).map(([variable, data]) => ({
    variable,
    producedBy: Array.from(data.producedBy),
    consumedBy: Array.from(data.consumedBy)
  }));
}

/**
 * 按页面分组请求
 */
export function groupRequestsByPage(collection: PostmanCollection): PageGroup[] {
  const pageMap = new Map<string, PostmanRequest[]>();

  for (const request of collection.requests) {
    const page = request.flow?.page || 'unknown';
    if (!pageMap.has(page)) {
      pageMap.set(page, []);
    }
    pageMap.get(page)!.push(request);
  }

  // 按序列号排序每个页面内的请求
  for (const requests of pageMap.values()) {
    requests.sort((a, b) => (a.flow?.sequence ?? 0) - (b.flow?.sequence ?? 0));
  }

  // 转换为数组并按序列号排序页面
  const groups: PageGroup[] = [];
  for (const [page, requests] of pageMap.entries()) {
    const style = PAGE_STYLES[page] || { icon: '📄', color: '#6b7280' };
    groups.push({
      page,
      icon: style.icon,
      color: style.color,
      requests
    });
  }

  // 按第一个请求的序列号排序
  groups.sort((a, b) => {
    const seqA = a.requests[0]?.flow?.sequence ?? 0;
    const seqB = b.requests[0]?.flow?.sequence ?? 0;
    return seqA - seqB;
  });

  return groups;
}
