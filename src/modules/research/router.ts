import { Router, Request, Response } from 'express';

const router = Router();

// ========== MOCK DATA ==========
// In-memory storage for demo - will be replaced with database later

interface MockTopic {
  id: number;
  topic: string;
  status: string;
  synthesis_notes: string | null;
  questions: { text: string; answered: boolean }[];
  leads_to_memo: string | null;
  leads_to_prd: string | null;
  memo_content: string | null;
  started_at: string;
  created_at: string;
  updated_at: string;
  reference_count: number;
}

let mockTopics: MockTopic[] = [
  {
    id: 1,
    topic: 'Bank Partnership for Rent Payments',
    status: 'active',
    synthesis_notes: '## Key Findings\n\n- 银行愿意提供 API 接入，手续费可谈到 0.3%\n- 竞品目前收费 1.5%，我们有价格优势空间\n- 用户痛点：每月手动转账麻烦，容易忘记\n\n## Next Steps\n\n1. 联系招商银行 API 团队\n2. 准备技术对接文档\n3. 用户调研验证需求',
    questions: [
      { text: '银行合作的具体条件是什么？', answered: false },
      { text: '竞品的定价策略如何？', answered: true },
      { text: '用户对自动扣款的接受度？', answered: false }
    ],
    leads_to_memo: 'MEMO-001',
    leads_to_prd: null,
    memo_content: '# Bank Partnership Memo\n\nRecommend pursuing partnership with CMB for rent payment automation.',
    started_at: '2024-12-15',
    created_at: '2024-12-15T10:00:00Z',
    updated_at: '2024-12-20T15:30:00Z',
    reference_count: 3
  },
  {
    id: 2,
    topic: 'Medical PR Pricing Strategy',
    status: 'done',
    synthesis_notes: '## 研究结论\n\n医疗公关定价需要考虑：\n- 医院等级（三甲 vs 二甲）\n- 服务类型（危机公关 vs 日常维护）\n- 地区差异',
    questions: [
      { text: '三甲医院的预算范围？', answered: true },
      { text: '竞品的服务模式？', answered: true }
    ],
    leads_to_memo: 'MEMO-002',
    leads_to_prd: null,
    memo_content: null,
    started_at: '2024-11-01',
    created_at: '2024-11-01T09:00:00Z',
    updated_at: '2024-12-10T14:00:00Z',
    reference_count: 5
  },
  {
    id: 3,
    topic: 'OTA Integration Research',
    status: 'synthesizing',
    synthesis_notes: '## 进行中\n\n正在整理各 OTA 平台的接入要求...',
    questions: [
      { text: '携程 API 文档在哪？', answered: true },
      { text: '美团的分成比例？', answered: false }
    ],
    leads_to_memo: null,
    leads_to_prd: 'PRD-012',
    memo_content: null,
    started_at: '2024-12-18',
    created_at: '2024-12-18T11:00:00Z',
    updated_at: '2024-12-20T16:00:00Z',
    reference_count: 2
  },
  {
    id: 4,
    topic: 'WeChat Mini Program Best Practices',
    status: 'archived',
    synthesis_notes: '已完成，见相关 PRD 文档',
    questions: [],
    leads_to_memo: null,
    leads_to_prd: 'PRD-008',
    memo_content: null,
    started_at: '2024-10-01',
    created_at: '2024-10-01T08:00:00Z',
    updated_at: '2024-11-15T12:00:00Z',
    reference_count: 8
  }
];

let mockReferences: Record<number, any[]> = {
  1: [
    { id: 101, research_topic_id: 1, type: 'notion', title: 'ChatGPT对话导出 - 银行合作讨论', url: 'https://notion.so/bank-partnership-chat', notes: '与 Claude 讨论银行 API 接入的对话记录', reference_date: '2024-12-15', created_at: '2024-12-15T10:30:00Z' },
    { id: 102, research_topic_id: 1, type: 'google-doc', title: '市场分析文档 - 租金支付市场', url: 'https://docs.google.com/document/d/abc123', notes: null, reference_date: '2024-12-16', created_at: '2024-12-16T09:00:00Z' },
    { id: 103, research_topic_id: 1, type: 'screenshot', title: '竞品 App 截图 - 自如支付流程', url: null, directus_file_id: 'file-uuid-001', notes: '自如 App 的租金支付界面', reference_date: '2024-12-18', created_at: '2024-12-18T14:00:00Z' }
  ],
  2: [
    { id: 201, research_topic_id: 2, type: 'notion', title: 'Claude对话 - 医疗公关定价', url: 'https://notion.so/medical-pr-pricing', notes: null, reference_date: '2024-11-01', created_at: '2024-11-01T09:30:00Z' },
    { id: 202, research_topic_id: 2, type: 'url', title: '行业报告 - 中国医疗公关市场', url: 'https://example.com/medical-pr-report', notes: '2024年行业报告', reference_date: '2024-11-05', created_at: '2024-11-05T10:00:00Z' },
    { id: 203, research_topic_id: 2, type: 'google-doc', title: '竞品分析 - 蓝标医疗', url: 'https://docs.google.com/document/d/xyz789', notes: null, reference_date: '2024-11-10', created_at: '2024-11-10T11:00:00Z' },
    { id: 204, research_topic_id: 2, type: 'screenshot', title: '微信群讨论截图', url: null, directus_file_id: 'file-uuid-002', notes: '与医院市场部的沟通', reference_date: '2024-11-15', created_at: '2024-11-15T15:00:00Z' },
    { id: 205, research_topic_id: 2, type: 'other', title: '会议纪要 - 医院调研', url: null, notes: '实地走访3家三甲医院的总结', reference_date: '2024-11-20', created_at: '2024-11-20T17:00:00Z' }
  ],
  3: [
    { id: 301, research_topic_id: 3, type: 'url', title: '携程开放平台文档', url: 'https://open.ctrip.com/docs', notes: 'API 接入指南', reference_date: '2024-12-18', created_at: '2024-12-18T11:30:00Z' },
    { id: 302, research_topic_id: 3, type: 'notion', title: 'ChatGPT对话 - OTA集成方案', url: 'https://notion.so/ota-integration', notes: null, reference_date: '2024-12-19', created_at: '2024-12-19T09:00:00Z' }
  ],
  4: [
    { id: 401, research_topic_id: 4, type: 'url', title: '微信小程序开发文档', url: 'https://developers.weixin.qq.com/miniprogram/dev/', notes: null, reference_date: '2024-10-01', created_at: '2024-10-01T08:30:00Z' },
    { id: 402, research_topic_id: 4, type: 'notion', title: 'Claude对话 - 小程序架构', url: 'https://notion.so/miniprogram-arch', notes: null, reference_date: '2024-10-05', created_at: '2024-10-05T10:00:00Z' }
  ]
};

