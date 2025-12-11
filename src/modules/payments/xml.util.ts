/**
 * XML 工具
 * 用于 Wallyt API 的 XML 请求/响应处理
 */

/**
 * 对象转 XML 字符串
 * 生成 Wallyt API 要求的 XML 格式
 *
 * @param obj - 参数对象
 * @returns XML 字符串
 *
 * @example
 * objectToXml({ mch_id: '123', body: 'test' })
 * // <xml><mch_id><![CDATA[123]]></mch_id><body><![CDATA[test]]></body></xml>
 */
export function objectToXml(obj: Record<string, any>): string {
  const parts: string[] = ['<xml>'];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    // 使用 CDATA 包裹值，避免特殊字符问题
    parts.push(`<${key}><![CDATA[${value}]]></${key}>`);
  }

  parts.push('</xml>');
  return parts.join('');
}

/**
 * XML 字符串转对象
 * 解析 Wallyt API 返回的 XML 响应
 *
 * @param xml - XML 字符串
 * @returns 解析后的对象
 *
 * @example
 * xmlToObject('<xml><status><![CDATA[0]]></status></xml>')
 * // { status: '0' }
 */
export function xmlToObject<T = Record<string, any>>(xml: string): T {
  const result: Record<string, string> = {};

  // Match CDATA wrapped content: <tag><![CDATA[content]]></tag>
  const cdataRegex = /<(\w+)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = cdataRegex.exec(xml)) !== null) {
    if (match[1] !== 'xml') {
      result[match[1]] = match[2].trim();
    }
  }

  // Match plain content: <tag>content</tag> (no CDATA, no nested tags)
  const plainRegex = /<(\w+)>([^<]*)<\/\1>/g;
  while ((match = plainRegex.exec(xml)) !== null) {
    if (match[1] !== 'xml' && !result[match[1]]) {
      result[match[1]] = match[2].trim();
    }
  }

  return result as T;
}

/**
 * 异步版本的 XML 转对象
 * 提供与 xml2js 兼容的 Promise API
 *
 * @param xml - XML 字符串
 * @returns Promise<解析后的对象>
 */
export async function xmlToObjectAsync<T = Record<string, any>>(xml: string): Promise<T> {
  return xmlToObject<T>(xml);
}

/**
 * 检查字符串是否为有效的 XML
 *
 * @param str - 待检查的字符串
 * @returns 是否为 XML
 */
export function isXml(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  const trimmed = str.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>');
}

/**
 * 从原始请求体中提取 XML
 * 处理 Express 中间件可能已经解析的情况
 *
 * @param body - 请求体 (可能是字符串或已解析的对象)
 * @returns 解析后的对象
 */
export function parseRequestBody<T = Record<string, any>>(body: any): T {
  if (typeof body === 'string') {
    return xmlToObject<T>(body);
  }
  // 如果已经是对象，直接返回
  return body as T;
}
