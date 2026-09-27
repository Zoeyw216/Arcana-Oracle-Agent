import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../server/agent.js';
import { buildPlannerPrompt, buildReadingPrompt, inferTopics, normalizePlan, parseJsonObject, validateAgentRequest } from '../lib/agent-core.mjs';

const baseState = { questionSummary: '', topics: [], cards: [], readingCount: 0, clarificationPending: false };

test('planner output is constrained to supported actions, counts, positions, and topics', () => {
  const plan = normalizePlan({
    action: 'invite_supplement', reply: '再看一个角度。', questionSummary: '项目下一步的阻碍是什么？',
    topics: ['career', 'unknown', 'career'], draw: { count: 8, positions: ['隐藏影响'] },
  }, { hasCards: true });
  assert.equal(plan.action, 'invite_supplement');
  assert.equal(plan.draw.count, 2);
  assert.deepEqual(plan.topics, ['career']);
  assert.deepEqual(plan.draw.positions, ['隐藏影响', '需要看见的另一面']);
  assert.equal(plan.questionSummary, '项目下一步的阻碍是什么？');
});

test('planner JSON parser accepts plain JSON and a fenced text fallback', () => {
  assert.deepEqual(parseJsonObject('{"action":"reply"}'), { action: 'reply' });
  assert.deepEqual(parseJsonObject('```json\n{"action":"clarify"}\n```'), { action: 'clarify' });
  assert.throws(() => parseJsonObject('没有结构化计划'));
});

test('display summaries avoid third-person labels and supplementary prompts focus the new angle', () => {
  const plan = normalizePlan({
    action: 'invite_draw', reply: '请抽牌。', questionSummary: '用户想知道项目能否推进。', topics: [],
    draw: { count: 1, positions: ['核心指引'] },
  });
  assert.equal(plan.questionSummary, '项目能否推进。');
  const productPlan = normalizePlan({
    action: 'invite_draw', reply: '请抽牌。', questionSummary: '这个产品能否提升用户持续使用意愿？', topics: [],
    draw: { count: 1, positions: ['核心指引'] },
  });
  assert.equal(productPlan.questionSummary, '这个产品能否提升用户持续使用意愿？');
  const prompt = buildReadingPrompt({ mode: 'supplement', questionSummary: plan.questionSummary, cards: [], knowledgeContext: '' });
  assert(prompt.includes('聚焦新增的补充牌位'));
  assert(prompt.includes('不要机械地重新逐张复述'));
  assert(prompt.includes('用户的具体问题是主角，牌义只是分析证据'));
  assert(prompt.includes('最多 30% 用于解释牌本身'));
  assert(prompt.includes('不得编造对话里没有的事实'));
});

test('request validation rejects duplicated cards and draw completion without cards', () => {
  assert.throws(() => validateAgentRequest({ event: 'draw_complete', messages: [{ role: 'user', text: '问题' }], state: baseState }));
  assert.throws(() => validateAgentRequest({
    event: 'message', messages: [{ role: 'user', text: '问题' }],
    state: { ...baseState, cards: [{ id: 1, isReversed: false, position: '一' }, { id: 1, isReversed: true, position: '二' }] },
  }));
});

test('a required context question cannot also create a draw invitation', () => {
  const plan = normalizePlan({
    action: 'invite_draw',
    reply: '在抽牌前，我想先确认：项目现在处于什么阶段，最让你担心的是哪一部分？',
    questionSummary: '这个项目能否顺利推进？', topics: ['career'],
    draw: { count: 3, positions: ['当前基础', '核心影响', '发展潜力'] },
  });
  assert.equal(plan.action, 'clarify');
  assert.equal(plan.draw, null);
  assert.equal(plan.questionSummary, '');
});

