import { updateConversationTitle } from './conversation-title.js';
import { createDraw, openDraw, closeDraw, appendCardResults } from './chat-draw.js?v=20260923-orbit';

const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const send = document.querySelector('#sendButton');
const messages = document.querySelector('#messages');
const sanctuary = document.querySelector('#sanctuary');
const dialog = document.querySelector('#historyDialog');
const search = document.querySelector('#historySearch');
const list = document.querySelector('#historyList');
const notice = document.querySelector('#storageNotice');
const PREFIX = 'arcana.conversation.v1.';
const LEGACY_ACTIVE_KEY = 'arcana.active.v1';
const AGENT_VERSION = 'arcana-agent-v1';
const sessions = new Map();
const controllers = new Map();
let activeId = null;
let composing = false;

function storageFailure() {
  notice.textContent = '暂时无法保存到浏览器。你仍可继续聊天，但本次更改可能在刷新后丢失。';
  notice.hidden = false;
}

function validSession(session) {
  return session && typeof session.id === 'string' && typeof session.title === 'string' &&
    Number.isFinite(session.updatedAt) && typeof session.draft === 'string' &&
    Array.isArray(session.messages) && session.messages.every(message =>
      message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string');
}

function ensureAgentState(session) {
  const historicalCards = session.messages.flatMap(message => message.cards ?? []);
  if (!session.agent || typeof session.agent !== 'object') {
    session.agent = { version: AGENT_VERSION, questionSummary: '', topics: [], cards: historicalCards.slice(-5), readingCount: 0, clarificationPending: false };
  }
  session.agent.version = AGENT_VERSION;
  session.agent.questionSummary = typeof session.agent.questionSummary === 'string' ? session.agent.questionSummary : '';
  session.agent.topics = Array.isArray(session.agent.topics) ? session.agent.topics : [];
  session.agent.cards = Array.isArray(session.agent.cards) ? session.agent.cards : [];
  session.agent.readingCount = Number.isInteger(session.agent.readingCount) ? session.agent.readingCount : 0;
  session.agent.clarificationPending = typeof session.agent.clarificationPending === 'boolean' ? session.agent.clarificationPending : false;
  if (session.pendingReply && !controllers.has(session.id)) session.pendingReply = null;
  delete session.pendingDraw;
  return session.agent;
}

try {
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const session = JSON.parse(localStorage.getItem(key));
      if (validSession(session) && key === PREFIX + session.id) {
        ensureAgentState(session);
        updateConversationTitle(session);
        localStorage.setItem(key, JSON.stringify(session));
        sessions.set(session.id, session);
      }
    } catch { /* Preserve malformed entries for manual recovery. */ }
  }
  // Always open on the welcome screen. Conversations remain available in history,
  // but the last viewed conversation should not take over a new page visit.
  localStorage.removeItem(LEGACY_ACTIVE_KEY);
} catch { storageFailure(); }

function save(session) {
  sessions.set(session.id, session);
  try { localStorage.setItem(PREFIX + session.id, JSON.stringify(session)); }
  catch { storageFailure(); }
}

function setActive(id) {
  activeId = id;
}

function current() { return sessions.get(activeId); }

function ensureSession() {
  if (current()) return current();
  const session = {
    id: crypto.randomUUID(), title: '未发送的草稿', titleMode: 'auto', updatedAt: Date.now(), draft: '', messages: [], pendingReply: null,
    agent: { version: AGENT_VERSION, questionSummary: '', topics: [], cards: [], readingCount: 0, clarificationPending: false },
  };
  save(session);
  setActive(session.id);
  return session;
}

function syncInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  send.disabled = Boolean(current()?.pendingReply) || !input.value.trim();
}

function saveDraft() {
  if (!current() && !input.value.trim()) return;
  const session = ensureSession();
  session.draft = input.value;
  session.updatedAt = Date.now();
  save(session);
}