let nextTopicId = 5;
let nextRefId = 500;

// ========== MOCK API Routes ==========

// List topics
router.get('/api/topics', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  let filtered = [...mockTopics];

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  // Sort by created_at desc
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    success: true,
    data: filtered,
    meta: { total: filtered.length, limit: 100, offset: 0 }
  });
});

// Get topic
router.get('/api/topics/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const topic = mockTopics.find(t => t.id === id);

  if (!topic) {
    return res.status(404).json({ success: false, error: 'Topic not found' });
  }

  res.json({ success: true, data: topic });
});

// Create topic
router.post('/api/topics', (req: Request, res: Response) => {
  const newTopic = {
    id: nextTopicId++,
    topic: req.body.topic,
    status: 'active',
    synthesis_notes: req.body.synthesis_notes || null,
    questions: req.body.questions || [],
    leads_to_memo: null,
    leads_to_prd: null,
    memo_content: null,
    started_at: req.body.started_at || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reference_count: 0
  };

  mockTopics.unshift(newTopic);
  mockReferences[newTopic.id] = [];

  res.status(201).json({ success: true, data: newTopic });
});

// Update topic
router.patch('/api/topics/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const topic = mockTopics.find(t => t.id === id);

  if (!topic) {
    return res.status(404).json({ success: false, error: 'Topic not found' });
  }

  // Update fields
  if (req.body.topic !== undefined) topic.topic = req.body.topic;
  if (req.body.status !== undefined) topic.status = req.body.status;
  if (req.body.synthesis_notes !== undefined) topic.synthesis_notes = req.body.synthesis_notes;
  if (req.body.questions !== undefined) topic.questions = req.body.questions;
  if (req.body.leads_to_memo !== undefined) topic.leads_to_memo = req.body.leads_to_memo;
  if (req.body.leads_to_prd !== undefined) topic.leads_to_prd = req.body.leads_to_prd;
  if (req.body.memo_content !== undefined) topic.memo_content = req.body.memo_content;
  topic.updated_at = new Date().toISOString();

  res.json({ success: true, data: topic });
});

// Delete topic
router.delete('/api/topics/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const index = mockTopics.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Topic not found' });
  }

  mockTopics.splice(index, 1);
  delete mockReferences[id];

  res.json({ success: true, message: 'Topic deleted' });
});

// List references for topic
router.get('/api/topics/:id/references', (req: Request, res: Response) => {
  const topicId = parseInt(req.params.id, 10);
  const refs = mockReferences[topicId] || [];
  res.json({ success: true, data: refs });
});

// Add reference to topic
router.post('/api/topics/:id/references', (req: Request, res: Response) => {
  const topicId = parseInt(req.params.id, 10);
  const topic = mockTopics.find(t => t.id === topicId);

  if (!topic) {
    return res.status(404).json({ success: false, error: 'Topic not found' });
  }

  const newRef = {
    id: nextRefId++,
    research_topic_id: topicId,
    type: req.body.type,
    title: req.body.title,
    url: req.body.url || null,
    directus_file_id: req.body.directus_file_id || null,
    notes: req.body.notes || null,
    reference_date: req.body.reference_date || null,
    created_at: new Date().toISOString()
  };

  if (!mockReferences[topicId]) {
    mockReferences[topicId] = [];
  }
  mockReferences[topicId].unshift(newRef);
  topic.reference_count = mockReferences[topicId].length;

  res.status(201).json({ success: true, data: newRef });
});

// Delete reference
router.delete('/api/references/:id', (req: Request, res: Response) => {
  const refId = parseInt(req.params.id, 10);

  for (const topicId in mockReferences) {
    const refs = mockReferences[topicId];
    const index = refs.findIndex(r => r.id === refId);
    if (index !== -1) {
      refs.splice(index, 1);
      const topic = mockTopics.find(t => t.id === parseInt(topicId, 10));
      if (topic) {
        topic.reference_count = refs.length;
      }
      return res.json({ success: true, message: 'Reference deleted' });
    }
  }

  res.status(404).json({ success: false, error: 'Reference not found' });
});

