import {
  validateAgentRequest,
  sanitizeHistory,
  inferTopics,
  normalizePlan,
  buildPlannerPrompt,
  buildReadingPrompt,
  formatKnowledge,
  parseJsonObject,
  AGENT_VERSION,
} from '../lib/agent-core.mjs';

export const config = { runtime: 'edge' };
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

async function callDeepSeek(apiKey, messages, { jsonMode = false, temperature = .55, maxTokens = 1800 } = {}) {
  let lastError;
  const attempts = jsonMode ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const textFallback = jsonMode && attempt === attempts - 1;
    const requestMessages = textFallback
      ? [...messages, { role: 'user', content: '请严格按照系统消息要求，只输出一个有效 JSON 对象，不要输出解释或代码围栏。' }]
      : messages;
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: requestMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
        ...(jsonMode && !textFallback ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      const error = new Error(`DeepSeek request failed (${upstream.status})`);
      error.status = upstream.status;
      error.detail = detail.slice(0, 500);
      throw error;
    }
    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return content;
    lastError = new Error('DeepSeek returned empty content');
  }
  throw lastError;
}

async function retrieveKnowledge(req, state, topics, query) {
  const response = await fetch(new URL('/api/rag-retrieve', req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards: state.cards, topics, query, semantic: true }),
  });
  if (!response.ok) throw new Error('Knowledge retrieval failed');
  const data = await response.json();
  if (!Array.isArray(data.results) || !data.results.length) throw new Error('Knowledge retrieval returned no evidence');
  return data;
}

function cardNamesFromKnowledge(cards, results) {
  return cards.map(card => ({ ...card, name: results.find(item => item.card_id === card.id)?.card_name ?? `牌 ${card.id}` }));
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return json({ error: '占卜师还没有连接到模型服务，请完成 DeepSeek 配置后重试。' }, 503);

  let body;
  try {
    body = await req.json();
    validateAgentRequest(body);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const history = sanitizeHistory(body.messages);
  const state = body.state;
  const hasCards = state.cards.length > 0;
  try {
    if (body.event === 'draw_complete') {
      const topicText = `${state.questionSummary}\n${history.at(-1)?.content ?? ''}`;
      const topics = state.topics?.filter(topic => ['love', 'career', 'spiritual'].includes(topic)) ?? inferTopics(topicText);
      const rag = await retrieveKnowledge(req, state, topics, topicText);
      const cards = cardNamesFromKnowledge(state.cards, rag.results);
      const content = await callDeepSeek(apiKey, [
        { role: 'system', content: buildReadingPrompt({ mode: state.readingCount > 0 ? 'supplement' : 'initial', questionSummary: state.questionSummary, cards, knowledgeContext: formatKnowledge(rag.results) }) },
        ...history,
      ], { temperature: .72, maxTokens: 2600 });
      return json({ version: AGENT_VERSION, action: 'reading', reply: content, questionSummary: state.questionSummary, topics, retrieval: { version: rag.version, semanticStatus: rag.semanticStatus } });
    }

    const plannerText = await callDeepSeek(apiKey, [
      { role: 'system', content: buildPlannerPrompt({ hasCards, questionSummary: state.questionSummary, cards: state.cards, clarificationPending: state.clarificationPending }) },
      ...history,
    ], { jsonMode: true, temperature: .35, maxTokens: 1100 });
    const plan = normalizePlan(parseJsonObject(plannerText), { hasCards });
    if (hasCards && plan.action === 'reply') {
      const query = `${state.questionSummary}\n${history.at(-1)?.content ?? ''}`;
      const topics = plan.topics.length ? plan.topics : (state.topics?.length ? state.topics : inferTopics(query));
      const rag = await retrieveKnowledge(req, state, topics, query);
      const cards = cardNamesFromKnowledge(state.cards, rag.results);
      const content = await callDeepSeek(apiKey, [
        { role: 'system', content: buildReadingPrompt({ mode: 'followup', questionSummary: state.questionSummary, cards, knowledgeContext: formatKnowledge(rag.results), plannerReply: plan.reply }) },
        ...history,
      ], { temperature: .7, maxTokens: 1900 });
      return json({ version: AGENT_VERSION, ...plan, reply: content, topics, retrieval: { version: rag.version, semanticStatus: rag.semanticStatus } });
    }
    return json({ version: AGENT_VERSION, ...plan });
  } catch (error) {
    console.error('[arcana-agent]', error?.message ?? 'Unknown agent error', error?.status ?? '');
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 502;
    return json({ error: status === 429 ? '占卜师此刻收到的来信有些多，请稍后再试。' : '占卜师暂时没有连上星光，请稍后重试。' }, status);
  }
}