function addMessage(role, text, message = null, reveal = false) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  if (message?.error) article.classList.add('message-error');
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? '你' : '✧  神秘占卜师';
  const body = document.createElement('div');
  body.className = 'message-body';
  body.textContent = text;
  if (message?.draw) {
    const draw = message.draw;
    if (draw.questionSummary) {
      const summary = document.createElement('p');
      summary.className = 'question-summary';
      summary.textContent = `这次我们想看清：${draw.questionSummary}`;
      body.append(summary);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'draw-invitation';
    button.disabled = draw.status === 'complete';
    button.textContent = draw.status === 'complete' ? '✧ 已完成抽牌' : draw.selected.length ? `✧ 继续选牌 · ${draw.selected.length} / ${draw.count}` : `✧ 抽取 ${draw.count} 张牌`;
    button.addEventListener('click', () => launchDraw(draw));
    body.append(button);
  }
  if (message?.cards) appendCardResults(body, message.cards, { reveal });
  if (message?.retryEvent) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'retry-response';
    retry.textContent = '重新连接';
    retry.addEventListener('click', () => {
      const session = current();
      if (!session || session.pendingReply) return;
      const index = session.messages.indexOf(message);
      if (index >= 0) session.messages.splice(index, 1);
      save(session);
      void requestAgent(session, message.originalEvent);
    });
    body.append(retry);
  }
  if (reveal) { article.classList.add('new-reading'); article.tabIndex = -1; }
  article.append(label, body);
  messages.append(article);
  return body;
}

function stopAgent(session) {
  controllers.get(session.id)?.abort();
  controllers.delete(session.id);
  session.pendingReply = null;
  session.updatedAt = Date.now();
  save(session);
  if (activeId === session.id) renderConversation();
}

function showPending(session) {
  const waiting = addMessage('assistant', '');
  waiting.closest('article').dataset.pending = 'true';
  const row = document.createElement('span');
  row.className = 'thinking-row';
  const dots = document.createElement('span');
  dots.className = 'thinking';
  dots.setAttribute('aria-label', '占卜师正在回应');
  for (let index = 0; index < 3; index++) dots.append(document.createElement('i'));
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'stop-response';
  stop.textContent = '停止';
  stop.addEventListener('click', () => stopAgent(session));
  row.append(dots, stop);
  waiting.append(row);
}

function renderConversation(revealDrawId = null) {
  const session = current();
  const started = Boolean(session?.messages.length);
  document.querySelector('#welcome').hidden = started;
  document.querySelector('#conversation').hidden = !started;
  sanctuary.classList.toggle('started', started);
  messages.replaceChildren();
  for (const message of session?.messages ?? []) addMessage(message.role, message.text, message, Boolean(revealDrawId && message.drawId === revealDrawId));
  if (session?.pendingReply) showPending(session);
  input.value = session?.draft ?? '';
  syncInput();
}