// ========== UI Route ==========

router.get('/', (_req: Request, res: Response) => {
  res.send(researchHubHTML);
});

// ========== Public Insights View ==========
// Renders a research topic's memo_content as a public blog-style page

router.get('/insights/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const topic = mockTopics.find(t => t.id === id);

  if (!topic) {
    return res.status(404).send(insightNotFoundHTML);
  }

  // Get references for citations
  const refs = mockReferences[id] || [];

  res.send(generateInsightHTML(topic, refs));
});

// Generate the public insight page HTML
function generateInsightHTML(topic: any, refs: any[]): string {
  const memoContent = topic.memo_content || topic.synthesis_notes || '';
  const hasContent = memoContent.trim().length > 0;

  // Simple markdown-like rendering (basic)
  const renderedContent = hasContent
    ? escapeHtmlForInsight(memoContent)
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
    : '<p class="no-content">No content published yet. This research is still in progress.</p>';

  const citationsHtml = refs.length > 0
    ? refs.map((ref, i) => {
        const link = ref.url
          ? `<a href="${escapeHtmlForInsight(ref.url)}" target="_blank" rel="noopener">${escapeHtmlForInsight(ref.title)}</a>`
          : escapeHtmlForInsight(ref.title);
        return `<li>[${i + 1}] ${link}${ref.notes ? ` - <em>${escapeHtmlForInsight(ref.notes)}</em>` : ''}</li>`;
      }).join('')
    : '<li>No sources cited</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlForInsight(topic.topic)} | Research Insights</title>
  <style>
    :root {
      --bg-primary: #fafafa;
      --bg-secondary: #fff;
      --text-primary: #1a1a2e;
      --text-secondary: #666;
      --accent: #e94560;
      --border: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1a1a2e;
        --bg-secondary: #16213e;
        --text-primary: #eee;
        --text-secondary: #aaa;
        --border: #334155;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.8;
      min-height: 100vh;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
      padding: 60px 20px;
    }

    header {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border);
    }

    .back-link {
      display: inline-block;
      color: var(--accent);
      text-decoration: none;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    h1 {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.3;
    }

    .meta {
      color: var(--text-secondary);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.9rem;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      text-transform: uppercase;
      margin-left: 10px;
    }

    .status-active { background: #22c55e22; color: #16a34a; }
    .status-synthesizing { background: #f59e0b22; color: #d97706; }
    .status-done { background: #3b82f622; color: #2563eb; }
    .status-archived { background: #64748b22; color: #64748b; }

    article {
      font-size: 1.1rem;
    }

    article h1, article h2, article h3 {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 30px 0 15px 0;
    }

    article h2 { font-size: 1.5rem; }
    article h3 { font-size: 1.2rem; }

    article p {
      margin-bottom: 1.5em;
    }

    article ul {
      margin: 20px 0;
      padding-left: 25px;
    }

    article li {
      margin-bottom: 8px;
    }

    article strong {
      font-weight: 600;
    }

    .no-content {
      color: var(--text-secondary);
      font-style: italic;
      text-align: center;
      padding: 60px 20px;
    }

    .citations {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
    }

    .citations h2 {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 1.2rem;
      margin-bottom: 20px;
      color: var(--text-secondary);
    }

    .citations ul {
      list-style: none;
      padding: 0;
    }

    .citations li {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.9rem;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }

    .citations a {
      color: var(--accent);
      text-decoration: none;
    }

    .citations a:hover {
      text-decoration: underline;
    }

    footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-secondary);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.85rem;
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/research" class="back-link">&larr; Back to Research Hub</a>
      <h1>${escapeHtmlForInsight(topic.topic)}</h1>
      <div class="meta">
        Started ${topic.started_at}
        <span class="status-badge status-${topic.status}">${topic.status}</span>
      </div>
    </header>

    <article>
      <p>${renderedContent}</p>
    </article>

    <section class="citations">
      <h2>Sources & References</h2>
      <ul>
        ${citationsHtml}
      </ul>
    </section>

    <footer>
      <p>Part of the <a href="/research">Research Hub</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtmlForInsight(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const insightNotFoundHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not Found | Research Insights</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #1a1a2e;
      color: #eee;
    }
    .content {
      text-align: center;
    }
    h1 { font-size: 4rem; margin-bottom: 10px; }
    p { color: #aaa; margin-bottom: 20px; }
    a { color: #e94560; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="content">
    <h1>404</h1>
    <p>Research topic not found</p>
    <a href="/research">&larr; Back to Research Hub</a>
  </div>
</body>
</html>`;

// ========== HTML Template ==========

const researchHubHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Hub</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-card: #0f3460;
      --text-primary: #eee;
      --text-secondary: #aaa;
      --accent: #e94560;
      --accent-hover: #ff6b6b;
      --success: #4ade80;
      --warning: #fbbf24;
      --info: #60a5fa;
      --border: #334155;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    /* How It Works Section */
    .how-it-works {
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 25px;
      margin-bottom: 25px;
    }

    .how-it-works-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    .how-it-works-header h2 {
      font-size: 1rem;
      color: var(--info);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .how-it-works-toggle {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 1.2rem;
    }

    .how-it-works-content {
      display: none;
      margin-top: 20px;
    }

    .how-it-works-content.expanded {
      display: block;
    }

    .workflow-diagram {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .workflow-step {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 15px 10px;
      background: var(--bg-primary);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .workflow-step .step-icon {
      font-size: 1.5rem;
      margin-bottom: 8px;
    }

    .workflow-step .step-title {
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .workflow-step .step-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .workflow-arrow {
      color: var(--text-secondary);
      font-size: 1.2rem;
    }

    .how-it-works-features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.85rem;
    }

    .feature-item .feature-icon {
      color: var(--success);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    header h1 {
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-secondary);
    }

    .main-layout {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 30px;
    }

    .sidebar {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      height: fit-content;
    }

    .sidebar h2 {
      font-size: 1.1rem;
      margin-bottom: 15px;
      color: var(--text-secondary);
    }

    .topic-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .topic-item {
      background: var(--bg-card);
      padding: 15px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .topic-item:hover {
      border-color: var(--accent);
    }

    .topic-item.active {
      border-color: var(--accent);
      background: rgba(233, 69, 96, 0.1);
    }

    .topic-item h3 {
      font-size: 0.95rem;
      margin-bottom: 8px;
    }

    .topic-meta {
      display: flex;
      gap: 10px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .status-active { background: #22c55e33; color: #4ade80; }
    .status-synthesizing { background: #f59e0b33; color: #fbbf24; }
    .status-done { background: #3b82f633; color: #60a5fa; }
    .status-archived { background: #64748b33; color: #94a3b8; }

    .detail-panel {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 30px;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
    }

    .detail-header h2 {
      font-size: 1.5rem;
      max-width: 70%;
    }

    .detail-actions {
      display: flex;
      gap: 10px;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .section h3 {
      font-size: 1rem;
      color: var(--text-secondary);
    }

    .reference-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reference-item {
      background: var(--bg-card);
      padding: 15px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .reference-info h4 {
      font-size: 0.95rem;
      margin-bottom: 5px;
    }

    .reference-info a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.85rem;
    }

    .reference-info a:hover {
      text-decoration: underline;
    }

    .reference-meta {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .type-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      background: var(--bg-secondary);
      margin-right: 8px;
    }

    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .question-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: var(--bg-card);
      border-radius: 6px;
    }

    .question-item.answered {
      opacity: 0.6;
    }

    .question-item.answered span {
      text-decoration: line-through;
    }

    .question-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .synthesis-notes {
      background: var(--bg-card);
      padding: 20px;
      border-radius: 8px;
      white-space: pre-wrap;
      font-family: inherit;
      line-height: 1.6;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-state h3 {
      margin-bottom: 10px;
    }

    /* Modal styles */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: var(--bg-secondary);
      padding: 30px;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .modal-header h3 {
      font-size: 1.2rem;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    .delete-btn {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      padding: 5px;
    }

    .delete-btn:hover {
      color: var(--accent-hover);
    }

    /* Build Context Modal */
    .context-output {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .context-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      flex-wrap: wrap;
    }

    .btn-success {
      background: var(--success);
      color: #000;
    }

    .btn-success:hover {
      background: #22c55e;
    }

    .btn-info {
      background: var(--info);
      color: #000;
    }

    .btn-info:hover {
      background: #3b82f6;
    }

    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 25px;
      background: var(--bg-card);
      border-radius: 8px;
      border-left: 4px solid var(--success);
      animation: slideIn 0.3s ease;
    }

    .toast.error {
      border-left-color: var(--accent);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- How It Works Section -->
    <div class="how-it-works">
      <div class="how-it-works-header" onclick="toggleHowItWorks()">
        <h2>How It Works</h2>
        <button class="how-it-works-toggle" id="how-toggle">+</button>
      </div>
      <div class="how-it-works-content" id="how-content">
        <!-- Pain Point -->
        <div style="background: rgba(233, 69, 96, 0.1); border: 1px solid var(--accent); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: var(--accent);">The Problem We're Solving</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">
            You have 100+ ChatGPT chats, 50+ Gemini sessions, dozens of Claude projects...
            <strong style="color: var(--text-primary);">"Which chat had that pricing analysis?"</strong>
            Research gets scattered across AI tools and becomes impossible to find.
          </div>
        </div>

        <div class="workflow-diagram">
          <div class="workflow-step">
            <div class="step-icon">1. Collect</div>
            <div class="step-title">Add Sources</div>
            <div class="step-desc">URLs, screenshots, chat exports, notes</div>
          </div>
          <div class="workflow-arrow">-></div>
          <div class="workflow-step">
            <div class="step-icon">2. Organize</div>
            <div class="step-title">Group by Topic</div>
            <div class="step-desc">Track questions, add annotations</div>
          </div>
          <div class="workflow-arrow">-></div>
          <div class="workflow-step">
            <div class="step-icon">3. Build Context</div>
            <div class="step-title">Export for AI</div>
            <div class="step-desc">One-click context for Claude/NotebookLM</div>
          </div>
          <div class="workflow-arrow">-></div>
          <div class="workflow-step">
            <div class="step-icon">4. Synthesize</div>
            <div class="step-title">AI + Your Brain</div>
            <div class="step-desc">Generate insights, memos, PRDs</div>
          </div>
          <div class="workflow-arrow">-></div>
          <div class="workflow-step">
            <div class="step-icon">5. Output</div>
            <div class="step-title">Memo or PRD</div>
            <div class="step-desc">Link to docs or publish as blog</div>
          </div>
        </div>
        <div class="how-it-works-features">
          <div class="feature-item">
            <span class="feature-icon">*</span>
            <span><strong>Find Past Research</strong> - No more "which chat was that in?"</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">*</span>
            <span><strong>Tool Agnostic</strong> - Works with Claude, ChatGPT, NotebookLM, Gemini</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">*</span>
            <span><strong>Compounds Over Time</strong> - Knowledge base grows, never disappears</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">*</span>
            <span><strong>Research -> Product</strong> - Link directly to PRDs and Memos</span>
          </div>
        </div>
      </div>
    </div>

    <header>
      <h1>Research Hub</h1>
      <button class="btn btn-primary" onclick="showNewTopicModal()">+ New Topic</button>
    </header>

    <div class="main-layout">
      <aside class="sidebar">
        <h2>Research Topics</h2>
        <div id="topic-list" class="topic-list">
          <div class="empty-state">
            <p>Loading topics...</p>
          </div>
        </div>
      </aside>

      <main id="detail-panel" class="detail-panel">
        <div class="empty-state">
          <h3>Select a topic</h3>
          <p>Choose a research topic from the sidebar to view details</p>
        </div>
      </main>
    </div>
  </div>

  <!-- New Topic Modal -->
  <div id="new-topic-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>New Research Topic</h3>
        <button class="modal-close" onclick="closeModal('new-topic-modal')">&times;</button>
      </div>
      <div class="form-group">
        <label>Topic</label>
        <input type="text" id="new-topic-name" placeholder="Enter research topic...">
      </div>
      <div class="form-group">
        <label>Start Date</label>
        <input type="date" id="new-topic-date">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('new-topic-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="createTopic()">Create</button>
      </div>
    </div>
  </div>

  <!-- Add Reference Modal -->
  <div id="add-reference-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Add Reference</h3>
        <button class="modal-close" onclick="closeModal('add-reference-modal')">&times;</button>
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="ref-type">
          <option value="notion">Notion</option>
          <option value="google-doc">Google Doc</option>
          <option value="url">URL</option>
          <option value="screenshot">Screenshot</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="ref-title" placeholder="Reference title...">
      </div>
      <div class="form-group">
        <label>URL</label>
        <input type="url" id="ref-url" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="ref-notes" placeholder="Optional notes..."></textarea>
      </div>
      <div class="form-group">
        <label>Reference Date</label>
        <input type="date" id="ref-date">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('add-reference-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="addReference()">Add</button>
      </div>
    </div>
  </div>

  <!-- Edit Notes Modal -->
  <div id="edit-notes-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edit Synthesis Notes</h3>
        <button class="modal-close" onclick="closeModal('edit-notes-modal')">&times;</button>
      </div>
      <div class="form-group">
        <label>Notes (Markdown supported)</label>
        <textarea id="edit-notes-content" style="min-height: 200px;"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('edit-notes-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveSynthesisNotes()">Save</button>
      </div>
    </div>
  </div>

  <!-- Build Context Modal -->
  <div id="build-context-modal" class="modal">
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3>Build Context for AI</h3>
        <button class="modal-close" onclick="closeModal('build-context-modal')">&times;</button>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
        Copy this context to Claude, ChatGPT, or NotebookLM to synthesize your research.
      </p>
      <div id="context-output" class="context-output">
        Generating context...
      </div>
      <div class="context-actions">
        <button class="btn btn-success" onclick="copyContext()">Copy to Clipboard</button>
        <button class="btn btn-info" onclick="downloadContext()">Download as .md</button>
        <button class="btn btn-secondary" onclick="closeModal('build-context-modal')">Close</button>
      </div>
    </div>
  </div>

  <!-- Save Synthesis Modal -->
  <div id="save-synthesis-modal" class="modal">
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3>Save AI Synthesis</h3>
        <button class="modal-close" onclick="closeModal('save-synthesis-modal')">&times;</button>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
        Paste the AI-generated synthesis here. Link to a Memo (strategic thinking) or PRD (build spec).
      </p>
      <div style="display: flex; gap: 15px;">
        <div class="form-group" style="flex: 1;">
          <label>Memo ID (optional)</label>
          <input type="text" id="synthesis-memo-id" placeholder="e.g., MEMO-001">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>PRD ID (optional)</label>
          <input type="text" id="synthesis-prd-id" placeholder="e.g., PRD-010">
        </div>
      </div>
      <div class="form-group">
        <label>Memo Content (Markdown supported)</label>
        <textarea id="synthesis-content" style="min-height: 250px;" placeholder="Paste your AI synthesis here...

Example:
# Key Findings

Based on the research sources, here are the main insights:

## 1. Market Opportunity
...

## 2. Recommended Actions
..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('save-synthesis-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveSynthesisAsMemo()">Save as Memo</button>
      </div>
    </div>
  </div>

  <script>
    console.log('Research Hub JS loaded');
    const API_BASE = '/research/api';
    let allTopics = [];
    let currentTopic = null;
    let currentReferences = [];

    // Expose functions to global scope for onclick handlers
    window.showNewTopicModal = function() {
      console.log('showNewTopicModal called');
      document.getElementById('new-topic-modal').classList.add('active');
    };
    window.loadTopicDetail = function(id) {
      console.log('loadTopicDetail called', id);
      _loadTopicDetail(id);
    };
    window.closeModal = function(modalId) {
      document.getElementById(modalId).classList.remove('active');
    };
    window.createTopic = createTopic;
    window.updateTopicStatus = updateTopicStatus;
    window.showAddReferenceModal = function() {
      document.getElementById('add-reference-modal').classList.add('active');
    };
    window.addReference = addReference;
    window.deleteReference = deleteReference;
    window.editSynthesisNotes = function() {
      document.getElementById('edit-notes-content').value = currentTopic.synthesis_notes || '';
      document.getElementById('edit-notes-modal').classList.add('active');
    };
    window.saveSynthesisNotes = saveSynthesisNotes;
    window.addQuestion = addQuestion;
    window.toggleQuestion = toggleQuestion;
    window.showCreateMemoModal = showCreateMemoModal;
    window.showListView = showListView;
    window.toggleHowItWorks = toggleHowItWorks;
    window.buildContext = buildContext;
    window.copyContext = copyContext;
    window.downloadContext = downloadContext;
    window.showSaveSynthesisModal = showSaveSynthesisModal;
    window.saveSynthesisAsMemo = saveSynthesisAsMemo;
    window.viewAsInsight = viewAsInsight;

    let generatedContext = '';

    function toggleHowItWorks() {
      const content = document.getElementById('how-content');
      const toggle = document.getElementById('how-toggle');
      content.classList.toggle('expanded');
      toggle.textContent = content.classList.contains('expanded') ? '-' : '+';
    }

    function buildContext() {
      if (!currentTopic) return;

      let context = '# Research Context: ' + currentTopic.topic + '\\n\\n';
      context += '## Research Question\\n';
      context += currentTopic.topic + '\\n\\n';

      // Add open questions
      const questions = currentTopic.questions || [];
      if (questions.length > 0) {
        context += '## Questions to Answer\\n';
        questions.forEach(q => {
          const status = q.answered ? '[x]' : '[ ]';
          context += status + ' ' + q.text + '\\n';
        });
        context += '\\n';
      }

      // Add sources with notes
      if (currentReferences.length > 0) {
        context += '## Sources (' + currentReferences.length + ')\\n\\n';
        currentReferences.forEach((ref, i) => {
          context += '### ' + (i + 1) + '. ' + ref.title + '\\n';
          context += '- Type: ' + ref.type + '\\n';
          if (ref.url) context += '- URL: ' + ref.url + '\\n';
          if (ref.reference_date) context += '- Date: ' + ref.reference_date + '\\n';
          if (ref.notes) context += '- Notes: ' + ref.notes + '\\n';
          context += '\\n';
        });
      }

      // Add existing synthesis notes
      if (currentTopic.synthesis_notes) {
        context += '## Current Notes\\n';
        context += currentTopic.synthesis_notes + '\\n\\n';
      }

      // Add prompt
      context += '---\\n\\n';
      context += '## Request\\n';
      context += 'Based on the sources and notes above, please help synthesize the key findings and insights for this research topic. ';
      context += 'Focus on answering the open questions and identifying actionable conclusions.\\n';

      generatedContext = context;
      document.getElementById('context-output').textContent = context;
      document.getElementById('build-context-modal').classList.add('active');
    }

    function copyContext() {
      navigator.clipboard.writeText(generatedContext).then(() => {
        showToast('Context copied to clipboard!');
      }).catch(err => {
        showToast('Failed to copy: ' + err.message, true);
      });
    }

    function downloadContext() {
      const blob = new Blob([generatedContext], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (currentTopic.topic || 'research').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-context.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded!');
    }

    function showSaveSynthesisModal() {
      if (!currentTopic) return;
      // Pre-fill with existing values if available
      document.getElementById('synthesis-content').value = currentTopic.memo_content || '';
      document.getElementById('synthesis-memo-id').value = currentTopic.leads_to_memo || '';
      document.getElementById('synthesis-prd-id').value = currentTopic.leads_to_prd || '';
      document.getElementById('save-synthesis-modal').classList.add('active');
    }

    async function saveSynthesisAsMemo() {
      if (!currentTopic) return;

      const memoContent = document.getElementById('synthesis-content').value.trim();
      const memoId = document.getElementById('synthesis-memo-id').value.trim();
      const prdId = document.getElementById('synthesis-prd-id').value.trim();

      if (!memoContent && !memoId && !prdId) {
        showToast('Please enter content or link to a Memo/PRD', true);
        return;
      }

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memo_content: memoContent || undefined,
            leads_to_memo: memoId || undefined,
            leads_to_prd: prdId || undefined,
            status: 'done'  // Auto-mark as done when synthesis is saved
          })
        });

        const result = await res.json();

        if (result.success) {
          closeModal('save-synthesis-modal');
          currentTopic.memo_content = memoContent || null;
          currentTopic.leads_to_memo = memoId || null;
          currentTopic.leads_to_prd = prdId || null;
          currentTopic.status = 'done';
          loadTopics();
          renderTopicDetail();
          const output = prdId ? prdId : (memoId ? memoId : 'insights/' + currentTopic.id);
          showToast('Saved! Output: ' + output);
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error saving: ' + error.message, true);
      }
    }

    function viewAsInsight() {
      if (!currentTopic) return;
      window.open('/research/insights/' + currentTopic.id, '_blank');
    }

    const STATUS_LABELS = {
      'active': 'Active',
      'synthesizing': 'Synthesizing',
      'done': 'Done',
      'archived': 'Archived'
    };

    const TYPE_ICONS = {
      'notion': 'N',
      'google-doc': 'G',
      'url': 'L',
      'screenshot': 'S',
      'directus-file': 'F',
      'other': 'O'
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      loadTopics();
      document.getElementById('new-topic-date').valueAsDate = new Date();
    });

    async function loadTopics() {
      try {
        const res = await fetch(API_BASE + '/topics?sort=-created_at');
        const result = await res.json();
        allTopics = result.data || [];
        renderTopicList();
      } catch (error) {
        document.getElementById('topic-list').innerHTML =
          '<div class="empty-state"><h3>Error loading topics</h3><p>' + error.message + '</p></div>';
      }
    }

    async function _loadTopicDetail(id) {
      try {
        const [topicRes, refsRes] = await Promise.all([
          fetch(API_BASE + '/topics/' + id),
          fetch(API_BASE + '/topics/' + id + '/references')
        ]);

        const topicResult = await topicRes.json();
        const refsResult = await refsRes.json();

        currentTopic = topicResult.data;
        currentReferences = refsResult.data || [];

        renderTopicDetail();

        // Update active state in sidebar
        document.querySelectorAll('.topic-item').forEach(item => {
          item.classList.toggle('active', item.dataset.id === String(id));
        });
      } catch (error) {
        showToast('Error loading topic: ' + error.message, true);
      }
    }

    function renderTopicList() {
      const container = document.getElementById('topic-list');

      if (allTopics.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No topics yet. Create one to get started!</p></div>';
        return;
      }

      container.innerHTML = allTopics.map(topic => {
        return '<div class="topic-item" data-id="' + topic.id + '" onclick="loadTopicDetail(' + topic.id + ')">' +
          '<h3>' + escapeHtml(topic.topic) + '</h3>' +
          '<div class="topic-meta">' +
            '<span class="status-badge status-' + topic.status + '">' + STATUS_LABELS[topic.status] + '</span>' +
            '<span>' + (topic.reference_count || 0) + ' refs</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderTopicDetail() {
      const panel = document.getElementById('detail-panel');

      if (!currentTopic) {
        panel.innerHTML = '<div class="empty-state"><h3>Select a topic</h3><p>Choose a research topic from the sidebar</p></div>';
        return;
      }

      const questionsHtml = (currentTopic.questions || []).map((q, i) => {
        return '<div class="question-item ' + (q.answered ? 'answered' : '') + '">' +
          '<input type="checkbox" class="question-checkbox" ' + (q.answered ? 'checked' : '') + ' onchange="toggleQuestion(' + i + ')">' +
          '<span>' + escapeHtml(q.text) + '</span>' +
        '</div>';
      }).join('');

      const referencesHtml = currentReferences.map(ref => {
        return '<div class="reference-item">' +
          '<div class="reference-info">' +
            '<h4><span class="type-badge">' + TYPE_ICONS[ref.type] + '</span>' + escapeHtml(ref.title) + '</h4>' +
            (ref.url ? '<a href="' + escapeHtml(ref.url) + '" target="_blank">' + escapeHtml(ref.url) + '</a>' : '') +
            '<div class="reference-meta">' + (ref.reference_date || '') + '</div>' +
          '</div>' +
          '<button class="delete-btn" onclick="deleteReference(' + ref.id + ')">Delete</button>' +
        '</div>';
      }).join('');

      panel.innerHTML =
        '<div class="detail-header">' +
          '<h2>' + escapeHtml(currentTopic.topic) + '</h2>' +
          '<div class="detail-actions">' +
            '<button class="btn btn-success" onclick="buildContext()">Build Context</button>' +
            '<button class="btn btn-info" onclick="showSaveSynthesisModal()">Save Synthesis</button>' +
            (currentTopic.memo_content ? '<button class="btn btn-secondary" onclick="viewAsInsight()">View as Blog</button>' : '') +
            '<select onchange="updateTopicStatus(this.value)">' +
              '<option value="active" ' + (currentTopic.status === 'active' ? 'selected' : '') + '>Active</option>' +
              '<option value="synthesizing" ' + (currentTopic.status === 'synthesizing' ? 'selected' : '') + '>Synthesizing</option>' +
              '<option value="done" ' + (currentTopic.status === 'done' ? 'selected' : '') + '>Done</option>' +
              '<option value="archived" ' + (currentTopic.status === 'archived' ? 'selected' : '') + '>Archived</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="section">' +
          '<div class="section-header">' +
            '<h3>References (' + currentReferences.length + ')</h3>' +
            '<button class="btn btn-secondary" onclick="showAddReferenceModal()">+ Add Reference</button>' +
          '</div>' +
          '<div class="reference-list">' +
            (referencesHtml || '<div class="empty-state"><p>No references yet</p></div>') +
          '</div>' +
        '</div>' +

        '<div class="section">' +
          '<div class="section-header">' +
            '<h3>Open Questions</h3>' +
            '<button class="btn btn-secondary" onclick="addQuestion()">+ Add Question</button>' +
          '</div>' +
          '<div class="questions-list">' +
            (questionsHtml || '<div class="empty-state"><p>No questions yet</p></div>') +
          '</div>' +
        '</div>' +

        '<div class="section">' +
          '<div class="section-header">' +
            '<h3>Synthesis Notes</h3>' +
            '<button class="btn btn-secondary" onclick="editSynthesisNotes()">Edit</button>' +
          '</div>' +
          '<div class="synthesis-notes">' +
            (currentTopic.synthesis_notes ? escapeHtml(currentTopic.synthesis_notes) : '<em>No notes yet</em>') +
          '</div>' +
        '</div>' +

        (currentTopic.leads_to_memo || currentTopic.leads_to_prd || currentTopic.memo_content ?
          '<div class="section" style="background: var(--bg-card); padding: 20px; border-radius: 8px;">' +
            '<h3 style="margin-bottom: 10px; font-size: 1rem; color: var(--text-secondary);">Output</h3>' +
            (currentTopic.leads_to_memo ? '<p>Memo: <a href="/memos/' + escapeHtml(currentTopic.leads_to_memo) + '" style="color: var(--accent);"><strong>' + escapeHtml(currentTopic.leads_to_memo) + '</strong></a></p>' : '') +
            (currentTopic.leads_to_prd ? '<p>PRD: <a href="/docs/prd/' + escapeHtml(currentTopic.leads_to_prd) + '" style="color: var(--accent);"><strong>' + escapeHtml(currentTopic.leads_to_prd) + '</strong></a></p>' : '') +
            (currentTopic.memo_content ? '<p><a href="/research/insights/' + currentTopic.id + '" target="_blank" style="color: var(--accent);">View as Public Blog Post -></a></p>' : '') +
          '</div>'
          : '');
    }

    async function createTopic() {
      const topic = document.getElementById('new-topic-name').value.trim();
      const startedAt = document.getElementById('new-topic-date').value;

      if (!topic) {
        showToast('Please enter a topic name', true);
        return;
      }

      try {
        const res = await fetch(API_BASE + '/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, started_at: startedAt })
        });

        const result = await res.json();

        if (result.success) {
          closeModal('new-topic-modal');
          document.getElementById('new-topic-name').value = '';
          loadTopics();
          _loadTopicDetail(result.data.id);
          showToast('Topic created!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error creating topic: ' + error.message, true);
      }
    }

    async function updateTopicStatus(status) {
      if (!currentTopic) return;

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });

        const result = await res.json();

        if (result.success) {
          currentTopic.status = status;
          loadTopics();
          showToast('Status updated!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error updating status: ' + error.message, true);
      }
    }

    async function addReference() {
      if (!currentTopic) return;

      const type = document.getElementById('ref-type').value;
      const title = document.getElementById('ref-title').value.trim();
      const url = document.getElementById('ref-url').value.trim();
      const notes = document.getElementById('ref-notes').value.trim();
      const refDate = document.getElementById('ref-date').value;

      if (!title) {
        showToast('Please enter a title', true);
        return;
      }

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id + '/references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            title,
            url: url || undefined,
            notes: notes || undefined,
            reference_date: refDate || undefined
          })
        });

        const result = await res.json();

        if (result.success) {
          closeModal('add-reference-modal');
          document.getElementById('ref-title').value = '';
          document.getElementById('ref-url').value = '';
          document.getElementById('ref-notes').value = '';
          document.getElementById('ref-date').value = '';
          _loadTopicDetail(currentTopic.id);
          loadTopics();
          showToast('Reference added!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error adding reference: ' + error.message, true);
      }
    }

    async function deleteReference(refId) {
      if (!confirm('Delete this reference?')) return;

      try {
        const res = await fetch(API_BASE + '/references/' + refId, {
          method: 'DELETE'
        });

        const result = await res.json();

        if (result.success) {
          _loadTopicDetail(currentTopic.id);
          loadTopics();
          showToast('Reference deleted!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error deleting reference: ' + error.message, true);
      }
    }

    async function saveSynthesisNotes() {
      if (!currentTopic) return;

      const notes = document.getElementById('edit-notes-content').value;

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ synthesis_notes: notes })
        });

        const result = await res.json();

        if (result.success) {
          closeModal('edit-notes-modal');
          currentTopic.synthesis_notes = notes;
          renderTopicDetail();
          showToast('Notes saved!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error saving notes: ' + error.message, true);
      }
    }

    async function addQuestion() {
      const text = prompt('Enter your question:');
      if (!text) return;

      const questions = [...(currentTopic.questions || []), { text, answered: false }];

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions })
        });

        const result = await res.json();

        if (result.success) {
          currentTopic.questions = questions;
          renderTopicDetail();
          showToast('Question added!');
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error adding question: ' + error.message, true);
      }
    }

    async function toggleQuestion(index) {
      const questions = [...(currentTopic.questions || [])];
      questions[index].answered = !questions[index].answered;

      try {
        const res = await fetch(API_BASE + '/topics/' + currentTopic.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions })
        });

        const result = await res.json();

        if (result.success) {
          currentTopic.questions = questions;
          renderTopicDetail();
        } else {
          showToast('Error: ' + result.error, true);
        }
      } catch (error) {
        showToast('Error updating question: ' + error.message, true);
      }
    }

    function showCreateMemoModal() {
      // Placeholder for memo creation
      alert('Memo creation coming soon!');
    }

    function showListView() {
      currentTopic = null;
      renderTopicDetail();
      document.querySelectorAll('.topic-item').forEach(item => item.classList.remove('active'));
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showToast(message, isError = false) {
      const toast = document.createElement('div');
      toast.className = 'toast' + (isError ? ' error' : '');
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  </script>
</body>
</html>`;

export default router;