test('a follow-up can clarify once without triggering reading retrieval', { concurrency: false }, async () => {
  const prompt = buildPlannerPrompt({ hasCards: true, questionSummary: '项目能否推进？', cards: [{ id: 1 }], clarificationPending: true });
  assert(prompt.includes('本轮不得再次追问'));
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async url => {
    calls += 1;
    assert.equal(String(url), 'https://api.deepseek.com/chat/completions');
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      action: 'clarify', reply: '你说的“它”具体是指项目进度，还是用户留存？', questionSummary: '', topics: [], draw: null,
    }) } }] }));
  };
  try {
    const state = { ...baseState, questionSummary: '项目能否推进？', cards: [{ id: 1, isReversed: false, position: '当前基础' }] };
    const request = new Request('http://localhost/api/agent', { method: 'POST', body: JSON.stringify({ event: 'message', messages: [{ role: 'user', text: '那它呢？' }], state }) });
    const response = await handler(request);
    const body = await response.json();
    assert.equal(body.action, 'clarify');
    assert.equal(calls, 1);
    assert.equal(body.draw, null);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});

test('topic inference supports relationship, career, and inner-growth contexts', () => {
  assert.deepEqual(inferTopics('我在感情和工作中都很焦虑，想理解自己'), ['love', 'career', 'spiritual']);
});

test('message event returns a validated structured draw invitation', { concurrency: false }, async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-key';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.deepseek.com/chat/completions');
    const upstream = JSON.parse(options.body);
    assert.deepEqual(upstream.response_format, { type: 'json_object' });
    assert(upstream.messages.some(message => message.content.includes('只输出一个有效 json 对象')));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      action: 'invite_draw', reply: '让我们带着这个问题抽三张牌。', questionSummary: '这个 Agent 项目能否顺利推进？',
      topics: ['career'], draw: { count: 3, positions: ['当前基础', '关键阻碍', '推进方向'] },
    }) } }] }));
  };
  try {
    const request = new Request('http://localhost/api/agent', { method: 'POST', body: JSON.stringify({
      event: 'message', messages: [{ role: 'user', text: '我想问这个 Agent 项目会成功吗？' }], state: baseState,
    }) });
    const response = await handler(request);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.action, 'invite_draw');
    assert.equal(body.draw.count, 3);
    assert.equal(body.questionSummary, '这个 Agent 项目能否顺利推进？');
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});

test('draw completion retrieves knowledge before producing the reading', { concurrency: false }, async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let readingPrompt = '';
  globalThis.fetch = async (url, options) => {
    if (String(url) === 'http://localhost/api/rag-retrieve') {
      const request = JSON.parse(options.body);
      assert.equal(request.semantic, true);
      assert.deepEqual(request.cards, [{ id: 1, isReversed: true, position: '关键阻碍' }]);
      return new Response(JSON.stringify({ version: 'test-kb', semanticStatus: 'complete', results: [{
        card_id: 1, card_name: '魔术师', orientation: 'reversed', position: '关键阻碍', topic: '逆位牌义', text: '能量分散，需要重新聚焦。',
      }] }));
    }
    const upstream = JSON.parse(options.body);
    readingPrompt = upstream.messages[0].content;
    return new Response(JSON.stringify({ choices: [{ message: { content: '魔术师逆位映照出执行上的分散。' } }] }));
  };
  try {
    const state = { questionSummary: '项目的关键阻碍是什么？', topics: ['career'], readingCount: 0, cards: [{ id: 1, isReversed: true, position: '关键阻碍' }] };
    const request = new Request('http://localhost/api/agent', { method: 'POST', body: JSON.stringify({ event: 'draw_complete', messages: [{ role: 'user', text: '项目的关键阻碍是什么？' }], state }) });
    const response = await handler(request);
    const body = await response.json();
    assert.equal(body.action, 'reading');
    assert.equal(body.retrieval.version, 'test-kb');
    assert(readingPrompt.includes('能量分散，需要重新聚焦。'));
    assert(readingPrompt.includes('魔术师（逆位）'));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});