function scrollToComposer() {
  form.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function payloadMessages(session) {
  return session.messages.filter(message => !message.localOnly).map(message => ({ role: message.role, text: message.text }));
}

function applyAgentResult(session, result) {
  const agent = ensureAgentState(session);
  agent.clarificationPending = result.action === 'clarify';
  if (result.questionSummary) agent.questionSummary = result.questionSummary;
  if (Array.isArray(result.topics)) agent.topics = result.topics;
  const response = { role: 'assistant', text: result.reply };
  if (['invite_draw', 'invite_supplement'].includes(result.action)) {
    const supplementary = result.action === 'invite_supplement';
    if (!supplementary) agent.cards = [];
    const excluded = supplementary ? agent.cards.map(card => card.id) : [];
    response.draw = createDraw(excluded, supplementary, {
      count: result.draw?.count,
      positions: result.draw?.positions,
      questionSummary: agent.questionSummary,
    });
    if (!response.draw) response.text += '\n\n这一轮暂时没有足够的新牌可抽，我们先从已有牌面继续聊。';
  }
  if (result.action === 'reading') agent.readingCount += 1;
  session.messages.push(response);
}

async function requestAgent(session, event) {
  if (session.pendingReply) return;
  const controller = new AbortController();
  controllers.set(session.id, controller);
  session.pendingReply = event;
  session.updatedAt = Date.now();
  save(session);
  if (activeId === session.id) { renderConversation(); scrollToComposer(); }
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, messages: payloadMessages(session), state: ensureAgentState(session) }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || '暂时无法获得回应。');
    if (!result.reply || !result.action) throw new Error('回应格式不完整，请重试。');
    if (session.deleted) return;
    applyAgentResult(session, result);
  } catch (error) {
    if (error.name !== 'AbortError') {
      session.messages.push({
        role: 'assistant', text: error.message || '连接暂时中断了，你可以重新试一次。', error: true,
        retryEvent: true, originalEvent: event, localOnly: true,
      });
    }
  } finally {
    if (controllers.get(session.id) === controller) controllers.delete(session.id);
    if (session.deleted) return;
    session.pendingReply = null;
    session.updatedAt = Date.now();
    save(session);
    if (activeId === session.id) { renderConversation(); scrollToComposer(); }
    if (dialog.open && !list.querySelector('.history-editor, .delete-question')) renderHistory();
  }
}

function completeDraw(session, draw) {
  if (draw.status === 'complete' || draw.selected.length !== draw.count) return;
  draw.status = 'complete';
  const cards = draw.selected.map(card => ({ ...card }));
  const agent = ensureAgentState(session);
  agent.questionSummary = draw.questionSummary || agent.questionSummary;
  agent.cards = draw.kind === 'supplement' ? [...agent.cards, ...cards] : cards;
  session.messages.push({ role: 'assistant', text: '你选中的牌，已经在这里展开。', drawId: draw.id, cards, localOnly: true });
  session.updatedAt = Date.now();
  save(session);
  void requestAgent(session, 'draw_complete');
}

function showDrawResult(draw) {
  renderConversation(draw.id);
  requestAnimationFrame(() => {
    const result = messages.querySelector('.new-reading');
    result?.focus({ preventScroll: true });
    result?.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}

function launchDraw(draw) {
  const session = current();
  if (!session || draw.status !== 'ready') return;
  saveDraft();
  if (draw.selected.length === draw.count) {
    completeDraw(session, draw);
    showDrawResult(draw);
    return;
  }
  void openDraw(draw, {
    onPick: () => { session.updatedAt = Date.now(); save(session); },
    onComplete: () => completeDraw(session, draw),
    onClose: () => {
      if (activeId !== session.id) return;
      if (draw.status === 'complete') showDrawResult(draw);
      else {
        renderConversation();
        const invitation = [...messages.querySelectorAll('.draw-invitation')].find(button => !button.disabled);
        invitation?.focus({ preventScroll: true });
      }
    },
  }).catch(() => {
    closeDraw();
    notice.textContent = '牌阵暂时未能打开，请再试一次。已选的牌会保留。';
    notice.hidden = false;
  });
}

function submitMessage(event) {
  event?.preventDefault();
  const text = input.value.trim();
  if (!text || current()?.pendingReply || composing) return;
  const session = ensureSession();
  session.messages.push({ role: 'user', text });
  updateConversationTitle(session);
  session.draft = '';
  session.updatedAt = Date.now();
  save(session);
  void requestAgent(session, 'message');
}

function switchSession(id) {
  closeDraw();
  saveDraft();
  setActive(id);
  renderConversation();
  dialog.close();
  if (current()?.messages.length) scrollToComposer();
  else window.scrollTo({ top: 0, behavior: 'instant' });
  input.focus({ preventScroll: true });
}

function returnHome(event) {
  event.preventDefault();
  closeDraw();
  saveDraft();
  setActive(null);
  renderConversation();
  if (dialog.open) dialog.close();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function actionButton(label, text, callback) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-action';
  button.setAttribute('aria-label', label);
  button.textContent = text;
  button.addEventListener('click', callback);
  return button;
}

function editTitle(session, row) {
  row.replaceChildren();
  const editor = document.createElement('form');
  editor.className = 'history-editor';
  const field = document.createElement('input');
  field.value = session.title;
  field.maxLength = 60;
  field.required = true;
  field.setAttribute('aria-label', '对话名称');
  const submit = document.createElement('button');
  submit.textContent = '保存';
  submit.type = 'submit';
  const cancel = actionButton('取消重命名', '取消', renderHistory);
  editor.append(field, submit, cancel);
  editor.addEventListener('submit', event => {
    event.preventDefault();
    if (!field.value.trim()) return;
    session.title = field.value.trim();
    session.titleMode = 'manual';
    save(session);
    renderHistory();
  });
  field.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); renderHistory(); }
  });
  row.append(editor);
  field.focus();
  field.select();
}

function confirmDelete(session, row) {
  row.replaceChildren();
  const prompt = document.createElement('p');
  prompt.className = 'delete-question';
  prompt.textContent = `删除「${session.title}」？删除后无法恢复。`;
  const cancel = actionButton('取消删除', '保留', renderHistory);
  const confirm = actionButton('确认删除对话', '删除', () => {
    try { localStorage.removeItem(PREFIX + session.id); }
    catch { storageFailure(); return; }
    session.deleted = true;
    controllers.get(session.id)?.abort();
    controllers.delete(session.id);
    sessions.delete(session.id);
    if (activeId === session.id) { setActive(null); renderConversation(); }
    renderHistory();
  });
  confirm.classList.add('delete-action');
  row.append(prompt, cancel, confirm);
  cancel.focus();
}

function renderHistory() {
  const query = search.value.trim().toLocaleLowerCase();
  const ordered = [...sessions.values()].filter(session => session.title.toLocaleLowerCase().includes(query) || session.messages.some(message => message.text.toLocaleLowerCase().includes(query))).sort((a, b) => b.updatedAt - a.updatedAt);
  list.replaceChildren();
  if (!ordered.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = query ? '还没有找到这段对话。' : '这里会收藏每一次倾诉。\n从第一句话开始吧。';
    list.append(empty);
  }
  for (const session of ordered) {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.classList.toggle('selected', session.id === activeId);
    const select = document.createElement('button');
    select.className = 'history-select';
    select.type = 'button';
    if (session.id === activeId) select.setAttribute('aria-current', 'true');
    const title = document.createElement('span');
    title.textContent = session.title;
    const date = document.createElement('small');
    date.textContent = new Date(session.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (session.pendingReply ? ' · 回应中' : session.draft ? ' · 草稿' : '');
    select.append(title, date);
    select.addEventListener('click', () => switchSession(session.id));
    row.append(select, actionButton(`重命名：${session.title}`, '改名', () => editTitle(session, row)), actionButton(`删除：${session.title}`, '删除', () => confirmDelete(session, row)));
    list.append(row);
  }
}

input.addEventListener('input', () => { syncInput(); saveDraft(); });
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; syncInput(); saveDraft(); });
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing && event.keyCode !== 229) {
    event.preventDefault();
    submitMessage();
  }
});
form.addEventListener('submit', submitMessage);
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  input.value = button.dataset.prompt;
  syncInput();
  saveDraft();
  input.focus();
}));
document.querySelector('.brand').addEventListener('click', returnHome);
document.querySelector('#newChat').addEventListener('click', () => switchSession(null));
document.querySelector('#historyNew').addEventListener('click', () => switchSession(null));
document.querySelector('#openHistory').addEventListener('click', () => { search.value = ''; renderHistory(); dialog.showModal(); });
document.querySelector('#closeHistory').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
search.addEventListener('input', renderHistory);
renderConversation();
